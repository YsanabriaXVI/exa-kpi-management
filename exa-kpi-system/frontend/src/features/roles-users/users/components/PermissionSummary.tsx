import type { Role } from "../../roles/types/role.types";

const modules = [
  ["KPI Management", "KPI_DEFINITION"],
  ["KPI Pool", "KPI_POOL"],
  ["ScoreCards", "SCORECARD"],
  ["Monitoring Results", "MONITORING"],
  ["Reports", "REPORTS"],
  ["Users & Access", "ROLES_USERS"],
] as const;

export function PermissionSummary({ role }: { role?: Role | null }) {
  const codes = role?.permissionCodes ?? [];
  return (
    <section className="ru-card">
      <h2>Permissions Summary</h2>
      <div className="ru-permission-summary">
        {modules.map(([label, prefix]) => {
          const count = codes.filter((code) => code.startsWith(prefix)).length;
          return (
            <article key={prefix}>
              <strong>{label}</strong>
              <span>{role?.isProtected ? "Full access" : count ? `${count} inherited permissions` : "No access"}</span>
            </article>
          );
        })}
      </div>
      <p className="ru-note">{codes.length} permissions inherited from {role?.name ?? "the primary role"}. Role permissions define what the user can do; department scope is managed separately.</p>
    </section>
  );
}
