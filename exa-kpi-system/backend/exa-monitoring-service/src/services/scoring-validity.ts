import type { Prisma } from "@prisma/client";

export const emptyResultScoring = {
  goalMet: null, rawAchievementPercent: null, compliancePercent: null, weightedScorePoints: null,
  trafficLightCode: null, calculationStatus: null, calculationErrorCode: null,
  calculationVersion: null, calculatedAt: null,
};
export const emptyScorecardScoring = {
  directScorePercent: null, linkedScorePercent: null, previewScorePercent: null,
  finalScorePercent: null, calculationVersion: null, calculatedAt: null,
};

export function hasCurrentScoring(period: { resultsVersion?: number; currentScoringResultsVersion?: number | null; baselineVersion?: number; currentScoringBaselineVersion?: number | null }) {
  return typeof period.currentScoringResultsVersion === "number" && period.currentScoringResultsVersion === period.resultsVersion && (period.currentScoringBaselineVersion ?? (period.baselineVersion == null ? 0 : -1)) === (period.baselineVersion ?? 0);
}

export function isCurrentRun(run: any, period: any) { return !!run && run.basedOnResultsVersion === period.resultsVersion && (run.basedOnBaselineVersion ?? 0) === (period.baselineVersion ?? 0); }

// Mask legacy or stale materialized values at every read boundary as well.
export function maskStaleScoring(period: any) {
  if (hasCurrentScoring(period)) return;
  for (const input of period.inputs ?? []) if (input.result) Object.assign(input.result, emptyResultScoring);
  for (const card of period.scorecards ?? []) {
    Object.assign(card, emptyScorecardScoring);
    for (const input of card.inputs ?? []) if (input.result) Object.assign(input.result, emptyResultScoring);
  }
  period.validationSummary = null;
  if (period.validationStatus) period.validationStatus = "STALE";
}

export async function clearCurrentScoring(tx: Prisma.TransactionClient, id: bigint) {
  await tx.kpiResult.updateMany({ where: { input: { monitoringPeriodId: id } }, data: emptyResultScoring });
  await tx.monitoringPeriodScorecard.updateMany({ where: { monitoringPeriodId: id }, data: emptyScorecardScoring });
}
