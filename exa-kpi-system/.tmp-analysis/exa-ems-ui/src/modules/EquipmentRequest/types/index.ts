export type Option = { label: string; value: string | number }

export interface Client {
  client_id: number
  name: string
}

export interface AttributeItem {
  attributeItemId: number
  name: string
  flat_name_id?: string
}

export interface ContainerAttributeItem {
  attribute_item_id: number
  name: string
  status: string
}

export interface EquipmentSize {
  sizeEquipmentId: number
  sizeType: string
  equipmentTypeId: number // 2 = container, 1 = chassis (legacy assumption)
}

export interface Trip {
  tripsid: number
  clientid: number
  refNumber?: string
  containertypeid?: number
  cargoid?: number
  tripstatus?: number
  workorderid?: number
}

export interface EquipmentRequestDetails {
  equipmentRequestId?: number | null
  clientId: number | null
  workOrderId: number | null
  requestTypeId: number | null
  referenceNumberBooking: string | null
  consignee?: string | null
  vesselCode?: string | null
  voyage?: string | null
  comments?: string | null
}

export interface EquipmentRequirement {
  requestId?: number
  tripId: number | null

  containerSizeId: number | null
  chassisSizeId: number | null
  /** 0/1 in legacy backend */
  genset: number | null

  equipmentClientContainer: number | null
  equipmentClientChassis: number | null
  equipmentClientGenset: number | null

  // UI labels (normalized in API)
  containerlabel: string | null
  chassislabel: string | null
  gensetlabel: string | null
  triplabel: string | null

  // Optional nested data from BE
  containerSize?: { sizeType: string } | null
  chassisSize?: { sizeType: string } | null
  equipmentRequest?: { workOrder?: { refNumber?: string } | null } | null

  workorderRefNumber?: string
  equipmentRequestId?: number
}

export interface EquipmentRequestForm {
  requestDetails: EquipmentRequestDetails
  requirements: EquipmentRequirement[]
}

export interface EquipmentRequestListRow {
  equipmentRequestId: number
  // other BE fields are passed through
  [key: string]: any
}

export interface EquipmentRequestLookups {
  clients: Client[]
  requestTypes: AttributeItem[]
  sizes: EquipmentSize[]
  trips: Trip[]
  attrContainerTypes: ContainerAttributeItem[]
}
