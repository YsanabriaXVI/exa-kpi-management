export interface AuditUser {
  user_id?: number
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
}

export interface CountryRef {
  country_id?: number
  id?: number
  name?: string
}

export interface DepartmentRef {
  department_id?: number
  id?: number
  name?: string
  country?: CountryRef
}

export interface CityRef {
  city_id?: number
  id?: number
  name?: string
  department?: DepartmentRef
}

export interface GeofencePoint {
  lat: number
  lng: number
}

export interface Location {
  location_id?: number
  id?: number
  name: string
  city_id?: number
  city?: CityRef
  address?: string | null
  reference?: string | null
  phone?: string | null
  status?: number
  latitud?: number | null
  longitud?: number | null
  geofence_coordinates?: GeofencePoint[] | null
  create_user?: AuditUser
  update_user?: AuditUser
  update_date_format?: string
  update_date?: string | number
  updated_at?: string | number
}

export interface LocationsState {
  locations: Location[]
  cities: CityRef[]
  currentLocation: Location | null
  loading: boolean
  error: string | Record<string, any> | null
  total: number
}
