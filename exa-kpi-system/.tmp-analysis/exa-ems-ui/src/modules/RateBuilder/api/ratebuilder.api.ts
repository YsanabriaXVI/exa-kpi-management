/**
 * Rate Builder API Service
 */

import apiClient from '../../../services/api/axios.config'
import { RateBuilderData } from '../types'

export const rateBuilderAPI = {
  /**
   * Load rate builder data for a specific pType and classType
   */
  getRateBuilderData: async (pType: number, classType: number) => {
    const response = await apiClient.get(`/rate-builder-data/${pType}/${classType}`)
    // Robust extraction: check response.data.data.rate_builder_data, response.data.rate_builder_data, or response.data.data
    const payload = response.data
    const data = payload?.data?.rate_builder_data ?? payload?.rate_builder_data ?? payload?.data ?? []
    return data as RateBuilderData[]
  },

  /**
   * Update existing rate builder data entry
   */
  updateRateBuilderData: async (id: number, data: { rate_builder_id: number }) => {
    const response = await apiClient.put(`/rate-builder-data/${id}`, data)
    const payload = response.data
    return (payload?.data?.rate_builder_data ?? payload?.rate_builder_data ?? payload?.data) as RateBuilderData
  },

  /**
   * Create new rate builder data entry
   */
  createRateBuilderData: async (data: {
    subdivision_id: number
    client_id: number
    p_type: number
    class: number
    rate_builder_id: number
  }) => {
    const response = await apiClient.post('/rate-builder-data', data)
    const payload = response.data
    return (payload?.data?.rate_builder_data ?? payload?.rate_builder_data ?? payload?.data) as RateBuilderData
  },

  /**
   * Export rate builder data to Excel
   */
  exportRateBuilderData: async (pType: number, classType: number) => {
    const response = await apiClient.post(
      '/rate-builder-data/export/xlsx',
      { p_type: pType, class: classType },
      { responseType: 'blob' }
    )
    return response.data
  },
}



