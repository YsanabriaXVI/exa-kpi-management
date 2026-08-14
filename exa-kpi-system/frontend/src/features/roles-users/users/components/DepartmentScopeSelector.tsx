import { mockDepartments } from "../../mocks/roles-users.mock";

export function DepartmentScopeSelector({ selected, isGlobal, onSelectedChange, onGlobalChange }: { selected: string[]; isGlobal: boolean; onSelectedChange: (ids: string[]) => void; onGlobalChange: (value: boolean) => void }) {
  return <fieldset className="ru-scope"><legend>Access Scope</legend><label className="ru-check"><input type="checkbox" checked={isGlobal} onChange={(e) => onGlobalChange(e.target.checked)} /> Global access</label><div className="ru-scope-grid">{mockDepartments.map((department) => <label className="ru-check" key={department.id}><input type="checkbox" disabled={isGlobal} checked={selected.includes(department.id)} onChange={(e) => onSelectedChange(e.target.checked ? [...selected, department.id] : selected.filter((id) => id !== department.id))} />{department.name}</label>)}</div><small>Selected departments determine which business data this user can access and manage.</small></fieldset>;
}
