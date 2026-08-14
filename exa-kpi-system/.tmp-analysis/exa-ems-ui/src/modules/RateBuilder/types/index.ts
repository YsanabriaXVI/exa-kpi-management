/**
 * Rate Builder Types
 */

export interface RateBuilderData {
  ratebuilderdata_id?: number
  client: {
    client_id: number
    name?: string
  }
  subdivision: {
    subdivision_id: number
    name?: string
  }
  rate_builder: {
    id: number
    name: string
  }
  p_type: number
  class: number
}

export interface RateBuilderCell {
  id: string // Format: "clientId-subdivisionId"
  data: RateBuilderData | null
  colValue?: string // Display value (rate plan name)
}

export interface RateBuilderRow {
  subdivisionName: string
  subdivisionId: number
  [key: string]: any // Dynamic client columns: `client-${clientId}`
}

export interface RateBuilderState {
  data: RateBuilderRow[]
  loading: boolean
  error: string | null
  updatingCells: string[] // List of cell IDs currently being updated
}

export interface RateBuilderFilters {
  pType: number // 1 = Payment, 2 = Invoice
  classType: number // 1 = Km, 2 = Price
}



