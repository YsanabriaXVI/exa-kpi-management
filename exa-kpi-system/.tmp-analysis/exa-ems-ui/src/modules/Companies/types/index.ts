export interface AuditUser {
  user_id?: number
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
}

export interface Company {
  company_id?: number
  id?: number
  name: string
  description?: string | null
  address?: string | null
  phone?: string | null
  reference?: string | null
  status?: number
  logo_url?: string | null
  create_user?: AuditUser
  update_user?: AuditUser
  update_date_format?: string
}

export interface CompaniesState {
  companies: Company[]
  currentCompany: Company | null
  loading: boolean
  error: string | null
  total: number
  activeTab: 'all' | 'active' | 'inactive'
}
