import { Prisma } from "@prisma/client";

export const CALCULATION_VERSION = "1";
const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

type DecimalInput = Prisma.Decimal | string | number;
type Band = { compliance: DecimalInput; minResult?: DecimalInput; maxResult?: DecimalInput; maxDistance?: DecimalInput };
export type ScoringRuleConfig = {
  bands?: Band[];
  tolerance?: DecimalInput;
  rangeMin?: DecimalInput;
  rangeMax?: DecimalInput;
};
export type TrafficThreshold = {
  code: string;
  min: DecimalInput | null;
  max: DecimalInput | null;
  includesMin: boolean;
  includesMax: boolean;
  displayOrder: number;
};
export type KpiScoringInput = {
  result: DecimalInput | null;
  goal: DecimalInput | null;
  evaluationType: string;
  scoringMethod?: string | null;
  scoringRuleConfig?: ScoringRuleConfig | null;
  thresholds: TrafficThreshold[];
  weight: DecimalInput;
};
export type KpiScoringResult = {
  status: "PENDING" | "CALCULATED" | "NOT_CALCULABLE";
  errorCode: string | null;
  scoringMethod: string | null;
  rawAchievement: Prisma.Decimal | null;
  compliance: Prisma.Decimal | null;
  trafficLight: string | null;
  weightedScore: Prisma.Decimal | null;
  calculationVersion: string;
};

const decimal = (value: DecimalInput) => value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
const clampCompliance = (value: Prisma.Decimal) => Prisma.Decimal.min(HUNDRED, Prisma.Decimal.max(ZERO, value));
const normalizeEvaluation = (value: string) => value === "HIGHER_IS_BETTER" ? "GREATER_IS_BETTER" : value;

function resolveMethod(evaluation: string, goal: Prisma.Decimal | null, explicit?: string | null) {
  if (explicit) return explicit;
  if (evaluation === "GREATER_IS_BETTER") return "PROPORTIONAL";
  if (evaluation === "LOWER_IS_BETTER") return goal?.isZero() ? "ZERO_TARGET" : "PROPORTIONAL";
  if (evaluation === "EQUAL_IS_BETTER") return "TOLERANCE_BASED";
  if (evaluation === "RANGE") return "RANGE_BASED";
  return null;
}

function bandComplianceByResult(result: Prisma.Decimal, bands: Band[] | undefined) {
  const match = bands?.find((band) => {
    const aboveMin = band.minResult === undefined || result.greaterThanOrEqualTo(decimal(band.minResult));
    const belowMax = band.maxResult === undefined || result.lessThanOrEqualTo(decimal(band.maxResult));
    return aboveMin && belowMax;
  });
  return match ? decimal(match.compliance) : null;
}

function bandComplianceByDistance(distance: Prisma.Decimal, bands: Band[] | undefined) {
  const ordered = bands?.filter((band) => band.maxDistance !== undefined)
    .sort((a, b) => decimal(a.maxDistance!).comparedTo(decimal(b.maxDistance!)));
  const match = ordered?.find((band) => distance.lessThanOrEqualTo(decimal(band.maxDistance!)));
  return match ? decimal(match.compliance) : null;
}

function trafficLight(compliance: Prisma.Decimal, thresholds: TrafficThreshold[]) {
  const ordered = [...thresholds].sort((a, b) => a.displayOrder - b.displayOrder);
  return ordered.find((threshold) => {
    const min = threshold.min === null ? null : decimal(threshold.min);
    const max = threshold.max === null ? null : decimal(threshold.max);
    const aboveMin = min === null || (threshold.includesMin ? compliance.greaterThanOrEqualTo(min) : compliance.greaterThan(min));
    const belowMax = max === null || (threshold.includesMax ? compliance.lessThanOrEqualTo(max) : compliance.lessThan(max));
    return aboveMin && belowMax;
  })?.code ?? null;
}

function notCalculable(errorCode: string, method: string | null): KpiScoringResult {
  return { status: "NOT_CALCULABLE", errorCode, scoringMethod: method, rawAchievement: null, compliance: null, trafficLight: null, weightedScore: null, calculationVersion: CALCULATION_VERSION };
}

