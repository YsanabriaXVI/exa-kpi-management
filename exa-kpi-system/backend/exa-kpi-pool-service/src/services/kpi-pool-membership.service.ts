import { randomUUID } from "node:crypto";
import { Prisma, type KpiPool, type KpiPoolKpi } from "@prisma/client";
import { kpiManagementClient, type KpiManagementConfiguration } from "../clients/kpi-management.client.js";
import { prisma } from "../config/prisma.js";
import { defaultTargetPeriod, formatDateOnly, poolPeriods, previousDay, resolvePoolPeriod, type InputPeriod } from "../domain/input-period.js";
import { periodFinalizationGateway } from "../gateways/period-finalization.gateway.js";
import type { AddKpiPoolConfigurationsBody, AvailableKpiConfigurationsQuery, ReplaceKpiPoolConfigurationBody, RetireKpiPoolConfigurationBody, TargetPeriodQuery } from "../schemas/kpi-pool.schema.js";
import { AppError } from "../utils/app-error.js";

type PoolWithFrequency = KpiPool & { frequency: { monthsPerPeriod: number } };

export function lifecycleAllowsPeriodFinalization(status: string, periodIndex: number): boolean {
  return status === "ACTIVE" || (status === "DRAFT" && periodIndex === 0);
}

async function requirePool(id: bigint): Promise<PoolWithFrequency> {
  const pool = await prisma.kpiPool.findFirst({ where: { id, deletedAt: null } });
  if (!pool) throw new AppError(404, "KPI_POOL_NOT_FOUND", "KPI Pool was not found");
  const frequency = await prisma.inputFrequencyReference.findUnique({ where: { externalInputFrequencyId: pool.inputFrequencyExternalId } });
  if (!frequency) throw new AppError(422, "INPUT_FREQUENCY_NOT_FOUND", "Pool Input Frequency reference was not found");
  return Object.assign(pool, { frequency });
}

async function targetPeriod(pool: PoolWithFrequency, requested?: string): Promise<InputPeriod> {
  if (pool.statusCode === "INACTIVE") throw new AppError(409, "POOL_INACTIVE", "Inactive Pools cannot change KPI membership");
  const periods = poolPeriods(pool.validFrom, pool.validTo, pool.frequency.monthsPerPeriod);
  const finalized = pool.statusCode === "DRAFT" ? new Set<string>() : new Set((await prisma.kpiPoolPeriodComposition.findMany({ where: { kpiPoolId: pool.id }, select: { periodStart: true } })).map((row) => formatDateOnly(row.periodStart)));
  const editable = pool.statusCode === "DRAFT" ? periods[0] : periods.find((candidate) => !finalized.has(formatDateOnly(candidate.start)));
  if (!editable) throw new AppError(409, "NO_EDITABLE_PERIOD", "Every Pool Input Period composition is already finalized");
  const period = requested ? resolvePoolPeriod(pool.validFrom, pool.validTo, pool.frequency.monthsPerPeriod, requested) : editable;
  if (period.start.getTime() !== editable.start.getTime()) throw new AppError(409, "POOL_PERIOD_NOT_EDITABLE", "Only the first non-finalized Pool Input Period can be prepared", { editablePeriodStart: formatDateOnly(editable.start) });
  return period;
}

function effectiveWhere(poolId: bigint, period: InputPeriod): Prisma.KpiPoolKpiWhereInput {
  return { kpiPoolId: poolId, effectiveFrom: { lte: period.end }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.start } }] };
}

function eligibilityReason(configuration: KpiManagementConfiguration, frequencyId: bigint): string | undefined {
  if (!configuration.isActive) return "KPI_CONFIGURATION_INACTIVE";
  if (!configuration.definitionIsActive) return "KPI_DEFINITION_INACTIVE";
  if (!configuration.inputFrequencyIsActive) return "INPUT_FREQUENCY_INACTIVE";
  if (configuration.inputFrequencyId !== frequencyId.toString()) return "FREQUENCY_MISMATCH";
  if (configuration.executability && !configuration.executability.executable) return configuration.executability.reasons[0]?.code ?? "KPI_CONFIGURATION_NOT_EXECUTABLE";
}

function throwEligibility(reason: string, configuration: KpiManagementConfiguration): never {
  throw new AppError(422, reason, `${configuration.configCode} is not eligible for this Pool`, { configurationId: configuration.id });
}

