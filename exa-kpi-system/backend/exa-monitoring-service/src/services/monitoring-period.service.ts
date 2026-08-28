import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { kpiManagementClient } from "../clients/kpi-management.client.js";
import { kpiPoolClient } from "../clients/kpi-pool.client.js";
import { scorecardsClient } from "../clients/scorecards.client.js";
import type { MaterializeMonitoringPeriodBody } from "../schemas/monitoring-period.schema.js";
import { AppError } from "../utils/app-error.js";
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const label = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date(value));
const frequencyName = (code: string) =>
  code
    .toLowerCase()
    .replace(
      /(^|_)([a-z])/g,
      (_m, p: string, l: string) => `${p ? " " : ""}${l.toUpperCase()}`,
    );
const include = {
  status: true,
  scorecards: { orderBy: { scorecardCodeSnapshot: "asc" as const } },
  inputs: {
    orderBy: { displayOrder: "asc" as const },
    include: { thresholds: { orderBy: { displayOrder: "asc" as const } } },
  },
};
function dto(row: any, created: boolean) {
  return {
    created,
    data: {
      id: row.id.toString(),
      poolId: row.kpiPoolExternalId.toString(),
      poolInputPeriodId: row.poolInputPeriodExternalId.toString(),
      poolCompositionId: row.poolPeriodCompositionExternalId.toString(),
      periodKey: row.periodKey,
      periodStart: row.periodStart.toISOString().slice(0, 10),
      periodEnd: row.periodEnd.toISOString().slice(0, 10),
      periodLabel: row.periodLabel,
      status: row.status.code,
      scorecards: row.scorecards.map((item: any) => ({
        id: item.id.toString(),
        scorecardId: item.scorecardExternalId.toString(),
        code: item.scorecardCodeSnapshot,
        name: item.scorecardNameSnapshot,
      })),
      expectedResults: row.inputs.map((item: any) => ({
        id: item.id.toString(),
        scorecardSnapshotId: item.monitoringPeriodScorecardId.toString(),
        kpiConfigurationId: item.kpiConfigurationExternalId.toString(),
        kpiConfigurationRevisionId:
          item.kpiConfigurationRevisionExternalId.toString(),
        configCode: item.configCodeSnapshot,
        kpiCode: item.kpiCodeSnapshot,
        kpiName: item.kpiNameSnapshot,
        goal: item.goalValueSnapshot?.toString() ?? null,
        weight: item.weightPercentSnapshot.toString(),
      })),
      summary: {
        expected: row.inputs.length,
        entered: 0,
        pending: row.inputs.length,
      },
    },
  };
}
async function existing(poolId: bigint, inputPeriodId: bigint) {
  return prisma.monitoringPeriod.findUnique({
    where: {
      kpiPoolExternalId_poolInputPeriodExternalId: {
        kpiPoolExternalId: poolId,
        poolInputPeriodExternalId: inputPeriodId,
      },
    },
    include,
  });
}
export const monitoringPeriodService = {
  async materialize(input: MaterializeMonitoringPeriodBody, actor: bigint) {
    const poolId = BigInt(input.poolId),
      inputPeriodId = BigInt(input.poolInputPeriodId);
    const found = await existing(poolId, inputPeriodId);
    if (found) return dto(found, false);
    const [{ pool, period }, projection] = await Promise.all([
      kpiPoolClient.context(input.poolId, input.poolInputPeriodId),
      scorecardsClient.materialization(input.poolId, input.poolInputPeriodId),
    ]);
    if (!period.poolCompositionId || period.workflowStatus !== "FINALIZED")
      throw new AppError(
        409,
        "POOL_COMPOSITION_NOT_FINALIZED",
        "The Pool Composition must be FINALIZED before Monitoring materialization",
      );
    if (projection.readiness !== "READY")
      throw new AppError(
        409,
        "SCORECARDS_NOT_READY",
        "All operational Scorecard compositions must be FINALIZED",
        {
          reason: projection.reason,
          applicableScorecardCount: projection.applicableScorecardCount,
          finalizedScorecardCount: projection.finalizedScorecardCount,
        },
      );
    if (
      projection.poolCompositionId !== period.poolCompositionId ||
      projection.periodKey !== period.periodKey
    )
      throw new AppError(
        409,
        "MATERIALIZATION_CONTEXT_MISMATCH",
        "Pool and Scorecards returned different Input Period context",
      );
    const assignments = projection.scorecards.flatMap((scorecard) =>
      scorecard.directKpiAssignments.map((assignment) => ({
        scorecard,
        assignment,
      })),
    );
    const ids = assignments.map(
      ({ assignment }) => assignment.kpiConfigurationId,
    );
    if (new Set(ids).size !== ids.length)
      throw new AppError(
        409,
        "DIRECT_KPI_ASSIGNMENT_CONFLICT",
        "A KPI Configuration is assigned directly to more than one Scorecard",
      );
    if (!ids.length)
      throw new AppError(
        409,
        "NO_EXPECTED_RESULTS",
        "Finalized Scorecards do not contain direct KPI assignments",
      );
    const snapshots = await kpiManagementClient.effectiveSnapshots(
      ids,
      period.start,
      period.end,
    );
    const byConfiguration = new Map(
      snapshots.map((snapshot) => [snapshot.kpiConfigurationId, snapshot]),
    );
    if (byConfiguration.size !== ids.length)
      throw new AppError(
        502,
        "KPI_SNAPSHOT_CONTRACT_INCOMPLETE",
        "KPI Management did not return every requested Configuration snapshot",
      );
    try {
      const created = await prisma.$transaction(
        async (tx) => {
          const duplicate = await tx.monitoringPeriod.findUnique({
            where: {
              kpiPoolExternalId_poolInputPeriodExternalId: {
                kpiPoolExternalId: poolId,
                poolInputPeriodExternalId: inputPeriodId,
              },
            },
            include,
          });
          if (duplicate) return duplicate;
          const draft = await tx.monitoringPeriodStatus.findUnique({
            where: { code: "DRAFT" },
          });
          if (!draft)
            throw new AppError(
              500,
              "MONITORING_DRAFT_STATUS_MISSING",
              "Monitoring DRAFT status is not seeded",
            );
          const aggregate = await tx.monitoringPeriod.aggregate({
            where: { kpiPoolExternalId: poolId },
            _max: { sequenceNo: true },
          });
          const periodRow = await tx.monitoringPeriod.create({
            data: {
              kpiPoolExternalId: poolId,
              poolInputPeriodExternalId: inputPeriodId,
              poolPeriodCompositionExternalId: BigInt(
                period.poolCompositionId!,
              ),
              inputFrequencyExternalId: BigInt(pool.inputFrequency.id),
              poolCodeSnapshot: pool.poolCode,
              poolNameSnapshot: pool.poolName,
              inputFrequencyCodeSnapshot: pool.inputFrequency.code,
              inputFrequencyNameSnapshot: frequencyName(
                pool.inputFrequency.code,
              ),
              companiesSnapshot: pool.companies,
              sequenceNo: (aggregate._max.sequenceNo ?? 0) + 1,
              periodKey: period.periodKey,
              periodStart: date(period.start),
              periodEnd: date(period.end),
              periodLabel: label(period.start),
              statusId: draft.id,
              generatedByUserId: actor,
              createdByUserId: actor,
            },
          });
          const localScorecards = new Map<string, bigint>();
          for (const scorecard of projection.scorecards) {
            if (!scorecard.scorecardPeriodCompositionId)
              throw new AppError(
                409,
                "SCORECARD_COMPOSITION_ID_MISSING",
                "A READY Scorecard is missing its finalized Composition ID",
                { scorecardId: scorecard.scorecardId },
              );
            const own = scorecard.directKpiAssignments.reduce(
                (sum, item) => sum + Number(item.weightPercent),
                0,
              ),
              linked = scorecard.linkedScorecards.reduce(
                (sum, item) => sum + Number(item.weightPercent),
                0,
              );
            const row = await tx.monitoringPeriodScorecard.create({
              data: {
                monitoringPeriodId: periodRow.id,
                scorecardExternalId: BigInt(scorecard.scorecardId),
                scorecardPeriodCompositionExternalId: BigInt(
                  scorecard.scorecardPeriodCompositionId,
                ),
                scorecardCodeSnapshot: scorecard.scorecardCode,
                scorecardNameSnapshot: scorecard.scorecardName,
                departmentsSnapshot: scorecard.departments,
                ownKpiWeightPercentSnapshot: new Prisma.Decimal(own),
                linkedScorecardWeightPercentSnapshot: new Prisma.Decimal(
                  linked,
                ),
                totalWeightPercentSnapshot: new Prisma.Decimal(own + linked),
              },
            });
            localScorecards.set(scorecard.scorecardId, row.id);
          }
          let displayOrder = 0;
          for (const { scorecard, assignment } of assignments) {
            const snapshot = byConfiguration.get(
              assignment.kpiConfigurationId,
            )!;
            await tx.monitoringPeriodInput.create({
              data: {
                monitoringPeriodId: periodRow.id,
                monitoringPeriodScorecardId: localScorecards.get(
                  scorecard.scorecardId,
                )!,
                kpiDefinitionExternalId: BigInt(snapshot.kpiDefinitionId),
                kpiConfigurationExternalId: BigInt(snapshot.kpiConfigurationId),
                kpiConfigurationRevisionExternalId: BigInt(
                  snapshot.kpiConfigurationRevisionId,
                ),
                poolCompositionItemExternalId: BigInt(
                  assignment.poolMembershipExternalId,
                ),
                scorecardKpiAssignmentExternalId: BigInt(
                  assignment.scorecardKpiAssignmentId,
                ),
                configCodeSnapshot: snapshot.configCode,
                kpiCodeSnapshot: snapshot.kpiCode,
                kpiNameSnapshot: snapshot.kpiName,
                kpiObjectiveSnapshot: snapshot.objective,
                goalTextSnapshot: snapshot.goal,
                goalValueSnapshot:
                  snapshot.goal === null
                    ? null
                    : new Prisma.Decimal(snapshot.goal),
                evaluationTypeExternalId: BigInt(snapshot.evaluationType.id),
                evaluationTypeCodeSnapshot: snapshot.evaluationType.code,
                resultSemanticsSnapshot: snapshot.resultSemantics,
                scoringMethodCodeSnapshot: snapshot.scoringMethod,
                scoringRuleConfigSnapshot: snapshot.scoringRuleConfig === null
                  ? Prisma.JsonNull
                  : snapshot.scoringRuleConfig as Prisma.InputJsonValue,
                scoringRuleConfigVersionSnapshot: snapshot.scoringRuleConfigVersion,
                negativeResultPolicySnapshot: snapshot.negativeResultPolicy,
                scoringApprovalStatusSnapshot: snapshot.scoringApprovalStatus,
                measurementUnitExternalId: BigInt(snapshot.measurementUnit.id),
                measurementUnitCodeSnapshot: snapshot.measurementUnit.code,
                measurementUnitNameSnapshot: snapshot.measurementUnit.name,
                measurementUnitSymbolSnapshot: snapshot.measurementUnit.symbol,
                primaryDataSourceExternalId: BigInt(snapshot.dataSource.id),
                primaryDataSourceCodeSnapshot: snapshot.dataSource.code,
                primaryDataSourceNameSnapshot: snapshot.dataSource.name,
                weightPercentSnapshot: new Prisma.Decimal(
                  assignment.weightPercent,
                ),
                displayOrder: ++displayOrder,
                generatedAt: new Date(),
                thresholds: {
                  create: snapshot.thresholds.map((threshold) => ({
                    trafficLightLevelExternalId: BigInt(
                      threshold.trafficLightLevelId,
                    ),
                    trafficLightCodeSnapshot: threshold.code,
                    trafficLightNameSnapshot: threshold.name,
                    rangeMinPercent:
                      threshold.rangeMinPercent === null
                        ? null
                        : new Prisma.Decimal(threshold.rangeMinPercent),
                    rangeMaxPercent:
                      threshold.rangeMaxPercent === null
                        ? null
                        : new Prisma.Decimal(threshold.rangeMaxPercent),
                    includesMin: threshold.includesMin,
                    includesMax: threshold.includesMax,
                    displayOrder: threshold.displayOrder,
                  })),
                },
              },
            });
          }
          const scorecardById = new Map(
            projection.scorecards.map((item) => [item.scorecardId, item]),
          );
          for (const parent of projection.scorecards)
            for (const link of parent.linkedScorecards) {
              const linked = scorecardById.get(link.linkedScorecardId);
              if (!linked || !link.linkedScorecardCompositionId)
                throw new AppError(
                  409,
                  "LINKED_SCORECARD_SNAPSHOT_INCOMPLETE",
                  "A linked Scorecard is missing from the READY projection",
                  {
                    scorecardId: parent.scorecardId,
                    linkedScorecardId: link.linkedScorecardId,
                  },
                );
              await tx.monitoringPeriodScorecardLink.create({
                data: {
                  monitoringPeriodScorecardId: localScorecards.get(
                    parent.scorecardId,
                  )!,
                  linkedMonitoringPeriodScorecardId: localScorecards.get(
                    link.linkedScorecardId,
                  )!,
                  scorecardLinkExternalId: BigInt(link.linkAssignmentId),
                  linkedScorecardExternalId: BigInt(link.linkedScorecardId),
                  linkedScorecardPeriodCompositionExternalId: BigInt(
                    link.linkedScorecardCompositionId,
                  ),
                  linkedScorecardCodeSnapshot: linked.scorecardCode,
                  linkedScorecardNameSnapshot: linked.scorecardName,
                  weightPercentSnapshot: new Prisma.Decimal(link.weightPercent),
                  displayOrderSnapshot: link.displayOrder,
                },
              });
            }
          return tx.monitoringPeriod.findUniqueOrThrow({
            where: { id: periodRow.id },
            include,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return dto(created, true);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrent = await existing(poolId, inputPeriodId);
        if (concurrent) return dto(concurrent, false);
      }
      throw error;
    }
  },
};
