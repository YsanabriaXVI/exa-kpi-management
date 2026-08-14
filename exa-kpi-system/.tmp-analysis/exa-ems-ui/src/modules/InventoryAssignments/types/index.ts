export interface InventoryAssignment {
  asset_id: number
  truck?: string
  truck_status_id?: number | null
  truck_status_label?: string
  driver?: number | null
  driverName?: string
  driver_status_id?: number | null
  driver_status_label?: string
  availability?: string
  current_trip?: string
  last_trip?: string
  last_trip_hours?: string | number | null
  last_trip_days?: string | number | null
  subdivision?: string
  subdivision_id?: number | string | null
  truck_current_status?: string
  driver_current_status?: string
  internal_supplier?: string
  internal_supplier_id?: number | string | null
  [key: string]: any
}

export interface InventoryDriverOption {
  asset_id?: number
  name?: string
  subdivision?: number | string | null
  driver_status?: number | string | null
  [key: string]: any
}

export interface AttributeOption {
  value: string
  label: string
}

export interface InternalSupplierOption {
  value: string
  label: string
  subdivision_id: number | null
}

export interface InventoryAssignmentsState {
  list: InventoryAssignment[]
  loading: boolean
  error: string | null
  driverOptions: InventoryDriverOption[]
  driverStatusOptions: AttributeOption[]
  truckStatusOptions: AttributeOption[]
  internalSupplierOptions: InternalSupplierOption[]
  updatingIds: number[]
}
