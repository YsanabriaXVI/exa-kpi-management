import { mockUserActionLogs } from "../../mocks/roles-users.mock";
import type { UserActionLogFilters } from "../types/user-action-log.types";

export async function listUserActionLogs(filters: UserActionLogFilters = {}) {
  const term = filters.search?.toLowerCase().trim();
  const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).getTime() : null;
  return Promise.resolve(mockUserActionLogs.filter((log) => {
    const occurredAt = new Date(log.occurredAt).getTime();
    return (!filters.action || log.action === filters.action) &&
      (!filters.actor || log.performedBy === filters.actor) &&
      (from === null || occurredAt >= from) &&
      (to === null || occurredAt <= to) &&
      (!term || [log.target, log.notes, log.performedBy].some((value) => value.toLowerCase().includes(term)));
  }));
}
