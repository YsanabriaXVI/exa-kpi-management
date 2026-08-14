import type { UserStatus } from "../types/user.types";
export function UserStatusBadge({ status }: { status: UserStatus }) { return <span className={`ru-status ${status.toLowerCase()}`}>{status}</span>; }
