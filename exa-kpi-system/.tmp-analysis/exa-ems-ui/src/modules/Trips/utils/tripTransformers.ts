import type {
  TripListItem,
  TripDetails,
  TripTrackPoint,
  TripWorkOrder,
  TripAuditorRow,
  TripChargeItem,
  TripTrackPointType,
} from '../types'

export const TRACK_POINT_PICK_UP = 'TRACK_POINT_PICK_UP'
export const TRACK_POINT_CUSTOMS = 'TRACK_POINT_CUSTOMS'
export const TRACK_POINT_DELIVER = 'TRACK_POINT_DELIVER'
export const TRACK_POINT_RETRUN_TO = 'TRACK_POINT_RETRUN_TO'

const TRACK_ORDER: Record<string, { type?: string; suffix?: string }[]> = {
  forward: [
    { type: TRACK_POINT_PICK_UP, suffix: 'a' },
    { type: TRACK_POINT_DELIVER, suffix: 'b' },
    { type: TRACK_POINT_RETRUN_TO, suffix: 'c' },
  ],
  customs: [
    { type: TRACK_POINT_PICK_UP, suffix: 'a' },
    { type: TRACK_POINT_CUSTOMS },
    { type: TRACK_POINT_DELIVER, suffix: 'b' },
    { type: TRACK_POINT_RETRUN_TO, suffix: 'c' },
  ],
  back: [
    undefined as any,
    { type: TRACK_POINT_DELIVER, suffix: 'a' },
    { type: TRACK_POINT_RETRUN_TO, suffix: 'b' },
  ],
}

export const durations = {
  withCustoms: [
    {
      nameProp: 'timer_pick_up',
      startProp: 'truck_ar_pk_date',
      endProp: 'truck_lv_pk_date',
    },
    {
      nameProp: 'timer_customs',
      startProp: 'container_ar_cus_date',
      endProp: 'container_lv_cus_date',
    },
    {
      nameProp: 'timer_delivery',
      startProp: 'container_ar_dl_date',
      endProp: 'container_lv_dl_date',
    },
    {
      nameProp: 'timer_d_o_l',
      startProp: 'truck_ar_pr_date',
      endProp: 'truck_lv_pr_date',
    },
    {
      nameProp: 'time_transit_customs',
      startProp: 'truck_lv_pk_date',
      endProp: 'container_ar_cus_date',
    },
    {
      nameProp: 'time_transit_delivery',
      startProp: 'container_lv_cus_date',
      endProp: 'container_ar_dl_date',
    },
    {
      nameProp: 'timer_transit_d_o_l',
      startProp: 'container_lv_dl_date',
      endProp: 'truck_ar_pr_date',
    },
  ],
  withoutCustoms: [
    {
      nameProp: 'timer_pick_up',
      startProp: 'truck_ar_pk_date',
      endProp: 'truck_lv_pk_date',
    },
    {
      nameProp: 'timer_delivery',
      startProp: 'container_ar_dl_date',
      endProp: 'container_lv_dl_date',
    },
    {
      nameProp: 'timer_d_o_l',
      startProp: 'truck_ar_pr_date',
      endProp: 'truck_lv_pr_date',
    },
    {
      nameProp: 'time_transit_delivery',
      startProp: 'truck_lv_pk_date',
      endProp: 'container_ar_dl_date',
    },
    {
      nameProp: 'timer_transit_d_o_l',
      startProp: 'container_lv_dl_date',
      endProp: 'truck_ar_pr_date',
    },
  ],
}

export const RATE_TYPES = {
  INV: 'INV',
  PAY: 'PAY',
}

export const RATES = {
  [RATE_TYPES.INV]: {
    type: 1,
    prefix: 'inv',
  },
  [RATE_TYPES.PAY]: {
    type: 2,
    prefix: 'pay',
  },
}

export const calculateTimeProps: string[] = [
  'total_trip_hours',
  'time_to_be_assigned',
  'time_assigned',
]

durations.withCustoms.forEach(({ nameProp }) => {
  calculateTimeProps.push(nameProp)
})

export const timeControlFields: string[] = Array.from(
  new Set([
    'free_time',
    ...durations.withCustoms.reduce<string[]>((acc, { startProp, endProp }) => {
      acc.push(startProp, endProp)
      return acc
    }, []),
  ])
)

const monthMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const ensureNumber = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const normalizeTimestamp = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    return parsed > 10_000_000_000 ? parsed / 1000 : parsed
  }
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return Math.floor(date.getTime() / 1000)
  }
  return undefined
}

