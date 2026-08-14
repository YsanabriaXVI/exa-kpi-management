export interface Invoice {
  invoice_id?: number
  id?: number
  clientid?: number | string
  client_name?: string
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
  payment_module?: any
  format?: any
  client?: any
  is_active_week?: boolean
  week_list?: any[]
  pay_module_id?: number
  create_date_format?: string
  inv_total_km?: number | string
  inv_total_km_rate_d?: number | string
  inv_total_km_rate_d_format?: string
}

export interface InvoiceTableData {
  header: { title: string; value: string }[]
  footer: { title: string; value: string }[]
  trips: Record<string, any>[]
  total: string[]
  columns: string[]
  broken: {
    trip_id: string
    route: string
    kilometer: number
    price: number
    internal_supplier_name: string | null
  }[]
}

export interface PaginatedInvoicesResult {
  list: Invoice[]
  total: number
  limit: number
  offset: number
}

export interface InvoicesState {
  list: Invoice[]
  total: number
  current: Invoice | null
  trips: InvoiceTableData | null
  loading: boolean
  error: string | null
}
