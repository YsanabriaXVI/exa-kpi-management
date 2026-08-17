import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../../../components/SortableTableHeader";
import { RowsPerPageSelect } from "../../../../components/RowsPerPageSelect";
import { PaginationControls } from "../../../../components/PaginationControls";
import type { RoleWithUserCount } from "../types/role.types";
import { RoleStatusBadge } from "./RoleStatusBadge";

type RoleSortKey = "name" | "description" | "usersCount" | "status";

export function RolesTable({ roles }: { roles: RoleWithUserCount[] }) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: RoleSortKey; direction: SortDirection }>({ key: "name", direction: "asc" });
  const sortedRoles = useMemo(() => [...roles].sort((left, right) => compareSortValues(left[sort.key], right[sort.key], sort.direction)), [roles, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedRoles.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const paginatedRoles = sortedRoles.slice(pageStart, pageStart + pageSize);
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);

  const sortBy = (key: RoleSortKey) => { setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const header = (key: RoleSortKey, label: string) => <SortableTableHeader active={sort.key === key} direction={sort.direction} onSort={() => sortBy(key)}>{label}</SortableTableHeader>;

  return <div className="ru-table-wrap ru-overview-table-wrap">
    <table className="ru-table ru-overview-table ru-roles-table">
      <thead><tr>{header("name", "Role Name")}{header("description", "Description")}{header("usersCount", "Users Count")}{header("status", "Status")}<th>Actions</th></tr></thead>
      <tbody>{paginatedRoles.length ? paginatedRoles.map((role) => <tr key={role.id}>
        <td><strong>{role.name}</strong>{role.isProtected && <span className="ru-protected">Protected</span>}</td>
        <td>{role.description}</td><td>{role.usersCount}</td><td><RoleStatusBadge status={role.status} /></td>
        <td className="ru-role-action-cell"><Link className="ru-manage-permissions" to={`/app/roles-users/roles/${role.id}/permissions`} aria-label={`Manage permissions for ${role.name}`}><span>Manage Permissions</span><ChevronRight size={16} aria-hidden="true" /></Link></td>
      </tr>) : <tr><td colSpan={5}>No roles found.</td></tr>}</tbody>
    </table>
    <TableFooter page={page} pageSize={pageSize} total={sortedRoles.length} totalPages={totalPages} label="Roles" onPage={setPage} onPageSize={setPageSize} />
  </div>;
}

function TableFooter({ page, pageSize, total, totalPages, label, onPage, onPageSize }: { page: number; pageSize: number; total: number; totalPages: number; label: string; onPage: React.Dispatch<React.SetStateAction<number>>; onPageSize: (size: number) => void }) {
  const start = (page - 1) * pageSize;
  return <footer className="ru-table-footer"><span>Showing <strong>{total ? start + 1 : 0}-{Math.min(start + pageSize, total)}</strong> of <strong>{total}</strong> records</span><RowsPerPageSelect value={pageSize} onChange={(value) => { onPageSize(value); onPage(1); }} /><PaginationControls page={page} totalPages={totalPages} onPage={(nextPage) => onPage(nextPage)} label={`${label} pagination`} className="ru-pagination" /></footer>;
}
