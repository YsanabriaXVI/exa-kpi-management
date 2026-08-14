/**
 * Work Orders API Service
 * Handles all API calls for Work Orders module
 */

import apiClient from '../../../services/api/axios.config'
import type {
  WorkOrder,
  WorkOrderListParams,
  WorkOrderListResponse,
  ExportParams,
} from '../types'
const WORK_ORDERS_MODULE_ID = 13
const adminHeaders = {
  headers: {
    'Route-Type': 'admin',
  },
}

/**
 * Helper function to convert field names from snake_case to camelCase
 * Example: work_order_id → workOrderId
 */
const snakeToCamel = (str: string): string => {
  const parts = str.split('_')
  // First word stays lowercase, rest are capitalized
  return parts
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join('')
}

/**
 * Transform frontend params to backend format
 * Backend expects: { order: [{ key, value }], offset, limit }
 * Frontend sends: { sortField, sortOrder, first, rows }
 */
const transformSearchParams = (params: WorkOrderListParams) => {
  // Start with EMPTY filter array - build it fresh from params.filters only
  const transformed: any = {
    filter: [],  // <- Always start empty, build from params.filters
    search: params.search || null,
    match: params.match || null,
    limit: params.rows,
    offset: params.first,
    order: null,
  }

  // Transform sortField and sortOrder to order array
  if (params.sortField) {
    transformed.order = [{
      key: snakeToCamel(params.sortField),
      value: params.sortOrder === -1 ? 'desc' : 'asc'
    }]
  }

  // Transform filters - handle both string values and object values
  // Build filter array ONLY from params.filters (ignore params.filter completely)
  if (params.filters && Object.keys(params.filters).length > 0) {
    Object.keys(params.filters).forEach(field => {
      const filterValue = params.filters![field]

      if (filterValue) {
        if (Array.isArray(filterValue)) {
          filterValue.forEach(val => {
            if (val) {
              transformed.filter.push({
                key: snakeToCamel(field),
                value: val
              })
            }
          })
        } else {
          const actualValue = typeof filterValue === 'string'
            ? filterValue
            : filterValue.value

          if (actualValue && actualValue.trim() !== '') {
            transformed.filter.push({
              key: snakeToCamel(field),
              value: actualValue
            })
          }
        }
      }
    })
  }

  return transformed
}

class WorkOrdersAPI {
  /**
   * Get paginated list of work orders with filters
   */
  async getWorkOrdersList(params: WorkOrderListParams): Promise<WorkOrderListResponse> {
    // Transform params to backend format
    const backendParams = transformSearchParams(params)

    const response = await apiClient.post<any>(
      '/workorders/search',
      backendParams
    )
    // Response structure from API: { data: { orders: [...] }, total: number, offset: number }
    // Axios response.data contains the API response
    return {
      orders: response.data?.data?.orders || [],
      total: response.data?.total || 0,
      offset: response.data?.offset || 0,
    }
  }

