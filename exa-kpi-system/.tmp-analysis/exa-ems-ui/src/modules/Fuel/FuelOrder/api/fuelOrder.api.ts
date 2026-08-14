import api from '../../../../services/api/axios.config'
import formatDate from '../../../../helpers/IsoDateFormatter'
import type {
  FuelOrder,
  FuelOrderForm,
  FuelOrderListParams,
  FuelOrderListResponse,
  AttributeItem,
  StatusUpdatePayload,
  PaymentStatusPayload,
  ReconciliationPayload,
  SuggestedFuelParams,
  TripSearchResult,
  CityOption,
  DriverOption,
  EquipmentDetail,
  TripDetail,
  GasStationInfo,
  ManualTripSearchParams,
} from '../types/fuelOrder.types'

const BASE_URL = '/fuel-service/fuelOrder'
const FUEL_ORDER_URL = '/fuel-service/fuelorder'
const SETTINGS_URL = '/fuel-service/fuelSettings'
const RECONCILIATION_URL = '/fuel-service/reconciliations'
const TRIP_URL = '/workorder-service/trips'
const ATTRIBUTE_URL = '/attribute-service/attributes'
const ASSET_URL = '/assets-service'
const CITY_URL = '/fuel-service/cities'

const deserializeRecord = (record: any): FuelOrder => {
  const result = { ...record }

  // Flatten nested attribute objects into display-name fields
  result.gasStationName =
    result.gasStation?.name ?? result.GasStation?.name ?? result.gasStationName ?? ''
  result.orderTypeName =
    result.orderTypeAttr?.name ?? result.orderTypeName ?? ''
  result.fuelTypeName =
    result.fuelTypeAttr?.name ?? result.fuelTypeName ?? ''
  result.statusFuelOrderName =
    result.orderStatusAttr?.name ?? result.statusFuelOrderName ?? ''
  result.typeContainerName =
    result.containerTypeAttr?.name ?? result.typeContainerName ?? ''
  result.statusReconciliationName =
    result.reconciliationStatusAttr?.name ?? result.statusReconciliationName ?? ''

  // Flatten statement statuses
  if (result.supplierStatementStatus && typeof result.supplierStatementStatus === 'object') {
    result.supplierStatementStatus = result.supplierStatementStatus.name ?? ''
  }
  if (result.fuelStatementStatus && typeof result.fuelStatementStatus === 'object') {
    result.fuelStatementStatus = result.fuelStatementStatus.name ?? ''
  }

  // Flatten nested relationships
  if (result.trip && !result.tripsid) {
    result.tripsid = result.trip.tripsid
  }
  if (result.gasStations && !result.gasStationsParentId) {
    result.gasStationsParentId = result.gasStations.gasStationsParentId
  }

  // User display names
  for (const field of ['CreatedBy', 'UpdatedBy', 'createdByUser', 'updatedByUser']) {
    const val = result[field]
    if (val && typeof val === 'object') {
      result[field] = `${val.firstName ?? ''} ${val.lastName ?? ''}`.trim()
    }
  }

  // Date formatting
  for (const field of ['createdAt', 'updatedAt', 'dateSchedule', 'expirationDate', 'approveAt', 'approvalDate', 'dateSupplied']) {
    if (result[field]) {
      result[`${field}Format`] = formatDate(result[field]) ?? ''
    }
  }

  // Flatten user display names for list columns
  if (result.CreatedBy && typeof result.CreatedBy === 'string') {
    result.createdByUser = result.CreatedBy
  } else if (!result.createdByUser || typeof result.createdByUser === 'object') {
    const cb = result.CreatedBy ?? result.createdByUser
    if (cb && typeof cb === 'object') {
      result.createdByUser = `${cb.firstName ?? ''} ${cb.lastName ?? ''}`.trim()
    }
  }

  // Fuel request in liters — map backend field names to UI field names
  if (result.fuelRequestLtr == null && result.fuelRequest != null) {
    result.fuelRequestLtr = result.fuelRequest
  }
  result.fuelRequestLiters = result.fuelRequestLiters ?? result.fuelRequestLtr ?? result.fuelRequest ?? null
  result.fuelTankLiters = result.fuelTankLiters ?? result.fuelTankLtr ?? result.fuelTank ?? null

  // Map snake_case payment status fields to camelCase
  if (result.gas_supplier_payment_status !== undefined && result.gasSupplierPaymentStatus === undefined) {
    result.gasSupplierPaymentStatus = result.gas_supplier_payment_status
  }
  if (result.subdivision_payment_status !== undefined && result.subdivisionPaymentStatus === undefined) {
    result.subdivisionPaymentStatus = result.subdivision_payment_status
  }

  // Map gasStationfuelStatementId → gasStationStatementId
  if (result.gasStationfuelStatementId !== undefined && result.gasStationStatementId === undefined) {
    result.gasStationStatementId = result.gasStationfuelStatementId
  }

  // Subdivision name
  if (!result.subdivisionName) {
    const sd = result.subdivision_data ?? result.subdivisionData
    if (sd && typeof sd === 'object') {
      result.subdivisionName = sd.name ?? ''
    }
  }

  // Reconstruct routeLegs from flat route fields or backend `legs` array
  if (!result.routeLegs && (result.fromCityId || result.routes || result.legs)) {
    const routeSource = Array.isArray(result.legs) ? result.legs
      : Array.isArray(result.routes) ? result.routes
      : null
    if (routeSource) {
      result.routeLegs = routeSource.map((r: any) => ({
        fromCityId: r.fromCityId ?? r.from_city_id,
        fromCityName: r.fromCityName ?? r.fromCity?.name ?? '',
        toCityId: r.toCityId ?? r.to_city_id,
        toCityName: r.toCityName ?? r.toCity?.name ?? '',
      }))
    } else if (result.fromCityId && result.toCityId) {
      result.routeLegs = [{
        fromCityId: result.fromCityId,
        fromCityName: result.fromCityName ?? '',
        toCityId: result.toCityId,
        toCityName: result.toCityName ?? '',
      }]
    }
  }

  // Reconstruct settings from flat settings_* fields
  if (!result.settings && result.settings_name) {
    result.settings = {
      name: result.settings_name,
      fuelModuleConfigId: result.settings_fuelModuleConfigId ?? result.fuelModuleConfigId,
      tripRequired: result.settings_tripRequired,
      fuelVariationMin: result.settings_fuelVariationMin,
      fuelVariationMax: result.settings_fuelVariationMax,
      maxFuelFeature: result.settings_maxFuelFeature,
    }
  }

  // Construct fuelAuditor from GasStationTransactions with all reconciliation fields
  if (!result.fuelAuditor && result.GasStationTransactions?.length) {
    const txn = result.GasStationTransactions[0]
    result.fuelAuditor = {
      gasStationTransactionId: txn.gasStationTransactionId ?? txn.gas_station_transaction_id ?? txn.id ?? null,
      licensePlate: txn.licensePlate ?? txn.license_plate ?? '',
      fuelType: txn.fuelType ?? txn.fuel_type ?? '',
      measureUnit: txn.measureUnit ?? txn.measure_unit ?? '',
      unitPrice: txn.unitPrice ?? txn.unit_price ?? null,
      quantity: txn.quantity ?? null,
      currency: txn.currency ?? '',
      amount: txn.amount ?? null,
      transactionId: txn.transactionId ?? txn.transaction_id ?? '',
      documentNumber: txn.documentNumber ?? txn.document_number ?? '',
      paymentMethod: txn.paymentMethod ?? txn.payment_method ?? '',
      dateTime: txn.dateTime ?? txn.date_time ?? '',
    }
  }

  return result
}

