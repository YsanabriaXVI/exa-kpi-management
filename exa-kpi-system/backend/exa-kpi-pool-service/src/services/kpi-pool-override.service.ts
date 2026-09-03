import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { kpiManagementClient } from "../clients/kpi-management.client.js";
import { AppError } from "../utils/app-error.js";
import { scorecardsClient } from "../clients/scorecards.client.js";

const normalize = (value: unknown): unknown => Array.isArray(value) ? value.map(normalize) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => [key, normalize(item)])) : value;
const canonical = (value: unknown) => JSON.stringify(normalize(value));
const globalField = (snapshot: any, field: string) => field === "GOAL" ? snapshot.goal : snapshot.thresholds.map((item: any) => ({ code: item.code, rangeMinPercent: item.rangeMinPercent, rangeMaxPercent: item.rangeMaxPercent, includesMin: item.includesMin, includesMax: item.includesMax }));

async function context(poolId: bigint, inputPeriodId: bigint, configurationId: bigint) {
  const period = await prisma.kpiPoolInputPeriod.findFirst({ where: { id: inputPeriodId, kpiPoolId: poolId } });
  if (!period) throw new AppError(404, "POOL_INPUT_PERIOD_NOT_FOUND", "Pool Input Period was not found");
  const membership = await prisma.kpiPoolKpi.findFirst({ where: { kpiPoolId: poolId, kpiConfigurationExternalId: configurationId, effectiveFrom: { lte: period.periodStart }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.periodEnd } }] } });
  if (!membership) throw new AppError(404, "KPI_POOL_MEMBERSHIP_NOT_FOUND", "KPI Configuration is not effective in this Pool period");
  return { period, membership };
}

