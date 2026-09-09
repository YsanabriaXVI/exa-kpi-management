import { validResultBands } from "./result-bands.js";
import { z } from "zod";

// Canonical fields are explicit; optional only to read legacy CURRENT_PERIOD snapshots.
export const historicalFields = {
  periodScope: z.enum(["CURRENT_PERIOD", "PREVIOUS_PERIOD", "SAME_PERIOD_PREVIOUS_YEAR"]).optional(),
  comparisonMode: z.enum(["NONE", "PREVIOUS_PERIOD", "SAME_PERIOD_PREVIOUS_YEAR"]).optional(),
  comparisonDirection: z.enum(["INCREASE", "REDUCTION"]).nullable().optional(),
  targetKind: z.string().nullable().optional(),
  historicalCapabilityVersion: z.literal("HISTORICAL_COMPARISON_V1").nullable().optional(),
  inputFrequency: z.object({ id: z.string(), code: z.string(), monthsPerPeriod: z.number().int().refine(n => [1,3,4,6,12].includes(n)) }).optional(),
};
export function isHistorical(value: any): boolean {
  return Boolean(value && ((value.periodScope != null && value.periodScope !== "CURRENT_PERIOD")
    || value.targetKind === "CHANGE_TARGET" || ["PREVIOUS_PERIOD","SAME_PERIOD_PREVIOUS_YEAR"].includes(value.comparisonMode)
    || !value.periodScope && value.goalUnit?.symbol === "%" && value.measurementUnit?.symbol && value.measurementUnit.symbol !== "%"));
}
export function historicalContractError(value: any): string | null {
  if (!isHistorical(value)) return null;
  const positive = (n: unknown) => typeof n === "string" && /^\d+(\.\d+)?$/.test(n) && Number.isFinite(Number(n)) && Number(n) > 0;
  const rule = value.scoringRuleConfig;
  const thresholds = (Array.isArray(value.thresholds) ? value.thresholds : []).map((t:any)=>({min:t?.rangeMinPercent==null?-Infinity:Number(t.rangeMinPercent),max:t?.rangeMaxPercent==null?Infinity:Number(t.rangeMaxPercent),includesMin:t?.includesMin??true,includesMax:t?.includesMax??false,code:t?.code})).sort((a:any,b:any)=>a.min-b.min);
  const trafficValid = ["RED","YELLOW","GREEN"].every(code=>thresholds.some((t:any)=>t.code===code))
    && thresholds.every((t:any,i:number)=>!Number.isNaN(t.min)&&!Number.isNaN(t.max)&&t.min<t.max
      && (i===0 || thresholds[i-1].max<t.min || thresholds[i-1].max===t.min && !(thresholds[i-1].includesMax&&t.includesMin)));
  const subjects = Array.isArray(value.subjectGoals) ? value.subjectGoals : [];
  const units = value.evaluationScope === "BY_SUBJECT" && value.entityEvaluationMode !== "CONTRIBUTE_TO_OVERALL" ? subjects.map((s: any) => ({goal: s?.goalUnit ?? value.goalUnit, result: s?.resultUnit ?? value.measurementUnit})) : [{goal: value.goalUnit, result: value.measurementUnit}];
  const goals = value.evaluationScope === "BY_SUBJECT" && value.entityEvaluationMode !== "CONTRIBUTE_TO_OVERALL" ? subjects.map((s: any) => s?.goal) : [value.goal];
  if (!z.object(historicalFields).safeParse(value).success
    || !["PREVIOUS_PERIOD","SAME_PERIOD_PREVIOUS_YEAR"].includes(value.periodScope)
    || value.comparisonMode !== value.periodScope || value.targetKind !== "CHANGE_TARGET"
    || !["INCREASE","REDUCTION"].includes(value.comparisonDirection)
    || value.historicalCapabilityVersion !== "HISTORICAL_COMPARISON_V1"
    || !trafficValid || !["GREATER_IS_BETTER","HIGHER_IS_BETTER","LOWER_IS_BETTER","ZERO_IS_BETTER"].includes(value.evaluationType?.code)
    || !value.inputFrequency || !goals.length || !goals.every(positive)
    || units.some((u: any) => u.goal?.symbol !== "%" || !u.result?.code || u.result?.symbol === "%") || !value.resultSemantics
    || !["PROPORTIONAL", "RESULT_BANDS"].includes(value.scoringMethod) || value.scoringApprovalStatus !== "APPROVED"
    || !rule || value.scoringMethod === "RESULT_BANDS" && !validResultBands(rule.bands)
    || value.scoringMethod === "PROPORTIONAL" && (rule.floorPercent == null || rule.capPercent == null
    || !Number.isFinite(Number(rule.floorPercent)) || !Number.isFinite(Number(rule.capPercent))
    || Number(rule.floorPercent) < 0 || Number(rule.capPercent) > 100 || Number(rule.floorPercent) > Number(rule.capPercent))
    || value.evaluationScope === "BY_SUBJECT" && (!value.subjectType || subjects.some((s: any) => !s?.subjectExternalId))
  ) return "HISTORICAL_CONTRACT_INVALID";
  return null;
}
