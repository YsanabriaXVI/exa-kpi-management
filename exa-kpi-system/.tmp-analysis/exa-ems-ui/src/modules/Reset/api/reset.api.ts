// src/modules/Reset/api/reset.api.ts
import axiosInstance from '../../../services/api/axios.config'
import type { Reset, ResetListItem } from '../types/reset.types'

// ─── Response normalization ───────────────────────────────────────────────────

const normalizeReset = (raw: Record<string, unknown>): Reset => ({
  id: raw.id as number,
  plate: raw.plate as string,
  equipmentType: raw.equipment_type as string,
  dateFrom: raw.date_from as string,
  dateTo: raw.date_to as string,
  status: raw.status as Reset['status'],
  perGates: raw.per_gates as boolean,
  lastInfo: {
    resetId: (raw.last_reset_id as number) ?? 0,
    date: (raw.last_reset_date as string) ?? '',
    kmsEcm: (raw.last_kms_ecm as number) ?? 0,
    gallonsEcm: (raw.last_gallons_ecm as number) ?? 0,
    gallonsInTank: (raw.last_gallons_in_tank as number) ?? 0,
    litersInTank: (raw.last_liters_in_tank as number) ?? 0,
  },
  currentInfo: {
    kmsEcm: String(raw.kms_ecm ?? ''),
    gallonsEcm: String(raw.gallons_ecm ?? ''),
    gallonsInTank: String(raw.gallons_in_tank ?? ''),
    litersInTank: String(raw.liters_in_tank ?? ''),
  },
  trips: ((raw.trips as Record<string, unknown>[]) ?? []).map((t) => ({
    id: t.id as number,
    tripId: String(t.trip_id ?? ''),
    tripDate: t.trip_date as string,
    route: t.route as string,
    fuelOrderId: String(t.fuel_order_id ?? ''),
    gasStation: t.gas_station as string,
    dateFuelOrder: t.date_fuel_order as string,
    gateOut: String(t.gate_out ?? ''),
    dateGateOut: t.date_gate_out as string,
    gateIn: String(t.gate_in ?? ''),
    dateGateIn: t.date_gate_in as string,
    odometer: (t.odometer as number) ?? 0,
    kms: (t.kms as number) ?? 0,
    reqLiters: (t.req_liters as number) ?? 0,
    litersInTank: (t.liters_in_tank as number) ?? 0,
    suppliedLiters: (t.supplied_liters as number) ?? 0,
    litersConsumption: (t.liters_consumption as number) ?? 0,
    kmPerLiterEms: (t.km_per_liter_ems as number) ?? 0,
    selected: false,
  })),
})

const normalizeListItem = (raw: Record<string, unknown>): ResetListItem => ({
  id: raw.id as number,
  plate: raw.plate as string,
  equipmentType: raw.equipment_type as string,
  date: raw.date as string,
  status: raw.status as ResetListItem['status'],
  kmsEcm: raw.kms_ecm as number,
  gallonsEcm: raw.gallons_ecm as number,
})

// ─── API methods ─────────────────────────────────────────────────────────────

export const resetApi = {
  getAll: async (): Promise<ResetListItem[]> => {
    const { data } = await axiosInstance.get('/resets')
    return (data as Record<string, unknown>[]).map(normalizeListItem)
  },

  getById: async (id: number): Promise<Reset> => {
    const { data } = await axiosInstance.get(`/resets/${id}`)
    return normalizeReset(data as Record<string, unknown>)
  },

  getContext: async (params: {
    plate: string
    dateFrom: string
    dateTo: string
  }): Promise<Reset> => {
    const { data } = await axiosInstance.get('/resets/context', { params })
    return normalizeReset(data as Record<string, unknown>)
  },

  save: async (payload: Reset): Promise<Reset> => {
    const body = {
      plate: payload.plate,
      equipment_type: payload.equipmentType,
      date_from: payload.dateFrom,
      date_to: payload.dateTo,
      status: payload.status,
      per_gates: payload.perGates,
      kms_ecm: parseFloat(payload.currentInfo.kmsEcm),
      gallons_ecm: parseFloat(payload.currentInfo.gallonsEcm),
      gallons_in_tank: parseFloat(payload.currentInfo.gallonsInTank),
      liters_in_tank: parseFloat(payload.currentInfo.litersInTank),
      trips: payload.trips.map((t) => ({ id: t.id })),
    }

    if (payload.id) {
      const { data } = await axiosInstance.put(`/resets/${payload.id}`, body)
      return normalizeReset(data as Record<string, unknown>)
    }

    const { data } = await axiosInstance.post('/resets', body)
    return normalizeReset(data as Record<string, unknown>)
  },
}