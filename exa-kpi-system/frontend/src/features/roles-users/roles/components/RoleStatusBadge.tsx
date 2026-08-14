import type { RoleStatus } from "../types/role.types";
export function RoleStatusBadge({ status }: { status: RoleStatus }) { return <span className={`ru-status ${status.toLowerCase()}`}>{status}</span>; }
