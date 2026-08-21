import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { kpiPoolClient } from "../clients/kpi-pool.client.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const include = {
  kpis: { orderBy: { displayOrder: "asc" as const } },
  links: { include: { linkedScorecard: { include: { companies: { orderBy: { displayOrder: "asc" as const } }, departments: { orderBy: { displayOrder: "asc" as const } } } } }, orderBy: { displayOrder: "asc" as const } },
};
type FullComposition = Prisma.ScorecardPeriodCompositionGetPayload<{ include: typeof include }>;

async function scorecard(id: bigint) {
  const value = await prisma.scorecard.findFirst({ where: { id, deletedAt: null } });
  if (!value) throw new AppError(404, "SCORECARD_NOT_FOUND", "Scorecard was not found");
  return value;
}

async function finalizedPeriod(poolId: bigint, periodKey: string) {
  let value = await prisma.poolPeriodReference.findFirst({
    where: { kpiPoolExternalId: poolId, periodKey, compositionStatusCode: "FINALIZED" },
    include: { memberships: { orderBy: { displayOrder: "asc" } } },
  });
  const displayMetadataMissing = value?.memberships.length && value.memberships.every((row) => row.categoryName === null && row.goalSnapshot === null && row.dataSourceSnapshot === null && row.measurementUnitSnapshot === null);
  const measurementUnitMissing = value?.memberships.length && value.memberships.every((row) => row.measurementUnitSnapshot === null);
  if (!value?.poolPeriodExternalId || !value.poolCompositionExternalId || value.memberships.length === 0 || displayMetadataMissing || measurementUnitMissing) {
    const sourcePeriod = (await kpiPoolClient.periods(poolId.toString())).find((period) => period.periodKey === periodKey);
    if (sourcePeriod?.poolPeriodId && sourcePeriod.poolCompositionId) {
      const memberships = await kpiPoolClient.memberships(poolId.toString(), sourcePeriod.start);
      if (!memberships.length) throw new AppError(503, "POOL_COMPOSITION_PROJECTION_UNAVAILABLE", "The finalized KPI Pool Composition has no memberships available for projection recovery");
      await prisma.$transaction(async (tx) => {
        const period = await tx.poolPeriodReference.upsert({
          where: { kpiPoolExternalId_periodStart: { kpiPoolExternalId: poolId, periodStart: new Date(`${sourcePeriod.start}T00:00:00.000Z`) } },
          create: {
            kpiPoolExternalId: poolId,
            poolPeriodExternalId: BigInt(sourcePeriod.poolPeriodId!),
            poolCompositionExternalId: BigInt(sourcePeriod.poolCompositionId!),
            periodKey: sourcePeriod.periodKey,
            periodStart: new Date(`${sourcePeriod.start}T00:00:00.000Z`),
            periodEnd: new Date(`${sourcePeriod.end}T00:00:00.000Z`),
            compositionStatusCode: "FINALIZED",
            kpiCountSnapshot: memberships.length,
          },
          update: {
            poolPeriodExternalId: BigInt(sourcePeriod.poolPeriodId!),
            poolCompositionExternalId: BigInt(sourcePeriod.poolCompositionId!),
            periodKey: sourcePeriod.periodKey,
            periodEnd: new Date(`${sourcePeriod.end}T00:00:00.000Z`),
            compositionStatusCode: "FINALIZED",
            kpiCountSnapshot: memberships.length,
            syncedAt: new Date(),
          },
        });
        await tx.poolPeriodMembershipReference.deleteMany({ where: { poolPeriodReferenceId: period.id } });
        await tx.poolPeriodMembershipReference.createMany({
          data: memberships.map((membership) => ({
            poolPeriodReferenceId: period.id,
            poolMembershipExternalId: BigInt(membership.membershipId),
            kpiDefinitionExternalId: BigInt(membership.definitionId),
            kpiConfigurationExternalId: BigInt(membership.configurationId),
            definitionCode: membership.definitionCode,
            definitionName: membership.definitionName,
            configurationCode: membership.configCode,
            categoryName: membership.categoryName,
            goalSnapshot: membership.goal,
            dataSourceSnapshot: membership.dataSource,
            measurementUnitSnapshot: membership.measurementUnit,
            displayOrder: membership.displayOrder,
          })),
        });
        for (const membership of memberships) {
          await tx.scorecardPeriodKpi.updateMany({
            where: { kpiPoolMembershipExternalId: BigInt(membership.membershipId) },
            data: { categoryNameSnapshot: membership.categoryName, goalSnapshot: membership.goal, dataSourceSnapshot: membership.dataSource, measurementUnitSnapshot: membership.measurementUnit },
          });
        }
      });
      value = await prisma.poolPeriodReference.findFirst({
        where: { kpiPoolExternalId: poolId, periodKey, compositionStatusCode: "FINALIZED" },
        include: { memberships: { orderBy: { displayOrder: "asc" } } },
      });
    }
    if (!sourcePeriod?.poolPeriodId || !sourcePeriod.poolCompositionId) {
      throw new AppError(409, "POOL_COMPOSITION_NOT_FINALIZED", "The KPI Pool Composition is not finalized or its stable contract is unavailable");
    }
  }
  if (!value?.poolPeriodExternalId || !value.poolCompositionExternalId) throw new AppError(503, "POOL_COMPOSITION_PROJECTION_UNAVAILABLE", "The finalized KPI Pool Composition could not be recovered into the local Scorecards projection");
  return value;
}

