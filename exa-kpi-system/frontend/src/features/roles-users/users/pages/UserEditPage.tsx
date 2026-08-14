import { useNavigate, useParams } from "react-router-dom";
import { AddNewUserForm } from "../components/AddNewUserForm";
import { useUser } from "../hooks/useUser";
import { useUpdateUser } from "../hooks/useUpdateUser";

export function UserEditPage() {
  const { userId } = useParams();
  const query = useUser(userId);
  const update = useUpdateUser();
  const navigate = useNavigate();
  if (!query.data) return <main className="ru-page">{query.isLoading ? "Loading user…" : "User not found."}</main>;
  const user = query.data;
  return <main className="ru-page ru-narrow">
    <header className="ru-header"><div><nav>Roles/Users / All Users / Edit User</nav><h1>Edit User</h1><p>Update profile details, primary role, and access scope.</p></div></header>
    <section className="ru-card">
      <AddNewUserForm
        submitLabel="Save Changes"
        initial={{ username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, password: "mock-unchanged", roleId: user.roleId, departmentIds: user.accessScopes, isGlobalScope: user.isGlobalScope, sendAccountEmail: false }}
        onSubmit={async (value) => {
          await update.mutateAsync({ userId: user.id, input: { username: value.username, email: value.email, firstName: value.firstName, lastName: value.lastName, roleId: value.roleId, departmentIds: value.departmentIds, isGlobalScope: value.isGlobalScope } });
          navigate(`/app/roles-users/users/${user.id}`);
        }}
      />
    </section>
  </main>;
}
