import { HistoricalBaseline } from "./HistoricalBaseline";
import { PeriodWorkflow, type WorkflowAction } from "./PeriodWorkflow";
import { NextPeriod } from "./NextPeriod";
import { CheckResultsReview } from "./CheckResultsReview";
import { DivisionResultInput, type DivisionValues } from "./DivisionResultInput";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { manualResultEntryService, type ManualEntryResponse, type ContributorValue } from "./manual-result-entry.service";
import "./manual-result-entry.css";
import { EntityGoalsSummary } from "../kpi-config/EntityGoalsDisplay";

export function ManualResultEntry({ periodId }: { periodId: string }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["monitoring-result-entry", periodId], queryFn: () => manualResultEntryService.get(periodId), retry: false, refetchOnWindowFocus: false });
  const [loaded, setLoaded] = useState<ManualEntryResponse | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [contributorValues, setContributorValues] = useState<Record<string, ContributorValue[]>>({});
  const [divisionValues, setDivisionValues] = useState<Record<string, DivisionValues>>({});
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(1);
  const savedContributors = (input: ManualEntryResponse["inputs"][number]): ContributorValue[] => (input.contributors ?? []).map(s => ({
    subjectType:s.subjectType,subjectExternalId:s.subjectExternalId,
    resultValue:input.contributorValues?.find(v => v.subjectType === s.subjectType && v.subjectExternalId === s.subjectExternalId)?.resultValue ?? null,
  }));
  function accept(data: ManualEntryResponse) {
    setContributorValues(Object.fromEntries(data.inputs.map(input => [input.id, savedContributors(input)])));
    setDivisionValues(Object.fromEntries(data.inputs.map(input => [input.id, input.inputValues ?? {numerator:null,denominator:null}])));
    setLoaded(data); setValues(Object.fromEntries(data.inputs.map(input => [input.id, input.resultValue ?? ""])));
  }
  // Background cache updates must not overwrite unsaved Results.
  useEffect(() => { if (query.data && (!loaded || loaded.monitoringPeriod.id !== periodId)) accept(query.data); }, [query.data, periodId, loaded]);
  const isChanged = (input: ManualEntryResponse["inputs"][number]) => input.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? JSON.stringify(contributorValues[input.id] ?? savedContributors(input)) !== JSON.stringify(savedContributors(input)) : input.resultMethod === "CALCULATED_FROM_INPUTS" ? JSON.stringify(divisionValues[input.id] ?? {numerator:null,denominator:null}) !== JSON.stringify(input.inputValues ?? {numerator:null,denominator:null}) : (values[input.id]?.trim() || null) !== input.resultValue;
  const dirty = !!loaded?.inputs.some(isChanged);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const confirmNavigation = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.getAttribute("target") === "_blank") return;
      if (!window.confirm("Discard unsaved Results and leave this page?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", confirmNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", confirmNavigation, true);
    };
  }, [dirty]);
  async function save(selectOnly = false) {
    if (!loaded) return;
    const changes = selectOnly ? [] : loaded.inputs.filter(isChanged).map(input => ({ monitoringPeriodInputId: input.id, resultValue: input.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" || input.resultMethod === "CALCULATED_FROM_INPUTS" ? null : values[input.id]?.trim() || null, version: input.version, ...(input.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? {contributorValues:contributorValues[input.id] ?? savedContributors(input)} : {}), ...(input.resultMethod === "CALCULATED_FROM_INPUTS" ? {inputValues:divisionValues[input.id] ?? {numerator:null,denominator:null}} : {}) }));
    if (changes.some(change => [change.resultValue, change.inputValues?.numerator ?? null, change.inputValues?.denominator ?? null, ...(change.contributorValues ?? []).map(v => v.resultValue)].some(value => value !== null && !/^-?\d+(\.\d+)?$/.test(value)))) { setError("Enter a numeric Result or leave it blank."); return; }
    setBusy(true); setError(""); setSaved(false);
    try {
      const result = await manualResultEntryService.save(periodId, loaded.monitoringPeriod.resultsVersion, changes);
      accept(result); client.setQueryData(["monitoring-result-entry", periodId], result);
      for (const key of ["monitoring-periods", "monitoring-overview", "monitoring-detail", "monitoring-attached", "monitoring-schedule", "monitoring-period-options", "monitoring-period-resolver"]) {
        void client.invalidateQueries({ queryKey: [key] });
      }
      setSaved(!selectOnly);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Results could not be saved."); }
    finally { setBusy(false); }
  }
  async function checkResults() {
    if(!loaded||busy||dirty)return;
    setStep(2);
    setBusy(true);setChecking(true);setError("");setSaved(false);
    try {
      const result=await manualResultEntryService.check(periodId,loaded.monitoringPeriod.resultsVersion,loaded.monitoringPeriod.baselineVersion);
      accept(result);client.setQueryData(["monitoring-result-entry",periodId],result);
      for(const key of ["monitoring-overview","monitoring-detail","monitoring-attached","monitoring-periods"])void client.invalidateQueries({queryKey:[key]});
    } catch(cause){setError(cause instanceof Error?cause.message:"Check Results failed. Reload saved Results and try again.");}
    finally{setBusy(false);setChecking(false);}
  }
  async function workflow(action: WorkflowAction, details: { reason?: string; withExceptions?: boolean; justification?: string | null }) {
    if (!loaded || busy || dirty) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      const result = await manualResultEntryService.workflow(periodId, action, loaded.monitoringPeriod.version, details);
      accept(result); client.setQueryData(["monitoring-result-entry", periodId], result);
      setStep(action === "return-for-correction" ? 1 : action === "submit" ? 4 : 5);
      for (const key of ["monitoring-overview", "monitoring-detail", "monitoring-attached", "monitoring-periods", "monitoring-schedule", "monitoring-period-options", "monitoring-period-resolver"]) void client.invalidateQueries({ queryKey: [key] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Workflow action failed. Reload saved Results and try again."); }
    finally { setBusy(false); }
  }
  if (!loaded) return <main className="monitor-page result-entry-page"><h1>Result Entry</h1>{query.isError ? <p role="alert">{(query.error as Error).message} <button onClick={() => query.refetch()}>Retry</button></p> : <p>Loading frozen evaluations…</p>}</main>;
  const period = loaded.monitoringPeriod;
  const readOnly = period.status !== "DRAFT" || (period.selectedEntryMethod !== null && period.selectedEntryMethod !== "MANUAL");
  const selected = period.selectedEntryMethod === "MANUAL";
  const current = loaded.check?.status === "CURRENT" && !dirty;
  const ready = current && (loaded.check?.summary?.readyForSubmit === true || loaded.check?.summary?.readyForSubmitWithExceptions === true);
  const steps = ["Result Entry", "Check Results", "Review & Submit", "Approval", "Close Period"];
  const available = (stage: number) => stage <= 2 || (stage === 3 ? current : stage === 4 ? period.status !== "DRAFT" : ["VALIDATED", "CLOSED"].includes(period.status));
  const groups = new Map<string, typeof loaded.inputs>();
  for (const input of loaded.inputs) { const key = `${input.scorecardId}:${input.kpiConfigurationId}`; groups.set(key, [...(groups.get(key) ?? []), input]); }
  return <main className="monitor-page result-entry-page">
    <header className="result-entry-header"><Link to="/app/monitoring-results/overview">Monitoring Overview</Link><div><h1>Result Entry</h1><p>Enter what actually happened. Goals, units and weights are frozen.</p></div></header>
    <section className="monitoring-period-sticky-context"><div><strong>{period.poolName}</strong><p>{period.periodLabel} · {period.status}</p></div><Link to="/app/monitoring-results/result-entry">Change Period</Link></section>
    <nav className="monitoring-wizard" aria-label="Results workflow steps">{steps.map((label, index) => <button key={label} aria-current={step === index + 1 ? "step" : undefined} disabled={busy || (dirty && index !== 0) || !available(index + 1)} onClick={() => setStep(index + 1)}><span>{index + 1}</span><strong>{label}</strong></button>)}</nav>
    <section className="entry-workspace manual-v1">
      <div hidden={step !== 1}>
      <header><h2>Manual Result Entry</h2>{selected ? <p>Entry method: Manual</p> : !readOnly ? <button className="entry-primary" disabled={busy} onClick={() => save(true)}>Select Manual</button> : <p>Entry method: {period.selectedEntryMethod ?? "Not selected"}</p>}</header>
      <p className="manual-v1-summary" aria-label="Saved completion">Expected Results: {loaded.summary.expected} · Entered: {loaded.summary.entered} · Pending: {loaded.summary.pending} · Completion: {loaded.summary.completionPercent}%</p>
      {readOnly && <p>Results are read-only for this period.</p>}
      {[...groups.entries()].map(([key, rows]) => {
        const parent = rows[0]!;
        return <section className={`manual-v1-group ${parent.evaluationKind === "ENTITY" ? "by-entity" : ""}`} key={key}><header><div><h3>{parent.kpiName}</h3><p>{parent.parentKpiCode} · {parent.scorecardName}</p></div>{parent.evaluationKind === "ENTITY" && <EntityGoalsSummary count={rows.length} subjectType={parent.subject?.type} groupGoal={parent.groupGoal}/>}</header>
          <div className="manual-entry-table-wrap"><table className="manual-entry-table"><thead><tr><th>{parent.evaluationKind === "ENTITY" ? "Entity" : "Evaluation"}</th><th>Goal</th><th>Weight</th><th>Result Unit</th><th>Result</th></tr></thead><tbody>{rows.map(input => <tr key={input.id}><td>{input.subject?.label ?? input.kpiName}</td><td>{input.goal ?? "—"} {input.goalUnit ?? ""}</td><td>{input.weight === null ? "—" : `${input.weight}%`}</td><td>{input.unit ?? "—"}</td><td>{input.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? <span>{input.resultValue ?? "Pending contributor results"} {input.unit}</span> : input.resultMethod === "CALCULATED_FROM_INPUTS" && input.measurementInputs ? <DivisionResultInput name={input.subject?.label ?? input.kpiName} inputs={input.measurementInputs} unit={input.unit} values={divisionValues[input.id] ?? {numerator:null,denominator:null}} disabled={readOnly || !selected || busy || !!input.entryBlock} onChange={value => {setDivisionValues(current=>({...current,[input.id]:value}));setSaved(false);}}/> : input.resultSemantics === "BINARY" ? <select aria-label={"Result for " + (input.subject?.label ?? input.kpiName)} value={values[input.id] ?? ""} disabled={readOnly || !selected || busy || !!input.entryBlock} onChange={e=>{setValues(current=>({...current,[input.id]:e.target.value}));setSaved(false);}}><option value="">Select result</option><option value="1">Si</option><option value="0">No</option></select> : <input aria-label={`Result for ${input.subject?.label ?? input.kpiName}`} className="manual-inline-input result" inputMode="decimal" value={values[input.id] ?? ""} disabled={readOnly || !selected || busy || !!input.entryBlock} onChange={event => { setValues(current => ({...current, [input.id]: event.target.value})); setSaved(false); }} placeholder="Enter Result"/>}{input.entryBlock && <small>Entry is unavailable for this frozen evaluation.</small>}</td></tr>)}</tbody></table></div>
          {rows.filter(input => input.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL").map(input => <div key={input.id}>
            <p>By Entity / Contributes to Overall / SUM / One official KPI Result</p>
            <div className="manual-entry-table-wrap"><table className="manual-entry-table"><thead><tr><th>Contributor</th><th>Result Unit</th><th>Result</th></tr></thead><tbody>
              {(input.contributors ?? []).map(subject => <tr key={subject.subjectExternalId}><td>{subject.subjectLabel}</td><td>{input.unit}</td><td><input aria-label={"Result for " + subject.subjectLabel} className="manual-inline-input result" inputMode="decimal" disabled={readOnly || !selected || busy || !!input.entryBlock} value={(contributorValues[input.id] ?? savedContributors(input)).find(v => v.subjectExternalId === subject.subjectExternalId)?.resultValue ?? ""} onChange={event => {
                const value=event.target.value;
                setContributorValues(current => ({...current,[input.id]:(current[input.id] ?? savedContributors(input)).map(v => v.subjectExternalId === subject.subjectExternalId ? {...v,resultValue:value.trim() || null} : v)}));setSaved(false);
              }}/></td></tr>)}
            </tbody></table></div>
            <p>The official Result is calculated when all contributor values are saved. Empty values remain pending; zero is a valid Result.</p>
            {input.periodScope && input.periodScope !== "CURRENT_PERIOD" && <p>Evaluation Reference: {input.periodScope === "PREVIOUS_PERIOD" ? "Previous Period" : "Same Period Previous Year"}. Monitoring compares the official total with the historical total.</p>}
          </div>)}
          {parent.groupGoal && <aside className="manual-v1-group-goal"><strong>Group Goal</strong><p>{parent.groupGoal.value} {parent.groupGoal.unit}</p><p>Group Weight: —</p><p>Group Evaluation: Not available yet</p></aside>}
        </section>;
      })}
      {step === 1 && loaded.inputs.filter(input=>input.historical && input.historical.state!=="NOT_REQUIRED").map(input=><HistoricalBaseline key={input.id} periodId={periodId} inputId={input.id} scope={input.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? "CONTRIBUTED" : input.subject ? "ENTITY" : "OVERALL"} name={input.subject?.label?input.kpiName+" / "+input.subject.label:input.kpiName} reference={input.periodScope??""} unit={input.unit} context={input.historical!} disabled={readOnly||busy||dirty} onSaved={async()=>{
        const result=await manualResultEntryService.get(periodId);accept(result);client.setQueryData(["monitoring-result-entry",periodId],result);
        for(const key of ["monitoring-overview","monitoring-detail","monitoring-attached","monitoring-periods"])void client.invalidateQueries({queryKey:[key]});
      }}/>)}
      {loaded.check?.status === "STALE" && <p>Results or baseline changed. Run Check Results again.</p>}
      {current && !!loaded.check?.summary?.blocking && <p className="monitoring-score-blocked">Scoring is blocked by {loaded.check.summary.blocking} findings. Open Check Results to review the reasons.</p>}
      </div>
      {step === 2 && <CheckResultsReview report={loaded.check} dirty={dirty} busy={checking} readOnly={readOnly} selected={selected&&!busy} onCheck={checkResults}/>}
      {step >= 3 && <><h2>{steps[step - 1]}</h2><p>{loaded.summary.entered} / {loaded.summary.expected} Results entered · Check: {loaded.check?.status ?? "NOT_CHECKED"}</p><div className="wizard-scorecards">{loaded.check?.scorecards.map(card => <article className="check-scorecard" key={card.id}><strong>{card.name}</strong><p>{card.score === null ? "Score unavailable" : `${Number(card.score).toFixed(2)}%`} · {card.scoreStatus}</p></article>)}</div><PeriodWorkflow data={loaded} disabled={busy || dirty} onAction={workflow}/></>}
      {step === 5 && period.status === "CLOSED" && <NextPeriod periodId={periodId}/>}
      {error && <div role="alert"><p>{error}</p><button disabled={busy} onClick={async () => { if (dirty && !window.confirm("Discard unsaved Results and reload persisted values?")) return; const response = await query.refetch(); if (response.data) {accept(response.data);setError("");} }}>Reload saved Results</button></div>}
      {saved && <p role="status">Results saved.</p>}
      <footer className="wizard-footer"><span>Step {step} of 5 · {dirty ? "Unsaved Results" : "All Results saved"}</span><div>
        {step > 1 && <button className="entry-secondary" disabled={busy} onClick={() => setStep(step - 1)}>Back: {steps[step - 2]}</button>}
        {step === 1 && !readOnly && <><button className="entry-secondary" disabled={!selected || busy} onClick={() => save()}>{busy ? "Saving…" : "Save Results"}</button><button className="entry-primary" disabled={!selected || busy || dirty} onClick={checkResults}>{loaded.check?.runId ? "Run Check Results again" : "Check Results"}</button></>}
        {step === 1 && readOnly && <button className="entry-primary" onClick={() => setStep(2)}>View Check Results</button>}
        {step === 2 && <button className="entry-primary" disabled={busy || !current} onClick={() => setStep(3)}>Next: Review & Submit</button>}
        {step === 3 && period.status === "DRAFT" && !ready && <span>Resolve blocking Check findings before submitting.</span>}
        {step >= 3 && step < 5 && available(step + 1) && <button className="entry-primary" disabled={busy} onClick={() => setStep(step + 1)}>Next: {steps[step]}</button>}
      </div></footer>
    </section>
  </main>;
}
