import apiClient from '../../../services/api/axios.config'
import type {
  TripListParams,
  TripListResponse,
  TripAuditorListParams,
  TripAuditorListResponse,
  TripAuditorRow,
  TripDetails,
  ExportParams,
} from '../types'
import {
  prepareTripListRecord,
  prepareTripDetails,
  serializeTripDetails,
  mapAuditorRow,
  RATES,
  RATE_TYPES,
} from '../utils/tripTransformers'
import { getModuleIdByName, MODULE_TRIP } from '../../../constants/modules'

const adminHeaders = {
  headers: {
    'Route-Type': 'admin',
  },
}

const snakeToCamel = (str: string): string => {
  const parts = str.split('_')
  return parts
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join('')
}

const transformSearchParams = (params: TripListParams | TripAuditorListParams) => {
  const transformed: any = {
    filter: [],
    search: params.search || null,
    match: params.match || null,
    limit: params.rows,
    offset: params.first,
    order: null,
  }

  if (params.sortField) {
    transformed.order = [
      {
        key: snakeToCamel(params.sortField),
        value: params.sortOrder === -1 ? 'desc' : 'asc',
      },
    ]
  }

  if (params.filters) {
    Object.keys(params.filters).forEach((key) => {
      const value = params.filters![key]
      if (value && typeof value === 'object' && value.value) {
        transformed.filter.push({ key: snakeToCamel(key), value: value.value })
      } else if (value && typeof value === 'string' && value.trim()) {
        transformed.filter.push({ key: snakeToCamel(key), value: value.trim() })
      }
    })
  }

  return transformed
}

const buildTripQueryParams = (params: TripListParams) => {
  const query: Record<string, any> = {
    limit: params.rows,
    offset: params.first,
    search: params.search || undefined,
  }

  if (params.sortField) {
    query.sort_by = snakeToCamel(params.sortField)
    query.sort_order = params.sortOrder === -1 ? 'desc' : 'asc'
  }

  if (params.filters) {
    Object.keys(params.filters).forEach((key) => {
      const value = params.filters![key]
      if (value && typeof value === 'object' && value.value) {
        query[key] = value.value
      } else if (value && typeof value === 'string' && value.trim()) {
        query[key] = value.trim()
      }
    })
  }

  return query
}

class TripsAPI {
  async getTripsList(params: TripListParams): Promise<TripListResponse> {
    const queryParams = buildTripQueryParams(params)
    const response = await apiClient.get<any>('/trips', {
      params: queryParams,
      ...adminHeaders,
    })
    const trips = response.data?.data?.trips || response.data?.trips || []
    const total = response.data?.total ?? response.data?.data?.total ?? trips.length
    const offset = response.data?.offset ?? params.first ?? 0
    return {
      trips: trips.map(prepareTripListRecord),
      total,
      offset,
    }
  }

  async getTripAuditorList(params: TripAuditorListParams): Promise<TripAuditorListResponse> {
    const body = transformSearchParams(params)
    const response = await apiClient.post<any>('/tripauditor', body, adminHeaders)
    const trips = response.data?.data?.trips || response.data?.trips || []
    const total = response.data?.total ?? response.data?.data?.total ?? trips.length
    const offset = response.data?.offset ?? params.first ?? 0
    return {
      trips: trips.map(mapAuditorRow),
      total,
      offset,
    }
  }

  async getTrip(id: number, isAudit = false): Promise<TripDetails> {
    const url = isAudit ? `/tripauditor/${id}` : `/trips/${id}`
    const response = await apiClient.get<any>(url, adminHeaders)
    const trip = response.data?.data?.trip || response.data?.trip
    return prepareTripDetails(trip)
  }

  async updateTrip(id: number, trip: TripDetails, isAudit = false): Promise<TripDetails> {
    const url = isAudit ? `/tripauditor/${id}` : `/trips/${id}`
    const payload = serializeTripDetails(trip, isAudit)
    const response = await apiClient.put<any>(url, payload, adminHeaders)
    const updated = response.data?.data?.trip || response.data?.trip
    return prepareTripDetails(updated)
  }

  async deleteTrip(id: number): Promise<void> {
    await apiClient.delete(`/trips/${id}`, adminHeaders)
  }

  async updateStatementStatus(id: number, payload: Record<string, any>): Promise<TripAuditorRow> {
    const response = await apiClient.put<any>(`/tripauditor/${id}/statment/status`, payload, adminHeaders)
    const trip = response.data?.data?.trip || response.data?.trip
    return mapAuditorRow(trip)
  }

  async getTripRates(tripId: number, inventoryId: number): Promise<any[]> {
    const response = await apiClient.get<any>(
      `/trips/${tripId}/inventory/${inventoryId}/rate`,
      adminHeaders,
    )
    return response.data?.data?.rates || response.data?.rates || []
  }

  async refreshTripRate(tripId: number, inventoryId: number, rateType: keyof typeof RATES): Promise<any[]> {
    const { type } = RATES[rateType]
    const response = await apiClient.put<any>(
      `/trips/${tripId}/inventory/${inventoryId}/rate/${type}/refresh`,
      {},
      adminHeaders,
    )
    return response.data?.data?.rates || response.data?.rates || []
  }

  async exportTrips(params: ExportParams): Promise<Blob> {
    const response = await apiClient.post(
      '/trips/export/xlsx',
      params,
      {
        responseType: 'blob',
        ...adminHeaders,
      },
    )
    return response.data
  }

  async exportTripAuditor(params: ExportParams, advanced = false): Promise<Blob> {
    const url = advanced ? '/tripauditor/export_adv/xlsx' : '/tripauditor/export/xlsx'
    const response = await apiClient.post(
      url,
      params,
      {
        responseType: 'blob',
        ...adminHeaders,
      },
    )
    return response.data
  }

  async getAttributesWithItems(module: string | number) {
    const moduleId = getModuleIdByName(module)
    const response = await apiClient.get<any>(`/attributes_with_items/${moduleId}`)
    return response.data?.data?.attributes || response.data?.attributes || []
  }

  async getInventoryOptions(query: Record<string, any> = {}) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const qs = params.toString() ? `?${params.toString()}` : ''
    const response = await apiClient.get<any>(`/assets/inventory/names${qs}`, adminHeaders)
    return response.data?.assets || response.data?.data?.assets || []
  }
}

export const tripsAPI = new TripsAPI()
