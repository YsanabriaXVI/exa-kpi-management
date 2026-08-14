// src/modules/Reset/types/reset.types.ts

export type ResetStatus = 'Pending' | 'Complete' | 'Cancel'

export interface ResetLastInfo {
  resetId: number
  date: string
  kmsEcm: number
  gallonsEcm: number
  gallonsInTank: number
  litersInTank: number
}

export interface ResetCurrentInfo {
  kmsEcm: string
  gallonsEcm: string
  gallonsInTank: string
  litersInTank: string
}

export interface ResetTripRow {
  id: number
  tripId: string
  tripDate: string
  route: string
  fuelOrderId: string
  gasStation: string
  dateFuelOrder: string
  gateOut: string
  dateGateOut: string
  gateIn: string
  dateGateIn: string
  odometer: number
  kms: number
  reqLiters: number
  litersInTank: number
  suppliedLiters: number
  litersConsumption: number
  kmPerLiterEms: number
  selected: boolean
}

export interface Reset {
  id?: number
  plate: string
  equipmentType: string
  dateFrom: string
  dateTo: string
  status: ResetStatus
  perGates: boolean
  lastInfo: ResetLastInfo
  currentInfo: ResetCurrentInfo
  trips: ResetTripRow[]
}

export interface ResetListItem {
  id: number
  plate: string
  equipmentType: string
  date: string
  status: ResetStatus
  kmsEcm: number
  gallonsEcm: number
}