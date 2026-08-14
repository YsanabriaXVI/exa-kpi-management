// src/modules/Depots/store/depots.types.ts
export type Depot = {
  depotId: number
  depotName: string
  depotCode: string
  locationId?: number
  locationObj?: {
    name?: string
    locationId?: number
    id?: number
  }
  active?: number
  status?: number
}