function membershipDto(value: KpiPoolKpi, configuration?: KpiManagementConfiguration, effectiveGoal?: string | null) {
  return {
    membershipId: value.id.toString(), id: value.kpiConfigurationExternalId.toString(), configurationId: value.kpiConfigurationExternalId.toString(),
    definitionId: value.kpiDefinitionExternalId.toString(), configCode: value.configurationCodeSnapshot,
    definitionCode: value.definitionCodeSnapshot, definitionName: value.definitionNameSnapshot,
    inputFrequencyId: value.inputFrequencyExternalIdSnapshot.toString(), inputFrequencyCode: value.inputFrequencyCodeSnapshot,
    displayOrder: value.displayOrder, isRequired: value.isRequired,
    effectiveFrom: formatDateOnly(value.effectiveFrom), effectiveTo: value.effectiveTo ? formatDateOnly(value.effectiveTo) : null,
    categoryName: configuration?.categoryName ?? null, goal: effectiveGoal ?? configuration?.goal ?? null,
    measurementUnit: configuration?.measurementUnit ?? null, dataSource: configuration?.dataSource ?? null,
    isActive: configuration?.isActive ?? true,
  };
}

async function effectiveGoalsForPeriod(
  poolId: bigint,
  period: InputPeriod,
  memberships: KpiPoolKpi[],
) {
  if (!memberships.length) return new Map<string, string>();
  const effectiveGoals = new Map<string, string>();
  const globalSnapshots = await Promise.all(
    memberships.map((membership) =>
      kpiManagementClient.effectiveSnapshot(
        membership.kpiConfigurationExternalId.toString(),
        formatDateOnly(period.start),
        formatDateOnly(period.end),
      ),
    ),
  );
  memberships.forEach((membership, index) => {
    const goal = globalSnapshots[index]?.goal;
    if (goal !== null && goal !== undefined)
      effectiveGoals.set(membership.id.toString(), goal);
  });
  const inputPeriod = await prisma.kpiPoolInputPeriod.findUnique({
    where: {
      kpiPoolId_periodStart: { kpiPoolId: poolId, periodStart: period.start },
    },
    select: { id: true },
  });
  if (!inputPeriod) return effectiveGoals;
  const overrides = await prisma.kpiPoolPeriodConfigurationOverride.findMany({
    where: {
      inputPeriodId: inputPeriod.id,
      poolMembershipId: { in: memberships.map((membership) => membership.id) },
      fieldCode: "GOAL",
      activeKey: "ACTIVE",
    },
    select: { poolMembershipId: true, overrideValue: true },
  });
  overrides.forEach((override) =>
    effectiveGoals.set(
      override.poolMembershipId.toString(),
      String(override.overrideValue),
    ),
  );
  return effectiveGoals;
}

function periodDto(period: InputPeriod) { return { start: formatDateOnly(period.start), end: formatDateOnly(period.end) }; }

async function lockPool(tx: Prisma.TransactionClient, id: bigint) {
  await tx.$queryRaw`SELECT kpi_pool_id FROM kpi_pools WHERE kpi_pool_id = ${id} FOR UPDATE`;
}

type MembershipEventType = "kpi.pool.activated.v1" | "kpi.pool.kpi.added.v1" | "kpi.pool.kpi.retired.v1" | "kpi.pool.period.composition.finalized.v1";
function membershipEvent(eventType: MembershipEventType, pool: KpiPool, data: Record<string, unknown>, versionOffset = 1) {
  const eventId = randomUUID();
  const payload = { eventId, eventType, occurredAt: new Date().toISOString(), producer: "exa-kpi-pool-service", aggregateType: "kpi_pool", aggregateId: pool.id.toString(), version: pool.aggregateVersion + versionOffset, data: { poolId: pool.id.toString(), ...data } };
  return { eventId, payload };
}

async function writeOutbox(tx: Prisma.TransactionClient, pool: KpiPool, eventType: MembershipEventType, data: Record<string, unknown>, versionOffset = 1) {
  const { eventId, payload } = membershipEvent(eventType, pool, data, versionOffset);
  await tx.outboxEvent.create({ data: { eventId, eventType, aggregateType: "kpi_pool", aggregateId: pool.id.toString(), aggregateVersion: payload.version, subject: eventType, payload, occurredAt: new Date(payload.occurredAt) } });
}

async function assertNotFinalized(poolId: bigint, periodStart: Date, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const locked = await tx.kpiPoolPeriodComposition.findUnique({ where: { kpiPoolId_periodStart: { kpiPoolId: poolId, periodStart } } });
  if (locked) throw new AppError(409, "POOL_PERIOD_LOCKED", "This period composition has been finalized and cannot be modified");
}

async function lookupAndValidate(ids: string[], pool: KpiPool) {
  const lookup = await kpiManagementClient.batchLookup(ids);
  if (lookup.notFoundIds.length) throw new AppError(422, "KPI_CONFIGURATION_NOT_FOUND", "One or more KPI Configurations were not found", { ids: lookup.notFoundIds });
  const definitions = new Set<string>();
  for (const configuration of lookup.data) {
    const reason = eligibilityReason(configuration, pool.inputFrequencyExternalId);
    if (reason) throwEligibility(reason, configuration);
    if (definitions.has(configuration.definitionId)) throw new AppError(422, "KPI_DEFINITION_ALREADY_EFFECTIVE", "The batch contains multiple Configurations from the same KPI Definition", { definitionId: configuration.definitionId });
    definitions.add(configuration.definitionId);
  }
  return lookup.data;
}

