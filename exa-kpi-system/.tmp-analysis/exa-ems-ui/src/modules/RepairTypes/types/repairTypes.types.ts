// src/modules/RepairTypes/types/repairTypes.types.ts

export type RepairType = {
  repairTypesId: number
  equipmentTypeId: number
  repairName: string
  description: string
  internalCode: string
  ISOCode: string
  status?: number
  active?: number

  // backend a veces trae objeto anidado
  equipmentTypedId?: { equipmentName?: string }
}

export type RepairTypeForm = Partial<RepairType>

export type RepairErrors =
  | Record<string, string>
  | string
  | null
  | undefined

export interface EquipmentType {
  equipmentTypeId: number
  equipmentName: string
  description?: string | null
  active?: number
  status?: number
}
