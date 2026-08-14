/**
 * Other Charges Module Types
 */

export interface PlanPrice {
  rate: string | number
  [key: string]: any
}

export interface OtherCharge {
  id: number
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  planPrices?: Record<string, PlanPrice>
  routes?: string[]
  applyTo?: string
  entityId?: number
  createdAt?: string
  updatedAt?: string
  [key: string]: any
}

export interface OtherChargeListParams {
  page?: number
  limit?: number
  filter?: any[]
  search?: string | null
  match?: string | null
  rows?: number
  first?: number
  sortField?: string
  sortOrder?: number
  filters?: Record<string, string>
}

export interface Pagination {
  page: number
  limit: number
  total: number
}

export interface OtherChargesState {
  charges: OtherCharge[]
  currentCharge: OtherCharge | null
  routes: any[]
  paymentPlans: any[]
  loading: boolean
  error: string | null
  pagination: Pagination
  total: number
}

export interface Route {
  id: number
  name: string
  [key: string]: any
}

export interface PaymentPlan {
  id: number
  name: string
  [key: string]: any
}

