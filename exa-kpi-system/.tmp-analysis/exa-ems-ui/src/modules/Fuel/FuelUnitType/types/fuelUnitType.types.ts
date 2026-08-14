export interface FuelUnitType {
  unitTypeId: number
  name: string
  createDate?: string | number
  updateDate?: string | number
  createDateFormat?: string
  updateDateFormat?: string
  createdBy?: {
    firstName?: string
    lastName?: string
    fullName?: string
  }
  updatedBy?: {
    firstName?: string
    lastName?: string
    fullName?: string
  }
}

export type FuelUnitTypeForm = Partial<FuelUnitType>

export type FuelUnitTypeErrors =
  | Record<string, string>
  | string
  | { message?: string; name?: string; code?: string; stack?: string }
  | null
  | undefined
