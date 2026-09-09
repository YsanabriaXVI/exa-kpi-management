import { Target, UsersRound, X } from "lucide-react";
import type { GroupGoal, SubjectGoal, SubjectType } from "./kpi-config.types";
import "./entity-goals-display.css";

export type EntityGoalsData = {
  configCode: string;
  kpiCode: string;
  kpiName: string;
  subjectType?: SubjectType | null;
  subjectGoals: SubjectGoal[];
  groupGoal?: GroupGoal | null;
  goalUnit?: string;
  resultUnit?: string;
  historical?: boolean;
};

const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
const subjectLabel = (value?: string | null) => value ? value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()) : "Entity";

export function EntityGoalsSummary({ count, subjectType, groupGoal, onView }: { count: number; subjectType?: string | null; groupGoal?: { value: number | string; unit: string } | null; onView?: () => void }) {
  return <div className="entity-goals-summary">
    <span className="entity-goals-badge"><UsersRound size={13}/>By Entity</span>
    <span>{count} {count === 1 ? subjectLabel(subjectType) : `${subjectLabel(subjectType)} entities`}</span>
    {groupGoal && <span className="entity-group-goal"><Target size={13}/>Group goal: <strong>{number(Number(groupGoal.value))} {groupGoal.unit}</strong></span>}
    {onView && <button type="button" onClick={onView}>View entity goals</button>}
  </div>;
}

export function EntityGoalsModal({ data, onClose }: { data: EntityGoalsData; onClose: () => void }) {
  return <div className="entity-goals-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="entity-goals-dialog" role="dialog" aria-modal="true" aria-labelledby="entity-goals-dialog-title">
      <header><div><span>{data.configCode}</span><h2 id="entity-goals-dialog-title">Entity goals</h2><p>{data.kpiCode} · {data.kpiName}</p></div><button type="button" onClick={onClose} aria-label="Close entity goals"><X size={18}/></button></header>
      <EntityGoalsSummary count={data.subjectGoals.length} subjectType={data.subjectType} groupGoal={data.groupGoal}/>
      <div className="entity-goals-table-wrap"><table><thead><tr><th>Entity</th><th>Code</th><th>Target</th><th>Target unit</th><th>Result unit</th></tr></thead><tbody>
        {data.subjectGoals.map(goal => <tr key={goal.subjectExternalId}><td><strong>{goal.subjectLabel}</strong></td><td>{goal.subjectCode ?? "—"}</td><td>{data.historical && goal.goal > 0 ? "+" : ""}{number(goal.goal)}</td><td>{goal.goalUnit ?? data.goalUnit ?? "—"}</td><td>{goal.resultUnit ?? data.resultUnit ?? "—"}</td></tr>)}
      </tbody></table></div>
      <footer><span>Snapshot with {data.subjectGoals.length} executable entity {data.subjectGoals.length === 1 ? "evaluation" : "evaluations"}.</span><button type="button" className="button secondary" onClick={onClose}>Close</button></footer>
    </section>
  </div>;
}
