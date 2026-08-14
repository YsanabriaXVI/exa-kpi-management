export interface Incident {
  incident_id?: number
  subject?: string
  description?: string
  event_date?: string | number
  event_date_format?: string
  incident_type?: string
  incident_type_obj?: Array<{ name?: string }>
  incident_type_obj_format?: string
  incident_cause?: string
  incident_cause_obj?: Array<{ name?: string }>
  incident_cause_obj_format?: string
  responsible?: string
  responsible_data?: Array<{ name?: string }>
  responsible_data_format?: string
  driver_id?: number | string
  driver_name?: string
  truck_id?: number | string
  truck_plate?: string
  chassis_id?: number | string
  chassis_no?: string
  genset_id?: number | string
  genset_no?: string
  client_id?: number | string
  client_name?: string
  subdivision_id?: number | string
  subdivision_name?: string
  trip_id?: number | string
  gas_supplier_id?: number | string
  gas_supplier_name?: string
}

export interface IncidentsState {
  list: Incident[]
  current: Incident | null
  loading: boolean
  error: string | null
}
