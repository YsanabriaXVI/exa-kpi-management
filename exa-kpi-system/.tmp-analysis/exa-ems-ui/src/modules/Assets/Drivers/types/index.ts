export interface Driver {
  asset_id?: number
  module_id?: number

  // Friendly fields mapped from attributes
  first_name?: string
  last_name?: string
  years_of_experience?: string | number
  hiring_date?: string | number
  subdivision?: string
  telephone_1_honduras?: string
  telephone_2_nicaragua?: string
  telephone_3_el_salvador?: string
  telephone_4_guatemala?: string
  truck_assigned?: string
  driver_status?: string
  rtn?: string
  address?: string
  internal_identification?: string
  vuceh_coments?: string
  vuceh_code?: string
  generic_name1?: string
  generic_value1?: string | number
  generic_name2?: string
  generic_value2?: string | number
  generic_name3?: string
  generic_value3?: string | number

  // Dynamic attributes container
  attributes?: Record<string | number, any>

  [key: string]: any
}

export interface DriverState {
  list: Driver[]
  currentDriver: Driver | null
  loading: boolean
  error: string | null
}