export const formatDateTime = (value?: number | string | null): string => {
  const timestamp = normalizeTimestamp(value)
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const day = date.getDate().toString().padStart(2, '0')
  const month = monthMap[date.getMonth()]
  const year = date.getFullYear().toString().slice(-2)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day}-${month}-${year} ${hours}:${minutes}`
}

export const formatDurationHours = (duration?: number | string | null): string => {
  const raw = Number(duration)
  if (!Number.isFinite(raw)) return typeof duration === 'string' ? duration : ''
  const isNegative = raw < 0
  const abs = Math.abs(raw)
  const hours = Math.floor(abs)
  const minutes = Math.round((abs - hours) * 60)
  const parts: string[] = []
  if (hours || minutes === 0) {
    parts.push(`${hours} ${hours === 1 ? 'Hour' : 'Hours'}`)
  }
  if (minutes) {
    parts.push(`${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`)
  }
  const formatted = parts.join(' ').trim() || '0 Hours'
  return isNegative ? `-${formatted}` : formatted
}

export const formatCurrency = (value?: number | string | null, options: Intl.NumberFormatOptions = {}): string => {
  const numberValue = typeof value === 'string' ? Number(value) : value
  const safeValue = Number.isFinite(numberValue as number) ? Number(numberValue) : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    ...options,
  }).format(safeValue)
}

export const formatLempiras = (value?: number | string | null): string => {
  const numberValue = typeof value === 'string' ? Number(value) : value
  const safeValue = Number.isFinite(numberValue as number) ? Number(numberValue) : 0
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
  }).format(safeValue)
}

const buildTrackPoints = (trip: TripDetails, workOrder: TripWorkOrder | undefined): TripTrackPoint[] => {
  if (!workOrder) {
    const fallback: TripTrackPoint[] = []
    const pushPoint = (type: string, cityName?: string | null, locationName?: string | null, address?: string | null) => {
      fallback.push({
        type,
        cityName: cityName || undefined,
        location: locationName || undefined,
        address: address || undefined,
      })
    }
    if (trip.truck_ar_pk_date || trip.truck_lv_pk_date || trip.pick_up) {
      pushPoint(TRACK_POINT_PICK_UP, trip.pick_up)
    }
    if (trip.container_ar_cus_date || trip.container_lv_cus_date) {
      pushPoint(TRACK_POINT_CUSTOMS)
    }
    if (trip.container_ar_dl_date || trip.container_lv_dl_date || trip.delivery) {
      pushPoint(TRACK_POINT_DELIVER, trip.delivery)
    }
    if (trip.truck_ar_pr_date || trip.truck_lv_pr_date || trip.return_to) {
      pushPoint(TRACK_POINT_RETRUN_TO, trip.return_to)
    }
    return fallback
  }
  const isCustoms = !workOrder.is_return_trip && (workOrder.customs === 1 || workOrder.customs === true)
  const type = workOrder.is_return_trip ? 'back' : isCustoms ? 'customs' : 'forward'

  // Helper to check if a point has relevant data
  const hasPointData = (pointType: string): boolean => {
    if (pointType === TRACK_POINT_PICK_UP) {
      return !!(trip.truck_ar_pk_date || trip.truck_lv_pk_date || trip.pick_up)
    }
    if (pointType === TRACK_POINT_CUSTOMS) {
      return !!(trip.container_ar_cus_date || trip.container_lv_cus_date)
    }
    if (pointType === TRACK_POINT_DELIVER) {
      return !!(trip.container_ar_dl_date || trip.container_lv_dl_date || trip.delivery)
    }
    if (pointType === TRACK_POINT_RETRUN_TO) {
      return !!(trip.truck_ar_pr_date || trip.truck_lv_pr_date || trip.return_to)
    }
    return false
  }

  return TRACK_ORDER[type]
    .map((point) => {
      if (!point || !point.type) return null

      // If it's a return trip point (or any optional point), check if we have data for it
      // For standard points in the flow, we might want to keep them even if empty for data entry,
      // but the user specifically asked to hide "Return To" if not applicable/empty.
      // However, the user also said "when dont apply need to be hide", implying if no data AND not required.
      // The legacy logic seems to be: show if it's part of the standard flow OR if it has data.
      // But for "Return To", it might be optional even in "forward" flow if no data exists?
      // Let's strictly follow: if it's in the TRACK_ORDER, include it, UNLESS it's "Return To" AND has no data.
      // Wait, the user's example shows "Return To" hidden when no data.

      if (point.type === TRACK_POINT_RETRUN_TO && !hasPointData(point.type)) {
        return null
      }

      const entry: TripTrackPoint = { type: point.type as TripTrackPointType }
      if (point.suffix) {
        const city = (workOrder as any)[`city_${point.suffix}`]
        const location = (workOrder as any)[`location_${point.suffix}`]
        if (city && location) {
          entry.cityName = city.name
          entry.location = location.name
          entry.address = location.address
        }
      }
      // If no suffix (like Customs), check if we should include it. 
      // Customs is usually determined by isCustoms flag which sets the TRACK_ORDER.
      // So if it's in TRACK_ORDER, it should be there.

      return entry
    })
    .filter(Boolean) as TripTrackPoint[]
}

const decorateTripDurations = (trip: TripDetails): TripDetails => {
  if (trip.total_trip_hours) {
    const durationHours = Number(trip.total_trip_hours)
    if (Number.isFinite(durationHours) && durationHours > 0) {
      const days = Math.ceil(durationHours / 24)
      trip.total_trip_days = `${days} ${days > 1 ? 'Days' : 'Day'}`
    }
  }
  calculateTimeProps.forEach((prop) => {
    if (trip[prop] !== undefined && trip[prop] !== null) {
      trip[prop] = formatDurationHours(trip[prop])
    }
  })
  return trip
}

export const prepareTripListRecord = (record: any): TripListItem => {
  const trip: TripListItem = { ...record }
    ;['payment', 'invoice'].forEach((type) => {
      const kmValue = ensureNumber(trip[`${type}_km`]) || 0
      const priceValue = ensureNumber(trip[`${type}_price`]) || 0
      const rate = kmValue ? priceValue / kmValue : 0
      trip[`${type}_rate`] = formatCurrency(rate, { maximumFractionDigits: 4 })
      trip[`${type}_price_format`] = formatCurrency(priceValue, { maximumFractionDigits: 4 })
    })
  const dateFields = [
    'trip_created',
    'trip_pick_up',
    'trip_close',
    'work_order_pick_up_date',
    'work_order_deliver_date',
    'create_date',
    'work_order_date',
    'truck_lvpk_date',
    'close_trip_date',
    'pick_up_exp_date',
    'deliver_exp_date',
  ]
  dateFields.forEach((field) => {
    const normalized = normalizeTimestamp((trip as any)[field])
    if (normalized) {
      ; (trip as any)[field] = normalized
    }
  })
  return trip
}

export const prepareTripDetails = (data: any): TripDetails => {
  const charges = data.charges || []
  const trip: TripDetails = {
    ...data,
    invoice_charge_items: charges.filter((c: any) => c.statement_type === RATES[RATE_TYPES.INV].type),
    payment_charge_items: charges.filter((c: any) => c.statement_type === RATES[RATE_TYPES.PAY].type),
  }
  const workOrder = trip.work_order
  const isCustoms = !workOrder?.is_return_trip && (workOrder?.customs === 1 || workOrder?.customs === true)
  trip.isCustoms = isCustoms
  trip.inventoryId = trip.inventory?.asset_id ?? trip.inventoryId ?? null
  if (trip.subdivision) {
    const subdivisionId = trip.subdivision.id ?? trip.subdivision.subdivision_id ?? trip.subdivision.subdivisionId
    trip.subdivision = {
      ...trip.subdivision,
      id: subdivisionId !== undefined ? Number(subdivisionId) : undefined,
    }
  }
  trip.chassisId = trip.chassis?.asset_id ?? trip.chassisId ?? null
  trip.gensetId = trip.genset?.asset_id ?? trip.gensetId ?? null
  trip.track = buildTrackPoints(trip, workOrder)
  decorateTripDurations(trip)
  return trip
}

export const serializeTripDetails = (trip: TripDetails, _isAudit = false): Record<string, any> => {
  const payload: Record<string, any> = {
    ...trip,
  }
  payload.inventory = trip.inventory?.asset_id ?? trip.inventoryId
  const subdivisionId =
    typeof trip.subdivision === 'object'
      ? trip.subdivision?.id ?? (trip.subdivision as any)?.subdivision_id ?? (trip.subdivision as any)?.subdivisionId
      : trip.subdivision
  payload.subdivision =
    subdivisionId === undefined || subdivisionId === null || subdivisionId === ''
      ? null
      : Number(subdivisionId)
  payload.driver = trip.driver?.asset_id ?? trip.driver
  payload.work_order_id = trip.work_order?.work_order_id ?? trip.work_order_id
  payload.cargo_type = trip.work_order?.cargo_type ?? trip.cargo_type
  payload.chassis = trip.chassisId ?? trip.chassis?.asset_id
  payload.genset = trip.gensetId ?? trip.genset?.asset_id
  payload.charges = [
    ...(trip.invoice_charge_items || []).map((charge: TripChargeItem) => ({
      statement_type: RATES[RATE_TYPES.INV].type,
      ...charge,
    })),
    ...(trip.payment_charge_items || []).map((charge: TripChargeItem) => ({
      statement_type: RATES[RATE_TYPES.PAY].type,
      ...charge,
    })),
  ]
  return payload
}

export const updateTripDurationField = (trip: TripDetails, fieldName: string, value: any): TripDetails => {
  const next = { ...trip, [fieldName]: value }
  const definitions = trip.isCustoms ? durations.withCustoms : durations.withoutCustoms
  let totalHours = Number(trip.free_time) || 0
  definitions.forEach(({ nameProp, startProp, endProp }) => {
    const start = normalizeTimestamp((next as any)[startProp])
    const end = normalizeTimestamp((next as any)[endProp])
    if (start && end && end >= start) {
      const diff = (end - start) / 3600
      totalHours += Number.isFinite(diff) ? Number(diff.toFixed(2)) : 0
        ; (next as any)[nameProp] = diff
    }
  })
  next.total_trip_hours = totalHours
  return decorateTripDurations(next)
}

export const mapAuditorRow = (row: any): TripAuditorRow => {
  const mapped = { ...row }
  Object.keys(mapped).forEach((key) => {
    if (/_date$/.test(key) || key.endsWith('_created') || key.endsWith('_pick_up') || key.endsWith('_close')) {
      const normalized = normalizeTimestamp(mapped[key])
      if (normalized) {
        mapped[key] = normalized
      }
    }
  })
  return mapped
}
