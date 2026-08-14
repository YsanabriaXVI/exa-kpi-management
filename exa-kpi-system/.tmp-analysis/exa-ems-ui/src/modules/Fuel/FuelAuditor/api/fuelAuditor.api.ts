import api from '../../../../services/api/axios.config'
import type {
  GasStationTransaction,
  FuelAuditorListParams,
  FuelAuditorListResponse,
  BulkPaymentStatusPayload,
  LinkFuelOrderPayload,
  PaymentStatusOption,
  FuelOrderSummary,
} from '../types/fuelAuditor.types'

const BASE_URL = '/fuel-service/gas-station-transaction'
const FUEL_ORDER_URL = '/fuel-service/fuelorder'
const ATTRIBUTE_URL = '/attribute-service/attributes'

const fmtDate = (val: any): string => {
  if (!val) return ''
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    const day = d.getDate()
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const mon = months[d.getMonth()]
    const yr = String(d.getFullYear()).slice(-2)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${day} ${mon} ${yr} ${hh}:${mm}`
  } catch { return String(val) }
}

const deserializeTransaction = (record: any): GasStationTransaction => {
  const result = { ...record }
  const station = result.gasStation ?? result.GasStation
  if (station && !result.gasStationName) {
    result.gasStationName = station.name
  }

  if (result.dateTime) result.dateTimeFormat = fmtDate(result.dateTime)
  if (result.createdAt) result.createdAtFormat = fmtDate(result.createdAt)
  if (result.updatedAt) result.updatedAtFormat = fmtDate(result.updatedAt)

  const txnAmount = Number(result.amount ?? 0)
  const txnUnitPrice = Number(result.unitPrice ?? 0)
  const orderUnitPrice = Number(result.fuelOrder?.unitPrice ?? 0)
  const orderQuantity = Number(result.fuelOrder?.fuelRequestLtr ?? result.fuelOrder?.quantity ?? 0)
  const orderAmount = orderUnitPrice && orderQuantity ? orderUnitPrice * orderQuantity : Number(result.fuelOrder?.amount ?? 0)

  if (result.fuelOrderId && orderAmount) {
    result.amountDifference = txnAmount - orderAmount
    result.unitPriceDifference = orderUnitPrice
      ? ((txnUnitPrice - orderUnitPrice) / orderUnitPrice) * 100
      : 0
  }

  if (result.gas_supplier_payment_status == null && result.fuelOrder?.gas_supplier_payment_status != null) {
    result.gas_supplier_payment_status = result.fuelOrder.gas_supplier_payment_status
  }
  if (result.subdivision_payment_status == null && result.fuelOrder?.subdivision_payment_status != null) {
    result.subdivision_payment_status = result.fuelOrder.subdivision_payment_status
  }

  result.gasSupplierPaymentStatusName = result.gasSupplierPaymentStatusName ?? result.gas_supplier_payment_status_name ?? ''
  result.subdivisionPaymentStatusName = result.subdivisionPaymentStatusName ?? result.subdivision_payment_status_name ?? ''

  return result
}

class FuelAuditorApi {
  async fetchList(params: FuelAuditorListParams): Promise<FuelAuditorListResponse> {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('size', String(params.size))
    if (params.sortField) query.set('sortField', params.sortField)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        if (Array.isArray(value)) {
          value.forEach((v) => query.append(key, String(v)))
        } else {
          query.set(key, String(value))
        }
      })
    }
    const res = await api.get<any>(`${BASE_URL}/paged?${query.toString()}`)
    const raw = res.data
    const records =
      raw?.items ??
      raw?.data?.items ??
      (Array.isArray(raw?.data) ? raw.data : null) ??
      raw?.rows ??
      (Array.isArray(raw) ? raw : null) ??
      []
    const data = Array.isArray(records) ? records : []
    return {
      data: data.map(deserializeTransaction),
      total: raw?.total ?? raw?.count ?? data.length,
      page: params.page,
      size: params.size,
    }
  }

  async fetchById(id: number): Promise<GasStationTransaction> {
    const res = await api.get<any>(`${BASE_URL}/${id}`)
    return deserializeTransaction(res.data?.data ?? res.data)
  }

  async remove(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`)
  }

  async bulkDelete(transactionIds: number[]): Promise<void> {
    await api.post(`${BASE_URL}/bulk-delete`, { transactionIds })
  }

  async bulkUpdatePaymentStatus(payload: BulkPaymentStatusPayload): Promise<void> {
    await api.post(`${BASE_URL}/bulk-update-payment-status`, payload)
  }

  async linkFuelOrder(payload: LinkFuelOrderPayload): Promise<any> {
    const res = await api.patch<any>(`${BASE_URL}/${payload.transactionId}`, {
      fuelOrderId: payload.fuelOrderId,
    })
    return res.data
  }

  async exportExcel(params: FuelAuditorListParams): Promise<Blob> {
    const payload: Record<string, any> = {}
    if (params.sortField) payload.sortField = params.sortField
    if (params.sortOrder) payload.sortOrder = params.sortOrder
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          payload[key] = value
        }
      })
    }
    const res = await api.post(`${BASE_URL}/export-excel`, payload, {
      responseType: 'blob',
    })
    return res.data
  }

  async fetchFuelOrder(id: number): Promise<FuelOrderSummary> {
    const res = await api.get<any>(`${FUEL_ORDER_URL}/${id}`)
    return res.data?.data ?? res.data
  }

  async updatePaymentStatus(
    fuelOrderId: number,
    payload: { gasSupplierPaymentStatus?: number; subdivisionPaymentStatus?: number },
  ): Promise<any> {
    const res = await api.put<any>(
      `${FUEL_ORDER_URL}/payment-status/${fuelOrderId}`,
      payload,
    )
    return res.data
  }

  async searchUnlinkedFuelOrders(
    query?: string,
    transactionData?: any,
  ): Promise<FuelOrderSummary[]> {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (transactionData) params.set('transactionData', JSON.stringify(transactionData))
    const res = await api.get<any>(
      `${FUEL_ORDER_URL}/search-unlinked?${params.toString()}`,
    )
    return res.data?.data ?? res.data ?? []
  }

  async fetchGasStation(id: number): Promise<any> {
    const res = await api.get<any>(`/fuel-service/gas-station/${id}`)
    return res.data?.data ?? res.data
  }

  async loadPaymentStatusOptions(
    attributeFlatNameId: string,
  ): Promise<PaymentStatusOption[]> {
    const res = await api.get<any>(
      `${ATTRIBUTE_URL}/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=fuel_order`,
    )
    const attrs =
      res.data?.data?.attributes ?? res.data?.attributes ?? res.data ?? []
    const items =
      Array.isArray(attrs) && attrs.length > 0 && attrs[0]?.items
        ? attrs[0].items
        : attrs
    return items.map((item: any) => ({
      value: item.attributeItemId ?? item.attribute_item_id ?? item.attributeItemid,
      label: item.name,
    }))
  }
}

export const fuelAuditorApi = new FuelAuditorApi()
