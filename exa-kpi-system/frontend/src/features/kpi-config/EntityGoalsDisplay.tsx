import { Target, UsersRound, X } from "lucide-react";
import type { EntityEvaluationMode, SubjectSelection, GroupGoal, SubjectGoal, SubjectType } from "./kpi-config.types";
import "./entity-goals-display.css";

export type EntityGoalsData = {
  configCode: string;
  kpiCode: string;
  kpiName: string;
  subjectType?: SubjectType | null;
  subjectGoals: Array<Omit<SubjectGoal, "goal"> & { goal: number | null }>;
  entityEvaluationMode?: EntityEvaluationMode | null;
  subjects?: SubjectSelection[];
  goal?: number | null;
  groupGoal?: GroupGoal | null;
  goalUnit?: string;
  resultUnit?: string;
  historical?: boolean;
};

const number = (value: number | null | undefined) => value == null || !Number.isFinite(Number(value)) ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(Number(value));
const unitLabel = (value: unknown): string => typeof value === "string" ? value : value && typeof value === "object" ? String((value as { symbol?: string; name?: string }).symbol ?? (value as { name?: string }).name ?? "") : "";
export function entityGoalsFromSnapshot(snapshot: Record<string, any>): EntityGoalsData {
  return {
    configCode: snapshot.configCode ?? "", kpiCode: snapshot.kpiCode ?? "", kpiName: snapshot.kpiName ?? "",
    subjectType: snapshot.subjectType, entityEvaluationMode: snapshot.entityEvaluationMode, subjects: snapshot.subjects ?? [],
    goal: snapshot.goal == null ? null : Number(snapshot.goal),
    goalUnit: unitLabel(snapshot.goalUnit), resultUnit: unitLabel(snapshot.measurementUnit),
    historical: Boolean(snapshot.periodScope && snapshot.periodScope !== "CURRENT_PERIOD"),
    groupGoal: snapshot.groupGoal ? { ...snapshot.groupGoal, value: Number(snapshot.groupGoal.value), unit: unitLabel(snapshot.groupGoal.unit) } : null,
    subjectGoals: (snapshot.subjectGoals ?? []).map((goal: Record<string, any>) => ({
      subjectExternalId: goal.subjectExternalId, subjectCode: goal.subjectCode, subjectLabel: goal.subjectLabel,
      goal: goal.goal == null ? null : Number(goal.goal), goalUnit: unitLabel(goal.goalUnit), resultUnit: unitLabel(goal.resultUnit),
    })),
  };
}
const subjectLabel = (value?: string | null) => value ? value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()) : "Entity";

export function EntityGoalsSummary({ count, subjectType, groupGoal, onView, entityEvaluationMode }: { entityEvaluationMode?: EntityEvaluationMode | null; count: number; subjectType?: string | null; groupGoal?: { value: number | string; unit: string } | null; onView?: () => void }) {
  return <div className="entity-goals-summary">
    <span className="entity-goals-badge"><UsersRound size={13}/>By Entity / {entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? "Contributes to Overall" : "Individual"}</span>
    <span>{count} {count === 1 ? subjectLabel(subjectType) : `${subjectLabel(subjectType)} entities`}</span>
    {groupGoal && <span className="entity-group-goal"><Target size={13}/>Group goal: <strong>{number(Number(groupGoal.value))} {groupGoal.unit}</strong></span>}
    {onView && <button type="button" onClick={onView}>{entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? "View contributors" : "View entity goals"}</button>}
  </div>;
}

export function EntityGoalsModal({ data, onClose }: { data: EntityGoalsData; onClose: () => void }) {
  if (data.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL") return <div className="entity-goals-modal-backdrop" role="presentation" onMouseDown={event => {if(event.target === event.currentTarget) onClose();}}>
    <section className="entity-goals-dialog" role="dialog" aria-modal="true" aria-labelledby="contributor-dialog-title">
      <header><div><span>{data.configCode}</span><h2 id="contributor-dialog-title">Contributors</h2><p>{data.kpiName}</p></div><button type="button" onClick={onClose} aria-label="Close contributors"><X size={18}/></button></header>
      <p>Official target: {number(data.goal)} {unitLabel(data.goalUnit)}</p><p>SUM of entity Results in {unitLabel(data.resultUnit)} produces one official Result.</p>
      <ul>{data.subjects?.map(subject => <li key={subject.subjectExternalId}>{subject.subjectLabel} / {subject.subjectCode ?? subject.subjectExternalId}</li>)}</ul>
      {data.groupGoal && <p>Informational group goal: {number(data.groupGoal.value)} {data.groupGoal.unit}</p>}
      <footer><button type="button" onClick={onClose}>Close</button></footer>
    </section>
  </div>;
  return <div className="entity-goals-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="entity-goals-dialog" role="dialog" aria-modal="true" aria-labelledby="entity-goals-dialog-title">
      <header><div><span>{data.configCode}</span><h2 id="entity-goals-dialog-title">Entity goals</h2><p>{data.kpiCode} · {data.kpiName}</p></div><button type="button" onClick={onClose} aria-label="Close entity goals"><X size={18}/></button></header>
      <EntityGoalsSummary count={data.subjectGoals.length} subjectType={data.subjectType} groupGoal={data.groupGoal}/>
      <div className="entity-goals-table-wrap"><table><thead><tr><th>Entity</th><th>Code</th><th>Target</th><th>Goal Unit</th><th>Result unit</th></tr></thead><tbody>
        {data.subjectGoals.map(goal => <tr key={goal.subjectExternalId}><td><strong>{goal.subjectLabel}</strong></td><td>{goal.subjectCode ?? "—"}</td><td>{data.historical && (goal.goal ?? 0) > 0 ? "+" : ""}{number(goal.goal)}</td><td>{unitLabel(goal.goalUnit) || unitLabel(data.goalUnit) || "—"}</td><td>{unitLabel(goal.resultUnit) || unitLabel(data.resultUnit) || "—"}</td></tr>)}
      </tbody></table></div>
      <footer><span>Snapshot with {data.subjectGoals.length} executable entity {data.subjectGoals.length === 1 ? "evaluation" : "evaluations"}.</span><button type="button" className="button secondary" onClick={onClose}>Close</button></footer>
    </section>
  </div>;
}
