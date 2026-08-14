/**
 * Users Module Types
 */

export interface UserStatus {
  id: number
  name: string
}

export interface UserProfile {
  job_title?: string
  phone?: string
  ext?: string
  address?: string
  city?: string
  zipcode?: string
  state?: string
  country?: string
}

export interface Company {
  company_id: number
  name: string
}

export interface Role {
  role_id: number
  name: string
}

export interface UserRoleCompany {
  company_item_id?: number | string
  company: Company
  role: Role
}

export interface Client {
  client_id: number
  name?: string
}

export interface Subdivision {
  subdivision_id: number
  name?: string
  status?: number
}

export interface UserDriver {
  asset_id?: number
  first_name?: string
  last_name?: string
}

export interface User {
  user_id?: number
  email: string
  first_name: string
  last_name: string
  phone?: string
  password?: string
  password2?: string
  status: UserStatus
  profile: UserProfile
  user_role_companies: UserRoleCompany[]
  clients: number[]
  subdivisions: number[]
  clientsList?: Client[]
  subdivisionsList?: Subdivision[]
  active?: number
  driver_id?: number | null
  driver?: UserDriver
}

export interface UserListParams {
  filter?: any[]
  search?: string | null
  match?: string | null
  rows: number
  first: number
  sortField: string
  sortOrder: number
  filters?: Record<string, string>
}

export interface UsersState {
  users: User[]
  currentUser: User | null
  roles: Role[]
  clients: Client[]
  subdivisions: Subdivision[]
  loading: boolean
  error: string | null
  total: number
  pagination: {
    page: number
    limit: number
    total: number
  }
}

