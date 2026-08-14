export interface StorageStatementSearchParams {
  clientId?: number | null
  exchangeRate?: number | string | null
  statementType?: number | null
  upToDate?: boolean
  startDate?: number | string | null
  endDate?: number | string | null
  depots?: Array<number | string>
  weeks?: Array<number | string>
  services?: Array<number | string>
  equipmentTypes?: Array<number | string>
  all_depots?: number | null
  all_services?: number | null
  all_equipment_types?: number | null
  all_weeks?: number | null
  [key: string]: unknown
}

export interface StorageStatementInvoiceLineDate {
  startDate: string
  endDate: string
}

export interface StorageStatementPostedInvoiceLine {
  equipmentId: number
  gateId: number
  taxRate: number
  jobId: number
  invoiceLineDates: StorageStatementInvoiceLineDate[]
  unitPrice: number | string
  freeDaysApplied: number | string
}

export interface StorageStatementLine {
  depotId: number
  depot: string
  equipmentTypeId: number
  equipmentId: number
  equipmentNumber: string
  gateId: number
  gateCreateDate?: string
  daysToInvoice?: number
  freeDaysAvailable?: number | string
  totalDays?: number
  unitPrice?: number | string
  subtotal?: number | string
  taxes?: number | string
  total?: number | string
  billingCycles?: string
  id?: string
  [key: string]: unknown
}

export interface StorageServiceGroup {
  id: string
  services: StorageStatementLine[]
}

export interface StorageEquipmentGroup {
  type: 'Chassis' | 'Container' | 'Genset'
  items: StorageServiceGroup[]
}

export interface StorageInvoiceDepotGroup {
  depotId: number
  depotName: string
  invoiceLines: StorageStatementLine[]
}

export interface StorageDepotStatement {
  depotStatementId?: number
  client: string | null
  clientId?: number | null
  depots: unknown[]
  exchangeRate: number | string | null
  services: unknown[]
  weeks: Array<number | { weekId: number }>
  equipmentsTypes?: unknown[]
  equipmentTypes?: unknown[]
  startDate: number | string | null
  endDate: number | string | null
  createDate?: number | string | null
  comments?: string | null
  equipments_Types?: unknown[] | null
  all_depots: number | null
  all_equipments_Types?: number | null
  all_equipment_types?: number | null
  all_services?: number | null
  all_weeks: number | null
  upToDate: boolean
  status: number
  taxRate?: number | string
  invoiceLines?: StorageStatementPostedInvoiceLine[]
  viewData?: StorageStatementLine[]
  [key: string]: unknown
}

export interface StorageStatementState {
  invoiceLines: StorageInvoiceDepotGroup[]
  depotStatement: StorageDepotStatement
  list: StorageDepotStatement[]
  jobs?: unknown[]
  statementTypes?: unknown[]
  isLoading: boolean
  isSaving: boolean
  errors: unknown
}