async function findComposition(scorecardId: bigint, periodKey: string) {
  return prisma.scorecardPeriodComposition.findFirst({ where: { scorecardId, periodKey }, include });
}

async function getOrCreate(owner: Awaited<ReturnType<typeof scorecard>>, period: Awaited<ReturnType<typeof finalizedPeriod>>, actor: bigint) {
  return prisma.scorecardPeriodComposition.upsert({
    where: { scorecardId_periodStart: { scorecardId: owner.id, periodStart: period.periodStart } },
    update: {},
    create: {
      scorecardId: owner.id, kpiPoolExternalId: owner.kpiPoolExternalId,
      poolPeriodExternalId: period.poolPeriodExternalId, poolCompositionExternalId: period.poolCompositionExternalId,
      periodKey: period.periodKey, periodStart: period.periodStart, periodEnd: period.periodEnd,
      createdByUserId: actor,
    },
    include,
  });
}

function editable(owner: { statusCode: string }, composition: { statusCode: string }) {
  if (owner.statusCode === "INACTIVE") throw new AppError(409, "SCORECARD_INACTIVE", "An inactive Scorecard cannot be changed");
  if (composition.statusCode !== "PREPARING") throw new AppError(409, "SCORECARD_COMPOSITION_ALREADY_FINALIZED", "The Scorecard Composition is read-only");
}
function canPrepare(owner: { statusCode: string }) { if (owner.statusCode === "INACTIVE") throw new AppError(409, "SCORECARD_INACTIVE", "An inactive Scorecard cannot create or change compositions"); }

function dto(value: FullComposition) {
  const kpiWeight = value.kpis.reduce((sum, row) => sum.plus(row.weightPercent), new Prisma.Decimal(0));
  const linkWeight = value.links.reduce((sum, row) => sum.plus(row.weightPercent), new Prisma.Decimal(0));
  return {
    id: value.id.toString(), periodKey: value.periodKey, status: value.statusCode,
    periodStart: value.periodStart.toISOString().slice(0, 10), periodEnd: value.periodEnd.toISOString().slice(0, 10),
    poolPeriodExternalId: value.poolPeriodExternalId?.toString() ?? null,
    poolCompositionExternalId: value.poolCompositionExternalId?.toString() ?? null,
    kpis: value.kpis.map((row) => ({
      id: row.id.toString(), poolMembershipExternalId: row.kpiPoolMembershipExternalId.toString(),
      kpiDefinitionExternalId: row.kpiDefinitionExternalId.toString(), kpiConfigurationExternalId: row.kpiConfigurationExternalId.toString(),
      definitionCode: row.definitionCodeSnapshot, definitionName: row.definitionNameSnapshot,
      configurationCode: row.configurationCodeSnapshot, categoryName: row.categoryNameSnapshot, goal: row.goalSnapshot,
      dataSource: row.dataSourceSnapshot, measurementUnit: row.measurementUnitSnapshot, weight: row.weightPercent.toFixed(4), displayOrder: row.displayOrder,
    })),
    linkedScorecards: value.links.map((row) => ({
      id: row.id.toString(), linkedScorecardId: row.linkedScorecardId.toString(), code: row.linkedScorecard.code,
      name: row.linkedScorecard.name, status: row.linkedScorecard.statusCode,
      companies: row.linkedScorecard.companies.map((company) => company.companyNameSnapshot),
      departments: row.linkedScorecard.departments.map((department) => department.departmentNameSnapshot),
      weight: row.weightPercent.toFixed(4), displayOrder: row.displayOrder,
    })),
    weights: { kpis: kpiWeight.toFixed(4), linkedScorecards: linkWeight.toFixed(4), total: kpiWeight.plus(linkWeight).toFixed(4) },
    finalizedAt: value.finalizedAt?.toISOString() ?? null,
  };
}

