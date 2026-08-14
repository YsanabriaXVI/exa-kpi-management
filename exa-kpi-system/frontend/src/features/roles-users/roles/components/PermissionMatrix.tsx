import type { Permission, PermissionModule } from "../types/permission.types";
import { PermissionCheckbox } from "./PermissionCheckbox";

const modules: PermissionModule[] = ["KPI Management", "KPI Pool", "ScoreCards", "Monitoring Results", "Reports", "Roles/Users"];
const generalActions = ["View", "Manage", "Export"] as const;

function friendlyPermissionLabel(permission: Permission) {
  return permission.label.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function PermissionMatrix({ permissions, enabled, onToggle }: { permissions: Permission[]; enabled: string[]; protectedRole: boolean; onToggle: (code: string) => void }) {
  return (
    <div className="ru-permissions-layout">
      <div className="ru-table-wrap">
        <table className="ru-table ru-matrix">
          <thead><tr><th>Module</th>{generalActions.map((action) => <th key={action}>{action}</th>)}</tr></thead>
          <tbody>{modules.map((module) => {
            const row = permissions.filter((permission) => permission.module === module);
            return <tr key={module}><th>{module}</th>{generalActions.map((action) => {
              const permission = row.find((item) => item.action === action);
              return <td key={action}>{permission && <PermissionCheckbox label={`${module} ${action}`} checked={enabled.includes(permission.code)} onChange={() => onToggle(permission.code)} />}</td>;
            })}</tr>;
          })}</tbody>
        </table>
      </div>
      <section className="ru-special-permissions">
        <header><h3>Special Permissions</h3><p>Granular operations that are not covered by a module-level Manage permission.</p></header>
        {modules.map((module) => {
          const special = permissions.filter((permission) => permission.module === module && permission.action === "Special");
          if (!special.length) return null;
          return <div key={module}><h4>{module}</h4><div>{special.map((permission) => <label key={permission.code}><PermissionCheckbox label={permission.label} checked={enabled.includes(permission.code)} onChange={() => onToggle(permission.code)} /><span>{friendlyPermissionLabel(permission)}</span></label>)}</div></div>;
        })}
      </section>
    </div>
  );
}
