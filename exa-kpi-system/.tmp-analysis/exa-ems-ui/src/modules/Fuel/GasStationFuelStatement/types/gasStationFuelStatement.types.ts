export interface InvoiceLine {
  id: string
  invoiceLineId?: number
  tripId?: number
  fuelOrderId?: number
  statementId?: number
  equipmentId?: number
  fuelPrice: number
  exchangeRateLps: number
  fuelExchangeRateLps?: number
  fuelRequestLiters: number
  fuelRequestLtr?: number
  lempTotal: number
  dollarTotal: number
  gsReceiptFuelPrice?: number
  gsReceiptFuelSuppliedLiters: number
  gsReceiptLempTotal: number
  gsReceiptDollarTotal: number
  gasStationReceiptTransactionId?: number
  gasStationReceiptDocumentNo?: string
  uploadSessionId?: number
  assetType?: string
  orderType?: string
  series?: string
  client?: string
  subdivision?: string
  city?: string
  station?: string
  fuelType?: string
  [key: string]: any
}

export interface WeekOption {
  label: string
  value: number
}

export interface GasStationFuelStatement {
  fuelStatementId: number
  gasStationId: number | null
  GasStation?: { name: string; [key: string]: any }
  comments?: string | null
  paid?: number
  paymentModuleId?: number | null
  weekIds: WeekOption[] | number[]
  subdivisionIds: number[]
  invoiceLines: InvoiceLine[]
  weeks?: { weekId: number; week_data: { weekno: number; weekyear: number } }[]
  viewData?: any[]
  fuelOrders?: string
  subdivisions?: string
  reconciliations?: string
  gasStationName?: string
  [key: string]: any
}

export type GasStationFuelStatementForm = Omit<GasStationFuelStatement, 'fuelStatementId'> & {
  fuelStatementId?: number
}

export interface GasStationFuelStatementErrors {
  message?: string
  [key: string]: any
}

export type GasStationFuelStatementErrorState = GasStationFuelStatementErrors | string | null
