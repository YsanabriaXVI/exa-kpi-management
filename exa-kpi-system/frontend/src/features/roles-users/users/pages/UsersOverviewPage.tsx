import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Plus, Power, PowerOff, Trash2, X } from "lucide-react";
import { useUsers } from "../hooks/useUsers";
import { useUpdateUserStatus } from "../hooks/useUpdateUserStatus";
import { useSoftDeleteUser } from "../hooks/useSoftDeleteUser";
import type { User, UserFilters as Filters } from "../types/user.types";
import { UserFilters } from "../components/UserFilters";
import { UsersTable } from "../components/UsersTable";
import { ActionToast, type ActionToastTone } from "../../../../components/ActionToast";

type Confirmation = { user: User; action: "enable" | "disable" | "delete" };

export function UsersOverviewPage() {
  const [filters, setFilters] = useState<Filters>({ statuses: ["Active"] });
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: ActionToastTone } | null>(null);
  const query = useUsers(filters);
  const status = useUpdateUserStatus();
  const remove = useSoftDeleteUser();

  const confirmAction = async () => {
    if (!confirmation) return;
    try {
      if (confirmation.action === "delete") {
        await remove.mutateAsync(confirmation.user.id);
        setToast({ message: "User removed from the normal users list. Historical records were preserved.", tone: "info" });
      } else {
        const enabled = confirmation.action === "enable";
        await status.mutateAsync({ userId: confirmation.user.id, status: enabled ? "Active" : "Inactive" });
        setToast({ message: `User ${enabled ? "enabled" : "disabled"} successfully.`, tone: "success" });
      }
      setConfirmation(null);
    } catch (reason) {
      setToast({ message: reason instanceof Error ? reason.message : "Action failed.", tone: "error" });
    }
  };

  return <main className="ru-page">
    {toast && <ActionToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    <header className="ru-header"><div><nav>Roles/Users / All Users</nav><h1>Users Overview</h1><p>Manage user accounts, primary roles, statuses, and department access scopes.</p></div><Link className="ru-button primary" to="/app/roles-users/users/new"><Plus size={16} /> Add New User</Link></header>
    <section className="ru-card"><UserFilters value={filters} onChange={setFilters} /><UsersTable users={query.data ?? []} loading={query.isLoading} onStatus={(user) => setConfirmation({ user, action: user.status === "Active" ? "disable" : "enable" })} onDelete={(user) => setConfirmation({ user, action: "delete" })} /></section>
    {confirmation && <UserConfirmationModal confirmation={confirmation} pending={status.isPending || remove.isPending} onCancel={() => setConfirmation(null)} onConfirm={confirmAction} />}
  </main>;
}

function UserConfirmationModal({ confirmation, pending, onCancel, onConfirm }: { confirmation: Confirmation; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { user, action } = confirmation;
  const content = action === "disable"
    ? { title: "Disable User?", text: "This user will no longer be able to access the KPI system. Their historical records and activity will be preserved.", label: "Disable User", icon: PowerOff }
    : action === "enable"
      ? { title: "Enable User?", text: "This user will regain access according to their assigned role and department access scope.", label: "Enable User", icon: Power }
      : { title: "Delete User?", text: "This user will be removed from the normal users list. Historical activity and references will be preserved.", label: "Delete User", icon: Trash2 };
  const Icon = content.icon;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) onCancel(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onCancel, pending]);

  return <div className="ru-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
    <section className={`ru-confirm-dialog ${action === "delete" ? "destructive" : ""}`} role="dialog" aria-modal="true" aria-labelledby="ru-confirm-title" aria-describedby="ru-confirm-description">
      <header><span className="ru-confirm-icon">{action === "delete" ? <AlertTriangle size={22} /> : <Icon size={22} />}</span><div><h2 id="ru-confirm-title">{content.title}</h2><p>{action === "delete" ? "Administrative removal" : "Account access"}</p></div><button type="button" onClick={onCancel} disabled={pending} aria-label="Close confirmation"><X size={18} /></button></header>
      <div className="ru-confirm-body"><dl><div><dt>User Name</dt><dd>{user.fullName}</dd></div><div><dt>Username</dt><dd>{user.username}</dd></div></dl><p id="ru-confirm-description">{content.text}</p></div>
      <footer><button type="button" className="ru-button secondary" onClick={onCancel} disabled={pending}>Cancel</button><button type="button" className={`ru-button ${action === "delete" ? "danger" : "primary"}`} onClick={onConfirm} disabled={pending}><Icon size={15} />{pending ? "Processing…" : content.label}</button></footer>
    </section>
  </div>;
}
