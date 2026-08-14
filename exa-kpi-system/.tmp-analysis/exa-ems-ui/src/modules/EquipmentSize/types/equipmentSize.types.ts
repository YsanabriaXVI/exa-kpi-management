// src/modules/EquipmentSize/types/equipmentSize.types.ts

export type EqSizeRelationships = {
  relationshipId: number,
  sizeId: number,
  relatedSizeId: number
}

export type EquipmentSize = {
  sizeEquipmentId: number

  equipmentTypeId?: number | null
  equipmentTypedId?: { equipmentName?: string } | null

  sizeType?: string | null
  description?: string | null

  axieId?: number | null
  extendable?: number | boolean | null
  fridge?: number | boolean | null

  isoCode1?: string | null
  isoCode2?: string | null
  isoCode3?: string | null
  isoCode4?: string | null
  isoCode5?: string | null
  isoCode6?: string | null
  isoCode7?: string | null
  isoCode8?: string | null
  isoCode9?: string | null
  isoCode10?: string | null

  active?: number | null
  status?: number | null
  EqSizeRelationships?: EqSizeRelationships[]
}

export type EquipmentSizeForm = Partial<EquipmentSize> & {
  sizeEquipmentId?: number
  status?: number
  active?: number
}

export type EquipmentSizeErrors = any

export type EquipmentType = {
  equipmentTypeId: number
  equipmentName: string
}

export type AxleItem = {
  attributeItemId: number
  name: string
  flat_name_id?: string
}