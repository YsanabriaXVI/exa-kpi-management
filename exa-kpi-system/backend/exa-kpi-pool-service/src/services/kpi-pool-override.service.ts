import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { kpiManagementClient, type EffectiveKpiSettingsV1 } from "../clients/kpi-management.client.js";
import { AppError } from "../utils/app-error.js";
import { scorecardsClient } from "../clients/scorecards.client.js";

const normalize = (value: unknown): unknown => Array.isArray(value) ? value.map(normalize) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => [key, normalize(item)])) : value;
const canonical = (value: unknown) => JSON.stringify(normalize(value));
const globalField = (snapshot: EffectiveKpiSettingsV1, field: string) => field === "GOAL" ? snapshot.goal : snapshot.thresholds.map((item) => ({ code: item.code, rangeMinPercent: item.rangeMinPercent, rangeMaxPercent: item.rangeMaxPercent, includesMin: item.includesMin, includesMax: item.includesMax }));

async function context(poolId: bigint, inputPeriodId: bigint, configurationId: bigint) {
  const [period, pool, closure, composition] = await Promise.all([
    prisma.kpiPoolInputPeriod.findFirst({ where: { id: inputPeriodId, kpiPoolId: poolId } }),
    prisma.kpiPool.findFirst({ where: { id: poolId, deletedAt: null }, select: { id: true, poolCode: true, poolName: true, statusCode: true } }),
    prisma.monitoringPeriodClosureReference.findUnique({ where: { kpiPoolId_poolInputPeriodExternalId: { kpiPoolId: poolId, poolInputPeriodExternalId: inputPeriodId } } }),
    prisma.kpiPoolPeriodComposition.findUnique({ where: { inputPeriodId } }),
  ]);
  if (!period) throw new AppError(404, "POOL_INPUT_PERIOD_NOT_FOUND", "Pool Input Period was not found");
  if (!pool) throw new AppError(404, "KPI_POOL_NOT_FOUND", "KPI Pool was not found");
  const earlierOpen = !composition && await prisma.kpiPoolInputPeriod.findFirst({ where: { kpiPoolId: poolId, periodStart: { lt: period.periodStart }, composition: { is: null } }, select: { id: true } });
  const status = closure ? "CLOSED" as const : composition ? "FINALIZED" as const : pool.statusCode === "INACTIVE" ? "INACTIVE" as const : earlierOpen ? "FUTURE" as const : "EDITABLE" as const;
  const membership = await prisma.kpiPoolKpi.findFirst({ where: { kpiPoolId: poolId, kpiConfigurationExternalId: configurationId, effectiveFrom: { lte: period.periodStart }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.periodEnd } }] } });
  if (!membership) throw new AppError(404, "KPI_POOL_MEMBERSHIP_NOT_FOUND", "KPI Configuration is not effective in this Pool period");
  return { period, membership, pool, status, editable: status === "EDITABLE" };
}

function assertEditable(value: Awaited<ReturnType<typeof context>>) {
  if (!value.editable) throw new AppError(409, "POOL_PERIOD_NOT_EDITABLE", `This Pool Input Period is ${value.status} and cannot be modified`, { periodStatus: value.status, inputPeriodId: value.period.id.toString(), periodKey: value.period.periodKey });
}

