export interface Client {
  client_id?: number
  module_id?: number
  name?: string
  reference?: string
  email?: string
  phone?: string
  exchange_rate?: string | number
  update_date_format?: string
  update_date?: string | number
  active?: string | number | boolean
  attributes?: Record<string | number, any>
  skip_routes_inv?: string[] | number[] | string
  skip_routes_inv_data?: any[]
  all_routes_inv?: string | number | boolean
  skip_routes_pay?: string[] | number[] | string
  skip_routes_pay_data?: any[]
  all_routes_pay?: string | number | boolean
  skip_subdivision?: string[] | number[] | string
  skip_subdivision_data?: any[]
  all_subdivision_pay?: string | number | boolean
  [key: string]: any
}

export interface ClientState {
  list: Client[]
  currentClient: Client | null
  loading: boolean
  error: string | null
}

export interface DepotSetup {
  setupId?: number
  depotId?: number
  clientId?: number
  depot?: {
    depotName?: string
    location?: {
      name?: string
    }
    [key: string]: any
  }
  ediGateCode?: string | null
  ediBookingCode?: string | null
  emailNotification?: number | string | boolean
  imagesOnEmail?: number | string | boolean
  taxRate?: number | string
  active?: number | string | boolean
  [key: string]: any
}

export type JobRateRow = {
  jobRateId?: number
  setupId?: number
  equipmentSizeId?: number | null
  gensetTypeId?: number | null
  jobId: number
  job?: string
  MHEmpty: number
  MHLoaded: number
  CHEmpty: number
  CHLoaded: number
  PriceOrQty: number
  active?: number
  status?: number
  attribute_data?: { name: string }
  depot?: any
  [key: string]: any
}

export type JobRateFormRow = {
  jobRateId?: number
  jobId: number | string | null
  job?: string
  MHEmpty?: number | string | null
  MHLoaded?: number | string | null
  CHEmpty?: number | string | null
  CHLoaded?: number | string | null
  PriceOrQty?: number | string | null
  [key: string]: any
}

export type JobRatesForm = {
  setupId: number | string
  equipmentSizeId: number | string | null
  gensetTypeId: number | string | null
  sizeType?: number | string | null
  jobs_data: JobRateFormRow[]
  [key: string]: any
}

export type JobOptionItem = {
  attributeItemId: number
  name: string
  [key: string]: any
}

export type AddJobRatesResponse = {
  job: any
  stats: { wasAdded: boolean; wasUpdated: boolean }
}

export type LoadJobRatesListResponse = {
  list: JobRateRow[]
}

export type LoadJobRatesGroupResponse = {
  job: JobRatesForm
}
