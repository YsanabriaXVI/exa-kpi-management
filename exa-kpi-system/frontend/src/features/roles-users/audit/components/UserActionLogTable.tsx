import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../../../components/SortableTableHeader";
import { RowsPerPageSelect } from "../../../../components/RowsPerPageSelect";
import type { UserActionLog } from "../types/user-action-log.types";

type LogSortKey = "occurredAt" | "action" | "target" | "oldValue" | "newValue" | "performedBy" | "performedByRole" | "notes";

export function UserActionLogTable({ logs }: { logs: UserActionLog[] }) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: LogSortKey; direction: SortDirection }>({ key: "occurredAt", direction: "desc" });
  const sortedLogs = useMemo(() => [...logs].sort((left, right) => compareSortValues(logSortValue(left, sort.key), logSortValue(right, sort.key), sort.direction)), [logs, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const paginatedLogs = sortedLogs.slice(pageStart, pageStart + pageSize);
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);

  const sortBy = (key: LogSortKey) => { setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  const header = (key: LogSortKey, label: string) => <SortableTableHeader active={sort.key === key} direction={sort.direction} onSort={() => sortBy(key)}>{label}</SortableTableHeader>;

  return <div className="ru-table-wrap ru-overview-table-wrap">
    <table className="ru-table ru-overview-table ru-log-table"><thead><tr>{header("occurredAt", "Date / Time")}{header("action", "Action")}{header("target", "Target User / Role")}{header("oldValue", "Old Value")}{header("newValue", "New Value")}{header("performedBy", "Performed By")}{header("performedByRole", "Performed By Role")}{header("notes", "Notes")}</tr></thead><tbody>{paginatedLogs.length ? paginatedLogs.map((log) => <tr key={log.id}><td>{new Date(log.occurredAt).toLocaleString()}</td><td><span className="ru-event">{log.action === "USER_SOFT_DELETED" ? "USER DELETED" : log.action.replace(/_/g, " ")}</span></td><td>{log.target}</td><td>{log.oldValue}</td><td>{log.newValue}</td><td>{log.performedBy}</td><td>{log.performedByRole}</td><td>{log.notes}</td></tr>) : <tr><td colSpan={8}>No audit events match the filters.</td></tr>}</tbody></table>
    <footer className="ru-table-footer"><span>Showing <strong>{sortedLogs.length ? pageStart + 1 : 0}-{Math.min(pageStart + pageSize, sortedLogs.length)}</strong> of <strong>{sortedLogs.length}</strong> records</span><RowsPerPageSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} /><div className="ru-pagination" aria-label="User Action Log pagination"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button><span className="current" aria-current="page">{page}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Next page"><ChevronRight size={15} /></button></div></footer>
  </div>;
}

function logSortValue(log: UserActionLog, key: LogSortKey): string | number { return key === "occurredAt" ? new Date(log.occurredAt).getTime() : log[key]; }