export const kpiPoolOverrideService = {
  async resolve(poolId: bigint, inputPeriodId: bigint, configurationId: bigint, includeEditability = true) {
    const selected = await context(poolId, inputPeriodId, configurationId);
    const { period, membership } = selected;
    const global = await kpiManagementClient.effectiveSnapshot(configurationId.toString(), period.periodStart.toISOString().slice(0,10), period.periodEnd.toISOString().slice(0,10));
    const overrides = await prisma.kpiPoolPeriodConfigurationOverride.findMany({ where: { inputPeriodId, poolMembershipId: membership.id, activeKey: "ACTIVE" } });
    const effective: EffectiveKpiSettingsV1 = { ...global };
    const sources: Record<string,string> = { GOAL: "GLOBAL_CONFIGURATION", TRAFFIC_LIGHT_THRESHOLDS: "GLOBAL_CONFIGURATION" };
    const activeOverrides: typeof overrides = [];
    for (const override of overrides) {
      const current = globalField(global, override.fieldCode);
      if (canonical(current) !== canonical(override.baseGlobalValue)) {
        await prisma.kpiPoolPeriodConfigurationOverride.update({ where: { id: override.id }, data: { statusCode: "SUPERSEDED", activeKey: null, supersededAt: new Date(), supersededByGlobalRevisionExternalId: BigInt(global.kpiConfigurationRevisionId) } });
        continue;
      }
      activeOverrides.push(override);
      if (override.fieldCode === "GOAL") effective.goal = String(override.overrideValue);
      if (override.fieldCode === "TRAFFIC_LIGHT_THRESHOLDS") effective.thresholds = override.overrideValue as unknown as EffectiveKpiSettingsV1["thresholds"];
      sources[override.fieldCode] = "POOL_OVERRIDE";
    }
    const usage = includeEditability ? await scorecardsClient.frozenUsage(poolId.toString(), period.periodKey, configurationId.toString()) : null;
    const frozen = usage?.frozen === true || !selected.editable;
    return { global, effective, sources, poolMembershipId: membership.id.toString(), contextVersion: [global.kpiConfigurationRevisionId, ...activeOverrides.map((item) => `${item.id}:${item.version}`)].join(":"), pool: { id: selected.pool.id.toString(), code: selected.pool.poolCode, name: selected.pool.poolName, status: selected.pool.statusCode }, period: { id: period.id.toString(), key: period.periodKey, start: period.periodStart.toISOString().slice(0,10), end: period.periodEnd.toISOString().slice(0,10), status: selected.status }, editability: includeEditability ? { editable: selected.editable && !usage?.frozen, frozen, reason: selected.editable ? usage?.frozen ? "FINALIZED_SCORECARD" : null : selected.status, scorecardId: usage?.scorecardId ?? null, scorecardPeriodCompositionId: usage?.scorecardPeriodCompositionId ?? null } : undefined };
  },
  async save(poolId: bigint, inputPeriodId: bigint, configurationId: bigint, input: { goal?: number; trafficLightThresholds?: unknown[]; applyToFuturePeriods?: boolean; reason?: string; expectedContextVersion: string }, actor: bigint) {
    const selected = await context(poolId, inputPeriodId, configurationId);
    assertEditable(selected);
    const selectedResolved = await this.resolve(poolId, inputPeriodId, configurationId);
    if (selectedResolved.contextVersion !== input.expectedContextVersion) throw new AppError(409, "POOL_OVERRIDE_STALE", "These effective settings changed while you were editing. Reload before saving.");
    const periods = input.applyToFuturePeriods === false
      ? [selected.period]
      : await prisma.kpiPoolInputPeriod.findMany({ where: { kpiPoolId: poolId, periodStart: { gte: selected.period.periodStart } }, orderBy: { periodStart: "asc" } });
    const candidates = (await Promise.all(periods.map(async (period) => {
      try { return await context(poolId, period.id, configurationId); }
      catch (error) { if (error instanceof AppError && error.statusCode === 404) return null; throw error; }
    }))).filter((item): item is Awaited<ReturnType<typeof context>> => item !== null);
    const usageChecks = await Promise.all(candidates.map(async (candidate) => ({ candidate, usage: await scorecardsClient.frozenUsage(poolId.toString(), candidate.period.periodKey, configurationId.toString()) })));
    const selectedUsage = usageChecks.find(({ candidate }) => candidate.period.id === inputPeriodId)?.usage;
    if (selectedUsage?.frozen) throw new AppError(409, "SCORECARD_EFFECTIVE_SETTINGS_FROZEN", "This KPI Configuration is already consumed by a FINALIZED Scorecard for the selected Input Period", selectedUsage);
    const eligible = usageChecks.filter(({ candidate, usage }) => !usage.frozen && candidate.status !== "FINALIZED" && candidate.status !== "CLOSED" && candidate.status !== "INACTIVE").map(({ candidate }) => candidate);
    const resolvedByPeriod = new Map((await Promise.all(eligible.map(async (candidate) => [candidate.period.id.toString(), await this.resolve(poolId, candidate.period.id, configurationId, false)] as const))));
    const fields = [{ code: "GOAL", value: input.goal }, { code: "TRAFFIC_LIGHT_THRESHOLDS", value: input.trafficLightThresholds }].filter((item) => item.value !== undefined);
    await prisma.$transaction(async (tx) => {
      for (const candidate of eligible) {
        const resolved = resolvedByPeriod.get(candidate.period.id.toString())!;
        for (const field of fields) {
          await tx.kpiPoolPeriodConfigurationOverride.updateMany({ where: { inputPeriodId: candidate.period.id, poolMembershipId: candidate.membership.id, fieldCode: field.code, activeKey: "ACTIVE" }, data: { statusCode: "SUPERSEDED", activeKey: null, supersededAt: new Date(), updatedByUserId: actor } });
          await tx.kpiPoolPeriodConfigurationOverride.create({ data: { kpiPoolId: poolId, inputPeriodId: candidate.period.id, poolMembershipId: candidate.membership.id, kpiConfigurationExternalId: configurationId, fieldCode: field.code, baseGlobalRevisionExternalId: BigInt(resolved.global.kpiConfigurationRevisionId), baseGlobalValue: globalField(resolved.global, field.code) as Prisma.InputJsonValue, previousEffectiveValue: globalField(resolved.effective, field.code) as Prisma.InputJsonValue, overrideValue: field.value as Prisma.InputJsonValue, applyScope: input.applyToFuturePeriods === false ? "PERIOD_ONLY" : "FROM_PERIOD_ONWARD", reason: input.reason, createdByUserId: actor } });
        }
      }
    });
    return { ...(await this.resolve(poolId, inputPeriodId, configurationId)), propagation: { appliedPeriodKeys: eligible.map(({ period }) => period.periodKey), skippedFrozenPeriodKeys: usageChecks.filter(({ usage }) => usage.frozen).map(({ candidate }) => candidate.period.periodKey) } };
  },
  async reset(poolId: bigint, inputPeriodId: bigint, configurationId: bigint, input: { fields: Array<"GOAL"|"TRAFFIC_LIGHT_THRESHOLDS">; applyToFuturePeriods?: boolean; reason: string; expectedContextVersion: string }, actor: bigint) {
    const selected = await context(poolId, inputPeriodId, configurationId);
    assertEditable(selected);
    const selectedResolved = await this.resolve(poolId, inputPeriodId, configurationId);
    if (selectedResolved.contextVersion !== input.expectedContextVersion) throw new AppError(409, "POOL_OVERRIDE_STALE", "These effective settings changed while you were editing. Reload before resetting.");
    const periods = input.applyToFuturePeriods === false ? [selected.period] : await prisma.kpiPoolInputPeriod.findMany({ where: { kpiPoolId: poolId, periodStart: { gte: selected.period.periodStart } }, orderBy: { periodStart: "asc" } });
    const candidates = (await Promise.all(periods.map(async (period) => { try { return await context(poolId, period.id, configurationId); } catch (error) { if (error instanceof AppError && error.statusCode === 404) return null; throw error; } }))).filter((item): item is Awaited<ReturnType<typeof context>> => item !== null);
    const usageChecks = await Promise.all(candidates.map(async (candidate) => ({ candidate, usage: await scorecardsClient.frozenUsage(poolId.toString(), candidate.period.periodKey, configurationId.toString()) })));
    const selectedUsage = usageChecks.find(({ candidate }) => candidate.period.id === inputPeriodId)?.usage;
    if (selectedUsage?.frozen) throw new AppError(409, "SCORECARD_EFFECTIVE_SETTINGS_FROZEN", "This KPI Configuration is already consumed by a FINALIZED Scorecard for the selected Input Period", selectedUsage);
    const eligible = usageChecks.filter(({ candidate, usage }) => !usage.frozen && candidate.status !== "FINALIZED" && candidate.status !== "CLOSED" && candidate.status !== "INACTIVE").map(({ candidate }) => candidate);
    await prisma.$transaction(async (tx) => {
      for (const candidate of eligible) await tx.kpiPoolPeriodConfigurationOverride.updateMany({
        where: { inputPeriodId: candidate.period.id, poolMembershipId: candidate.membership.id, fieldCode: { in: input.fields }, activeKey: "ACTIVE" },
        data: { statusCode: "RESET_TO_GLOBAL", activeKey: null, supersededAt: new Date(), statusReason: input.reason, updatedAt: new Date(), updatedByUserId: actor },
      });
    });
    return { ...(await this.resolve(poolId, inputPeriodId, configurationId)), propagation: { resetPeriodKeys: eligible.map(({ period }) => period.periodKey), skippedFrozenPeriodKeys: usageChecks.filter(({ usage }) => usage.frozen).map(({ candidate }) => candidate.period.periodKey) } };
  },
};
