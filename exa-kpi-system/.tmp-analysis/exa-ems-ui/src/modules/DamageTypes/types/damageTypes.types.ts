export interface DamageType {
  damageId: number
  damageName: string
  description: string
  equipmentTypeId: number
  code: string
  isoCode: string
  status: number
  active: number
}

export interface DamageTypeForm {
  damageId?: number
  damageName?: string
  description?: string
  equipmentTypeId?: number | string
  code?: string
  isoCode?: string
  status?: number
  active?: number
}

export type DamageErrors = any