class FuelOrderApi {
  async fetchList(params: FuelOrderListParams): Promise<FuelOrderListResponse> {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('size', String(params.size))
    if (params.sortField) query.set('sortField', params.sortField)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value))
        }
      })
    }
    const res = await api.get<any>(`${BASE_URL}?${query.toString()}`)
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
      data: data.map(deserializeRecord),
      total: raw?.total ?? raw?.count ?? data.length,
      page: params.page,
      size: params.size,
    }
  }

  async fetchById(id: number): Promise<FuelOrder> {
    const res = await api.get<any>(`${FUEL_ORDER_URL}/${id}`)
    const record = res.data?.data ?? res.data
    return deserializeRecord(record)
  }

  async create(form: FuelOrderForm): Promise<FuelOrder> {
    const res = await api.post<any>(BASE_URL, form)
    return deserializeRecord(res.data?.data ?? res.data)
  }

  async update(form: FuelOrderForm): Promise<FuelOrder> {
    if (!form.fuelOrderId) throw new Error('fuelOrderId is required to update')
    const res = await api.put<any>(`${FUEL_ORDER_URL}/${form.fuelOrderId}`, form)
    return deserializeRecord(res.data?.data ?? res.data)
  }

  async remove(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`)
  }

  async downloadPdf(id: number): Promise<Blob> {
    const res = await api.get(`${FUEL_ORDER_URL}/download/${id}`, {
      responseType: 'blob',
    })
    return res.data
  }

  async updateStatus(payload: StatusUpdatePayload): Promise<any> {
    const res = await api.post<any>(`${BASE_URL}/update-status`, {
      orderId: payload.orderId,
      action: payload.action,
    })
    return res.data
  }

  async updatePaymentStatus(payload: PaymentStatusPayload): Promise<any> {
    const res = await api.put<any>(
      `${FUEL_ORDER_URL}/payment-status/${payload.fuelOrderId}`,
      payload,
    )
    return res.data
  }

  async syncFuelPrice(fuelOrderId: number): Promise<any> {
    const res = await api.get<any>(`${BASE_URL}/${fuelOrderId}/fuel-price`)
    return res.data
  }

  async getSuggestedFuel(params: SuggestedFuelParams): Promise<number | null> {
    if (params.orderType === 1588 && params.routeLegs?.length) {
      const res = await api.post<any>(`${BASE_URL}/custom-suggested`, params)
      return res.data?.suggested ?? res.data ?? null
    }
    if (params.equipmentType && params.equipmentType !== 1) {
      const res = await api.post<any>(
        `${BASE_URL}/calculate-suggested-other-assets`,
        params,
      )
      return res.data?.suggested ?? res.data ?? null
    }
    const query = new URLSearchParams()
    if (params.routeid) query.set('routeid', String(params.routeid))
    if (params.clientid) query.set('clientid', String(params.clientid))
    if (params.subdivisionId) query.set('subdivisionId', String(params.subdivisionId))
    if (params.workorderid) query.set('workorderid', String(params.workorderid))
    if (params.equipmentType) query.set('equipmentType', 'Truck')
    if (params.ratebuilderId) query.set('ratebuilderId', String(params.ratebuilderId))
    if (params.tripId) query.set('tripId', String(params.tripId))
    const res = await api.get<any>(`${BASE_URL}/suggested?${query.toString()}`)
    return res.data?.suggested ?? res.data ?? null
  }

  async getSimpleSuggested(tripId: number): Promise<number | null> {
    const res = await api.get<any>(`${BASE_URL}/suggested-simple?tripId=${tripId}`)
    return res.data?.suggested ?? res.data ?? null
  }

  async getSimpleSuggestedWithParams(queryString: string): Promise<number | null> {
    const res = await api.get<any>(`${BASE_URL}/suggested-simple?${queryString}`)
    return res.data?.suggestedAmount ?? res.data?.suggested ?? res.data ?? null
  }

  async getRouteId(fromCityId: number, toCityId: number): Promise<number | null> {
    const res = await api.get<any>(
      `${BASE_URL}/routeId?fromCityId=${fromCityId}&toCityId=${toCityId}`,
    )
    return res.data?.routeId ?? res.data ?? null
  }

  async checkFuelLimit(payload: any): Promise<any> {
    const res = await api.post<any>(`${SETTINGS_URL}/fuel-limit-assessment`, payload)
    return res.data
  }

  async fetchSettings(params?: Record<string, any>): Promise<any> {
    if (!params || Object.keys(params).length === 0) return null
    const query = '?' + new URLSearchParams(params as any).toString()
    const res = await api.get<any>(`${SETTINGS_URL}/search${query}`, {
      validateStatus: () => true,
    })
    if (res.status >= 400) return null
    return res.data?.data ?? res.data
  }

  // Reconciliation
  async addReconciliation(payload: ReconciliationPayload): Promise<any> {
    const res = await api.post<any>(
      `${RECONCILIATION_URL}/gas-station-transaction/${payload.fuelOrderId}`,
      payload,
    )
    return res.data
  }

  async updateReconciliation(
    transactionId: number,
    payload: ReconciliationPayload,
  ): Promise<any> {
    const res = await api.put<any>(
      `${RECONCILIATION_URL}/gas-station-transaction/${transactionId}`,
      payload,
    )
    return res.data
  }

  async deleteReconciliation(transactionId: number): Promise<void> {
    await api.delete(`/fuel-service/gas-station-transaction/delete/${transactionId}`)
  }

  // Trip lookups
  async fetchTrip(tripId: number): Promise<TripDetail> {
    const res = await api.get<any>(`${TRIP_URL}/${tripId}`)
    return res.data?.data ?? res.data
  }

  async searchTrips(
    query: string,
    orderType?: number,
    manualParams?: ManualTripSearchParams,
    signal?: AbortSignal,
  ): Promise<TripSearchResult[]> {
    const endpoint =
      orderType === 1588
        ? `${TRIP_URL}/search-manual-trips`
        : `${TRIP_URL}/search-trips`
    let url = `${endpoint}?query=${encodeURIComponent(query)}`
    if (orderType === 1588 && manualParams) {
      if (manualParams.fromCityId) url += `&fromCityId=${manualParams.fromCityId}`
      if (manualParams.toCityId) url += `&toCityId=${manualParams.toCityId}`
      if (manualParams.subdivisionId) url += `&subdivisionId=${manualParams.subdivisionId}`
      if (manualParams.responsibleId) url += `&responsibleId=${manualParams.responsibleId}`
      if (manualParams.clientId) url += `&clientId=${manualParams.clientId}`
    }

    // Numeric queries bypass the expensive 5-table LIKE search and fetch by primary key directly
    if (/^\d+$/.test(query.trim())) {
      try {
        const direct = await api.get<any>(`${TRIP_URL}/${query.trim()}`, {
          validateStatus: () => true,
          signal,
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        })
        if (direct.status < 400 && direct.data) {
          const detail = direct.data?.data ?? direct.data
          if (detail?.tripsid) return [detail as unknown as TripSearchResult]
        }
      } catch {
        // ignore — return empty below
      }
      return []
    }

    const res = await api.get<any>(url, {
      validateStatus: () => true,
      signal,
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    if (res.status >= 400) return []
    return res.data?.data ?? res.data ?? []
  }

  // Attribute items
  async loadAttributeItems(
    attributeFlatNameId: string,
    moduleFlatNameId = 'fuel_order',
  ): Promise<AttributeItem[]> {
    const res = await api.get<any>(
      `${ATTRIBUTE_URL}/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`,
      { validateStatus: () => true },
    )
    if (res.status >= 400) return []
    const attrs =
      res.data?.data?.attributes ?? res.data?.attributes ?? res.data ?? []
    if (Array.isArray(attrs) && attrs.length > 0 && attrs[0]?.items) {
      return attrs[0].items
    }
    return attrs
  }

  // City lookups
  async fetchCity(cityId: number): Promise<CityOption> {
    const res = await api.get<any>(`${CITY_URL}/${cityId}`)
    return res.data
  }

  async fetchConnectedCities(fromCityId: number, subdivisionId?: number): Promise<CityOption[]> {
    const query = new URLSearchParams()
    query.set('fromCityId', String(fromCityId))
    if (subdivisionId) query.set('subdivisionId', String(subdivisionId))
    const res = await api.get<any>(`${CITY_URL}/connected?${query.toString()}`)
    return res.data ?? []
  }

  async fetchAllCitiesForOrderType(): Promise<CityOption[]> {
    const res = await api.get<any>(`${CITY_URL}/all-for-order-type`)
    return res.data ?? []
  }

  async searchCities(query: string): Promise<CityOption[]> {
    const res = await api.get<any>(
      `${CITY_URL}/search?q=${encodeURIComponent(query)}`,
    )
    return res.data ?? []
  }

  // Equipment lookups
  async fetchTruckDetail(id: number): Promise<EquipmentDetail> {
    const res = await api.get<any>(`${ASSET_URL}/truck/detail/${id}`)
    return res.data?.data ?? res.data
  }

  async fetchGensetDetail(id: number): Promise<EquipmentDetail> {
    const res = await api.get<any>(`${ASSET_URL}/genset/detail/${id}`)
    return res.data?.data ?? res.data
  }

  async fetchOtherAssetDetail(id: number): Promise<EquipmentDetail> {
    const res = await api.get<any>(`${ASSET_URL}/kindofassets/detail/${id}`)
    return res.data?.data ?? res.data
  }

  async fetchDriverOptions(equipmentId: number): Promise<DriverOption[]> {
    const res = await api.get<any>(`${ASSET_URL}/fetchdriver/${equipmentId}`)
    return res.data?.data ?? res.data ?? []
  }

  async fetchDriversForAsset(
    type: number,
    equipmentId: number,
  ): Promise<DriverOption[]> {
    const res = await api.get<any>(
      `${ASSET_URL}/fetchdrivers/${type}/${equipmentId}`,
    )
    return res.data?.data ?? res.data ?? []
  }

  async fetchDriverDetail(driverId: number): Promise<DriverOption> {
    const res = await api.get<any>(
      `${ASSET_URL}/driver-unfiltered/detail/${driverId}`,
    )
    return res.data?.data ?? res.data
  }

  async searchEquipment(
    equipmentType: number,
    query: string,
  ): Promise<any[]> {
    let endpoint: string
    switch (equipmentType) {
      case 1:
        endpoint = `${ASSET_URL}/truck/search`
        break
      case 2:
        endpoint = `${ASSET_URL}/genset/search`
        break
      case 3:
        endpoint = `${ASSET_URL}/kindofassets/search`
        break
      default:
        return []
    }
    const res = await api.get<any>(
      `${endpoint}?query=${encodeURIComponent(query)}`,
      { validateStatus: () => true },
    )
    if (res.status >= 400) return []
    return res.data?.data ?? res.data ?? []
  }

  async searchOtherAssets(payload: any): Promise<any[]> {
    const res = await api.post<any>(`${ASSET_URL}/other-assets-search`, payload)
    return res.data?.data ?? res.data ?? []
  }

  async searchOtherAssetPeople(payload: any): Promise<any[]> {
    const res = await api.post<any>(
      `${ASSET_URL}/other-assets-people-search`,
      payload,
    )
    return res.data?.data ?? res.data ?? []
  }

  // Gas Station lookup
  async fetchGasStation(id: number): Promise<GasStationInfo> {
    const res = await api.get<any>(`/fuel-service/gas-station/${id}`)
    return res.data?.data ?? res.data
  }

  // Gas Supplier list (for select)
  async fetchGasSupplierStores(): Promise<any[]> {
    const res = await api.get<any>('/fuel-service/gas-station')
    return res.data ?? []
  }
}

export const fuelOrderApi = new FuelOrderApi()
