// src/modules/RepairStatus/types/repairStatus.types.ts

export interface RepairStatus {
  repairStatusId?: number
  ISOCode: string
  description: string
  active?: number
  status?: number
}

export type RepairStatusFormValue = {
  repairStatusId?: number
  ISOCode: string
  description: string
}

export interface RepairStatusState {
  list: RepairStatus[]
  current: RepairStatus | null
  loading: boolean
  errors: unknown
  statuses: {
    added: boolean
    updated: boolean
    deleted: boolean
  }
}

