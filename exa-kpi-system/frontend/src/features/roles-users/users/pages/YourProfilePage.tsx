import { useCurrentProfile } from "../hooks/useCurrentProfile";
import { useRole } from "../../roles/hooks/useRole";
import { UserProfileCard } from "../components/UserProfileCard";
import { PermissionSummary } from "../components/PermissionSummary";
export function YourProfilePage() { const profile = useCurrentProfile(); const role = useRole(profile.data?.roleId); if (!profile.data) return <main className="ru-page">Loading profile…</main>; return <main className="ru-page ru-narrow"><header className="ru-header"><div><nav>My Profile</nav><h1>Your Profile</h1><p>Administrator account with full mock access to the Roles/Users workflow.</p></div></header><UserProfileCard user={profile.data} role={role.data}/><PermissionSummary role={role.data}/></main>; }
