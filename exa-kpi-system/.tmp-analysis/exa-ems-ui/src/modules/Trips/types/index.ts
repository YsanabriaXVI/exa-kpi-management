export type TripTrackPointType =
  | 'TRACK_POINT_PICK_UP'
  | 'TRACK_POINT_CUSTOMS'
  | 'TRACK_POINT_DELIVER'
  | 'TRACK_POINT_RETRUN_TO'

export interface TripListItem {
  trip_id: number
  create_date?: number
  truck_lvpk_date?: number
  close_trip_date?: number
  work_order_id?: number
  work_order_date?: number
  work_order_ref?: string
  client?: string
  subdivision?: string
  assigned_inventory?: string
  pick_up?: string
  pick_up_exp_date?: number
  delivery?: string
  deliver_exp_date?: number
  return_to?: string
  chassis?: string
  km_initial?: number
  km_final?: number
  genset?: string
  hour_initial?: number
  hour_final?: number
  container_no?: string
  TPL?: string
  TTransitCL?: string
  TCL?: string
  TTransitDL?: string
  TDL?: string
  TTransitDOL?: string
  TDOL?: string
  free_time?: number
  other_charges?: number
  payment_other_charges?: number
  total_hours?: number
  customs?: number
  time_waiting_to_be_assigned?: number
  time_waiting_to_start_trip?: number
  time_current_status?: string
  trip_status_name?: string
  auditor_status_name?: string
  pick_up_boleta?: string
  delivery_boleta?: string
  internal_supplier?: string
  invoice_price_format?: string
  invoice_km?: number
  invoice_rate?: string
  payment_price_format?: string
  payment_km?: number
  payment_rate?: string
}

export type Trip = TripListItem

export interface TripWorkOrder {
  work_order_id?: number
  ref_number?: string
  create_date?: number | string
  pick_up_date_time?: number | string
  deliver_date_time?: number | string
  client?: {
    client_id?: number
    name?: string
    exchange_rate?: number
  }
  cargo_type?: string
  city_a?: { name?: string }
  city_b?: { name?: string }
  city_c?: { name?: string }
  location_a?: { name?: string; address?: string }
  location_b?: { name?: string; address?: string }
  location_c?: { name?: string; address?: string }
  is_return_trip?: boolean
  customs?: number
}

export interface TripRate {
  trip_rate_id: number
  route?: {
    route_code?: string
  }
  inv_km?: number
  inv_price?: number
  pay_km?: number
  pay_price?: number
  counter_rate?: number
  [key: string]: any
}

export interface TripChargeItem {
  id?: number
  trip_charge_id?: number
  value: number
  type: number | string
  name?: string
  description?: string
  statement_type?: number
}

export interface TripTrackPoint {
  type: TripTrackPointType
  cityName?: string
  location?: string
  address?: string
}

export interface TripDetails extends Omit<TripListItem, 'subdivision' | 'chassis' | 'genset' | 'free_time'> {
  work_order?: TripWorkOrder
  inventory?: InventoryItem
  inventoryId?: number | null
  driver?: {
    asset_id?: number
    first_name?: string
    last_name?: string
    name?: string
  }
  subdivision?: {
    id?: number
    subdivision_id?: number
    subdivisionId?: number
    name?: string
    exchange_rate?: number
  }
  genset?: Asset | null
  gensetId?: number | null
  genset_data?: Asset | null
  chassis?: Asset | null
  chassisId?: number | null
  chassis_data?: Asset | null
  track?: TripTrackPoint[]
  rates?: TripRate[]
  invoice_charge_items: TripChargeItem[]
  payment_charge_items: TripChargeItem[]
  trip_open?: number | string | null
  trip_active?: number | string | null
  trip_status?: number | string | null
  isCustoms?: boolean
  isClosedTrip?: boolean
  total_trip_hours?: number | string | null
  total_trip_days?: string | null
  free_time?: number | string | null
  time_to_be_assigned?: number | string | null
  time_assigned?: number | string | null
  time_transit_customs?: number | string | null
  time_transit_delivery?: number | string | null
  timer_transit_d_o_l?: number | string | null
  timer_pick_up?: number | string | null
  timer_delivery?: number | string | null
  timer_d_o_l?: number | string | null
  timer_customs?: number | string | null
  [key: string]: any
}

export interface TripListParams {
  filter: any[]
  search: string | null
  match: string | null
  rows: number
  first: number
  sortField: string | null
  sortOrder: number | null
  filters?: Record<string, any>
}

export interface TripAuditorListParams {
  filter: any[]
  search: string | null
  match: string | null
  rows: number
  first: number
  sortField: string | null
  sortOrder: number | null
  filters?: Record<string, any>
}

export interface TripListResponse {
  trips: TripListItem[]
  total: number
  offset: number
}

export interface TripAuditorRow {
  trip: number
  trip_created?: number
  trip_pick_up?: number
  trip_close?: number
  work_order?: number
  work_order_date?: number
  work_order_date_ref?: string
  client?: string
  subdivision?: string
  assigned?: string
  pick_up?: string
  work_order_pick_up_date?: number
  delivery?: string
  work_order_deliver_date?: number
  return?: string
  chassis?: string
  km_initial?: number
  km_final?: number
  genset?: string
  hour_initial?: number
  hour_final?: number
  container?: string
  TPL?: string
  TTCL?: string
  TCL?: string
  TTDL?: string
  TDL?: string
  TTDOL?: string
  TDOL?: string
  free_time?: number
  other_charges_payment?: number
  other_charges?: number
  total_hours?: number
  customs?: number
  to_be_assigned?: number
  t_assigned?: number
  current_status?: string
  status?: string
  invoice_status?: string
  invoice_status_id?: number
  payment_status?: string
  payment_status_id?: number
  review_status?: string
  invoice_price?: number
  inv_km?: number
  inv_rate?: number
  payment_price?: number
  payment_price_lps?: number
  pay_km?: number
  pay_rate?: number
  pick_up_boleta?: string
  delivery_boleta?: string
  [key: string]: any
}

export interface TripAuditorListResponse {
  trips: TripAuditorRow[]
  total: number
  offset: number
}

export interface ExportParams {
  type: string
  format: string
  filter?: any[]
  search?: string
  sortField?: string
  sortOrder?: number
}

export interface AttributeItem {
  attribute_item_id: number
  name: string
  color?: string
  value?: string | number
}

export interface AttributeWithItems {
  attribute_id: number
  name: string
  items: AttributeItem[]
}

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface Asset {
  id: number
  asset_id?: number
  name?: string
  chassis_no?: string
  genset_no?: string
  plate?: string
  brand?: string
  model?: string
  color?: string
  serial_no?: string
  date_purchased?: number
  initial_miles?: number
  brand_engine?: string
  [key: string]: any
}

export interface InventoryItem {
  asset_id: number
  name: string
  truck?: string
  driver_name?: string
  availability?: string
  subdivision_id?: number
  subdivision_name?: string
  subdivision_exchange_rate?: number
  driver_id?: number
  [key: string]: any
}
