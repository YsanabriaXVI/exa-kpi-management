export interface UploadSession {
  uploadSessionId: number
  gasStationsId?: number
  gasStationName?: string
  fileName?: string
  totalTransactions?: number
  matchedTransactions?: number
  unmatchedTransactions?: number
  uploadDate?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  CreatedBy?: { firstName?: string; lastName?: string; fullName?: string }
}

export interface ReconciliationTransaction {
  transactionId?: string
  gasStationTransactionId?: number
  documentNumber?: string
  dateTime?: string
  measureUnit?: string
  fuelType?: string
  paymentMethod?: string
  unitPrice?: number | null
  quantity?: number | null
  currency?: string
  amount?: number | null
  licensePlate?: string
  fuelOrderId?: number | null
  reconciliationStatus?: string
  discrepancyReason?: string
  isDuplicate?: boolean
  matchedFuelOrder?: {
    fuelOrderId?: number
    plate?: string
    fuelType?: string
    quantity?: number
  }
}

export type FuelOrderReconciliationErrors =
  | Record<string, string>
  | string
  | { message?: string; name?: string; code?: string; stack?: string }
  | null
  | undefined

export interface ValidateReconciliationPayload {
  data: Record<string, any>[]
  gasStationId: number
  gasStationName: string
}

export interface ProcessReconciliationPayload {
  data: ReconciliationTransaction[]
  gasStationId: number
}

export interface ReconciliationSessionData {
  reconciliationData: ReconciliationTransaction[]
  gasStationId: number | null
  gasStationName: string
  uploadSessionId?: number | null
  uploadDate?: string
  totalTransactions?: number
  matchedTransactions?: number
  unmatchedTransactions?: number
}
