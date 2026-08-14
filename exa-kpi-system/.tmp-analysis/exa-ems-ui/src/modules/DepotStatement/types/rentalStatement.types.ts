export interface RentalInvoiceLine {
  id?: string
  proratedLabel?: string
  proratedOptionId?: number
  prorated?: number
  total?: number

  comboLabel?: string
  dateOut?: string
  dateIn?: string
  depot?: string
  depotId?: number
  gateOutId?: number | null
  gateInId?: number | null
  periodLabel?: string
  periodId?: number
  comboPrice?: number
  comboId?: number
  chassisId?: number | null
  containerId?: number | null
  gensetId?: number | null
  chassisNo?: string | null
  containerNo?: string | null
  gensetNo?: string | null
  startDate?: number | string | null
  endDate?: number | string | null
  billingRange?: string
  days?: number
  duration?: number
  [key: string]: any
}

export interface RentalDepotStatement {
  depotStatementId?: number
  client: string | null
  depots: any[]
  exchangeRate: number | null
  weeks: any[]
  endDate: number | string | null
  startDate?: number | string | null
  createDate?: number | string | null
  all_depots: any[] | null
  all_weeks: any[] | null
  status: number
  upToDate: boolean
  [key: string]: any
}

export interface RentalStatementSearchParams {
  [key: string]: any
}

export interface RentalStatementState {
  invoiceLines: RentalInvoiceLine[][]
  current: RentalDepotStatement
  list: RentalDepotStatement[]
  isLoading: boolean
  isSaving: boolean
  errors: unknown
}