export const kpiPoolMembershipService = {
  async assignmentEligibility(configurationIds: string[]) {
    const lookup = await kpiManagementClient.batchLookup(configurationIds);
    if (lookup.notFoundIds.length) throw new AppError(422, "KPI_CONFIGURATION_NOT_FOUND", "One or more KPI Configurations were not found", { ids: lookup.notFoundIds });
    const duplicateDefinitions = new Set<string>();
    const seenDefinitions = new Set<string>();
    for (const configuration of lookup.data) {
      if (seenDefinitions.has(configuration.definitionId)) duplicateDefinitions.add(configuration.definitionId);
      seenDefinitions.add(configuration.definitionId);
    }

    const pools = await prisma.kpiPool.findMany({
      where: { deletedAt: null },
      include: { companies: { orderBy: { displayOrder: "asc" } } },
      orderBy: [{ statusCode: "asc" }, { poolName: "asc" }],
    });
    const frequencies = await prisma.inputFrequencyReference.findMany({
      where: { externalInputFrequencyId: { in: [...new Set(pools.map((pool) => pool.inputFrequencyExternalId))] } },
    });
    const frequencyById = new Map(frequencies.map((frequency) => [frequency.externalInputFrequencyId.toString(), frequency]));

    const data = await Promise.all(pools.map(async (pool) => {
      const issues: Array<{ configurationId: string | null; code: string; message: string; conflictingConfigurationCode?: string | null }> = [];
      const availableConfigurationIds: string[] = [];
      const alreadyIncludedConfigurationIds: string[] = [];
      const frequency = frequencyById.get(pool.inputFrequencyExternalId.toString());
      let period: InputPeriod | null = null;

      if (!frequency?.isActive) {
        issues.push({ configurationId: null, code: "INPUT_FREQUENCY_INACTIVE", message: "The Pool Input Frequency is inactive." });
      } else {
        try {
          period = await targetPeriod(Object.assign(pool, { frequency }));
          const finalized = await prisma.kpiPoolPeriodComposition.findUnique({ where: { kpiPoolId_periodStart: { kpiPoolId: pool.id, periodStart: period.start } } });
          if (finalized) issues.push({ configurationId: null, code: "POOL_PERIOD_LOCKED", message: "The target Pool period is already finalized." });
        } catch (error) {
          const appError = error instanceof AppError ? error : null;
          issues.push({ configurationId: null, code: appError?.code ?? "POOL_NOT_EDITABLE", message: appError?.message ?? "The Pool has no editable period." });
        }
      }

      const conflicts = period ? await prisma.kpiPoolKpi.findMany({
        where: { ...effectiveWhere(pool.id, { start: period.start, end: pool.validTo }), kpiDefinitionExternalId: { in: lookup.data.map((item) => BigInt(item.definitionId)) } },
      }) : [];

      for (const configuration of lookup.data) {
        if (duplicateDefinitions.has(configuration.definitionId)) {
          issues.push({ configurationId: configuration.id, code: "BATCH_DEFINITION_DUPLICATE", message: `${configuration.definitionCode} appears more than once in the selection.` });
          continue;
        }
        const reason = eligibilityReason(configuration, pool.inputFrequencyExternalId);
        if (reason) {
          const messages: Record<string, string> = {
            KPI_CONFIGURATION_INACTIVE: `${configuration.configCode} is inactive.`,
            KPI_DEFINITION_INACTIVE: `${configuration.definitionCode} is inactive.`,
            INPUT_FREQUENCY_INACTIVE: `${configuration.configCode} has an inactive Input Frequency.`,
            FREQUENCY_MISMATCH: `${configuration.configCode} does not match the Pool frequency.`,
          };
          issues.push({ configurationId: configuration.id, code: reason, message: messages[reason] ?? `${configuration.configCode} is not eligible.` });
          continue;
        }
        const conflict = conflicts.find((item) => item.kpiDefinitionExternalId === BigInt(configuration.definitionId));
        if (conflict?.kpiConfigurationExternalId === BigInt(configuration.id)) alreadyIncludedConfigurationIds.push(configuration.id);
        else if (conflict) issues.push({ configurationId: configuration.id, code: "KPI_DEFINITION_ALREADY_EFFECTIVE", message: `${configuration.definitionCode} already has ${conflict.configurationCodeSnapshot} in this Pool.`, conflictingConfigurationCode: conflict.configurationCodeSnapshot });
        else availableConfigurationIds.push(configuration.id);
      }

      const eligibility = issues.length ? "NOT_ELIGIBLE"
        : availableConfigurationIds.length && alreadyIncludedConfigurationIds.length ? "PARTIAL"
          : availableConfigurationIds.length ? "ELIGIBLE" : "ALREADY_INCLUDED";
      return {
        poolId: pool.id.toString(), poolCode: pool.poolCode, poolName: pool.poolName, poolStatus: pool.statusCode,
        companies: pool.companies.map((company) => company.companyNameSnapshot), inputFrequencyCode: pool.inputFrequencyCode,
        targetPeriod: period ? periodDto(period) : null, eligibility,
        availableConfigurationIds, alreadyIncludedConfigurationIds, issues,
      };
    }));
    return { data };
  },

  async periods(poolId: bigint) {
    const pool = await requirePool(poolId);
    const periods = poolPeriods(pool.validFrom, pool.validTo, pool.frequency.monthsPerPeriod);
    const [persistedPeriods, finalized] = await Promise.all([
      prisma.kpiPoolInputPeriod.findMany({ where: { kpiPoolId: poolId }, orderBy: { periodStart: "asc" } }),
      prisma.kpiPoolPeriodComposition.findMany({ where: { kpiPoolId: poolId }, select: { id: true, inputPeriodId: true, periodStart: true } }),
    ]);
    const persistedByStart = new Map(persistedPeriods.map((value) => [formatDateOnly(value.periodStart), value]));
    const finalizedByStart = new Map(finalized.map((value) => [formatDateOnly(value.periodStart), value]));
    const finalizedStarts = new Set(finalizedByStart.keys());
    // The first non-finalized period remains the planning target even after its
    // calendar start. Passing the start date must never fabricate a finalized
    // Pool Composition: Scorecards can only consume a persisted composition ID.
    const firstEditableIndex = periods.findIndex((period) => !finalizedStarts.has(formatDateOnly(period.start)));
    const data = await Promise.all(periods.map(async (period, index) => {
      const persistedFinalized = finalizedStarts.has(formatDateOnly(period.start));
      const conservativelyLocked = pool.statusCode === "INACTIVE";
      const isOnlyEditablePeriod = index === firstEditableIndex;
      const configurationStatus = persistedFinalized || conservativelyLocked ? "POOL_COMPOSITION_LOCKED" as const : isOnlyEditablePeriod ? "EDITABLE" as const : "FUTURE_NOT_AVAILABLE" as const;
      const dependency = await periodFinalizationGateway.evaluate(poolId, periods, index);
      const canEditComposition = configurationStatus === "EDITABLE";
      const lifecycleAllowsFinalization = lifecycleAllowsPeriodFinalization(pool.statusCode, index);
      const canFinalizeComposition = lifecycleAllowsFinalization && canEditComposition && dependency.canFinalize;
      const workflowStatus = persistedFinalized ? "FINALIZED" as const : canEditComposition ? "EDITABLE" as const : "FUTURE" as const;
      const persisted = persistedByStart.get(formatDateOnly(period.start));
      const composition = finalizedByStart.get(formatDateOnly(period.start));
      return { poolPeriodId: persisted?.id.toString() ?? null, poolCompositionId: composition?.id.toString() ?? null, periodKey: formatDateOnly(period.start).slice(0, 7), ...periodDto(period), configurationStatus, canEditComposition, canFinalizeComposition, workflowStatus, dependency };
    }));
    const defaultPeriod = data.find((period) => period.configurationStatus === "EDITABLE") ?? null;
    return { data, meta: { defaultPeriodStart: defaultPeriod?.start ?? null, editabilitySource: "PERSISTED_PERIOD_LOCK_WITH_CONSERVATIVE_FALLBACK" } };
  },

  async usage(configurationIds: string[]) {
    const memberships = await prisma.kpiPoolKpi.findMany({ where: { kpiConfigurationExternalId: { in: configurationIds.map(BigInt) }, pool: { deletedAt: null } }, select: { kpiConfigurationExternalId: true, pool: { select: { id: true, poolCode: true, poolName: true, statusCode: true, validTo: true } } }, orderBy: [{ kpiConfigurationExternalId: "asc" }, { kpiPoolId: "asc" }] });
    const grouped = new Map<string, Array<{ id: string; code: string; name: string; status: string; validTo: string }>>();
    for (const item of memberships) { const key = item.kpiConfigurationExternalId.toString(); const pools = grouped.get(key) ?? []; if (!pools.some((pool) => pool.id === item.pool.id.toString())) pools.push({ id: item.pool.id.toString(), code: item.pool.poolCode, name: item.pool.poolName, status: item.pool.statusCode, validTo: formatDateOnly(item.pool.validTo) }); grouped.set(key, pools); }
    return { data: configurationIds.map((configurationId) => ({ configurationId, usedIn: grouped.get(configurationId)?.length ?? 0, pools: grouped.get(configurationId) ?? [] })) };
  },

  async list(poolId: bigint, query: TargetPeriodQuery) {
    const pool = await requirePool(poolId);
    const period = query.periodStart ? resolvePoolPeriod(pool.validFrom, pool.validTo, pool.frequency.monthsPerPeriod, query.periodStart) : defaultTargetPeriod(pool.validFrom, pool.validTo, pool.frequency.monthsPerPeriod, pool.statusCode);
    const rows = await prisma.kpiPoolKpi.findMany({ where: effectiveWhere(poolId, period), orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
    const lookup = rows.length ? await kpiManagementClient.batchLookup(rows.map((row) => row.kpiConfigurationExternalId.toString())) : { data: [], notFoundIds: [] };
    const configurations = new Map(lookup.data.map((configuration) => [configuration.id, configuration]));
    const effectiveGoals = await effectiveGoalsForPeriod(poolId, period, rows);
    return { data: rows.map((row) => membershipDto(row, configurations.get(row.kpiConfigurationExternalId.toString()), effectiveGoals.get(row.id.toString()))), meta: { targetPeriod: periodDto(period) } };
  },

  async add(poolId: bigint, input: AddKpiPoolConfigurationsBody, actor: bigint) {
    const initial = await requirePool(poolId);
    const period = await targetPeriod(initial, input.effectiveFromPeriod);
    await assertNotFinalized(poolId, period.start);
    const configurations = await lookupAndValidate(input.configurationIds, initial);
    return prisma.$transaction(async (tx) => {
      await lockPool(tx, poolId);
      await assertNotFinalized(poolId, period.start, tx);
      const pool = await tx.kpiPool.findFirst({ where: { id: poolId, deletedAt: null } });
      if (!pool || pool.statusCode === "INACTIVE") throw new AppError(409, "POOL_INACTIVE", "Pool cannot accept KPI membership changes");
      const conflicts = await tx.kpiPoolKpi.findMany({ where: { ...effectiveWhere(poolId, { start: period.start, end: pool.validTo }), kpiDefinitionExternalId: { in: configurations.map((item) => BigInt(item.definitionId)) } } });
      for (const configuration of configurations) {
        const conflict = conflicts.find((item) => item.kpiDefinitionExternalId === BigInt(configuration.definitionId));
        if (conflict) throw new AppError(409, conflict.kpiConfigurationExternalId === BigInt(configuration.id) ? "CONFIGURATION_ALREADY_EFFECTIVE" : "KPI_DEFINITION_ALREADY_EFFECTIVE", `${configuration.definitionCode} already has an effective Configuration in the requested interval`, { conflictingConfigurationCode: conflict.configurationCodeSnapshot });
      }
      const effectiveRows = await tx.kpiPoolKpi.findMany({ where: effectiveWhere(poolId, period) });
      const nextOrder = effectiveRows.reduce((max, row) => Math.max(max, row.displayOrder), 0) + 1;
      await tx.kpiPoolKpi.createMany({ data: configurations.map((configuration, index) => ({ kpiPoolId: poolId, kpiDefinitionExternalId: BigInt(configuration.definitionId), kpiConfigurationExternalId: BigInt(configuration.id), definitionCodeSnapshot: configuration.definitionCode, definitionNameSnapshot: configuration.definitionName, configurationCodeSnapshot: configuration.configCode, inputFrequencyExternalIdSnapshot: BigInt(configuration.inputFrequencyId), inputFrequencyCodeSnapshot: configuration.inputFrequencyCode, displayOrder: nextOrder + index, isRequired: true, effectiveFrom: period.start, createdByUserId: actor })) });
      await tx.kpiPool.update({ where: { id: poolId }, data: { aggregateVersion: { increment: 1 }, updatedAt: new Date(), updatedByUserId: actor } });
      for (const configuration of configurations) await writeOutbox(tx, pool, "kpi.pool.kpi.added.v1", { configurationId: configuration.id, definitionId: configuration.definitionId, effectiveFrom: formatDateOnly(period.start) });
      const created = await tx.kpiPoolKpi.findMany({ where: { kpiPoolId: poolId, effectiveFrom: period.start, kpiConfigurationExternalId: { in: configurations.map((item) => BigInt(item.id)) } }, orderBy: { displayOrder: "asc" } });
      return { data: created.map((row) => membershipDto(row)), meta: { targetPeriod: periodDto(period) } };
    });
  },

  async remove(poolId: bigint, configurationId: bigint) {
    return prisma.$transaction(async (tx) => {
      await lockPool(tx, poolId);
      const pool = await tx.kpiPool.findFirst({ where: { id: poolId, deletedAt: null } });
      if (!pool) throw new AppError(404, "KPI_POOL_NOT_FOUND", "KPI Pool was not found");
      if (pool.statusCode !== "DRAFT") throw new AppError(409, "ACTIVE_MEMBERSHIP_REQUIRES_RETIRE", "Published membership must be retired for a future period, not deleted");
      const result = await tx.kpiPoolKpi.deleteMany({ where: { kpiPoolId: poolId, kpiConfigurationExternalId: configurationId } });
      if (!result.count) throw new AppError(404, "KPI_POOL_MEMBERSHIP_NOT_FOUND", "KPI Configuration is not in this Pool");
      return { removedConfigurationId: configurationId.toString() };
    });
  },

  async retire(poolId: bigint, configurationId: bigint, input: RetireKpiPoolConfigurationBody, actor: bigint) {
    const initial = await requirePool(poolId);
    const period = await targetPeriod(initial, input.effectiveFromPeriod);
    await assertNotFinalized(poolId, period.start);
    if (initial.statusCode === "DRAFT") return this.remove(poolId, configurationId);
    return prisma.$transaction(async (tx) => {
      await lockPool(tx, poolId);
      await assertNotFinalized(poolId, period.start, tx);
      const row = await tx.kpiPoolKpi.findFirst({ where: { ...effectiveWhere(poolId, period), kpiConfigurationExternalId: configurationId }, orderBy: { effectiveFrom: "desc" } });
      if (!row) throw new AppError(404, "KPI_POOL_MEMBERSHIP_NOT_FOUND", "KPI Configuration is not effective in the target period");
      if (row.effectiveFrom >= period.start) throw new AppError(409, "MEMBERSHIP_HAS_NO_PRIOR_HISTORY", "A membership starting in the target period should be removed or replaced, not retired before it starts");
      const effectiveTo = previousDay(period.start);
      await tx.kpiPoolKpi.update({ where: { id: row.id }, data: { effectiveTo, updatedAt: new Date(), updatedByUserId: actor } });
      await tx.kpiPool.update({ where: { id: poolId }, data: { aggregateVersion: { increment: 1 }, updatedAt: new Date(), updatedByUserId: actor } });
      await writeOutbox(tx, initial, "kpi.pool.kpi.retired.v1", { configurationId: configurationId.toString(), definitionId: row.kpiDefinitionExternalId.toString(), effectiveTo: formatDateOnly(effectiveTo) });
      return { configurationId: configurationId.toString(), effectiveTo: formatDateOnly(effectiveTo) };
    });
  },

  async replace(poolId: bigint, input: ReplaceKpiPoolConfigurationBody, actor: bigint) {
    const initial = await requirePool(poolId);
    const period = await targetPeriod(initial, input.effectiveFromPeriod);
    await assertNotFinalized(poolId, period.start);
    const [replacement] = await lookupAndValidate([input.newConfigurationId], initial);
    if (!replacement) throw new AppError(422, "KPI_CONFIGURATION_NOT_FOUND", "Replacement KPI Configuration was not found");
    return prisma.$transaction(async (tx) => {
      await lockPool(tx, poolId);
      await assertNotFinalized(poolId, period.start, tx);
      const old = await tx.kpiPoolKpi.findFirst({ where: { ...effectiveWhere(poolId, period), kpiConfigurationExternalId: BigInt(input.oldConfigurationId) }, orderBy: { effectiveFrom: "desc" } });
      if (!old) throw new AppError(404, "KPI_POOL_MEMBERSHIP_NOT_FOUND", "Configuration to replace is not effective in the target period");
      if (old.kpiDefinitionExternalId !== BigInt(replacement.definitionId)) throw new AppError(422, "REPLACEMENT_DEFINITION_MISMATCH", "Replacement must belong to the same KPI Definition");
      const other = await tx.kpiPoolKpi.findFirst({ where: { ...effectiveWhere(poolId, { start: period.start, end: initial.validTo }), kpiDefinitionExternalId: old.kpiDefinitionExternalId, id: { not: old.id } } });
      if (other) throw new AppError(409, "KPI_DEFINITION_ALREADY_EFFECTIVE", "Another Configuration already overlaps the replacement interval");
      const effectiveTo = previousDay(period.start);
      if (old.effectiveFrom >= period.start) await tx.kpiPoolKpi.delete({ where: { id: old.id } });
      else await tx.kpiPoolKpi.update({ where: { id: old.id }, data: { effectiveTo, updatedAt: new Date(), updatedByUserId: actor } });
      const created = await tx.kpiPoolKpi.create({ data: { kpiPoolId: poolId, kpiDefinitionExternalId: BigInt(replacement.definitionId), kpiConfigurationExternalId: BigInt(replacement.id), definitionCodeSnapshot: replacement.definitionCode, definitionNameSnapshot: replacement.definitionName, configurationCodeSnapshot: replacement.configCode, inputFrequencyExternalIdSnapshot: BigInt(replacement.inputFrequencyId), inputFrequencyCodeSnapshot: replacement.inputFrequencyCode, displayOrder: old.displayOrder, isRequired: old.isRequired, effectiveFrom: period.start, createdByUserId: actor } });
      await tx.kpiPool.update({ where: { id: poolId }, data: { aggregateVersion: { increment: 1 }, updatedAt: new Date(), updatedByUserId: actor } });
      await writeOutbox(tx, initial, "kpi.pool.kpi.retired.v1", { configurationId: input.oldConfigurationId, definitionId: replacement.definitionId, effectiveTo: formatDateOnly(effectiveTo) });
      await writeOutbox(tx, initial, "kpi.pool.kpi.added.v1", { configurationId: replacement.id, definitionId: replacement.definitionId, effectiveFrom: formatDateOnly(period.start) });
      return { retiredConfigurationId: input.oldConfigurationId, added: membershipDto(created), targetPeriod: periodDto(period) };
    });
  },

  async availability(poolId: bigint, query: AvailableKpiConfigurationsQuery) {
    const pool = await requirePool(poolId);
    const period = await targetPeriod(pool, query.periodStart);
    await assertNotFinalized(poolId, period.start);
    const catalog = await kpiManagementClient.listConfigurations(query);
    const effective = await prisma.kpiPoolKpi.findMany({ where: effectiveWhere(poolId, period) });
    const configurations = new Map(effective.map((row) => [row.kpiConfigurationExternalId.toString(), row]));
    const definitions = new Map(effective.map((row) => [row.kpiDefinitionExternalId.toString(), row]));
    const effectiveGoals = await effectiveGoalsForPeriod(poolId, period, effective);
    return { data: catalog.data.map((configuration) => {
      let availability = "AVAILABLE_TO_ADD"; let reasonCode: string | null = null; let conflict: string | null = null;
      if (configurations.has(configuration.id)) availability = "ALREADY_IN_POOL";
      else if (definitions.has(configuration.definitionId)) { availability = "NOT_AVAILABLE"; reasonCode = "KPI_DEFINITION_ALREADY_EFFECTIVE"; conflict = definitions.get(configuration.definitionId)!.configurationCodeSnapshot; }
      else { reasonCode = eligibilityReason(configuration, pool.inputFrequencyExternalId) ?? null; if (reasonCode) availability = "NOT_AVAILABLE"; }
      const membership = configurations.get(configuration.id);
      return { ...configuration, goal: membership ? effectiveGoals.get(membership.id.toString()) ?? configuration.goal : configuration.goal, availability, reasonCode, conflictingConfigurationCode: conflict };
    }), meta: { ...catalog.meta, targetPeriod: periodDto(period), configurationStatus: "EDITABLE", editabilitySource: "CONSERVATIVE_FUTURE_ONLY" } };
  },

  async finalizePeriod(poolId: bigint, periodStart: string, actor: bigint) {
    const initial = await requirePool(poolId);
    const periods = poolPeriods(initial.validFrom, initial.validTo, initial.frequency.monthsPerPeriod);
    const period = await targetPeriod(initial, periodStart);
    const periodIndex = periods.findIndex((candidate) => candidate.start.getTime() === period.start.getTime());
    const firstDraftComposition = initial.statusCode === "DRAFT" && periodIndex === 0;
    if (!lifecycleAllowsPeriodFinalization(initial.statusCode, periodIndex)) throw new AppError(409, "POOL_NOT_ACTIVE", "Only an ACTIVE Pool or its first DRAFT composition can be finalized");
    const dependency = await periodFinalizationGateway.evaluate(poolId, periods, periodIndex);
    if (!dependency.canFinalize) throw new AppError(409, "PREVIOUS_INPUT_PERIOD_NOT_CLOSED", "The previous Monitoring Input Period must be closed before this Pool composition can be finalized", dependency);
    return prisma.$transaction(async (tx) => {
      await lockPool(tx, poolId);
      await assertNotFinalized(poolId, period.start, tx);
      const memberships = await tx.kpiPoolKpi.findMany({ where: effectiveWhere(poolId, period), orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
      if (!memberships.length) throw new AppError(422, "POOL_PERIOD_COMPOSITION_EMPTY", "At least one KPI Configuration is required before finalization");
      const definitions = new Set(memberships.map((value) => value.kpiDefinitionExternalId.toString()));
      if (definitions.size !== memberships.length) throw new AppError(422, "KPI_DEFINITION_ALREADY_EFFECTIVE", "The period contains overlapping KPI Definitions");
      const lookup = await kpiManagementClient.batchLookup(memberships.map((value) => value.kpiConfigurationExternalId.toString()));
      const effective = await Promise.all(memberships.map(membership => kpiManagementClient.effectiveSnapshot(membership.kpiConfigurationExternalId.toString(), formatDateOnly(period.start), formatDateOnly(period.end))));
      const blocked = effective.filter(configuration => !configuration.executability.executable);
      if (blocked.length) throw new AppError(422, "POOL_PERIOD_COMPOSITION_INVALID", "Complete the effective KPI Configurations for this Input Period before finalizing", { configurations: blocked.map(configuration => ({ id: configuration.kpiConfigurationId, code: configuration.configCode, reasons: configuration.executability.reasons })) });
      const eligible = lookup.notFoundIds.length === 0 && lookup.data.length === memberships.length && lookup.data.every(configuration => configuration.isActive && configuration.definitionIsActive && configuration.inputFrequencyIsActive && configuration.inputFrequencyId === initial.inputFrequencyExternalId.toString());
      if (!eligible) throw new AppError(422, "POOL_PERIOD_COMPOSITION_INVALID", "One or more KPI Configurations are no longer eligible");
      const inputPeriod = await tx.kpiPoolInputPeriod.findUnique({ where: { kpiPoolId_periodStart: { kpiPoolId: poolId, periodStart: period.start } } });
      if (!inputPeriod) throw new AppError(409, "POOL_INPUT_PERIOD_NOT_FOUND", "The persisted Pool Input Period was not found");
      const composition = await tx.kpiPoolPeriodComposition.create({ data: { kpiPoolId: poolId, inputPeriodId: inputPeriod.id, periodStart: period.start, periodEnd: period.end, statusCode: "POOL_COMPOSITION_LOCKED", kpiCountSnapshot: memberships.length, finalizedByUserId: actor } });
      await tx.kpiPoolPeriodCompositionItem.createMany({ data: memberships.map((membership) => ({ compositionId: composition.id, poolMembershipId: membership.id, kpiConfigurationExternalId: membership.kpiConfigurationExternalId, configurationCodeSnapshot: membership.configurationCodeSnapshot, displayOrder: membership.displayOrder })) });
      await tx.kpiPool.update({ where: { id: poolId }, data: { statusCode: firstDraftComposition ? "ACTIVE" : initial.statusCode, aggregateVersion: { increment: firstDraftComposition ? 2 : 1 }, updatedAt: new Date(), updatedByUserId: actor } });
      if (firstDraftComposition) await writeOutbox(tx, initial, "kpi.pool.activated.v1", { poolCode: initial.poolCode, validFrom: formatDateOnly(initial.validFrom), validTo: formatDateOnly(initial.validTo), inputFrequencyId: initial.inputFrequencyExternalId.toString() });
      const finalizedConfigurations = new Map(lookup.data.map((configuration) => [configuration.id, configuration]));
      const finalizedMemberships = memberships.map((membership) => ({
        poolMembershipId: membership.id.toString(),
        kpiDefinitionId: membership.kpiDefinitionExternalId.toString(),
        kpiConfigurationId: membership.kpiConfigurationExternalId.toString(),
        definitionCode: membership.definitionCodeSnapshot,
        definitionName: membership.definitionNameSnapshot,
        configurationCode: membership.configurationCodeSnapshot,
        categoryName: finalizedConfigurations.get(membership.kpiConfigurationExternalId.toString())?.categoryName ?? null,
        goal: finalizedConfigurations.get(membership.kpiConfigurationExternalId.toString())?.goal ?? null,
        dataSource: finalizedConfigurations.get(membership.kpiConfigurationExternalId.toString())?.dataSource ?? null,
        measurementUnit: finalizedConfigurations.get(membership.kpiConfigurationExternalId.toString())?.measurementUnit ?? null,
        displayOrder: membership.displayOrder,
      }));
      await writeOutbox(tx, initial, "kpi.pool.period.composition.finalized.v1", {
        poolPeriodId: inputPeriod.id.toString(), poolCompositionId: composition.id.toString(), periodKey: inputPeriod.periodKey,
        periodStart: formatDateOnly(period.start), periodEnd: formatDateOnly(period.end), kpiCount: memberships.length,
        memberships: finalizedMemberships,
      }, firstDraftComposition ? 2 : 1);
      return { poolId: poolId.toString(), poolStatus: firstDraftComposition ? "ACTIVE" : initial.statusCode, poolPeriodId: inputPeriod.id.toString(), poolCompositionId: composition.id.toString(), periodKey: inputPeriod.periodKey, periodStart: formatDateOnly(period.start), periodEnd: formatDateOnly(period.end), status: "POOL_COMPOSITION_LOCKED", kpiCount: memberships.length, memberships: finalizedMemberships };
    });
  },
};
