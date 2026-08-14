import { Link, useParams } from "react-router-dom";
import { useUser } from "../hooks/useUser";
import { useRole } from "../../roles/hooks/useRole";
import { UserProfileCard } from "../components/UserProfileCard";
import { PermissionSummary } from "../components/PermissionSummary";
export function UserDetailPage() { const { userId } = useParams(); const user = useUser(userId); const role = useRole(user.data?.roleId); if (user.isLoading) return <main className="ru-page">Loading user…</main>; if (!user.data) return <main className="ru-page"><h1>User not found</h1></main>; return <main className="ru-page ru-narrow"><header className="ru-header"><div><nav>Roles/Users / All Users / User Profile</nav><h1>User Profile</h1><p>Account, role, and effective scope information.</p></div><Link className="ru-button secondary" to={`/app/roles-users/users/${user.data.id}/edit`}>Edit User</Link></header><UserProfileCard user={user.data} role={role.data}/><PermissionSummary role={role.data}/></main>; }
