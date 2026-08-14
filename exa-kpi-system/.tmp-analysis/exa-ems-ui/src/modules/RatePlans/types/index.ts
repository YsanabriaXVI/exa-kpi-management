/**
 * Rate Plans Types
 */

export interface AuditUser {
  user_id?: number
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
}

export interface RatePlanStatus {
  id: number
  name: string
}

export interface RatePlan {
  id?: number
  name: string
  status: RatePlanStatus | number
  create_user?: AuditUser
  update_user?: AuditUser
  create_date?: string | number | null
  update_date?: string | number | null
  update_date_format?: string
}

export interface RatePlanListParams {
  search?: string | null
  sortField?: string
  sortOrder?: number
  rows?: number
  first?: number
}

export interface RatePlansState {
  rateplans: RatePlan[]
  currentRatePlan: RatePlan | null
  loading: boolean
  error: string | null
  total: number
}
