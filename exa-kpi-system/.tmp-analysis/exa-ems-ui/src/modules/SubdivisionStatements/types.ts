export interface SubdivisionStatement {
  paymentId?: number
  id?: number // Alias for paymentId for compatibility
  subdivisionid?: number | string
  subdivision_name?: string
  invoiceformatid?: number | string
  format_name?: string
  weeks?: string
  daterange?: string
  currencyrate?: number | string
  invoicenumber?: string
  create_date?: string
  duedays_date?: string
  notes?: string
  status_format?: string
  inv_final_total?: number | string
  inv_final_total_format?: string
  inv_total_rate_km_lps?: number | string
  inv_total_rate_km_lps_format?: string
  inv_othercharges?: number | string
  inv_othercharges_format?: string
  inv_tax?: number | string
  inv_tax_format?: string
  inv_subtotal?: number | string
  inv_subtotal_format?: string
  inv_total_km?: number | string
  inv_total_km_rate_d?: number | string
  inv_total_km_rate_d_format?: string
  payment_module?: any
  format?: any
  subdivision?: any
  is_active_week?: boolean
  week_list?: any[]
  pay_module_id?: number
  payment_core_id?: string
  payment_core_number?: number
  payment_transfer_no?: string
  payment_date?: string
  statusid?: number
  create_date_format?: string
  trip_count?: number
  clients?: string
  clients_list?: any[]
  due_date?: string | number
  past_due_days?: number
}

export interface SubdivisionStatementTableData {
  header: { title: string; value: string }[]
  footer: { title: string; value: string }[]
  trips: Record<string, any>[]
  total: String[]
  columns: string[]
  broken: {
    trip_id: string
    route: string
    kilometer: number
    price: number
    internal_supplier_name: string | null
  }[]
}

export interface PaginatedStatementsResult {
  list: SubdivisionStatement[]
  total: number
  limit: number
  offset: number
}

export interface SubdivisionStatementsState {
  list: SubdivisionStatement[]
  total: number
  current: SubdivisionStatement | null
  trips: SubdivisionStatementTableData | null
  loading: boolean
  error: string | null
}
