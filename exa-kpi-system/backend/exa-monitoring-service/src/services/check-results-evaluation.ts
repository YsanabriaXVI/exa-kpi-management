import { historicalContractError, isHistorical } from "../contracts/historical-contract.js";
import { historicalComparison } from "./historical-comparison.js";
import { Prisma } from "@prisma/client";
import { parseFrozenEffectiveKpiSettings } from "../contracts/frozen-effective-kpi-settings.js";
import { calculateKpiScore, notCalculable, persistedDecimal } from "./scoring-engine.js";

const text = (value: any): string | null => value == null ? null : String(value);
const decimal = (value: any) => new Prisma.Decimal(value);
const fixed = (value: Prisma.Decimal) => persistedDecimal(value)!.toFixed(6);
const sum = (values: Prisma.Decimal[]) => values.reduce((a,b)=>a.plus(b),decimal(0));
export type CheckFinding = {
  code: string; severity: "ERROR" | "CRITICAL"; scope: "EVALUATION" | "SCORECARD";
  message: string; monitoringPeriodInputId: string | null; kpiConfigurationId: string | null;
  kpiCode: string | null; entityId: string | null; entityLabel: string | null;
  scorecardId: string; blocking: boolean;
};
const messages: Record<string,string> = {
  RESULT_MISSING: "Enter a Result for this evaluation. Zero is a valid Result.",
  FROZEN_KPI_SETTINGS_INVALID: "The frozen execution contract is incomplete. This evaluation cannot be checked.",
  FROZEN_SCORING_CONTRACT_INVALID: "The frozen scoring metadata is invalid or inconsistent.",
  HISTORICAL_CONTRACT_INVALID: "The frozen historical contract is incomplete or unsupported.",
  HISTORICAL_BASELINE_MISSING: "Resolve the required historical baseline before final Submit.",
  HISTORICAL_BASELINE_AMBIGUOUS: "Multiple eligible historical Results exist. Select the correct baseline.",
  HISTORICAL_BASELINE_INCOMPATIBLE: "The baseline is incompatible with the required historical context.",
  HISTORICAL_BASELINE_ZERO_UNDEFINED: "Percentage change against a zero baseline is undefined.",
  HISTORICAL_REQUIRED_PERIOD_NOT_FOUND: "The required historical period cannot be determined from frozen cadence.",
  HISTORICAL_BASELINE_SOURCE_NOT_ELIGIBLE: "The selected historical source is no longer eligible.",
  UNSUPPORTED_SCORING_COMBINATION: "This frozen behavior and scoring method are not supported by Check Results V1.",
  TRAFFIC_LIGHT_THRESHOLDS_INVALID: "The frozen Traffic thresholds are invalid or overlap.",
  TRAFFIC_LIGHT_THRESHOLDS_NOT_CONFIGURED: "The frozen Traffic thresholds do not cover the calculated Compliance.",
  WEIGHT_COVERAGE_INVALID: "Frozen Scorecard weights must total 100%. Monitoring cannot repair the composition.",
  SCORECARD_DEPENDENCY_INVALID: "The frozen Scorecard links contain a cycle or a missing dependency.",
};

