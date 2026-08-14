export interface AuditUser {
  user_id?: number
  first_name?: string
  last_name?: string
  email?: string
  full_name?: string
}

export interface RoleStatus {
  id: number
  name: string
}

export interface Role {
  role_id?: number
  name: string
  status: RoleStatus
  description?: string
  permissions?: Record<string, number[]>
  mobile_field_restrictions?: Record<string, string[]>
  create_user?: AuditUser
  update_user?: AuditUser
  create_date?: string | number
  update_date?: string | number
  update_date_format?: string
}

export interface RolesState {
  roles: Role[]
  currentRole: Role | null
  loading: boolean
  error: string | Record<string, any> | null
}
