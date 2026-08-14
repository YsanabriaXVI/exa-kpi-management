export type AuditAction =
  | "USER_CREATED"
  | "USER_ENABLED"
  | "USER_DISABLED"
  | "USER_SOFT_DELETED"
  | "ROLE_ASSIGNED"
  | "ROLE_CHANGED"
  | "DEPARTMENT_SCOPE_CHANGED"
  | "ROLE_PERMISSIONS_UPDATED";

export type UserActionLog = {
  id: string;
  occurredAt: string;
  action: AuditAction;
  target: string;
  oldValue: string;
  newValue: string;
  performedBy: string;
  performedByRole: string;
  notes: string;
};

export type UserActionLogFilters = {
  search?: string;
  actor?: string;
  action?: AuditAction | "";
  dateFrom?: string;
  dateTo?: string;
};