export function evaluateCheck(inputs: any[], cards: any[], selectedEntryMethod: string | null, contexts = new Map<string,any>()) {
  const findings: CheckFinding[] = [];
  const expectedInputs=inputs.filter(i=>i.evaluationKindSnapshot!=="GROUP");
  const evaluations=expectedInputs.map(input=>{
    let failure: string | null=null;
    let frozen: ReturnType<typeof parseFrozenEffectiveKpiSettings> | null=null;
    const saved=input.result?.resultValue??null;
    try {
      const candidate=input.effectiveSettingsSnapshot;
      if(historicalContractError(candidate)) failure="HISTORICAL_CONTRACT_INVALID";
      else {
        frozen=parseFrozenEffectiveKpiSettings(candidate);
        const subject=frozen.subjectGoals.find(s=>s.subjectExternalId===input.subjectExternalIdSnapshot);
        const goal=input.evaluationKindSnapshot==="ENTITY"?subject?.goal:frozen.goal;
        if(frozen.kpiConfigurationId!==String(input.kpiConfigurationExternalId)||frozen.kpiConfigurationRevisionId!==String(input.kpiConfigurationRevisionExternalId)
          ||frozen.evaluationType.code!==input.evaluationTypeCodeSnapshot||frozen.scoringMethod!==input.scoringMethodCodeSnapshot
          ||goal==null||input.goalValueSnapshot==null||!decimal(goal).eq(input.goalValueSnapshot)
          ||frozen.measurementUnit.code!==input.measurementUnitCodeSnapshot
          ||input.evaluationKindSnapshot==="ENTITY"&&(frozen.evaluationScope!=="BY_SUBJECT"||!subject||!decimal(subject.weight!).eq(input.weightPercentSnapshot))
          ||input.evaluationKindSnapshot==="OVERALL"&&frozen.evaluationScope!=="OVERALL") failure="FROZEN_SCORING_CONTRACT_INVALID";
      }
    } catch(error) {failure=typeof (error as any)?.code==="string"?(error as any).code:"FROZEN_KPI_SETTINGS_INVALID";}
    const historical = isHistorical(input.effectiveSettingsSnapshot);
    const context = contexts.get(String(input.id));
    const comparison = historical && !failure ? historicalComparison(saved, {...context,comparisonDirection:input.effectiveSettingsSnapshot.comparisonDirection}) : null;
    if (comparison?.errorCode && !failure) failure=comparison.errorCode;
    if(historical && frozen && saved !== null && decimal(saved).lt(0) && frozen.negativeResultPolicy !== "ALLOW")
      failure = frozen.negativeResultPolicy === "REVIEW" ? "NEGATIVE_RESULT_REQUIRES_REVIEW" : frozen.negativeResultPolicy === "DISALLOW" ? "NEGATIVE_RESULT_NOT_ALLOWED" : "NEGATIVE_RESULT_POLICY_NOT_CONFIGURED";
    const scored = saved===null ? notCalculable("RESULT_MISSING",frozen?.scoringMethod??input.scoringMethodCodeSnapshot)
      : failure ? notCalculable(failure,input.scoringMethodCodeSnapshot)
      : calculateKpiScore({result:historical?comparison!.achievedChangePercent:saved,goal:input.goalValueSnapshot,weight:input.weightPercentSnapshot,
          evaluationType:historical?"GREATER_IS_BETTER":frozen!.evaluationType.code,scoringMethod:frozen!.scoringMethod,
          scoringRuleConfig:frozen!.scoringRuleConfig,scoringApprovalStatus:frozen!.scoringApprovalStatus,
          negativeResultPolicy:historical?"ALLOW":frozen!.negativeResultPolicy,
          thresholds:frozen!.thresholds.map(t=>({code:t.code,min:t.rangeMinPercent,max:t.rangeMaxPercent,includesMin:t.includesMin,includesMax:t.includesMax,displayOrder:t.displayOrder}))});
    const row={id:String(input.id),scorecardId:String(input.monitoringPeriodScorecardId),kpiConfigurationId:String(input.kpiConfigurationExternalId),
      revisionId:String(input.kpiConfigurationRevisionExternalId),kpiCode:input.kpiCodeSnapshot,kpiName:input.kpiNameSnapshot,
      evaluationKind:input.evaluationKindSnapshot,entityId:input.subjectExternalIdSnapshot??null,entityLabel:input.subjectLabelSnapshot??null,
      historical:historical?{...context,referenceType:input.effectiveSettingsSnapshot.periodScope,comparisonDirection:input.effectiveSettingsSnapshot.comparisonDirection,targetKind:input.effectiveSettingsSnapshot.targetKind,...comparison}:null,
      goalUnit:input.effectiveSettingsSnapshot?.goalUnit?.symbol??null,resultValue:text(saved),goal:text(input.goalValueSnapshot),unit:input.measurementUnitSymbolSnapshot??input.measurementUnitNameSnapshot,
      weight:text(input.weightPercentSnapshot),behavior:input.evaluationTypeCodeSnapshot,scoringMethod:frozen?.scoringMethod??input.scoringMethodCodeSnapshot,
      status:scored.status,errorCode:scored.errorCode,rawAchievementPercent:scored.rawAchievement?.toFixed(6)??null,
      compliancePercent:scored.compliance?.toFixed(6)??null,goalMet:scored.goalMet,trafficLight:scored.trafficLight,
      weightedContribution:scored.weightedScore?.toFixed(6)??null,groupEvaluation:input.effectiveSettingsSnapshot?.groupGoal?"NOT_AVAILABLE":null};
    for(const code of new Set([scored.errorCode,...(failure?[failure]:[])].filter((c):c is string=>c!==null))) {
      const message = code === "FROZEN_KPI_SETTINGS_INVALID" && !input.effectiveSettingsSnapshot
        ? "This period has no frozen KPI execution settings. Saved Results are preserved, but Score and Traffic Light cannot be calculated. The original finalized snapshot must be recovered before this period can be evaluated."
        : messages[code] ?? `This evaluation is not calculable (${code}).`;
      findings.push({code,severity:code==="RESULT_MISSING"?"ERROR":"CRITICAL",scope:"EVALUATION",message,monitoringPeriodInputId:row.id,kpiConfigurationId:row.kpiConfigurationId,kpiCode:row.kpiCode,entityId:row.entityId,entityLabel:row.entityLabel,scorecardId:row.scorecardId,blocking:true});
    }
    return row;
  });
  const byId=new Map(cards.map(c=>[String(c.id),c]));
  const summaries=new Map<string,any>();
  const visiting=new Set<string>();
  const summarize=(id:string):any=>{
    if(summaries.has(id))return summaries.get(id);
    if(visiting.has(id)||!byId.has(id))throw new Error("SCORECARD_DEPENDENCY_INVALID");
    visiting.add(id);
    const card=byId.get(id)!;const rows=evaluations.filter(r=>r.scorecardId===id);
    const links=(card.outgoingLinks??[]).map((l:any)=>({weight:decimal(l.weightPercentSnapshot),child:summarize(String(l.linkedMonitoringPeriodScorecardId))}));
    const weights=rows.map(r=>{try {const w=decimal(r.weight!);return w.isFinite()&&w.gte(0)&&w.lte(100)?w:decimal(0);}catch{return decimal(0);}});
    const coverage=sum([...weights,...links.map((l:any)=>l.weight)]);
    const validCoverage=coverage.eq(100);
    if(!validCoverage)findings.push({code:"WEIGHT_COVERAGE_INVALID",severity:"ERROR",scope:"SCORECARD",message:messages.WEIGHT_COVERAGE_INVALID!,monitoringPeriodInputId:null,kpiConfigurationId:null,kpiCode:null,entityId:null,entityLabel:null,scorecardId:id,blocking:true});
    const calculated=rows.filter(r=>r.status==="CALCULATED");
    const calculableWeight=sum([...rows.map((r,i)=>r.status==="CALCULATED"?weights[i]!:decimal(0)),...links.map((l:any)=>l.child.scoreStatus==="COMPLETE"?l.weight:decimal(0))]);
    const contribution=sum([...calculated.map(r=>decimal(r.weightedContribution!)),...links.map((l:any)=>decimal(l.child.score??0).mul(l.weight).div(100))]);
    const entered=rows.filter(r=>r.resultValue!==null).length;
    const complete=validCoverage&&calculated.length===rows.length&&links.every((l:any)=>l.child.scoreStatus==="COMPLETE");
    const result={id,code:card.scorecardCodeSnapshot,name:card.scorecardNameSnapshot,expected:rows.length,entered,pending:rows.length-entered,
      completionPercent:rows.length?Math.round(entered/rows.length*100):100,weightCoverage:fixed(coverage),weightCoverageComplete:validCoverage,
      calculableWeight:fixed(calculableWeight),pendingWeight:fixed(coverage.minus(calculableWeight)),
      score:fixed(contribution),scoreStatus:complete?"COMPLETE":"PARTIAL"};
    visiting.delete(id);summaries.set(id,result);return result;
  };
  try{for(const card of cards)summarize(String(card.id));}catch{
    summaries.clear();
    for(const card of cards){const id=String(card.id);findings.push({code:"SCORECARD_DEPENDENCY_INVALID",severity:"CRITICAL",scope:"SCORECARD",message:messages.SCORECARD_DEPENDENCY_INVALID!,monitoringPeriodInputId:null,kpiConfigurationId:null,kpiCode:null,entityId:null,entityLabel:null,scorecardId:id,blocking:true});summaries.set(id,{id,code:card.scorecardCodeSnapshot,name:card.scorecardNameSnapshot,score:null,scoreStatus:"NOT_CALCULABLE",weightCoverage:null,weightCoverageComplete:false,calculableWeight:null,pendingWeight:null});}
  }
  const entered=evaluations.filter(e=>e.resultValue!==null).length;
  const expected=evaluations.length;
  const weightCoverageComplete=cards.length>0&&[...summaries.values()].every(s=>s.weightCoverageComplete);
  const blocking=findings.filter(f=>f.blocking).length;
  const calculated=evaluations.filter(e=>e.status==="CALCULATED").length;
  const historicalEvaluations=evaluations.filter(e=>e.historical);
  const resolvedBaselines=historicalEvaluations.filter(e=>e.historical.resolution && e.historical.state!=="INVALID").length;
  return {evaluations,scorecards:[...summaries.values()],findings,summary:{expected,entered,pending:expected-entered,completionPercent:expected?Math.round(entered/expected*100):0,
    errorCount:findings.length,passed:calculated,missing:expected-entered,errors:findings.filter(f=>f.severity==="ERROR").length,critical:findings.filter(f=>f.severity==="CRITICAL").length,warnings:0,blocking,
    historicalBaselines:{required:historicalEvaluations.length,resolved:resolvedBaselines,unresolved:historicalEvaluations.length-resolvedBaselines},
    allRequiredHistoricalBaselinesResolved:resolvedBaselines===historicalEvaluations.length,
    scoring:{calculated,missing:expected-entered,notCalculable:expected-calculated},weightCoverageComplete,allRequiredScoringCalculable:calculated===expected&&expected>0,
    runStatus:blocking?"BLOCKED":"PASSED",readyForSubmit:selectedEntryMethod==="MANUAL"&&expected>0&&entered===expected&&weightCoverageComplete&&blocking===0&&calculated===expected}};
}
