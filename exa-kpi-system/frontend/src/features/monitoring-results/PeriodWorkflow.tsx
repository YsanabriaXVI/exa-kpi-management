import { useState } from "react";
import type { ManualEntryResponse } from "./manual-result-entry.service";

export type WorkflowAction = "submit" | "approve" | "return-for-correction" | "close";
export function PeriodWorkflow({ data, disabled, onAction }: {
  data: ManualEntryResponse; disabled: boolean;
  onAction: (action: WorkflowAction, details: { reason?: string; withExceptions?: boolean; justification?: string | null }) => Promise<void>;
}) {
  const [action, setAction] = useState<WorkflowAction | null>(null);
  const [reason, setReason] = useState("");
  const period = data.monitoringPeriod;
  const current = data.check?.status === "CURRENT";
  const ready = current && data.check?.summary?.readyForSubmit === true;
  const exceptions = data.summary.pending > 0;
  const labels = { submit: "Submit Results", approve: "Approve Results", "return-for-correction": "Return for Correction", close: exceptions ? "Close with Exceptions" : "Close Period" };
  const needsReason = action === "return-for-correction" || (action === "close" && exceptions);
  return <section className="check-results-review" aria-label="Period workflow">
    <h2>Period workflow</h2><p>Draft → Submitted → Validated → Closed</p>
    {period.returnReason && <p>Return reason: {period.returnReason}</p>}
    {period.status === "DRAFT" && <><p>{ready ? "Saved Results are ready for submission." : "Run Check Results and resolve blocking findings before submitting."}</p><button className="entry-primary" disabled={disabled || !ready} onClick={() => setAction("submit")}>{labels.submit}</button></>}
    {period.status === "SUBMITTED" && <><button className="entry-primary" disabled={disabled || !ready} onClick={() => setAction("approve")}>{labels.approve}</button><button className="entry-secondary" disabled={disabled} onClick={() => setAction("return-for-correction")}>{labels["return-for-correction"]}</button></>}
    {period.status === "VALIDATED" && <button className="entry-primary" disabled={disabled || !current} onClick={() => setAction("close")}>{labels.close}</button>}
    {period.status === "CLOSED" && <><p>This period is closed. Results and historical baselines are read-only.</p>{period.closedWithExceptions && <p>Closed with exceptions: {period.closeExceptionJustification}</p>}{data.scorecards.map(card => <p key={card.id}>{card.name}: {card.finalScorePercent ?? "Unavailable"}</p>)}</>}
    {action && <div className="entry-dialog-backdrop"><section className="entry-dialog" role="dialog" aria-modal="true" aria-labelledby="workflow-confirm-title">
      <h2 id="workflow-confirm-title">{labels[action]}?</h2><p>{period.poolName} · {period.periodLabel}</p>
      <p>{action === "submit" ? "Results become read-only until returned for correction." : action === "close" ? "Closing preserves this period as read-only historical data." : action === "approve" ? "Approve the saved Results and their current Check." : "Explain which Results need correction."}</p>
      {needsReason && <label>Reason (at least 10 characters)<textarea aria-label="Workflow reason" maxLength={10000} value={reason} onChange={event => setReason(event.target.value)}/></label>}
      <footer><button disabled={disabled} onClick={() => { setAction(null); setReason(""); }}>Cancel</button><button className="entry-primary" disabled={disabled || (needsReason && reason.trim().length < 10)} onClick={async () => {
        await onAction(action, action === "return-for-correction" ? { reason: reason.trim() } : action === "close" ? { withExceptions: exceptions, justification: exceptions ? reason.trim() : null } : {});
        setAction(null); setReason("");
      }}>Confirm {labels[action]}</button></footer>
    </section></div>}
  </section>;
}
