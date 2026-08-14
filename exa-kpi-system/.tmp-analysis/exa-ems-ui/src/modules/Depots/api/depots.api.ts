// src/modules/Depots/api/depot.api.ts (o donde lo tengas)
import apiClient from '../../../services/api/axios.config'

export interface DepotRaw {
  depotId?: number
  depot_id?: number
  id?: number
  depotName?: string
  depotCode?: string
  depot_code?: string
  active?: number | string
  status?: number
  location?: {
    name?: string
    locationId?: number
    id?: number
  }
  locationId?: number
  [key: string]: any
}

export type Depot = {
  depotId: number
  depotName: string
  depotCode: string
  locationId?: number
  locationObj?: DepotRaw['location']
  active?: number
  status?: number
  raw?: DepotRaw // opcional, útil para debug
}

const unwrap = (response: any) => response?.data ?? response
const getDepotsPayload = (payload: any) => payload?.data?.depots ?? payload?.depots ?? payload

const ADMIN_HEADERS = { 'Route-Type': 'admin' }

// Normaliza shapes inconsistentes
const normalizeDepot = (d: DepotRaw): Depot => ({
  depotId: Number(d.depotId ?? d.depot_id ?? d.id ?? 0),
  depotName: d.depotName ?? '',
  depotCode: (d.depotCode ?? d.depot_code ?? '') as string,
  locationId: d.locationId ?? d.location?.locationId ?? d.location?.id,
  locationObj: d.location,
  active: d.active !== undefined ? Number(d.active) : undefined,
  status: d.status,
  raw: d,
})

export const depotsAPI = {
  getDepots: async (): Promise<Depot[]> => {
    const response = await apiClient.get('/depot-service', { headers: ADMIN_HEADERS })
    const payload = unwrap(response)
    const depots = getDepotsPayload(payload)
    const arr = Array.isArray(depots) ? depots : []
    // emula el sort legacy: depotId desc
    return arr.map(normalizeDepot).sort((a, b) => b.depotId - a.depotId)
  },

  createDepot: async (payload: {
    locationId: number
    depotName: string
    depotCode: string
    active: number
    status: number
  }): Promise<Depot> => {
    const response = await apiClient.post('/depot-service', payload, { headers: ADMIN_HEADERS })
    return normalizeDepot(unwrap(response))
  },

  updateDepot: async (
    depotId: number,
    payload: {
      locationId: number
      depotName: string
      depotCode: string
      active: number
      status: number
    },
  ): Promise<Depot> => {
    const response = await apiClient.put(`/depot-service/${depotId}`, payload, { headers: ADMIN_HEADERS })
    return normalizeDepot(unwrap(response))
  },

  deleteDepot: async (depotId: number): Promise<void> => {
    await apiClient.delete(`/depot-service/${depotId}`, { headers: ADMIN_HEADERS })
  },
}
