export interface SummaryRow {
  weekno: string | number
  weekStartDate: string
  weekEndDate: string
  weekname: string
  fuelOrderId: number
  tripId: number
  gasStation: string
  client: string
  subdivision: string
  internalSupplier: string
  dateSchedule: string
  orderType: string
  assetType: string
  plate: string
  fuelRequestLtr: number
  reconciliationStatus: string
  subdivision_payment_status: string
  gas_supplier_payment_status: string
  [key: string]: any
}

export interface AttributeOption {
  value: number
  label: string
}

export interface FuelWeekSummaryFilters {
  weekIds?: number[]
  gasSupplierIds?: number[]
  subdivisionIds?: number[]
  clientIds?: number[]
  fuelStatementStatusIds?: number[]
  supplierStatementStatusIds?: number[]
  assetTypeIds?: number[]
  orderTypeIds?: number[]
  reconciliationStatusIds?: number[]
  [key: string]: any
}

export type FuelWeekSummaryErrorState = string | { message?: string; [key: string]: any } | null
