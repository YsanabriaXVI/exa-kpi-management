export interface FuelPriceEntry {
  fuelPriceId?: number
  fuelPriceLocationWeekId?: number
  fuelTypeId: number
  unitTypeId: number
  price: string | number
}

export interface FuelPriceLocation {
  fuelPriceLocationId?: number
  countryId: number
  departmentId: number
  cityId: number
  city?: { citieid: number; name: string }
  country?: { countryId: number; name: string }
  department?: { deparmentid: number; name: string }
}

export interface FuelPrice {
  fuelPriceLocationWeekId: number
  fuelPriceLocationId?: number
  weekId: number
  exchangeRate: string | number | null
  companyId?: number
  createdBy?: number
  updatedBy?: number
  createdAt?: string
  updatedAt?: string
  createdAtFormat?: string
  updatedAtFormat?: string
  FuelPriceLocation?: FuelPriceLocation
  fuelPrices?: FuelPriceEntry[]
  Week?: {
    weekid: number
    weekno: string
    weekyear: string
    startdate?: string
    enddate?: string
  }
  UserCreatedBy?: { firstName?: string; lastName?: string }
  UserUpdatedBy?: { firstName?: string; lastName?: string }
  weekLabel?: string
  countryName?: string
  departmentName?: string
  cityName?: string
  createdByName?: string
  updatedByName?: string
}

export interface FuelPriceForm {
  fuelPriceLocationWeekId?: number | null
  weekId: number | null
  exchangeRate: string
  countryId: number | null
  departmentId: number | null
  cityId: number | null
  prices: Record<string, string>
}

export interface CountryOption {
  countryId: number
  name: string
}

export interface DepartmentOption {
  deparmentid: number
  name: string
}

export interface CityOption {
  citieid: number
  name: string
  variantid?: number | null
}

export interface FuelTypeOption {
  attributeItemid: number
  name: string
}

export interface UnitTypeOption {
  unitTypeId: number
  name: string
}

export type FuelPriceErrors =
  | Record<string, string>
  | string
  | { message?: string }
  | null
  | undefined
