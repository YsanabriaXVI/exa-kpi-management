import { additiveResultError } from "./additive-results.js";
import { z } from "zod";

export const entityParticipationFields = {
  entityEvaluationMode: z.enum(["INDIVIDUAL", "CONTRIBUTE_TO_OVERALL"]).nullable().optional(),
  entityAggregation: z.literal("SUM").nullable().optional(),
};
type Participation = { evaluationScope?: unknown; entityEvaluationMode?: unknown };
export const isContributingEvaluation = (value: Participation | null | undefined) =>
  value?.evaluationScope === "BY_SUBJECT" && value.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL";
export const isIndividualEvaluation = (value: Participation | null | undefined) =>
  value?.evaluationScope === "BY_SUBJECT" && value.entityEvaluationMode !== "CONTRIBUTE_TO_OVERALL";

// Missing legacy mode preserves individual evaluation, regardless of groupGoal.
export function contributionContractError(value: any): string | null {
  if (!isContributingEvaluation(value)) return null;
  const additiveError = additiveResultError(value.resultSemantics, value.measurementUnit);
  if (additiveError) return additiveError;
  const subjects = value.subjects;
  if (value.entityAggregation !== "SUM" || value.goal == null || !Number.isFinite(Number(value.goal))
    || !value.subjectType || !Array.isArray(subjects) || !subjects.length
    || subjects.some((s: any) => !s.subjectExternalId?.trim() || !s.subjectLabel?.trim() || s.weight != null || s.goal != null)
    || new Set(subjects.map((s: any) => s.subjectExternalId)).size !== subjects.length
    || !Array.isArray(value.subjectGoals) || value.subjectGoals.length || value.goalAssignment != null
    || value.evaluationWeightsVersion != null || value.resultMethod !== "DIRECT"
    || !value.goalUnit?.symbol || !value.measurementUnit?.symbol
    || value.periodScope === "CURRENT_PERIOD" && value.goalUnit.symbol !== value.measurementUnit.symbol)
    return "CONTRIBUTION_CONTRACT_INVALID";
  return null;
}
