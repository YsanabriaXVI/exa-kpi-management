import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, UserRound } from "lucide-react";
import { useRoles } from "../../roles/hooks/useRoles";
import {
  addNewUserSchema,
  type AddNewUserFormValues,
} from "../schemas/user.schemas";
import { DepartmentScopeSelector } from "./DepartmentScopeSelector";

const defaults: AddNewUserFormValues = {
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: "",
  roleId: "",
  departmentIds: [],
  isGlobalScope: false,
  sendAccountEmail: true,
};

type AddNewUserFormProps = {
  initial?: Partial<AddNewUserFormValues>;
  onSubmit: (value: AddNewUserFormValues) => Promise<unknown>;
  submitLabel?: string;
  lockRole?: boolean;
};

export function AddNewUserForm({
  initial,
  onSubmit,
  submitLabel = "Create User",
  lockRole = false,
}: AddNewUserFormProps) {
  const navigate = useNavigate();
  const roles = useRoles(false);
  const editing = Boolean(initial);
  const [value, setValue] = useState<AddNewUserFormValues>(() => ({
    ...defaults,
    ...initial,
    confirmPassword: initial?.password ?? initial?.confirmPassword ?? "",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = addNewUserSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    try {
      setSaving(true);
      setError("");
      await onSubmit(parsed.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ru-form ru-user-information-form" onSubmit={submit}>
      <fieldset className="ru-form-section" aria-labelledby="account-information-title">
        <div className="ru-user-form-heading"><span><UserRound size={20} /></span><div><h2 id="account-information-title">Account Information</h2><p>Identity and sign-in details for this user.</p></div></div>
        <div className="ru-form-grid">
          <label>
            Username *
            <input required value={value.username} onChange={(event) => setValue({ ...value, username: event.target.value })} />
          </label>
          <label>
            Email *
            <input type="email" required value={value.email} onChange={(event) => setValue({ ...value, email: event.target.value })} />
          </label>
          <label>
            First Name
            <input value={value.firstName ?? ""} onChange={(event) => setValue({ ...value, firstName: event.target.value })} />
          </label>
          <label>
            Last Name
            <input value={value.lastName ?? ""} onChange={(event) => setValue({ ...value, lastName: event.target.value })} />
          </label>
          {!editing && (
            <>
              <label>
                Password *
                <input type="password" required value={value.password} onChange={(event) => setValue({ ...value, password: event.target.value })} />
              </label>
              <label>
                Confirm Password *
                <input type="password" required value={value.confirmPassword} onChange={(event) => setValue({ ...value, confirmPassword: event.target.value })} />
              </label>
            </>
          )}
        </div>
      </fieldset>

      <fieldset className="ru-form-section" id="scope" aria-labelledby="role-access-title">
        <div className="ru-user-form-heading"><span><ShieldCheck size={20} /></span><div><h2 id="role-access-title">Role &amp; Access</h2><p>Role controls what the user can do. Access Scope controls where they can do it.</p></div></div>
        <label>
          Primary Role *
          <select disabled={lockRole} required value={value.roleId} onChange={(event) => setValue({ ...value, roleId: event.target.value })}>
            <option value="">Select primary role</option>
            {roles.data?.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
          <small>One primary role determines inherited permissions.</small>
        </label>
        <DepartmentScopeSelector
          selected={value.departmentIds}
          isGlobal={value.isGlobalScope}
          onSelectedChange={(departmentIds) => setValue({ ...value, departmentIds })}
          onGlobalChange={(isGlobalScope) => setValue({ ...value, isGlobalScope, departmentIds: isGlobalScope ? [] : value.departmentIds })}
        />
      </fieldset>

      {!editing && (
        <label className="ru-check">
          <input type="checkbox" checked={value.sendAccountEmail} onChange={(event) => setValue({ ...value, sendAccountEmail: event.target.checked })} />
          Send the new user an email about the account (mock only)
        </label>
      )}
      {!editing && <p className="ru-note">Choose a secure temporary password for the user's initial sign-in.</p>}
      {error && <p className="ru-error" role="alert">{error}</p>}
      <div className="ru-form-actions">
        <button type="button" className="ru-button secondary" onClick={() => navigate(-1)}>Cancel</button>
        <button className="ru-button primary" disabled={saving}>{saving ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}
