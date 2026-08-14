import { Search } from "lucide-react";
import { mockUserActionLogs } from "../../mocks/roles-users.mock";
import type { AuditAction, UserActionLogFilters as Filters } from "../types/user-action-log.types";

const actions: AuditAction[] = ["USER_CREATED", "USER_ENABLED", "USER_DISABLED", "USER_SOFT_DELETED", "ROLE_ASSIGNED", "ROLE_CHANGED", "DEPARTMENT_SCOPE_CHANGED", "ROLE_PERMISSIONS_UPDATED"];
const actors = [...new Set(mockUserActionLogs.map((log) => log.performedBy))];

export function UserActionLogFilters({ value, onChange }: { value: Filters; onChange: (value: Filters) => void }) {
  return <div className="ru-filters ru-audit-filters">
    <label className="ru-search"><Search size={16}/><input aria-label="Search audit log" placeholder="Search target, actor, or notes" value={value.search ?? ""} onChange={(event) => onChange({ ...value, search: event.target.value })}/></label>
    <select aria-label="Filter by actor" value={value.actor ?? ""} onChange={(event) => onChange({ ...value, actor: event.target.value })}><option value="">All actors</option>{actors.map((actor) => <option key={actor}>{actor}</option>)}</select>
    <select aria-label="Filter by action" value={value.action ?? ""} onChange={(event) => onChange({ ...value, action: event.target.value as Filters["action"] })}><option value="">All actions</option>{actions.map((action) => <option key={action} value={action}>{action.replace(/_/g, " ")}</option>)}</select>
    <label className="ru-date-filter"><span>From</span><input type="date" value={value.dateFrom ?? ""} onChange={(event) => onChange({ ...value, dateFrom: event.target.value })}/></label>
    <label className="ru-date-filter"><span>To</span><input type="date" value={value.dateTo ?? ""} onChange={(event) => onChange({ ...value, dateTo: event.target.value })}/></label>
  </div>;
}
