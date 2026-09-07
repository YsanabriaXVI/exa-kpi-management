import { Prisma } from "@prisma/client";
export const CALCULATION_VERSION = "CHECK_RESULTS_V1";
const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);
type DecimalInput = Prisma.Decimal | string | number;
type Band = { compliance: DecimalInput; minResult?: DecimalInput; maxResult?: DecimalInput; maxDistance?: DecimalInput };
export type ScoringRuleConfig = {
  bands?: Band[];
  tolerance?: DecimalInput;
  rangeMin?: DecimalInput;
  rangeMax?: DecimalInput;
  floorPercent?: DecimalInput;
  capPercent?: DecimalInput;
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
  negativeResultPolicy?: string | null;
  scoringApprovalStatus?: string | null;
};
export type KpiScoringResult = {
  status: "CALCULATED" | "NOT_CALCULABLE";
  goalMet: boolean | null;
  errorCode: string | null;
  scoringMethod: string | null;
  rawAchievement: Prisma.Decimal | null;
  compliance: Prisma.Decimal | null;
  trafficLight: string | null;
  weightedScore: Prisma.Decimal | null;
  calculationVersion: string;
};


const decimal = (value: DecimalInput) => new Prisma.Decimal(value);
export function notCalculable(errorCode: string, method: string | null): KpiScoringResult {
  return {status:"NOT_CALCULABLE",errorCode,scoringMethod:method,goalMet:null,rawAchievement:null,compliance:null,trafficLight:null,weightedScore:null,calculationVersion:CALCULATION_VERSION};
}
export const persistedDecimal = (value: Prisma.Decimal | null) => value?.toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP) ?? null;

