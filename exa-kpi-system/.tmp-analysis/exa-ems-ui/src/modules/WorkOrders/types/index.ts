/**
 * Work Orders Module - TypeScript Types
 * Modern type definitions for Work Orders
 */

export interface WorkOrder {
  work_order_id?: number
  ref_number?: string
  trip_number?: number
  client_name?: string
  client_id?: number | string
  pick_up_city?: string
  pick_up_date_time?: number // Unix timestamp
  delivered_city?: string
  deliver_date_time?: number // Unix timestamp
  return_city?: string
  cargo_type?: string
  status?: string
  invoice_price?: number
  inv_km?: number
  invoice_other_charges?: number
  active?: boolean | string
  created_at?: string
  updated_at?: string

  // Form fields
  is_return_trip?: boolean
  is_return?: boolean
  cargo_id?: string | number
  city_a_id?: string | number
  city_b_id?: string | number
  city_c_id?: string | number
  city_a_name?: string
  city_b_name?: string
  city_c_name?: string
  location_a_id?: string | number
  location_b_id?: string | number
  location_c_id?: string | number
  date_a?: number | null
  date_b?: number | null
  customs?: boolean
  trips?: WorkOrderTrip[]
  work_order_routes?: any[]
}

export interface WorkOrderTrip {
  trip_id?: number | null
  price?: number | null
  others?: number | null
  container_ref?: string
  driver?: number | null
  inventory?: number | null
  km?: number | null
  container_type_id?: string | number | null
  payment?: any
  invoice?: any
  close_trip_date?: string | number | null
}

export interface WorkOrderListParams {
  filter?: any[]
  search?: string | null
  match?: any
  rows?: number // Limit
  first?: number // Offset
  sortField?: string
  sortOrder?: number // 1 for ASC, -1 for DESC
  filters?: Record<string, any>
}

export interface WorkOrderListResponse {
  orders: WorkOrder[]
  total: number
  offset: number
  limit: number
}

export interface WorkOrderState {
  list: WorkOrder[]
  workorder: WorkOrder | null
  isLoading: boolean
  total: number
  start: number // Offset for pagination
  page: number
  status: string | null
  errors: any
}

// Export formats
export interface ExportColumn {
  header: string
  field: string
}

export interface ExportParams extends WorkOrderListParams {
  columns: ExportColumn[]
}

// Filter types
export interface ColumnFilter {
  value: any
  matchMode?: string
}

export interface TableFilters {
  [key: string]: ColumnFilter
}
