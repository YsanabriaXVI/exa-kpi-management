// src/modules/TiresAssignment/types/tiresAssignment.types.ts

export interface SelectOption {
  label: string
  value: string | number
}

export interface TiresCatalogs {
  brands: SelectOption[]
  tireTypes: SelectOption[]
  assignedTo: SelectOption[]
  positions: SelectOption[]
  categories: SelectOption[]
  statuses: SelectOption[]
}

export interface TireDetail {
  tiresAssignId?: number
  position: number
  outSideLeft?: string
  outSideLeftStatus?: number
  inSideLeft?: string
  inSideLeftStatus?: number
  outSideRight?: string
  outSideRightStatus?: number
  inSideRight?: string
  inSideRightStatus?: number
  company?: number
  status?: number
}

export interface TiresAssignment {
  tiresId: number
  tiresAssignId?: number

  seriesNumber: string
  serialNo: string

  year: string

  // Backend stores brand as attributeItemId and enriches brandName.
  brand: number | string
  brandId?: number | string
  brandName?: string | null

  depth: number | string

  owned: boolean
  owner?: boolean

  // Backend stores TireType as attributeItemId and enriches tireTypeName.
  tireType: number | string
  tireTypeId?: number | string
  tireTypeName?: string | null

  statusId?: number | string
  statusName?: string | null

  remarks?: string | null
  observations?: string

  assignedToId?: number | string
  assignedToName?: string
  positionId?: number | string
  positionName?: string
  categoryId?: number | string
  isAssigned?: boolean

  company?: number
  status?: number
  active?: number
  createUser?: number
  createDate?: string
  updateUser?: number
  updateDate?: string

  createdUser?: any
  updatedUser?: any
  tiresAssigndId?: TireDetail[]
}

export interface TiresAssignmentForm {
  tiresId?: number
  tiresAssignId?: number

  company?: number
  status?: number

  serialNo?: string
  seriesNumber?: string
  year?: number | string

  brand?: number | string
  brandId?: number | string
  brandName?: string

  depth?: number | string
  owner?: boolean
  owned?: boolean

  tireType?: number | string
  tireTypeId?: number | string
  tireTypeName?: string

  assignedToId?: number | string
  positionId?: number | string
  categoryId?: number | string

  statusId?: number | string
  statusName?: string
  observations?: string
  remarks?: string | null

  chassisId?: number | string
  axieId?: number | string

  position?: number[]
  outSideLeft?: string[]
  outSideLeftStatus?: number[]
  inSideLeft?: string[]
  inSideLeftStatus?: number[]
  outSideRight?: string[]
  outSideRightStatus?: number[]
  inSideRight?: string[]
  inSideRightStatus?: number[]
}

export type TiresAssignmentErrors = any
