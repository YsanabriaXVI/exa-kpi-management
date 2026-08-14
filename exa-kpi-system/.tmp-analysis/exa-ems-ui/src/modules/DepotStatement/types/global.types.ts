export interface AttributeItem {
  [key: string]: unknown
}

export interface StatementInvoiceLineDate {
  startDate: string
  endDate: string
  comboInvoiceLineId?: number
}

export interface StatementRentalInvoiceLine {
  comboInvoiceLineId: number
  comboPrice: number | string
  prorated: number
  period_data: {
    name: 'Week' | 'Month' | 'Day' | string
  }
  DSComboInvoiceLineDates: StatementInvoiceLineDate[]
  total?: number
  [key: string]: unknown
}

export interface StatementStorageInvoiceLine {
  depotId: number
  depot: string
  equipmentTypeId: number
  equipmentId: number
  equipmentNumber: string
  gateId: number
  subtotal?: number | string
  taxes?: number | string
  total?: number | string
  unitPrice?: number | string
  freeDaysAvailable?: number | string
  totalDays?: number
  daysToInvoice?: number
  id?: string
  [key: string]: unknown
}

export interface PostedStorageInvoiceLine {
  equipmentId: number
  gateId: number
  unitPrice: number | string
  freeDaysApplied: number | string
  invoiceLineDates: Array<{
    startDate: string
    endDate: string
  }>
}

export interface GroupedEquipmentServices {
  id: string
  services: StatementStorageInvoiceLine[]
}

export interface GroupedEquipmentType {
  type: 'Chassis' | 'Container' | 'Genset'
  items: GroupedEquipmentServices[]
}

export interface GroupedDepotInvoiceLines {
  depotName: string
  equipment: GroupedEquipmentType[]
}

export interface DepotStatementRecord {
  depotStatementId?: number
  statement_type: {
    flat_name_id: 'storage' | 'rental' | string
  }
  viewData?: StatementStorageInvoiceLine[]
  invoiceLines?: PostedStorageInvoiceLine[]
  DSRentalComboInvoiceLines?: StatementRentalInvoiceLine[]
  subtotal?: string
  taxes?: string
  total?: string
  taxRate?: number | string
  [key: string]: unknown
}

export interface StatementState {
  invoiceLines: GroupedDepotInvoiceLines[]
  list: DepotStatementRecord[]
  depotStatementsList: DepotStatementRecord[]
  isLoading: boolean
  errors: unknown
  lookups: any
  [key: string]: unknown
}