  /**
   * Get single work order by ID
   */
  async getWorkOrder(id: number): Promise<WorkOrder> {
    const response = await apiClient.get<{ status: string; code: number; data: { order: any } }>(
      `/workorders/${id}`,
      adminHeaders
    )
    const raw = response.data.data.order
    const toUnixNumber = (value: any) => {
      if (value === null || value === undefined || value === '') return null
      // Try simple number conversion first
      const num = Number(value)
      if (Number.isFinite(num)) return num

      // Try parsing as date
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000)
      }
      return null
    }

    console.log('🔍 [API] Raw work order data:', raw)
    console.log('🔍 [API] city_a object:', raw.city_a)
    console.log('🔍 [API] city_b object:', raw.city_b)
    console.log('🔍 [API] location_a object:', raw.location_a)
    console.log('🔍 [API] location_b object:', raw.location_b)

    const transformed = {
      ...raw,
      work_order_id: raw.work_order_id,
      ref_number: raw.ref_number,
      is_return_trip: !!raw.is_return_trip,
      is_return: !!raw.city_c,
      client_id: raw.client?.client_id ?? raw.client_id,
      cargo_id: raw.cargo_id,
      city_a_id: raw.city_a?.city_id ?? raw.city_a_id,
      city_b_id: raw.city_b?.city_id ?? raw.city_b_id,
      city_c_id: raw.city_c?.city_id ?? raw.city_c_id,
      city_a_name: raw.city_a?.name,
      city_b_name: raw.city_b?.name,
      city_c_name: raw.city_c?.name,
      location_a_id: raw.location_a?.location_id ?? raw.location_a_id,
      location_b_id: raw.location_b?.location_id ?? raw.location_b_id,
      location_c_id: raw.location_c?.location_id ?? raw.location_c_id,
      location_a_name: raw.location_a?.name,
      location_b_name: raw.location_b?.name,
      location_c_name: raw.location_c?.name,
      date_a: toUnixNumber(raw.date_a),
      date_b: toUnixNumber(raw.date_b),
      trips: raw.trips || [],
      customs: !!raw.customs,
      work_order_routes: raw.work_order_routes || [],
      active: raw.active === true ? 'Yes' : raw.active,
    }

    console.log('🔍 [API] Transformed work order:', transformed)
    console.log('🔍 [API] city_a_id:', transformed.city_a_id, 'city_a_name:', transformed.city_a_name)
    console.log('🔍 [API] city_b_id:', transformed.city_b_id, 'city_b_name:', transformed.city_b_name)
    console.log('🔍 [API] location_a_id:', transformed.location_a_id, 'location_a_name:', transformed.location_a_name)
    console.log('🔍 [API] location_b_id:', transformed.location_b_id, 'location_b_name:', transformed.location_b_name)

    return transformed
  }

  /**
   * Create new work order
   */
  async createWorkOrder(workorder: Partial<WorkOrder>): Promise<WorkOrder> {
    const response = await apiClient.post<{ status: string; code: number; data: { order: WorkOrder } }>(
      '/workorders',
      workorder,
      adminHeaders
    )
    return response.data.data.order
  }

  /**
   * Update existing work order
   */
  async updateWorkOrder(id: number, workorder: Partial<WorkOrder>): Promise<WorkOrder> {
    const response = await apiClient.put<{ status: string; code: number; data: { order: WorkOrder } }>(
      `/workorders/${id}`,
      workorder,
      adminHeaders
    )
    return response.data.data.order
  }

  /**
   * Delete work order
   */
  async deleteWorkOrder(id: number): Promise<void> {
    await apiClient.delete(`/workorders/${id}`, adminHeaders)
  }

  /**
   * Export work orders to Excel (Basic)
   */
  async exportWorkOrders(params: ExportParams): Promise<Blob> {
    const backendParams = transformSearchParams(params)
    const exportParams = {
      ...backendParams,
      columns: params.columns,
    }

    const response = await apiClient.post(
      '/workorder-service/workorders/export/xlsx',
      exportParams,
      {
        responseType: 'blob',
        ...adminHeaders,
      }
    )
    return response.data
  }

  /**
   * Export work orders to Excel (Advanced)
   */
  async exportWorkOrdersAdvanced(params: ExportParams): Promise<Blob> {
    const backendParams = transformSearchParams(params)
    const exportParams = {
      ...backendParams,
      columns: params.columns,
    }

    const response = await apiClient.post(
      '/workorder-service/workorders/export_adv/xlsx',
      exportParams,
      {
        responseType: 'blob',
        ...adminHeaders,
      }
    )
    return response.data
  }
}

export const workOrdersAPI = new WorkOrdersAPI()

export const workOrderHelpers = {
  /**
   * Get attributes with items for Work Orders module
   * NOTE: This endpoint does NOT use admin headers (matching legacy implementation)
   * The admin header causes the backend to return incomplete item data
   */
  async getAttributesWithItems() {
    const response = await apiClient.get<any>(`/attributes_with_items/${WORK_ORDERS_MODULE_ID}`)
    // Legacy returns result.data.attributes directly
    return response.data?.data?.attributes ?? response.data?.attributes ?? []
  },
  async getRoutesByClient(clientId: number, query: Record<string, any> = {}) {
    const params = new URLSearchParams()
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const qs = params.toString() ? `?${params.toString()}` : ''
    const response = await apiClient.get<any>(`/routes/client/${clientId}${qs}`, adminHeaders)
    console.log('🔍 [API] Routes response structure:', response.data)
    // Handle nested response: response.data.data.routes or response.data.routes
    const routes = response.data?.data?.routes ?? response.data?.routes ?? []
    console.log('🔍 [API] Extracted routes:', routes.length, 'routes')
    return routes
  },
  async getLocationsByCity(cityId: number) {
    const response = await apiClient.get<any>(`/locations/city/${cityId}`, adminHeaders)
    console.log('🔍 [API] Locations response structure for city', cityId, ':', response.data)
    // Handle nested response: response.data.data.locations or response.data.locations
    const locations = response.data?.data?.locations ?? response.data?.locations ?? []
    console.log('🔍 [API] Extracted locations for city', cityId, ':', locations.length, 'locations')
    return locations
  },
  async getInventoryForWorkOrders(query: Record<string, any> = {}) {
    const params = new URLSearchParams()
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const qs = params.toString() ? `?${params.toString()}` : ''
    console.log('🔍 [API] getInventoryForWorkOrders - URL:', `/assets/inventory/names${qs}`)
    console.log('🔍 [API] getInventoryForWorkOrders - Query params:', query)
    const response = await apiClient.get<any>(`/assets/inventory/names${qs}`, adminHeaders)
    console.log('🔍 [API] getInventoryForWorkOrders - Full response:', response)
    console.log('🔍 [API] getInventoryForWorkOrders - response.data:', response.data)
    console.log('🔍 [API] getInventoryForWorkOrders - response.data.assets:', response.data?.assets)

    // Try multiple possible response structures
    const assets = response.data?.assets ?? response.data?.data?.assets ?? response.data ?? []
    console.log('🔍 [API] getInventoryForWorkOrders - Extracted assets:', assets)
    return assets
  },
}