export function hasCircularLink(graph: Map<string, string[]>, root: string) {
  const visit = (node: string, path: Set<string>): boolean => {
    if (path.has(node)) return true;
    const nextPath = new Set(path); nextPath.add(node);
    return (graph.get(node) ?? []).some((next) => visit(next, nextPath));
  };
  return visit(root, new Set());
}

async function assertNoCycle(ownerId: bigint, periodKey: string, links: bigint[]) {
  if (links.includes(ownerId)) throw new AppError(422, "SCORECARD_SELF_LINK_NOT_ALLOWED", "A Scorecard cannot link to itself");
  const values = await prisma.scorecardPeriodComposition.findMany({ where: { periodKey }, select: { scorecardId: true, links: { select: { linkedScorecardId: true } } } });
  const graph = new Map(values.map((row) => [row.scorecardId.toString(), row.links.map((link) => link.linkedScorecardId.toString())]));
  graph.set(ownerId.toString(), links.map(String));
  if (hasCircularLink(graph, ownerId.toString())) throw new AppError(422, "SCORECARD_LINK_CYCLE", "Linked Scorecards would create a circular dependency");
}

async function outbox(tx: Prisma.TransactionClient, type: string, owner: { id: bigint; code: string; aggregateVersion: number }, data: Prisma.InputJsonObject) {
  const eventId = randomUUID(); const occurredAt = new Date();
  await tx.outboxEvent.create({ data: {
    eventId, eventType: type, aggregateType: "scorecard", aggregateId: owner.id.toString(), aggregateVersion: owner.aggregateVersion,
    subject: type, occurredAt, payload: { eventId, eventType: type, producer: "exa-scorecards-service", occurredAt: occurredAt.toISOString(), aggregateId: owner.id.toString(), version: owner.aggregateVersion, data },
  } });
}

