import { Eye, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { CURRENT_USER_ID } from "../../mocks/roles-users.mock";
import type { User } from "../types/user.types";

export function UserActionsMenu({ user, onStatus, onDelete }: { user: User; onStatus: () => void; onDelete: () => void }) {
  if (user.deletedAt) return <span className="ru-deleted-action-state">No actions available</span>;
  const isCurrentUser = user.id === CURRENT_USER_ID;
  const cannotChangeStatus = isCurrentUser && user.status === "Active";
  const statusLabel = user.status === "Active" ? "Disable" : "Enable";
  return <div className="table-actions ru-user-table-actions" aria-label={`Actions for ${user.fullName}`}>
    <Link className="icon-button view" to={`/app/roles-users/users/${user.id}`} title="View Profile" aria-label={`View ${user.fullName} profile`}><Eye size={15} aria-hidden="true" /></Link>
    <Link className="icon-button edit" to={`/app/roles-users/users/${user.id}/edit`} title="Edit User" aria-label={`Edit ${user.fullName}`}><Pencil size={15} aria-hidden="true" /></Link>
    <button type="button" className={`icon-button ${user.status === "Active" ? "disable" : "enable"}`} onClick={onStatus} disabled={cannotChangeStatus} title={cannotChangeStatus ? "You cannot disable your own account." : `${statusLabel} User`} aria-label={`${statusLabel} ${user.fullName}`}>
      {user.status === "Active" ? <PowerOff size={15} aria-hidden="true" /> : <Power size={15} aria-hidden="true" />}
    </button>
    <button type="button" className="icon-button delete" onClick={onDelete} disabled={isCurrentUser} title={isCurrentUser ? "You cannot delete your own account." : "Delete User"} aria-label={isCurrentUser ? "Delete User unavailable: you cannot delete your own account" : "Delete User"}><Trash2 size={15} aria-hidden="true" /></button>
  </div>;
}
