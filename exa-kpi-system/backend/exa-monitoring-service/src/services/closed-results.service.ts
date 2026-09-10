import { Prisma } from "@prisma/client";
import { extraPoints } from "./scoring-engine.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

// This read contract deliberately never calls operational serializers or scoring.
// Decimal values remain strings and absent historical values remain null.
const include = {
  inputs: { orderBy: { displayOrder: "asc" as const }, include: { result: { include: { revisions: true } }, thresholds: true, baselineResolutions: { orderBy: { revisionNo: "desc" as const } } } },
  outgoingLinks: { include: { linked: true } },
  period: { include: { closure: true, workflowEvents: { orderBy: { occurredAt: "asc" as const } }, validationRuns: { include: { issues: true } } } },
} satisfies Prisma.MonitoringPeriodScorecardInclude;
type Card = Prisma.MonitoringPeriodScorecardGetPayload<{ include: typeof include }>;
const json = (value: unknown): any => JSON.parse(JSON.stringify(value, (_key, v) => typeof v === "bigint" ? String(v) : v));
function serialize(card: Card) {
  const p = card.period;
  const closeEvent = [...p.workflowEvents].reverse().find(e => e.toStatusCode === "CLOSED");
  const runId = (closeEvent?.metadata as { validationRunId?: string } | null)?.validationRunId;
  // Never substitute the newest run if the closure does not identify its Check.
  const run = runId ? p.validationRuns.find(r => String(r.id) === runId) : undefined;
  const snapshot = run?.scoringSnapshot as { evaluations?: any[]; scorecards?: any[]; findings?: any[] } | null;
  const evaluations = card.inputs.filter(i => i.evaluationKindSnapshot !== "GROUP").map(input => {
    const checked = snapshot?.evaluations?.find(e => e.id === String(input.id));
    return {
      id: String(input.id), configurationId: String(input.kpiConfigurationExternalId), revisionId: input.kpiConfigurationRevisionExternalId?.toString() ?? null,
      code: input.kpiCodeSnapshot, name: input.kpiNameSnapshot, configCode: input.configCodeSnapshot,
      entityId: input.subjectExternalIdSnapshot, entityLabel: input.subjectLabelSnapshot, evaluationKind: input.evaluationKindSnapshot,
      goal: checked?.goal ?? input.goalTextSnapshot ?? input.goalValueSnapshot?.toString() ?? null,
      goalUnit: checked?.goalUnit ?? null, unit: input.measurementUnitSymbolSnapshot ?? input.measurementUnitNameSnapshot,
      result: input.result?.resultValue?.toString() ?? null, comment: input.result?.comment ?? null,
      score: input.result?.compliancePercent?.toString() ?? null, goalMet: input.result?.goalMet ?? null,
      extraPoints: extraPoints(input.result?.rawAchievementPercent, input.result?.compliancePercent)?.toString() ?? null,
      trafficLight: input.result?.trafficLightCode ?? null, weight: input.weightPercentSnapshot.toString(),
      weightedContribution: input.result?.weightedScorePoints?.toString() ?? null,
      dataSource: input.primaryDataSourceNameSnapshot, historical: checked?.historical ?? null,
      effectiveSettingsSnapshot: input.effectiveSettingsSnapshot, thresholds: input.thresholds,
      baselines: input.baselineResolutions, revisions: input.result?.revisions ?? [], inputValues: input.result?.inputValues ?? null,
    };
  });
  return json({
    id: String(card.id), scorecardId: String(card.scorecardExternalId), monitoringPeriodId: String(p.id),
    code: card.scorecardCodeSnapshot, name: card.scorecardNameSnapshot, departmentsSnapshot: card.departmentsSnapshot,
    period: p.periodLabel, periodKey: p.periodKey, periodStart: p.periodStart.toISOString().slice(0, 10), periodEnd: p.periodEnd.toISOString().slice(0, 10),
    poolId: String(p.kpiPoolExternalId), poolName: p.poolNameSnapshot, poolCode: p.poolCodeSnapshot,
    frequency: p.inputFrequencyNameSnapshot, frequencyCode: p.inputFrequencyCodeSnapshot, sequenceNo: p.sequenceNo,
    status: p.closedWithExceptions ? "Closed with Exceptions" : "Closed", closedWithExceptions: p.closedWithExceptions,
    closedAt: p.closedAt, justification: p.closeExceptionJustification, closure: p.closure,
    score: card.finalScorePercent?.toString() ?? null, directScore: card.directScorePercent?.toString() ?? null, linkedScore: card.linkedScorePercent?.toString() ?? null,
    ownWeight: card.ownKpiWeightPercentSnapshot.toString(), linkedWeight: card.linkedScorecardWeightPercentSnapshot.toString(),
    calculationVersion: card.calculationVersion, selectedEntryMethod: p.selectedEntryMethod,
    scoreStatus: snapshot?.scorecards?.find(c => c.id === String(card.id))?.scoreStatus ?? null,
    evaluations, links: card.outgoingLinks.map(l => ({ id: String(l.linkedMonitoringPeriodScorecardId), scorecardId: String(l.linkedScorecardExternalId), code: l.linkedScorecardCodeSnapshot, name: l.linkedScorecardNameSnapshot, weight: l.weightPercentSnapshot.toString(), score: l.linked.finalScorePercent?.toString() ?? null })),
    check: run ? { id: String(run.id), createdAt: run.createdAt, calculationVersion: run.calculationVersion, scoringSnapshot: run.scoringSnapshot, issues: run.issues } : null,
    audit: p.workflowEvents,
  });
}
export const closedResultsService = {
  async list(after?: string) {
    const cards = await prisma.monitoringPeriodScorecard.findMany({
      where: { period: { status: { code: "CLOSED" } }, ...(after ? { id: { gt: BigInt(after) } } : {}) },
      orderBy: { id: "asc" }, take: 51, include,
    });
    return { contractVersion: "ClosedMonitoringResultsV1", items: cards.slice(0, 50).map(serialize), nextCursor: cards.length > 50 ? String(cards[49]!.id) : null };
  },
  async get(id: string) {
    const card = await prisma.monitoringPeriodScorecard.findFirst({ where: { id: BigInt(id), period: { status: { code: "CLOSED" } } }, include });
    if (!card) throw new AppError(404, "OFFICIAL_RESULT_NOT_FOUND", "A closed Scorecard result was not found");
    return serialize(card);
  },
};