export function calculateKpiScore(input: KpiScoringInput): KpiScoringResult {
  const method=input.scoringMethod??null;
  if(input.result===null) return notCalculable("RESULT_MISSING",method);
  try {
    const result=decimal(input.result), goal=input.goal===null?null:decimal(input.goal), weight=decimal(input.weight);
    const behavior=input.evaluationType==="HIGHER_IS_BETTER"?"GREATER_IS_BETTER":input.evaluationType;
    if(!result.isFinite()||goal&&!goal.isFinite()||!weight.isFinite()||weight.lt(0)||weight.gt(100)) return notCalculable("FROZEN_SCORING_CONTRACT_INVALID",method);
    if(input.scoringApprovalStatus!=="APPROVED") return notCalculable("SCORING_CONFIGURATION_NOT_APPROVED",method);
    if(!method) return notCalculable("SCORING_METHOD_NOT_CONFIGURED",method);
    if(result.lt(0)&&input.negativeResultPolicy!=="ALLOW") return notCalculable(input.negativeResultPolicy==="REVIEW"?"NEGATIVE_RESULT_REQUIRES_REVIEW":input.negativeResultPolicy==="DISALLOW"?"NEGATIVE_RESULT_NOT_ALLOWED":"NEGATIVE_RESULT_POLICY_NOT_CONFIGURED",method);
    let raw:Prisma.Decimal|null=null, compliance:Prisma.Decimal, goalMet:boolean;
    const config=input.scoringRuleConfig;
    if(method==="PROPORTIONAL" && ["GREATER_IS_BETTER","LOWER_IS_BETTER"].includes(behavior)) {
      if(!goal||goal.lte(0))return notCalculable("PROPORTIONAL_GOAL_NOT_POSITIVE",method);
      // Approved proportional contracts require an explicit floor and cap.
      if(config?.floorPercent===undefined||config.capPercent===undefined)return notCalculable("COMPLIANCE_LIMITS_MISSING",method);
      const floor=decimal(config.floorPercent),cap=decimal(config.capPercent);
      if(!floor.isFinite()||!cap.isFinite()||floor.lt(0)||cap.gt(100)||floor.gt(cap))return notCalculable("COMPLIANCE_LIMITS_INVALID",method);
      goalMet=behavior==="GREATER_IS_BETTER"?result.gte(goal):result.lte(goal);
      // Existing lower-zero convention: finite 100 raw; use the approved cap directly.
      raw=behavior==="GREATER_IS_BETTER"?result.div(goal).mul(100):result.isZero()?HUNDRED:goal.div(result).mul(100);
      compliance=behavior==="LOWER_IS_BETTER"&&result.isZero()?cap:Prisma.Decimal.min(cap,Prisma.Decimal.max(floor,raw));
    } else if(method==="ZERO_TARGET_BANDS" && ["ZERO_IS_BETTER","LOWER_IS_BETTER"].includes(behavior)) {
      if(!goal?.isZero())return notCalculable("ZERO_TARGET_REQUIRES_ZERO_GOAL",method);
      const bands=config?.bands;
      if(!Array.isArray(bands)||!bands.length)return notCalculable("SCORING_RULE_NOT_CONFIGURED",method);
      const parsed=bands.map(b=>({min:b.minResult===undefined?ZERO:decimal(b.minResult),max:b.maxResult===undefined?null:decimal(b.maxResult),value:decimal(b.compliance)})).sort((a,b)=>a.min.comparedTo(b.min));
      if(parsed.some((b,i)=>!b.min.isFinite()||b.max&&(!b.max.isFinite()||b.max.lt(b.min))||!b.value.isFinite()||b.value.lt(0)||b.value.gt(100)||i>0&&(parsed[i-1]!.max===null||parsed[i-1]!.max!.gte(b.min))))return notCalculable("SCORING_BANDS_INVALID",method);
      const matches=parsed.filter(b=>result.gte(b.min)&&(!b.max||result.lte(b.max)));
      if(matches.length!==1)return notCalculable("SCORING_RULE_NOT_CONFIGURED",method);
      compliance=matches[0]!.value;
      // Bands define Compliance, not a mathematical achievement ratio for Goal zero.
      raw=null;goalMet=result.isZero();
    } else return notCalculable("UNSUPPORTED_SCORING_COMBINATION",method);
    const thresholds=input.thresholds.map(t=>({...t,min:t.min===null?null:decimal(t.min),max:t.max===null?null:decimal(t.max)})).sort((a,b)=>a.min===null?-1:b.min===null?1:a.min.comparedTo(b.min));
    if(!thresholds.length)return notCalculable("TRAFFIC_LIGHT_THRESHOLDS_NOT_CONFIGURED",method);
    if(thresholds.some((t,i)=>!["RED","YELLOW","GREEN"].includes(t.code)||t.min&&!t.min.isFinite()||t.max&&!t.max.isFinite()||t.min&&t.max&&(t.min.gt(t.max)||t.min.eq(t.max)&&!(t.includesMin&&t.includesMax))||i>0&&(()=>{const prev=thresholds[i-1]!;return prev.max===null||t.min===null||prev.max.gt(t.min)||prev.max.eq(t.min)&&prev.includesMax&&t.includesMin;})()))return notCalculable("TRAFFIC_LIGHT_THRESHOLDS_INVALID",method);
    const matches=thresholds.filter(t=>(t.min===null||(t.includesMin?compliance.gte(t.min):compliance.gt(t.min)))&&(t.max===null||(t.includesMax?compliance.lte(t.max):compliance.lt(t.max))));
    if(matches.length!==1)return notCalculable("TRAFFIC_LIGHT_THRESHOLDS_NOT_CONFIGURED",method);
    const weighted=compliance.mul(weight).div(100);
    if([raw,compliance,weighted].some(v=>v!==null&&(!v.isFinite()||v.abs().gte(1000000))))return notCalculable("SCORING_PRECISION_EXCEEDED",method);
    return {status:"CALCULATED",errorCode:null,scoringMethod:method,rawAchievement:persistedDecimal(raw),compliance:persistedDecimal(compliance),goalMet,trafficLight:matches[0]!.code,weightedScore:persistedDecimal(weighted),calculationVersion:CALCULATION_VERSION};
  } catch {return notCalculable("FROZEN_SCORING_CONTRACT_INVALID",method);}
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