export const scorecardCompositionService = {
  async periods(scorecardId: bigint) {
    const owner = await scorecard(scorecardId);
    const [poolPeriods, compositions] = await Promise.all([
      kpiPoolClient.periods(owner.kpiPoolExternalId.toString()),
      prisma.scorecardPeriodComposition.findMany({ where: { scorecardId }, select: { id: true, periodKey: true, statusCode: true } }),
    ]);
    const byPeriod = new Map(compositions.map((row) => [row.periodKey, row]));
    return { data: poolPeriods.map((period) => ({ ...period, poolCompositionStatus: period.poolCompositionId ? "FINALIZED" : period.workflowStatus, scorecardCompositionId: byPeriod.get(period.periodKey)?.id.toString() ?? null, scorecardCompositionStatus: byPeriod.get(period.periodKey)?.statusCode ?? (period.poolCompositionId ? "AVAILABLE" : "UNAVAILABLE") })) };
  },

  async get(scorecardId: bigint, periodKey: string, actor: bigint) {
    const owner = await scorecard(scorecardId); const period = await finalizedPeriod(owner.kpiPoolExternalId, periodKey);
    const existing = await findComposition(scorecardId, periodKey); if (existing) return dto(existing); canPrepare(owner);
    return dto(await getOrCreate(owner, period, actor));
  },

  async availableKpis(scorecardId: bigint, periodKey: string) {
    const owner = await scorecard(scorecardId); const period = await finalizedPeriod(owner.kpiPoolExternalId, periodKey); const current = await findComposition(scorecardId, periodKey);
    const selected = new Set(current?.kpis.map((row) => row.kpiPoolMembershipExternalId.toString()) ?? []);
    return { data: period.memberships.map((row) => ({ poolMembershipExternalId: row.poolMembershipExternalId.toString(), kpiDefinitionExternalId: row.kpiDefinitionExternalId.toString(), kpiConfigurationExternalId: row.kpiConfigurationExternalId.toString(), definitionCode: row.definitionCode, definitionName: row.definitionName, configurationCode: row.configurationCode, categoryName: row.categoryName, goal: row.goalSnapshot, dataSource: row.dataSourceSnapshot, measurementUnit: row.measurementUnitSnapshot, displayOrder: row.displayOrder, selectionStatus: selected.has(row.poolMembershipExternalId.toString()) ? "SELECTED_IN_SCORECARD" : "AVAILABLE_TO_SELECT" })) };
  },

  async addKpis(scorecardId: bigint, periodKey: string, items: Array<{ poolMembershipExternalId: string; weight: number }>, actor: bigint) {
    const owner = await scorecard(scorecardId); canPrepare(owner); const period = await finalizedPeriod(owner.kpiPoolExternalId, periodKey); const current = await getOrCreate(owner, period, actor); editable(owner, current);
    const allowed = new Map(period.memberships.map((row) => [row.poolMembershipExternalId.toString(), row]));
    if (items.some((item) => !allowed.has(item.poolMembershipExternalId))) throw new AppError(422, "KPI_NOT_IN_FINALIZED_POOL_COMPOSITION", "A KPI does not belong to this finalized Pool Composition");
    const offset = current.kpis.length;
    await prisma.scorecardPeriodKpi.createMany({ data: items.map((item, index) => { const row = allowed.get(item.poolMembershipExternalId)!; return { scorecardPeriodCompositionId: current.id, kpiPoolMembershipExternalId: row.poolMembershipExternalId, kpiDefinitionExternalId: row.kpiDefinitionExternalId, kpiConfigurationExternalId: row.kpiConfigurationExternalId, definitionCodeSnapshot: row.definitionCode, definitionNameSnapshot: row.definitionName, configurationCodeSnapshot: row.configurationCode, categoryNameSnapshot: row.categoryName, goalSnapshot: row.goalSnapshot, dataSourceSnapshot: row.dataSourceSnapshot, measurementUnitSnapshot: row.measurementUnitSnapshot, weightPercent: new Prisma.Decimal(item.weight), displayOrder: offset + index + 1, createdByUserId: actor }; }), skipDuplicates: true });
    return dto((await findComposition(scorecardId, periodKey))!);
  },

  async removeKpi(scorecardId: bigint, periodKey: string, configurationId: bigint) {
    const owner = await scorecard(scorecardId); const current = await findComposition(scorecardId, periodKey); if (!current) throw new AppError(404, "SCORECARD_COMPOSITION_NOT_FOUND", "Scorecard Composition was not found"); editable(owner, current);
    const result = await prisma.scorecardPeriodKpi.deleteMany({ where: { scorecardPeriodCompositionId: current.id, kpiConfigurationExternalId: configurationId } });
    if (!result.count) throw new AppError(404, "SCORECARD_KPI_NOT_FOUND", "KPI Configuration is not selected");
  },

  async availableLinks(scorecardId: bigint, periodKey: string) {
    const owner = await scorecard(scorecardId); await finalizedPeriod(owner.kpiPoolExternalId, periodKey); const current = await findComposition(scorecardId, periodKey);
    const selected = new Set(current?.links.map((row) => row.linkedScorecardId.toString()) ?? []);
    const rows = await prisma.scorecard.findMany({ where: { id: { not: scorecardId }, kpiPoolExternalId: owner.kpiPoolExternalId, statusCode: { not: "INACTIVE" }, deletedAt: null }, orderBy: { code: "asc" } });
    return { data: rows.map((row) => ({ id: row.id.toString(), code: row.code, name: row.name, status: row.statusCode, selectionStatus: selected.has(row.id.toString()) ? "SELECTED_IN_SCORECARD" : "AVAILABLE_TO_LINK" })) };
  },

  async addLink(scorecardId: bigint, periodKey: string, linkedId: bigint, weight: number, actor: bigint) {
    const owner = await scorecard(scorecardId); canPrepare(owner); const period = await finalizedPeriod(owner.kpiPoolExternalId, periodKey); const current = await getOrCreate(owner, period, actor); editable(owner, current);
    if (linkedId === scorecardId) throw new AppError(422, "SCORECARD_SELF_LINK_NOT_ALLOWED", "A Scorecard cannot link to itself");
    const linked = await prisma.scorecard.findFirst({ where: { id: linkedId, kpiPoolExternalId: owner.kpiPoolExternalId, statusCode: { not: "INACTIVE" }, deletedAt: null } });
    if (!linked) throw new AppError(422, linkedId === scorecardId ? "SCORECARD_SELF_LINK_NOT_ALLOWED" : "LINKED_SCORECARD_NOT_ELIGIBLE", "Linked Scorecard is not eligible");
    await assertNoCycle(scorecardId, periodKey, [...current.links.map((row) => row.linkedScorecardId), linkedId]);
    await prisma.scorecardPeriodLink.upsert({ where: { scorecardPeriodCompositionId_linkedScorecardId: { scorecardPeriodCompositionId: current.id, linkedScorecardId: linkedId } }, update: { weightPercent: new Prisma.Decimal(weight) }, create: { scorecardPeriodCompositionId: current.id, linkedScorecardId: linkedId, weightPercent: new Prisma.Decimal(weight), displayOrder: current.links.length + 1, createdByUserId: actor } });
    return dto((await findComposition(scorecardId, periodKey))!);
  },

  async removeLink(scorecardId: bigint, periodKey: string, linkedId: bigint) {
    const owner = await scorecard(scorecardId); const current = await findComposition(scorecardId, periodKey); if (!current) throw new AppError(404, "SCORECARD_COMPOSITION_NOT_FOUND", "Scorecard Composition was not found"); editable(owner, current);
    const result = await prisma.scorecardPeriodLink.deleteMany({ where: { scorecardPeriodCompositionId: current.id, linkedScorecardId: linkedId } }); if (!result.count) throw new AppError(404, "LINKED_SCORECARD_NOT_FOUND", "Linked Scorecard is not selected");
  },

  async updateWeights(scorecardId: bigint, periodKey: string, input: { kpis: Array<{ kpiConfigurationExternalId: string; weight: number }>; linkedScorecards: Array<{ linkedScorecardId: string; weight: number }> }) {
    const owner = await scorecard(scorecardId); const current = await findComposition(scorecardId, periodKey); if (!current) throw new AppError(404, "SCORECARD_COMPOSITION_NOT_FOUND", "Scorecard Composition was not found"); editable(owner, current);
    await prisma.$transaction(async (tx) => {
      for (const item of input.kpis) if (!(await tx.scorecardPeriodKpi.updateMany({ where: { scorecardPeriodCompositionId: current.id, kpiConfigurationExternalId: BigInt(item.kpiConfigurationExternalId) }, data: { weightPercent: new Prisma.Decimal(item.weight) } })).count) throw new AppError(422, "SCORECARD_KPI_NOT_FOUND", "A KPI weight targets an item outside this composition");
      for (const item of input.linkedScorecards) if (!(await tx.scorecardPeriodLink.updateMany({ where: { scorecardPeriodCompositionId: current.id, linkedScorecardId: BigInt(item.linkedScorecardId) }, data: { weightPercent: new Prisma.Decimal(item.weight) } })).count) throw new AppError(422, "LINKED_SCORECARD_NOT_FOUND", "A linked weight targets an item outside this composition");
    });
    return dto((await findComposition(scorecardId, periodKey))!);
  },

  async finalize(scorecardId: bigint, periodKey: string, actor: bigint) {
    const owner = await scorecard(scorecardId); const period = await finalizedPeriod(owner.kpiPoolExternalId, periodKey); const current = await findComposition(scorecardId, periodKey);
    if (!current || (!current.kpis.length && !current.links.length)) throw new AppError(422, "SCORECARD_COMPOSITION_EMPTY", "Select at least one KPI or linked Scorecard before finalization"); editable(owner, current);
    const allowed = new Set(period.memberships.map((row) => row.poolMembershipExternalId.toString()));
    if (current.kpis.some((row) => !allowed.has(row.kpiPoolMembershipExternalId.toString()))) throw new AppError(422, "KPI_NOT_IN_FINALIZED_POOL_COMPOSITION", "A KPI no longer belongs to this Pool Composition");
    await assertNoCycle(scorecardId, periodKey, current.links.map((row) => row.linkedScorecardId));
    for (const link of current.links) if (!await prisma.scorecardPeriodComposition.findFirst({ where: { scorecardId: link.linkedScorecardId, periodKey, statusCode: "FINALIZED" } })) throw new AppError(422, "LINKED_SCORECARD_COMPOSITION_NOT_FINALIZED", `${link.linkedScorecard.code} is not finalized for ${periodKey}`);
    const total = [...current.kpis, ...current.links].reduce((sum, row) => sum.plus(row.weightPercent), new Prisma.Decimal(0));
    if (!total.equals(new Prisma.Decimal("100.0000"))) throw new AppError(422, "SCORECARD_WEIGHT_TOTAL_INVALID", "KPI and Linked Scorecard weights must total exactly 100.0000", { total: total.toFixed(4) });
    return prisma.$transaction(async (tx) => {
      const changed = await tx.scorecardPeriodComposition.updateMany({ where: { id: current.id, statusCode: "PREPARING" }, data: { statusCode: "FINALIZED", finalizedAt: new Date(), finalizedByUserId: actor, updatedByUserId: actor } });
      if (!changed.count) throw new AppError(409, "SCORECARD_COMPOSITION_ALREADY_FINALIZED", "The composition is no longer editable");
      const first = owner.statusCode === "DRAFT"; const aggregate = await tx.scorecard.update({ where: { id: owner.id }, data: { statusCode: first ? "ACTIVE" : owner.statusCode, aggregateVersion: { increment: first ? 2 : 1 }, updatedByUserId: actor } });
      if (first) await outbox(tx, "scorecard.activated.v1", { ...aggregate, aggregateVersion: aggregate.aggregateVersion - 1 }, { scorecardCode: aggregate.code });
      await outbox(tx, "scorecard.composition.finalized.v1", aggregate, { scorecardCode: aggregate.code, periodKey, poolPeriodExternalId: period.poolPeriodExternalId!.toString(), poolCompositionExternalId: period.poolCompositionExternalId!.toString(), kpis: current.kpis.map((row) => ({ kpiConfigurationExternalId: row.kpiConfigurationExternalId.toString(), weight: row.weightPercent.toFixed(4) })), linkedScorecards: current.links.map((row) => ({ linkedScorecardId: row.linkedScorecardId.toString(), weight: row.weightPercent.toFixed(4) })), totalWeight: total.toFixed(4) });
      return dto(await tx.scorecardPeriodComposition.findUniqueOrThrow({ where: { id: current.id }, include }));
    });
  },

  async poolWorkflow(poolId: bigint, periodKey: string) {
    const rows = await prisma.scorecard.findMany({ where: { kpiPoolExternalId: poolId, statusCode: { not: "INACTIVE" }, deletedAt: null }, select: { periodCompositions: { where: { periodKey }, select: { statusCode: true } } } });
    const preparing = rows.filter((row) => row.periodCompositions[0]?.statusCode === "PREPARING").length; const finalized = rows.filter((row) => row.periodCompositions[0]?.statusCode === "FINALIZED").length;
    return { data: { poolId: poolId.toString(), periodKey, totalScorecards: rows.length, preparing, finalized, pending: rows.length - preparing - finalized, status: rows.length === 0 ? "NOT_STARTED" : finalized === rows.length ? "FINALIZED" : preparing || finalized ? "IN_PROGRESS" : "NOT_STARTED" } };
  },

  async poolUsageBatch(targets: Array<{ poolId: string; periodKey: string }>) {
    const unique = [...new Map(targets.map((target) => [`${target.poolId}:${target.periodKey}`, target])).values()];
    const rows = await prisma.scorecardPeriodComposition.findMany({
      where: { OR: unique.map((target) => ({ kpiPoolExternalId: BigInt(target.poolId), periodKey: target.periodKey })), kpis: { some: {} }, scorecard: { statusCode: { not: "INACTIVE" }, deletedAt: null } },
      select: { kpiPoolExternalId: true, periodKey: true, scorecardId: true },
    });
    return { data: unique.map((target) => ({ poolId: target.poolId, periodKey: target.periodKey, scorecardsUsing: new Set(rows.filter((row) => row.kpiPoolExternalId === BigInt(target.poolId) && row.periodKey === target.periodKey).map((row) => row.scorecardId.toString())).size })) };
  },
};
