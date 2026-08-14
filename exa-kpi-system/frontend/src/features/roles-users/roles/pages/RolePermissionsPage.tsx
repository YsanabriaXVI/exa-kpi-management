import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useRole } from "../hooks/useRole";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { useUpdateRolePermissions } from "../hooks/useUpdateRolePermissions";
import { ActionToast } from "../../../../components/ActionToast";
import { PermissionMatrix } from "../components/PermissionMatrix";
import { RolePermissionsHeader } from "../components/RolePermissionsHeader";

export function RolePermissionsPage() {
  const { roleId } = useParams();
  const role = useRole(roleId);
  const query = useRolePermissions(roleId);
  const update = useUpdateRolePermissions();
  const [enabled, setEnabled] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (query.data) setEnabled(query.data.enabledCodes);
  }, [query.data]);

  if (!role.data || !query.data) return <main className="ru-page">Loading permission matrix…</main>;
  const roleData = role.data;
  const toggle = (code: string) => setEnabled((items) => items.includes(code) ? items.filter((item) => item !== code) : [...items, code]);

  return <main className="ru-page">
    {message && <ActionToast message={message} onClose={() => setMessage("")} />}
    <RolePermissionsHeader role={roleData}/>
    {roleData.isProtected && <p className="ru-warning">Admin is protected from being disabled or deleted. Its permission matrix can still be configured here.</p>}
    <section className="ru-card">
      <PermissionMatrix permissions={query.data.permissions} enabled={enabled} protectedRole={roleData.isProtected} onToggle={toggle}/>
      <div className="ru-form-actions">
        <button className="ru-button primary" disabled={update.isPending} onClick={async () => {
          await update.mutateAsync({ roleId: roleData.id, permissionCodes: enabled });
          setMessage("Permissions saved successfully.");
        }}>Save Permissions</button>
      </div>
      <p className="ru-note">Frontend controls improve usability only. The backend must independently validate permissions and department scope.</p>
    </section>
  </main>;
}
