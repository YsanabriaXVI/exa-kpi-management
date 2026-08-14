export interface FuelOrderPdfConfig {
  id: number
  configName: string
  subdivisions?: string
  subdivisionIds?: number[]
  fuelPriceEnabled?: boolean
  importEnabled?: boolean
  totalEnabled?: boolean
  createdate?: string
  updatedate?: string
  createdateFormat?: string
  updatedateFormat?: string
  createdByName?: string
  updatedByName?: string
}

export type FuelOrderPdfConfigForm = Partial<FuelOrderPdfConfig>

export type FuelOrderPdfConfigErrors =
  | Record<string, string>
  | string
  | { message?: string; name?: string; code?: string; stack?: string }
  | null
  | undefined
