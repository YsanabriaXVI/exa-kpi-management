export interface GasSupplier {
  gasStationsParentId: number
  name: string
  phone?: string
  email?: string
  address?: string
  creditDays?: number | string
  countryId?: number
  departmentId?: number
  cityId?: number
  companyId?: number
  status?: number
  active?: number
  createdAt?: string
  updatedAt?: string
  createdAtFormat?: string
  updatedAtFormat?: string
  country_format?: string
  department_format?: string
  city_format?: string
  company_format?: string
  country?: { countryId: number; name: string }
  department?: { deparmentid: number; name: string }
  city?: { citieid: number; name: string }
  company?: { companyId: number; name: string }
  subdivisions?: number[]
  Subdivisions?: { subdivisionId: number }[]
}

export interface GasStore {
  gasStationsId: number
  gasStationsParentId: number
  name: string
  phone?: string
  email?: string
  address?: string
  creditDays?: number | string
  countryId?: number
  departmentId?: number
  cityId?: number
  companyId?: number
  status?: number
  active?: number
  createdAt?: string
  updatedAt?: string
  createdAtFormat?: string
  updatedAtFormat?: string
  country_format?: string
  department_format?: string
  city_format?: string
  company_format?: string
  country?: { countryId: number; name: string }
  department?: { deparmentid: number; name: string }
  city?: { citieid: number; name: string }
  company?: { companyId?: number; company_id?: number; name: string }
  subdivisions?: number[]
  Subdivisions?: { subdivisionId: number }[]
}

export type GasSupplierForm = Partial<GasSupplier>
export type GasStoreForm = Partial<GasStore>

export type GasSupplierErrors =
  | Record<string, string>
  | string
  | { message?: string; name?: string; code?: string; stack?: string }
  | null
  | undefined
