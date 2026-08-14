import { useNavigate } from "react-router-dom";
import { AddNewUserForm } from "../components/AddNewUserForm";
import { useCreateUser } from "../hooks/useCreateUser";
export function AddNewUserPage() { const create = useCreateUser(); const navigate = useNavigate(); return <main className="ru-page ru-narrow"><header className="ru-header"><div><nav>Roles/Users / All Users / Add New User</nav><h1>Add New User</h1><p>Create a brand new user and add them to this site.</p></div></header><section className="ru-card"><AddNewUserForm onSubmit={async (value) => { await create.mutateAsync(value); navigate("/app/roles-users/users"); }}/></section></main>; }
