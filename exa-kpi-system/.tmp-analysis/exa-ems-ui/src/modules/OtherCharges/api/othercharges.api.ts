/**
 * Other Charges API Service
 * Handles all API calls for Other Charges module
 */

import apiClient from '../../../services/api/axios.config'
import type { OtherCharge, OtherChargeListParams } from '../types'

/**
 * Helper function to convert field names from snake_case to camelCase
 * Example: other_charge_id → otherChargeId
 */
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

/**
 * Transform frontend params to backend format
 */
const transformSearchParams = (params: OtherChargeListParams = {}) => {
  const transformed: any = {
    filter: [],
    search: params.search || null,
    match: params.match || null,
    limit: params.limit || params.rows || 20,
    offset: params.first || ((params.page || 1) - 1) * (params.limit || params.rows || 20),
    order: null,
  }

  // Transform sortField and sortOrder to order array
  if (params.sortField) {
    transformed.order = [{
      key: snakeToCamel(params.sortField),
      value: params.sortOrder === -1 ? 'desc' : 'asc'
    }]
  }

  // Transform filters
  if (params.filters && Object.keys(params.filters).length > 0) {
    Object.keys(params.filters).forEach(field => {
      const filterValue = params.filters![field]
      if (filterValue) {
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
    })
  }

  return transformed
}

class OtherChargesAPI {
  /**
   * Get paginated list of other charges with filters
   */
  async getChargesList(params: OtherChargeListParams = {}) {
    try {
      const backendParams = transformSearchParams(params)
      
      console.log('🔍 Fetching Other Charges with params:', backendParams)
      
      // Backend uses GET /api/other-charges/charges with query params
      const response = await apiClient.get<any>('/other-charges/charges', {
        params: backendParams
      })
      
      console.log('✅ Other Charges API Response:', response.data)
      
      return {
        data: response.data?.data?.charges || response.data?.data || [],
        total: response.data?.total || 0,
        pagination: {
          page: params.page || 1,
          limit: params.limit || params.rows || 20,
          total: response.data?.total || 0,
        }
      }
    } catch (error: any) {
      console.error('❌ Other Charges API Error:', error.response?.data || error.message)
      // Return empty data instead of throwing to prevent UI crashes
      return {
        data: [],
        total: 0,
        pagination: {
          page: params.page || 1,
          limit: params.limit || params.rows || 20,
          total: 0,
        }
      }
    }
  }

  /**
   * Get single charge by ID
   */
  async getCharge(id: number): Promise<OtherCharge> {
    try {
      const response = await apiClient.get<{ status: string; data: OtherCharge }>(
        `/other-charges/charges/${id}`
      )
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch charge')
    }
  }

  /**
   * Create new charge
   */
  async createCharge(chargeData: Partial<OtherCharge>): Promise<OtherCharge> {
    try {
      const response = await apiClient.post<{ status: string; data: OtherCharge }>(
        '/other-charges/charges',
        chargeData
      )
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to create charge')
    }
  }

  /**
   * Update existing charge
   */
  async updateCharge(id: number, chargeData: Partial<OtherCharge>): Promise<OtherCharge> {
    try {
      const response = await apiClient.put<{ status: string; data: OtherCharge }>(
        `/other-charges/charges/${id}`,
        chargeData
      )
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to update charge')
    }
  }

  /**
   * Delete charge
   */
  async deleteCharge(id: number): Promise<void> {
    try {
      await apiClient.delete(`/other-charges/charges/${id}`)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete charge')
    }
  }

  /**
   * Fetch available routes (all of them, not paginated)
   */
  async getRoutes(): Promise<any[]> {
    try {
      console.log('🔍 Fetching ALL Routes...')
      
      // Fetch all routes by setting a high limit
      // Backend response shows total: 1044, so request limit=2000 to get all
      const response = await apiClient.get<{ status: string; data: any }>('/other-charges/routes', {
        params: {
          limit: 2000,  // Get all routes in one call
          page: 1
        }
      })
      
      console.log('✅ Routes API Response:', response.data)
      
      // Backend returns: { data: [...array of routes...], pagination: {...} }
      const routesData = response.data?.data || []
      console.log('📍 Extracted routes:', routesData.length, 'items')
      
      if (response.data?.pagination) {
        console.log('📊 Pagination info:', response.data.pagination)
      }
      
      return Array.isArray(routesData) ? routesData : []
    } catch (error: any) {
      console.error('❌ Routes API Error:', error.response?.data || error.message)
      // Return empty array instead of throwing to prevent UI crashes
      return []
    }
  }

  /**
   * Fetch payment plans (variants)
   */
  async getPaymentPlans(params?: any): Promise<any[]> {
    try {
      console.log('🔍 Fetching Payment Plans (Variants) with params:', params)
      const response = await apiClient.get<{ status: string; data: any[] }>('/other-charges/variants', { params })
      console.log('✅ Payment Plans API Response:', response.data)
      
      // Ensure we always return an array
      const plansData = response.data?.data || response.data || []
      return Array.isArray(plansData) ? plansData : []
    } catch (error: any) {
      console.error('❌ Payment Plans API Error:', error.response?.data || error.message)
      // Return empty array instead of throwing to prevent UI crashes
      return []
    }
  }
}

export const otherChargesAPI = new OtherChargesAPI()

