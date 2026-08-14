export interface Subdivision {
  subdivision_id?: number
  module_id?: number
  name?: string
  reference?: string
  email?: string
  phone?: string
  exchange_rate?: string | number
  update_date_format?: string
  active?: string | number | boolean
  attributes?: Record<string | number, any>
  [key: string]: any
}

export interface InternalSupplier {
  attribute_item_id: number
  name: string
  subdivision_id: number
  status: number
}

export interface SubdivisionState {
  list: Subdivision[]
  currentSubdivision: Subdivision | null
  loading: boolean
  error: string | null
}
