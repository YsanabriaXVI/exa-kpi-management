import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../../../components/SortableTableHeader";
import { RowsPerPageSelect } from "../../../../components/RowsPerPageSelect";
import { PaginationControls } from "../../../../components/PaginationControls";
import { CURRENT_USER_ID } from "../../mocks/roles-users.mock";
import type { User } from "../types/user.types";
import { UserActionsMenu } from "./UserActionsMenu";
import { UserStatusBadge } from "./UserStatusBadge";

const fmt = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";

function AccessScope({ user }: { user: User }) {
  const [expanded, setExpanded] = useState(false);
  if (user.isGlobalScope) return <span className="ru-scope-pill global">Global</span>;
  const visible = user.departments.slice(0, 2);
  const remaining = user.departments.slice(2);
  return <div className="ru-scope-summary">{visible.map((department) => <span className="ru-scope-pill" key={department.id}>{department.name}</span>)}{remaining.length > 0 && <button type="button" className="ru-scope-more" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>+{remaining.length} more{expanded && <span role="tooltip">{remaining.map((department) => department.name).join(", ")}</span>}</button>}</div>;
}

export function UsersTable({ users, loading, onStatus, onDelete }: { users: User[]; loading: boolean; onStatus: (user: User) => void; onDelete: (user: User) => void }) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: UserSortKey; direction: SortDirection }>({ key: "username", direction: "asc" });
  const sortedUsers = useMemo(() => [...users].sort((left, right) => compareSortValues(userSortValue(left, sort.key), userSortValue(right, sort.key), sort.direction)), [users, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const paginatedUsers = sortedUsers.slice(pageStart, pageStart + pageSize);
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);
  const sortBy = (key: UserSortKey) => { setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const header = (key: UserSortKey, label: string) => <SortableTableHeader active={sort.key === key} direction={sort.direction} onSort={() => sortBy(key)}>{label}</SortableTableHeader>;

  return <div className="ru-table-wrap ru-users-table-wrap">
    <table className="ru-table ru-users-table">
      <thead><tr>{header("username", "Username")}{header("name", "Name")}{header("email", "Email")}{header("role", "Role")}{header("scope", "Access Scope")}{header("status", "Status")}{header("lastLogin", "Last Login")}<th>Actions</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={8}>Loading users…</td></tr> : paginatedUsers.length ? paginatedUsers.map((user) => <tr key={user.id} className={user.deletedAt ? "ru-user-row-deleted" : user.status === "Inactive" ? "ru-user-row-inactive" : undefined}><td><strong>{user.username}</strong>{user.id === CURRENT_USER_ID && <small className="ru-current-user">You · Admin</small>}</td><td>{user.fullName}</td><td>{user.email}</td><td>{user.roleName}</td><td><AccessScope user={user} /></td><td>{user.deletedAt ? <span className="ru-status deleted">Deleted</span> : <UserStatusBadge status={user.status}/>}</td><td>{fmt(user.lastLoginAt)}</td><td><UserActionsMenu user={user} onStatus={() => onStatus(user)} onDelete={() => onDelete(user)} /></td></tr>) : <tr><td colSpan={8}>No users match the selected filters.</td></tr>}</tbody>
    </table>
    <footer className="ru-table-footer"><span>Showing <strong>{sortedUsers.length ? pageStart + 1 : 0}-{Math.min(pageStart + pageSize, sortedUsers.length)}</strong> of <strong>{sortedUsers.length}</strong> records</span><RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} /><PaginationControls page={page} totalPages={totalPages} onPage={setPage} label="Users pagination" className="ru-pagination" /></footer>
  </div>;
}

type UserSortKey = "username" | "name" | "email" | "role" | "scope" | "status" | "lastLogin";
function userSortValue(user: User, key: UserSortKey): string | number {
  switch (key) { case "name": return user.fullName; case "role": return user.roleName; case "scope": return user.isGlobalScope ? "Global" : user.departments.map((department) => department.name).join(" "); case "lastLogin": return user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : 0; default: return user[key]; }
}