export function calculateKpiScore(input: KpiScoringInput): KpiScoringResult {
  if (input.result === null) return { status: "PENDING", errorCode: null, scoringMethod: null, rawAchievement: null, compliance: null, trafficLight: null, weightedScore: null, calculationVersion: CALCULATION_VERSION };
  const goal = input.goal === null ? null : decimal(input.goal);
  const result = decimal(input.result);
  const evaluation = normalizeEvaluation(input.evaluationType);
  const method = resolveMethod(evaluation, goal, input.scoringMethod);
  let raw: Prisma.Decimal | null = null;

  if (!method) return notCalculable("UNSUPPORTED_EVALUATION_TYPE", null);
  if (method === "PROPORTIONAL") {
    if (goal === null) return notCalculable("GOAL_REQUIRED", method);
    if (evaluation === "GREATER_IS_BETTER") {
      if (goal.isZero()) return notCalculable("PROPORTIONAL_GOAL_ZERO", method);
      raw = result.div(goal).mul(HUNDRED);
    } else if (evaluation === "LOWER_IS_BETTER") {
      if (goal.lessThanOrEqualTo(ZERO)) return notCalculable("LOWER_PROPORTIONAL_GOAL_NOT_POSITIVE", method);
      raw = result.isZero() ? HUNDRED : goal.div(result).mul(HUNDRED);
    } else return notCalculable("PROPORTIONAL_EVALUATION_MISMATCH", method);
  } else if (method === "ZERO_TARGET" || method === "THRESHOLD_BASED") {
    if (goal === null || !goal.isZero()) return notCalculable("ZERO_TARGET_REQUIRES_ZERO_GOAL", method);
    raw = result.isZero() ? HUNDRED : bandComplianceByResult(result, input.scoringRuleConfig?.bands);
    if (raw === null) return notCalculable("SCORING_RULE_NOT_CONFIGURED", method);
  } else if (method === "TOLERANCE_BASED") {
    if (goal === null) return notCalculable("GOAL_REQUIRED", method);
    const tolerance = input.scoringRuleConfig?.tolerance === undefined ? null : decimal(input.scoringRuleConfig.tolerance);
    if (tolerance === null || tolerance.lessThan(ZERO)) return notCalculable("TOLERANCE_NOT_CONFIGURED", method);
    const distance = result.minus(goal).abs();
    raw = distance.lessThanOrEqualTo(tolerance) ? HUNDRED : bandComplianceByDistance(distance.minus(tolerance), input.scoringRuleConfig?.bands);
    if (raw === null) return notCalculable("SCORING_RULE_NOT_CONFIGURED", method);
  } else if (method === "RANGE_BASED") {
    const min = input.scoringRuleConfig?.rangeMin === undefined ? null : decimal(input.scoringRuleConfig.rangeMin);
    const max = input.scoringRuleConfig?.rangeMax === undefined ? null : decimal(input.scoringRuleConfig.rangeMax);
    if (min === null || max === null || min.greaterThan(max)) return notCalculable("RANGE_NOT_CONFIGURED", method);
    const distance = result.lessThan(min) ? min.minus(result) : result.greaterThan(max) ? result.minus(max) : ZERO;
    raw = distance.isZero() ? HUNDRED : bandComplianceByDistance(distance, input.scoringRuleConfig?.bands);
    if (raw === null) return notCalculable("SCORING_RULE_NOT_CONFIGURED", method);
  } else return notCalculable("UNSUPPORTED_SCORING_METHOD", method);

  const compliance = clampCompliance(raw);
  return {
    status: "CALCULATED",
    errorCode: null,
    scoringMethod: method,
    rawAchievement: raw,
    compliance,
    trafficLight: trafficLight(compliance, input.thresholds),
    weightedScore: compliance.div(HUNDRED).mul(decimal(input.weight)),
    calculationVersion: CALCULATION_VERSION,
  };
}

export type ScorecardNode = { id: string; directContributions: Array<DecimalInput | null>; links: Array<{ scorecardId: string; weight: DecimalInput }> };
export function calculateScorecardScores(nodes: ScorecardNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visiting = new Set<string>();
  const scores = new Map<string, Prisma.Decimal | null>();
  const calculate = (id: string): Prisma.Decimal | null => {
    if (scores.has(id)) return scores.get(id)!;
    if (visiting.has(id)) throw new Error(`SCORECARD_DEPENDENCY_CYCLE:${id}`);
    const node = byId.get(id);
    if (!node) throw new Error(`LINKED_SCORECARD_NOT_FOUND:${id}`);
    visiting.add(id);
    let score: Prisma.Decimal | null = ZERO;
    for (const contribution of node.directContributions) {
      if (contribution === null) { score = null; break; }
      score = score!.plus(decimal(contribution));
    }
    if (score !== null) for (const link of node.links) {
      const linkedScore = calculate(link.scorecardId);
      if (linkedScore === null) { score = null; break; }
      score = score.plus(linkedScore.div(HUNDRED).mul(decimal(link.weight)));
    }
    visiting.delete(id);
    scores.set(id, score);
    return score;
  };
  for (const node of nodes) calculate(node.id);
  return scores;
}
