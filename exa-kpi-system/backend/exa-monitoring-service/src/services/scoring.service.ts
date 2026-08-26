import { Prisma } from "@prisma/client";
import { CALCULATION_VERSION, calculateKpiScore, calculateScorecardScores, type ScoringRuleConfig } from "./scoring-engine.js";

type Transaction = Prisma.TransactionClient;

export async function recalculatePeriodScores(tx: Transaction, monitoringPeriodId: bigint, periodStatus: string) {
  const [inputs, scorecards] = await Promise.all([
    tx.monitoringPeriodInput.findMany({
      where: { monitoringPeriodId },
      include: { result: true, thresholds: { orderBy: { displayOrder: "asc" } } },
    }),
    tx.monitoringPeriodScorecard.findMany({
      where: { monitoringPeriodId },
      include: { outgoingLinks: { orderBy: { displayOrderSnapshot: "asc" } } },
    }),
  ]);
  const now = new Date();
  const contributionByInput = new Map<string, Prisma.Decimal | null>();

  for (const input of inputs) {
    if (!input.result) { contributionByInput.set(input.id.toString(), null); continue; }
    const calculated = calculateKpiScore({
      result: input.result.resultValue,
      goal: input.goalValueSnapshot,
      evaluationType: input.evaluationTypeCodeSnapshot,
      scoringMethod: input.scoringMethodCodeSnapshot,
      scoringRuleConfig: input.scoringRuleConfigSnapshot as ScoringRuleConfig | null,
      thresholds: input.thresholds.map((threshold) => ({
        code: threshold.trafficLightCodeSnapshot,
        min: threshold.rangeMinPercent,
        max: threshold.rangeMaxPercent,
        includesMin: threshold.includesMin,
        includesMax: threshold.includesMax,
        displayOrder: threshold.displayOrder,
      })),
      weight: input.weightPercentSnapshot,
    });
    contributionByInput.set(input.id.toString(), calculated.weightedScore);
    await tx.kpiResult.update({
      where: { id: input.result.id },
      data: {
        rawAchievementPercent: calculated.rawAchievement,
        compliancePercent: calculated.compliance,
        weightedScorePoints: calculated.weightedScore,
        trafficLightCode: calculated.trafficLight,
        calculationStatus: calculated.status,
        calculationErrorCode: calculated.errorCode,
        calculationVersion: calculated.calculationVersion,
        calculatedAt: now,
      },
    });
  }

  const inputsByScorecard = new Map<string, typeof inputs>();
  for (const scorecard of scorecards) inputsByScorecard.set(scorecard.id.toString(), []);
  for (const input of inputs) inputsByScorecard.get(input.monitoringPeriodScorecardId.toString())?.push(input);
  const graph = scorecards.map((scorecard) => ({
    id: scorecard.id.toString(),
    directContributions: (inputsByScorecard.get(scorecard.id.toString()) ?? []).map((input) => contributionByInput.get(input.id.toString()) ?? null),
    links: scorecard.outgoingLinks.map((link) => ({ scorecardId: link.linkedMonitoringPeriodScorecardId.toString(), weight: link.weightPercentSnapshot })),
  }));
  const totals = calculateScorecardScores(graph);

  for (const scorecard of scorecards) {
    const id = scorecard.id.toString();
    const own = graph.find((node) => node.id === id)!.directContributions;
    const direct = own.some((value) => value === null) ? null : own.reduce<Prisma.Decimal>((sum, value) => sum.plus(value!), new Prisma.Decimal(0));
    const linkedValues = scorecard.outgoingLinks.map((link) => {
      const linkedScore = totals.get(link.linkedMonitoringPeriodScorecardId.toString()) ?? null;
      return linkedScore === null ? null : linkedScore.div(100).mul(link.weightPercentSnapshot);
    });
    const linked = linkedValues.some((value) => value === null) ? null : linkedValues.reduce<Prisma.Decimal>((sum, value) => sum.plus(value!), new Prisma.Decimal(0));
    const preview = totals.get(id) ?? null;
    await tx.monitoringPeriodScorecard.update({
      where: { id: scorecard.id },
      data: {
        directScorePercent: direct,
        linkedScorePercent: linked,
        previewScorePercent: preview,
        ...(periodStatus === "CLOSED" ? { finalScorePercent: preview } : {}),
        calculationVersion: CALCULATION_VERSION,
        calculatedAt: now,
      },
    });
  }
}
