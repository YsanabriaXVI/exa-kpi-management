import { Search } from "lucide-react";
import { mockDepartments } from "../../mocks/roles-users.mock";
import { useRoles } from "../../roles/hooks/useRoles";
import type { UserFilters as Filters, UserStatus } from "../types/user.types";
import { UserFilterMultiSelect } from "./UserFilterMultiSelect";

export function UserFilters({ value, onChange }: { value: Filters; onChange: (value: Filters) => void }) {
  const roles = useRoles();
  return <div className="ru-filters">
    <label className="ru-search"><Search size={16} /><input aria-label="Search users" placeholder="Search username, name, or email" value={value.search ?? ""} onChange={(event) => onChange({ ...value, search: event.target.value })} /></label>
    <UserFilterMultiSelect label="All roles" options={(roles.data ?? []).map((role) => ({ value: role.id, label: role.name }))} selected={value.roleIds ?? []} onChange={(roleIds) => onChange({ ...value, roleIds })} />
    <UserFilterMultiSelect label="All statuses" options={(["Active", "Inactive"] as UserStatus[]).map((status) => ({ value: status, label: status }))} selected={value.statuses ?? []} onChange={(statuses) => onChange({ ...value, statuses: statuses as UserStatus[] })} />
    <UserFilterMultiSelect label="All departments" options={mockDepartments.map((department) => ({ value: department.id, label: department.name }))} selected={value.departmentIds ?? []} onChange={(departmentIds) => onChange({ ...value, departmentIds })} />
    <label className="ru-show-deleted"><input type="checkbox" checked={value.includeDeleted ?? false} onChange={(event) => onChange({ ...value, includeDeleted: event.target.checked })} /><span>Show deleted users</span></label>
  </div>;
}
