import { Fragment } from "react";

export type CheckEvaluation = {
  historical?: {referenceType:string;comparisonDirection:string;signedChangePercent:string|null;achievedChangePercent:string|null;resolution?:{value:string;sourceType:string;reason?:string|null;sourceReference?:string|null;resolvedByUserId?:string;resolvedAt?:string}|null;requiredPeriod?:{key:string}|null}|null;
  id:string;scorecardId:string;kpiName:string;kpiCode:string;entityLabel:string|null;entityId:string|null;
  goalUnit:string|null;resultValue:string|null;goal:string|null;unit:string|null;weight:string|null;
  extraPoints?:string|null;rawAchievementPercent:string|null;compliancePercent:string|null;goalMet:boolean|null;trafficLight:string|null;
  weightedContribution:string|null;status:string;errorCode:string|null;
};
export type CheckReport = {
  basedOnBaselineVersion?:number|null;
  status:"NOT_CHECKED"|"CURRENT"|"STALE";runId:string|null;runNo:number|null;basedOnResultsVersion:number|null;
  summary:null|{expected:number;entered:number;pending:number;completionPercent:number;errorCount:number;errors:number;critical:number;warnings:number;blocking:number;runStatus:string;weightCoverageComplete:boolean;allRequiredScoringCalculable:boolean;readyForSubmit:boolean;readyForSubmitWithExceptions?:boolean};
  evaluations:CheckEvaluation[];
  scorecards:Array<{id:string;code:string;name:string;score:string|null;scoreStatus:string;weightCoverage:string|null;calculableWeight:string|null;pendingWeight:string|null}>;
  findings:Array<{code:string;message:string;severity:string;scope:string;kpiCode:string|null;entityLabel:string|null;scorecardId:string;blocking:boolean}>;
};
const number = (value:string|null) => value==null ? "—" : new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value));
const percent = (value:string|null) => value==null ? "—" : `${number(value)}%`;


export function CheckResultsReview({report,dirty,busy,readOnly,selected,onCheck}:{report?:CheckReport;dirty:boolean;busy:boolean;readOnly:boolean;selected:boolean;onCheck:()=>void}) {
  const historical = report?.evaluations.some(row => Boolean(row.historical));
  const current=report?.status==="CURRENT"&&!dirty;
  return <section className="check-results-review" aria-label="Check Results review">
    <header><div><h2>Check Results</h2><p>Evaluate saved Results against frozen Goals and scoring rules.</p></div>
      {!readOnly&&<button className="entry-primary" disabled={busy||dirty||!selected} onClick={onCheck}>{busy?"Checking Results…":report?.runId?"Run Check Results again":"Check Results"}</button>}
    </header>
    <p role="status">{dirty?"Unsaved Results. Save Results before checking.":report?.status==="STALE"?"Results or baseline changed. Run Check Results again.":current?`CURRENT · Check #${report.runNo} · Results v${report.basedOnResultsVersion}${(!historical || report.basedOnBaselineVersion===undefined)?"":` · Baselines v${report.basedOnBaselineVersion}`}`:"NOT_CHECKED"}</p>
    {current && report?.findings.some(f => f.code === "FROZEN_KPI_SETTINGS_INVALID") && <aside className="monitoring-score-blocked"><strong>Score and Traffic Light unavailable</strong><p>This period contains missing or incomplete frozen KPI settings. Saved Results are preserved. Review the findings below; the original finalized settings are needed to evaluate these KPIs.</p></aside>}
    {current&&report.summary&&<>
      <p className="manual-v1-summary">Check: {report.summary.runStatus} · Results: {report.summary.entered} / {report.summary.expected} · Completion: {report.summary.completionPercent}% · Errors: {report.summary.errorCount} · Warnings: {report.summary.warnings}</p>
      <div className="manual-entry-table-wrap"><table className="manual-entry-table check-evaluations"><thead><tr><th>KPI / Entity</th><th>Goal</th><th>Result</th><th>Extra Points</th><th>Compliance %</th><th>Goal Met</th><th>Traffic</th><th>Weight</th><th>Weighted Contribution</th><th>Evaluation</th></tr></thead><tbody>
        {report.evaluations.map((row,index) => {
          const group = report.evaluations.filter(candidate => candidate.scorecardId === row.scorecardId && candidate.kpiCode === row.kpiCode);
          const firstEntity = Boolean(row.entityLabel) && report.evaluations.findIndex(candidate => candidate.scorecardId === row.scorecardId && candidate.kpiCode === row.kpiCode) === index;
          return <Fragment key={row.id}>{firstEntity && <tr className="check-entity-parent"><td colSpan={10}><strong>{row.kpiCode} · {row.kpiName}</strong><span>By Entity · {group.length} executable evaluations</span></td></tr>}<tr className={row.entityLabel ? "check-entity-evaluation" : undefined}><td>{row.entityLabel ? <><strong>{row.entityLabel}</strong><small>Entity evaluation</small></> : row.kpiName}</td><td>{row.goal??"—"} {row.goalUnit??row.unit}</td><td>{row.resultValue??"—"} {row.unit}</td><td>{row.extraPoints == null ? "\u2014" : `+${number(row.extraPoints)} pts`}</td><td>{percent(row.compliancePercent)}</td><td>{row.goalMet===null?"—":row.goalMet?"Yes":"No"}</td><td><TrafficLight value={row.trafficLight}/></td><td>{percent(row.weight)}</td><td>{percent(row.weightedContribution)}</td><td>{row.status}{row.historical&&<small>{row.historical.resolution?.sourceType === "MANUAL" && <>Manual baseline (warning): {row.historical.resolution.sourceReference}<br/>Reason: {row.historical.resolution.reason}<br/></>}Baseline: {row.historical.resolution?.value??"Missing"} {row.unit} · {row.historical.requiredPeriod?.key??"—"}<br/>Actual change: {percent(row.historical.signedChangePercent)} · Achieved change: {percent(row.historical.achievedChangePercent)}</small>}</td></tr></Fragment>;
        })}
      </tbody></table></div>
      <h3>Scorecard evaluation</h3>
      {report.scorecards.map(card=><article className="check-scorecard" key={card.id}><strong>{card.name}</strong><p>Weight Coverage: {percent(card.weightCoverage)} · Calculable Weight: {percent(card.calculableWeight)} · Pending Weight: {percent(card.pendingWeight)}</p><p>{card.scoreStatus==="PARTIAL"?"Partial Score":card.scoreStatus==="COMPLETE"?"Current Score":"Score unavailable"}: {number(card.score)} · {card.scoreStatus}</p></article>)}
      <h3>Findings</h3>
      {!report.findings.length?<p>No findings.</p>:<ul className="check-findings">{report.findings.map((finding,index)=><li key={`${finding.code}-${index}`}><strong>{finding.code}</strong> · {finding.severity} · {finding.code === "MANUAL_BASELINE_USED" ? "Exception approval required; does not block calculation" : finding.blocking?"Blocks future Submit":"Non-blocking"}<p>{finding.kpiCode??report.scorecards.find(c=>c.id===finding.scorecardId)?.name}{finding.entityLabel?` · ${finding.entityLabel}`:""}</p><p>{finding.message}</p></li>)}</ul>}
    </>}
  </section>;
}
import { TrafficLight } from "./TrafficLight";
