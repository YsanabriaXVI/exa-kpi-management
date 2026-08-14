import { useState } from "react";
import { UserActionLogFilters } from "../components/UserActionLogFilters";
import { UserActionLogTable } from "../components/UserActionLogTable";
import { useUserActionLogs } from "../hooks/useUserActionLogs";
import type { UserActionLogFilters as Filters } from "../types/user-action-log.types";
export function UserActionLogPage() { const [filters, setFilters] = useState<Filters>({}); const query = useUserActionLogs(filters); return <main className="ru-page"><header className="ru-header"><div><nav>Roles/Users / User Action Log</nav><h1>User Action Log</h1><p>Audit user, role, permission, and department scope changes.</p></div></header><section className="ru-card"><UserActionLogFilters value={filters} onChange={setFilters}/><UserActionLogTable logs={query.data ?? []}/><p className="ru-note">Mock events reset on refresh. The backend will later persist immutable records in <code>audit_logs</code>.</p></section></main>; }
