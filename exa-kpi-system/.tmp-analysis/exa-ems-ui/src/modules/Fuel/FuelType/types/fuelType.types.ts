export interface FuelType {
  fuelTypeId: number
  name: string
  attributeid?: number
  status?: number
  flat_name_id?: string
  createuser?: number
  updateuser?: number
  createdate?: string
  updatedate?: string
  createdateFormat?: string
  updatedateFormat?: string
  createdByName?: string
  updatedByName?: string
}

export type FuelTypeForm = Partial<FuelType>

export type FuelTypeErrors =
  | Record<string, string>
  | string
  | { message?: string; name?: string; code?: string; stack?: string }
  | null
  | undefined
