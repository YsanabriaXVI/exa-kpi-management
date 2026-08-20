import { randomUUID } from "node:crypto";
import { kpiManagementClient } from "../clients/kpi-management.client.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

type Check = { code: string; passed: boolean; message: string };

async function evaluate(poolId: bigint) {
  const pool = await prisma.kpiPool.findFirst({
    where: { id: poolId, deletedAt: null }, include: { areas: true, companies: true, kpis: { orderBy: { displayOrder: "asc" } } },
  });
  if (!pool) throw new AppError(404, "KPI_POOL_NOT_FOUND", "KPI Pool was not found");
  const initialKpis = pool.kpis.filter((value) => value.effectiveFrom <= pool.validFrom && (value.effectiveTo === null || value.effectiveTo >= pool.validFrom));
  const checks: Check[] = [
    { code: "POOL_IS_DRAFT", passed: pool.statusCode === "DRAFT", message: "Pool must be DRAFT" },
    { code: "POOL_AREAS_PRESENT", passed: pool.areas.length >= 1, message: "At least one Pool Area is required" },
    { code: "POOL_COMPANIES_PRESENT", passed: pool.companies.length >= 1, message: "At least one Company is required" },
    { code: "POOL_VALIDITY_VALID", passed: pool.validTo >= pool.validFrom, message: "Validity must be valid" },
    { code: "POOL_FREQUENCY_ACTIVE", passed: false, message: "Pool input frequency must be active" },
    { code: "POOL_KPIS_PRESENT", passed: initialKpis.length >= 1, message: "At least one KPI Configuration must be effective in the initial period" },
    { code: "KPI_CONFIGURATIONS_ELIGIBLE", passed: false, message: "All KPI Configurations and Definitions must remain active and frequency-compatible" },
    { code: "KPI_DEFINITIONS_UNIQUE", passed: new Set(initialKpis.map((value) => value.kpiDefinitionExternalId.toString())).size === initialKpis.length, message: "KPI Definitions must be unique in the initial period" },
  ];
  const frequency = await prisma.inputFrequencyReference.findFirst({ where: { externalInputFrequencyId: pool.inputFrequencyExternalId, isActive: true } });
  checks.find((check) => check.code === "POOL_FREQUENCY_ACTIVE")!.passed = Boolean(frequency);
  let configurations: Awaited<ReturnType<typeof kpiManagementClient.batchLookup>> = { data: [], notFoundIds: [] };
  if (initialKpis.length) configurations = await kpiManagementClient.batchLookup(initialKpis.map((value) => value.kpiConfigurationExternalId.toString()));
  const eligible = configurations.notFoundIds.length === 0 && configurations.data.length === initialKpis.length && configurations.data.every((value) =>
    value.isActive && value.definitionIsActive && value.inputFrequencyIsActive && value.inputFrequencyId === pool.inputFrequencyExternalId.toString(),
  );
  checks.find((check) => check.code === "KPI_CONFIGURATIONS_ELIGIBLE")!.passed = eligible;
  return { pool, checks, ready: checks.every((check) => check.passed) };
}

function envelope(eventId: string, eventType: string, pool: { id: bigint; poolCode: string; validFrom: Date; validTo: Date; inputFrequencyExternalId: bigint; aggregateVersion: number }) {
  return {
    eventId, eventType, occurredAt: new Date().toISOString(), producer: "exa-kpi-pool-service",
    aggregateType: "kpi_pool", aggregateId: pool.id.toString(), version: pool.aggregateVersion + 1,
    data: { poolId: pool.id.toString(), poolCode: pool.poolCode, validFrom: pool.validFrom.toISOString().slice(0, 10), validTo: pool.validTo.toISOString().slice(0, 10), inputFrequencyId: pool.inputFrequencyExternalId.toString() },
  };
}

export const kpiPoolLifecycleService = {
  async readiness(poolId: bigint) {
    const result = await evaluate(poolId);
    return { poolId: result.pool.id.toString(), status: result.pool.statusCode, ready: result.ready, checks: result.checks };
  },
  async activate(poolId: bigint, actor: bigint) {
    const validation = await evaluate(poolId);
    if (!validation.ready) throw new AppError(422, "KPI_POOL_NOT_READY", "KPI Pool failed pre-activation validation", { checks: validation.checks });
    return prisma.$transaction(async (tx) => {
      const updated = await tx.kpiPool.updateMany({ where: { id: poolId, statusCode: "DRAFT", deletedAt: null }, data: { statusCode: "ACTIVE", aggregateVersion: { increment: 1 }, updatedAt: new Date(), updatedByUserId: actor } });
      if (!updated.count) throw new AppError(409, "KPI_POOL_STATUS_CONFLICT", "KPI Pool is no longer DRAFT");
      const eventId = randomUUID();
      const payload = envelope(eventId, "kpi.pool.activated.v1", validation.pool);
      await tx.outboxEvent.create({ data: { eventId, eventType: payload.eventType, aggregateType: "kpi_pool", aggregateId: poolId.toString(), aggregateVersion: payload.version, subject: payload.eventType, payload, occurredAt: new Date(payload.occurredAt) } });
      return { id: poolId.toString(), status: "ACTIVE", eventId };
    });
  },
  async deactivate(poolId: bigint, actor: bigint) {
    const pool = await prisma.kpiPool.findFirst({ where: { id: poolId, deletedAt: null } });
    if (!pool) throw new AppError(404, "KPI_POOL_NOT_FOUND", "KPI Pool was not found");
    if (pool.statusCode !== "ACTIVE") throw new AppError(409, "INVALID_POOL_STATUS_TRANSITION", "Only an ACTIVE Pool can be deactivated");
    return prisma.$transaction(async (tx) => {
      const updated = await tx.kpiPool.updateMany({ where: { id: poolId, statusCode: "ACTIVE", deletedAt: null }, data: { statusCode: "INACTIVE", aggregateVersion: { increment: 1 }, updatedAt: new Date(), updatedByUserId: actor } });
      if (!updated.count) throw new AppError(409, "KPI_POOL_STATUS_CONFLICT", "KPI Pool is no longer ACTIVE");
      const eventId = randomUUID();
      const payload = envelope(eventId, "kpi.pool.deactivated.v1", pool);
      await tx.outboxEvent.create({ data: { eventId, eventType: payload.eventType, aggregateType: "kpi_pool", aggregateId: poolId.toString(), aggregateVersion: payload.version, subject: payload.eventType, payload, occurredAt: new Date(payload.occurredAt) } });
      return { id: poolId.toString(), status: "INACTIVE", eventId };
    });
  },
};
