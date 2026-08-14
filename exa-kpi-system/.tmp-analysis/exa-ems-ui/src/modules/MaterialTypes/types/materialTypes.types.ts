export interface MaterialType {
  materialId: number
  name: string
  description: string
  equipmentTypeId: number
  code: string
  isoCode: string
  status: number
  active?: number
}

export interface MaterialTypeForm {
  materialId?: number
  name?: string
  description?: string
  equipmentTypeId?: number | string
  code?: string
  isoCode?: string
  status?: number
  active?: number
}

export type MaterialErrors = any
