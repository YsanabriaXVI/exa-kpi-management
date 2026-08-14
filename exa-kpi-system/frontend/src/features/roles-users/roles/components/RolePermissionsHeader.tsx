import { Link } from "react-router-dom";
import type { Role } from "../types/role.types";
export function RolePermissionsHeader({ role }: { role: Role }) { return <header className="ru-header"><div><nav><Link to="/app/roles-users/roles">Roles & Permissions</Link> / Role Permissions</nav><h1>{role.name} Permissions</h1><p>Configure inherited operations for this role. Department access scope remains assigned separately per user.</p></div></header>; }
