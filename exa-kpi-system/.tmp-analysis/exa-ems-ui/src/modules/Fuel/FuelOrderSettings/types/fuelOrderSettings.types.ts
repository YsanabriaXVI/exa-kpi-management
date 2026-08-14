export interface FuelLimitRule {
  period?: string | number
  assetIds?: number[]
  fuelLimitLtrs?: number | string
  takenIds?: number[]
}

export interface FuelOrderSettings {
  fuelModuleConfigId: number
  name: string
  company_id?: number | null
  subdivisions?: number[] | null
  workTypes?: number[] | null
  assetTypes?: number[] | null
  clients?: number[] | null
  fuelOrderTypeId?: number | null
  ratebuilderId?: number | null
  tripRequired?: number
  approvalRequired?: number
  suggestedAmountRequired?: number
  expTimeBefore?: number
  expTimeAfter?: number
  minimumApprove?: number
  maximumApprove?: number
  fuelLimitRules?: FuelLimitRule[]
  fuelVariationMin?: number | string
  fuelVariationMax?: number | string
  fuelSupplyVariationMin?: number | string
  fuelSupplyVariationMax?: number | string
  fuelStatementRequired?: number
  supplierStatementRequired?: number
  maxFuelFeature?: number
  approvers?: number[] | null
  createdAt?: string | number
  updatedAt?: string | number
  createdAtFormat?: string
  updatedAtFormat?: string
  CreatedBy?: { firstName?: string; lastName?: string; fullName?: string }
  UpdatedBy?: { firstName?: string; lastName?: string; fullName?: string }
}

export type FuelOrderSettingsForm = Partial<FuelOrderSettings>

export type FuelOrderSettingsErrors =
  | Record<string, string>
  | string
  | { message?: string; name?: string; code?: string; stack?: string }
  | null
  | undefined

export interface PlateOption {
  asset_id: number
  name: string
  plate?: string
}

export interface SubdivisionUser {
  user_id: number
  subdivision_id?: number
  name: string
  email?: string
}

export interface AttributeItem {
  attribute_item_id: number
  name: string
  value?: string | number
}
