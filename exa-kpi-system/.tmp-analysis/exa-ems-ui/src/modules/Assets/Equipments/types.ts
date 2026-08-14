export type EquipmentKind = 'chassis' | 'genset'

export interface Equipment {
  assetsid?: number | string
  asset_id?: number | string
  moduleid?: number
  attributes: Record<string, any>
  generic_name1?: string
  generic_name2?: string
  generic_name3?: string
  generic_value1?: string
  generic_value2?: string
  generic_value3?: string
}

export interface EquipmentListItem extends Equipment {
  name?: string
  identification?: string
  status?: string | number
  subdivision?: string
  company?: string
  typeLabel?: string
}

export interface EquipmentStatePerKind {
  list: EquipmentListItem[]
  current: Equipment | null
  loading: boolean
  error: string | null
  formAttributes: any[]
  attributesLoading: boolean
  equipmentSizes?: any[]
  genericAttributeItems?: Record<string, any[]>
}

export interface EquipmentsState {
  chassis: EquipmentStatePerKind
  genset: EquipmentStatePerKind
}
