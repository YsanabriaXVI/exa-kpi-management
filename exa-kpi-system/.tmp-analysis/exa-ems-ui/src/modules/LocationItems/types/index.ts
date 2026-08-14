export type LocationTypeKey = 'countries' | 'departments' | 'cities' | 'variants'

export interface AuditUser {
  user_id?: number
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
}

export interface Country {
  country_id?: number
  id?: number
  name: string
  status?: number
  create_user?: AuditUser
  update_user?: AuditUser
  update_date_format?: string
}

export interface Variant {
  variant_id?: number
  id?: number
  name: string
  status?: number
  create_user?: AuditUser
  update_user?: AuditUser
  update_date_format?: string
}

export interface Department {
  department_id?: number
  id?: number
  name: string
  country_id?: number
  country?: Country
  status?: number
  create_user?: AuditUser
  update_user?: AuditUser
  update_date_format?: string
}

export interface City {
  city_id?: number
  id?: number
  name: string
  code?: string | number | null
  department_id?: number
  department?: Department
  country?: Country
  variant_id?: number | null
  variant?: Variant | null
  fullName?: string
  status?: number
  create_user?: AuditUser
  update_user?: AuditUser
  update_date_format?: string
}

export type LocationItem = Country | Department | City | Variant

export interface LocationItemsState {
  data: {
    countries: Country[]
    departments: Department[]
    cities: City[]
    variants: Variant[]
  }
  current: Partial<LocationItem> | null
  activeType: LocationTypeKey
  loading: boolean
  error: string | null
}
