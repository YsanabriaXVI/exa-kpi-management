export interface AuditUser {
  user_id?: number
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
}

export interface Week {
  week_id?: number
  id?: number
  week_no?: number
  week_year?: number
  start_date?: string | null // YYYY-MM-DD
  end_date?: string | null // YYYY-MM-DD
  start_date_display?: string | null
  end_date_display?: string | null
  active?: number
  status?: number
  create_user?: AuditUser
  update_user?: AuditUser
  update_date_format?: string
}

export interface WeeksState {
  weeks: Week[]
  currentWeek: Week | null
  loading: boolean
  error: string | Record<string, any> | null
  total: number
}
