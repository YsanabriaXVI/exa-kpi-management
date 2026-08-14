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
  formattedDateScheduled?: string
  internalSupplier?: string
  assetType?: string
  orderType?: string
  series?: string
  client?: string
  city?: string
  station?: string
  fuelType?: string
  fuelRequest?: string
  dateSchedule?: string
  [key: string]: any
}

export interface LinkedStatementOption {
  label: string | number
  value: string | number
}

export interface WeekOption {
  label: string
  value: number
}

export interface SubdivisionFuelStatement {
  fuelStatementId: number
  subdivisionId: number | null
  subdivision_data?: { name: string; [key: string]: any }
  clientId?: number | null
  comments?: string | null
  personalizedTrips: string
  deducted?: number
  paymentModuleId?: number | null
  weekIds: WeekOption[] | number[]
  statementIds: (string | number)[]
  gasSupplierIds: number[]
  invoiceLines: InvoiceLine[]
  linkedStatements?: LinkedStatementOption[]
  weeks?: { weekId: number; week_data: { weekno: number; weekyear: number } }[]
  viewData?: any[]
  gasStations?: string
  fuelOrders?: string
  [key: string]: any
}

export type SubdivisionFuelStatementForm = Omit<SubdivisionFuelStatement, 'fuelStatementId'> & {
  fuelStatementId?: number
}

export interface SubdivisionFuelStatementErrors {
  message?: string
  [key: string]: any
}

export type SubdivisionFuelStatementErrorState = SubdivisionFuelStatementErrors | string | null
