export interface AuditUser {
  user_id?: number
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
}

export interface FormatStatus {
  id: number
  name: string
}

export interface FormatBuilder {
  id?: number
  invoiceformat_id?: number
  name: string
  type: string
  tax_rate?: number
  currency?: string | number
  note?: string | number
  othercharges?: number
  totalkm?: number
  duedays?: number
  font?: number
  row?: number
  status: FormatStatus | number
  create_user?: AuditUser
  update_user?: AuditUser
  create_date?: string | number | null
  update_date?: string | number | null
  create_date_format?: string
  update_date_format?: string
  items?: Record<string, any>
}

export interface FormatListParams {
  search?: string | null
  sortField?: string
  sortOrder?: number
  rows?: number
  first?: number
}

export interface FormatBuilderState {
  formats: FormatBuilder[]
  currentFormat: FormatBuilder | null
  loading: boolean
  error: string | Record<string, any> | null
  total: number
  tripitems: any[]
}
