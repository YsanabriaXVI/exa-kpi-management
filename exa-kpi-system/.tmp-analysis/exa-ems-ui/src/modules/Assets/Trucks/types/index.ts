export interface Truck {
  asset_id?: number
  module_id?: number
  generic_name1?: string // Operational Permit
  generic_value1?: number | string // Operational Permit Exp. Date (unix or string)
  generic_name2?: string // Exploitation Permit
  generic_value2?: number | string // Exploitation Permit Exp. Date
  generic_name3?: string // Registration Permit
  generic_value3?: number | string // Registration Permit Exp. Date
  
  // Attributes container (dynamic values keyed by attribute_id)
  attributes?: Record<string | number, any>

  // Any other dynamic attributes or flattened properties
  [key: string]: any
}

export interface TruckState {
  list: Truck[]
  loading: boolean
  error: string | Record<string, any> | null
  currentTruck: Truck | null
}