export const kpiPoolOverrideService = {
  async eligibleGlobalPeriods(configurationId: bigint) {
    const memberships = await prisma.kpiPoolKpi.findMany({ where: { kpiConfigurationExternalId: configurationId }, select: { kpiPoolId: true, effectiveFrom: true, effectiveTo: true } });
    const poolIds = [...new Set(memberships.map((item) => item.kpiPoolId.toString()))].map(BigInt);
    const now = new Date(), today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const periods = await prisma.kpiPoolInputPeriod.findMany({ where: { kpiPoolId: { in: poolIds }, periodEnd: { gte: today } }, orderBy: { periodStart: "asc" } });
    const candidates = periods.filter((period) => memberships.some((membership) => membership.kpiPoolId === period.kpiPoolId && membership.effectiveFrom <= period.periodStart && (!membership.effectiveTo || membership.effectiveTo >= period.periodEnd)));
    const checks = await Promise.all(candidates.map(async (period) => ({ period, usage: await scorecardsClient.frozenUsage(period.kpiPoolId.toString(), period.periodKey, configurationId.toString()) })));
    const byKey = new Map<string, { periodKey: string; periodStart: string; eligible: boolean; frozenConsumers: number }>();
    for (const { period, usage } of checks) { const item = byKey.get(period.periodKey) ?? { periodKey: period.periodKey, periodStart: period.periodStart.toISOString().slice(0,10), eligible: true, frozenConsumers: 0 }; if (usage.frozen) { item.eligible = false; item.frozenConsumers += 1; } byKey.set(period.periodKey, item); }
    return { data: [...byKey.values()].filter((item) => item.eligible), meta: { excludedFrozenPeriods: [...byKey.values()].filter((item) => !item.eligible) } };
  },
  async resolve(poolId: bigint, inputPeriodId: bigint, configurationId: bigint, includeEditability = true) {
    const { period, membership } = await context(poolId, inputPeriodId, configurationId);
    const global = await kpiManagementClient.effectiveSnapshot(configurationId.toString(), period.periodStart.toISOString().slice(0,10), period.periodEnd.toISOString().slice(0,10));
    const overrides = await prisma.kpiPoolPeriodConfigurationOverride.findMany({ where: { inputPeriodId, poolMembershipId: membership.id, activeKey: "ACTIVE" } });
    const effective: any = { ...global };
    const sources: Record<string,string> = { GOAL: "GLOBAL_CONFIGURATION", TRAFFIC_LIGHT_THRESHOLDS: "GLOBAL_CONFIGURATION" };
    for (const override of overrides) {
      const current = globalField(global, override.fieldCode);
      if (canonical(current) !== canonical(override.baseGlobalValue)) {
        await prisma.kpiPoolPeriodConfigurationOverride.update({ where: { id: override.id }, data: { statusCode: "SUPERSEDED", activeKey: null, supersededAt: new Date(), supersededByGlobalRevisionExternalId: BigInt(global.kpiConfigurationRevisionId) } });
        continue;
      }
      if (override.fieldCode === "GOAL") effective.goal = String(override.overrideValue);
      if (override.fieldCode === "TRAFFIC_LIGHT_THRESHOLDS") effective.thresholds = override.overrideValue;
      sources[override.fieldCode] = "POOL_OVERRIDE";
    }
    const usage = includeEditability ? await scorecardsClient.frozenUsage(poolId.toString(), period.periodKey, configurationId.toString()) : null;
    return { global, effective, sources, poolMembershipId: membership.id.toString(), editability: usage ? { editable: !usage.frozen, frozen: usage.frozen, scorecardId: usage.scorecardId, scorecardPeriodCompositionId: usage.scorecardPeriodCompositionId } : undefined };
  },
  async save(poolId: bigint, inputPeriodId: bigint, configurationId: bigint, input: { goal?: number; trafficLightThresholds?: unknown[]; applyToFuturePeriods?: boolean; reason?: string }, actor: bigint) {
    const selected = await context(poolId, inputPeriodId, configurationId);
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
    const eligible = usageChecks.filter(({ usage }) => !usage.frozen).map(({ candidate }) => candidate);
    const resolvedByPeriod = new Map((await Promise.all(eligible.map(async (candidate) => [candidate.period.id.toString(), await this.resolve(poolId, candidate.period.id, configurationId, false)] as const))));
    const fields = [{ code: "GOAL", value: input.goal }, { code: "TRAFFIC_LIGHT_THRESHOLDS", value: input.trafficLightThresholds }].filter((item) => item.value !== undefined);
    await prisma.$transaction(async (tx) => {
      for (const candidate of eligible) {
        const resolved = resolvedByPeriod.get(candidate.period.id.toString())!;
        for (const field of fields) {
          await tx.kpiPoolPeriodConfigurationOverride.updateMany({ where: { inputPeriodId: candidate.period.id, poolMembershipId: candidate.membership.id, fieldCode: field.code, activeKey: "ACTIVE" }, data: { statusCode: "SUPERSEDED", activeKey: null, supersededAt: new Date(), updatedByUserId: actor } });
          await tx.kpiPoolPeriodConfigurationOverride.create({ data: { kpiPoolId: poolId, inputPeriodId: candidate.period.id, poolMembershipId: candidate.membership.id, kpiConfigurationExternalId: configurationId, fieldCode: field.code, baseGlobalRevisionExternalId: BigInt(resolved.global.kpiConfigurationRevisionId), baseGlobalValue: globalField(resolved.global, field.code) as Prisma.InputJsonValue, overrideValue: field.value as Prisma.InputJsonValue, reason: input.reason, createdByUserId: actor } });
        }
      }
    });
    return { ...(await this.resolve(poolId, inputPeriodId, configurationId)), propagation: { appliedPeriodKeys: eligible.map(({ period }) => period.periodKey), skippedFrozenPeriodKeys: usageChecks.filter(({ usage }) => usage.frozen).map(({ candidate }) => candidate.period.periodKey) } };
  },
  async reset(poolId: bigint, inputPeriodId: bigint, configurationId: bigint, input: { fields: Array<"GOAL"|"TRAFFIC_LIGHT_THRESHOLDS">; applyToFuturePeriods?: boolean; reason: string }, actor: bigint) {
    const selected = await context(poolId, inputPeriodId, configurationId);
    const periods = input.applyToFuturePeriods === false ? [selected.period] : await prisma.kpiPoolInputPeriod.findMany({ where: { kpiPoolId: poolId, periodStart: { gte: selected.period.periodStart } }, orderBy: { periodStart: "asc" } });
    const candidates = (await Promise.all(periods.map(async (period) => { try { return await context(poolId, period.id, configurationId); } catch (error) { if (error instanceof AppError && error.statusCode === 404) return null; throw error; } }))).filter((item): item is Awaited<ReturnType<typeof context>> => item !== null);
    const usageChecks = await Promise.all(candidates.map(async (candidate) => ({ candidate, usage: await scorecardsClient.frozenUsage(poolId.toString(), candidate.period.periodKey, configurationId.toString()) })));
    const selectedUsage = usageChecks.find(({ candidate }) => candidate.period.id === inputPeriodId)?.usage;
    if (selectedUsage?.frozen) throw new AppError(409, "SCORECARD_EFFECTIVE_SETTINGS_FROZEN", "This KPI Configuration is already consumed by a FINALIZED Scorecard for the selected Input Period", selectedUsage);
    const eligible = usageChecks.filter(({ usage }) => !usage.frozen).map(({ candidate }) => candidate);
    await prisma.$transaction(async (tx) => {
      for (const candidate of eligible) await tx.kpiPoolPeriodConfigurationOverride.updateMany({
        where: { inputPeriodId: candidate.period.id, poolMembershipId: candidate.membership.id, fieldCode: { in: input.fields }, activeKey: "ACTIVE" },
        data: { statusCode: "RESET_TO_GLOBAL", activeKey: null, supersededAt: new Date(), statusReason: input.reason, updatedAt: new Date(), updatedByUserId: actor },
      });
    });
    return { ...(await this.resolve(poolId, inputPeriodId, configurationId)), propagation: { resetPeriodKeys: eligible.map(({ period }) => period.periodKey), skippedFrozenPeriodKeys: usageChecks.filter(({ usage }) => usage.frozen).map(({ candidate }) => candidate.period.periodKey) } };
  },
};
