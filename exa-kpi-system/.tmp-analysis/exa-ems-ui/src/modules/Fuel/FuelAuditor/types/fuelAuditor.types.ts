export interface GasStationTransaction {
  gasStationTransactionId: number
  fuelOrderId?: number | null
  gasStationsId?: number | null
  gasStationName?: string
  licensePlate?: string
  fuelType?: string
  measureUnit?: string
  unitPrice?: number | null
  quantity?: number | null
  currency?: string
  amount?: number | null
  transactionId?: string
  documentNumber?: string
  paymentMethod?: string
  dateTime?: string
  dateTimeFormat?: string
  source?: string
  reconciliationStatus?: string
  orderNumber?: string | null
  subdivisionId?: number | string | null
  isDuplicate?: boolean | null
  fuelOrderIdReference?: number | null
  status?: boolean | number | null
  amountDifference?: number | null
  unitPriceDifference?: number | null
  gasSupplierPaymentStatus?: number | null
  gas_supplier_payment_status?: number | null
  gasSupplierPaymentStatusName?: string
  subdivisionPaymentStatus?: number | null
  subdivision_payment_status?: number | null
  subdivisionPaymentStatusName?: string
  uploadSessionId?: number | null
  gasStation?: {
    gasStationsId?: number
    name?: string
  }
  GasStation?: {
    gasStationsId?: number
    name?: string
  }
  fuelOrder?: FuelOrderSummary | null
  createdAt?: string
  updatedAt?: string
  createdAtFormat?: string
  updatedAtFormat?: string
}

export interface FuelOrderSummary {
  fuelOrderId: number
  plate?: string
  gasStationName?: string
  gasStation?: { gasStationsId?: number; name?: string }
  gasStationsId?: number | null
  tripsid?: number | null
  fuelType?: string
  fuelTypeName?: string
  fuelTypeAttr?: { name?: string }
  fuelRequestLtr?: number | null
  unitPrice?: number | null
  fuelPrice?: { price?: number; currency?: string }
  fuelAuditor?: { unitPrice?: number; currency?: string; fuelOrderId?: number }
  statusFuelOrder?: number
  statusReconciliation?: number
  gasSupplierPaymentStatus?: number
  subdivisionPaymentStatus?: number
  gasStationTransactionId?: number | null
  fuelStatementId?: number | null
  gasSupplierStatementId?: number | null
  gasStationStatementId?: number | null
  dateSchedule?: string
  currency?: string
  totalLps?: number | null
  totalDollar?: number | null
  station?: string
}

export type FuelAuditorErrors =
  | Record<string, string>
  | string
  | { message?: string; name?: string; code?: string; stack?: string }
  | null
  | undefined

export interface FuelAuditorListParams {
  page: number
  size: number
  sortField?: string
  sortOrder?: string | number
  filters?: Record<string, any>
}

export interface FuelAuditorListResponse {
  data: GasStationTransaction[]
  total: number
  page: number
  size: number
}

export interface PaymentStatusOption {
  value: number
  label: string
}

export interface BulkPaymentStatusPayload {
  transactionIds: number[]
  field: 'gasSupplierPaymentStatus' | 'subdivisionPaymentStatus'
  statusId: number
}

export interface LinkFuelOrderPayload {
  transactionId: number
  fuelOrderId: number | null
}

export interface DiffField {
  key: string
  label: string
  left: string | number | null
  right: string | number | null
  match?: boolean
  differenceAbs?: number | null
  differencePct?: number | null
}
