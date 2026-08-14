import apiClient from '../../../../services/api/axios.config'
import { MODULE_DRIVERS, getModuleIdByName } from '../../../../constants/modules'
import { Driver } from '../types'

const MODULE_ID = getModuleIdByName(MODULE_DRIVERS)

const unwrap = (response: any) => response?.data ?? response
const getAssetsPayload = (payload: any) => payload?.data?.assets ?? payload?.assets ?? payload
const getAssetPayload = (payload: any) => payload?.data?.asset ?? payload?.asset ?? payload

export const driversAPI = {
  getDrivers: async () => {
    const response = await apiClient.get(`/assets/${MODULE_ID}`)
    const payload = unwrap(response)
    const assets = getAssetsPayload(payload)
    return Array.isArray(assets) ? (assets as Driver[]) : []
  },

  getDriver: async (id: number | string) => {
    const response = await apiClient.get(`/assets/${MODULE_ID}/${id}`)
    const payload = unwrap(response)
    return getAssetPayload(payload) as Driver
  },

  createDriver: async (driver: Driver) => {
    const response = await apiClient.post(`/assets/${MODULE_ID}`, driver)
    const payload = unwrap(response)
    return getAssetPayload(payload) as Driver
  },

  updateDriver: async (id: number | string, driver: Driver) => {
    const response = await apiClient.put(`/assets/${MODULE_ID}/${id}`, driver)
    const payload = unwrap(response)
    return getAssetPayload(payload) as Driver
  },

  getAttributesWithItems: async () => {
    const response = await apiClient.get<any>(`/attributes_with_items/${MODULE_ID}`)
    return response.data?.data?.attributes || response.data?.attributes || []
  },

  deleteDriver: async (id: number | string) => {
    const response = await apiClient.delete(`/assets/${MODULE_ID}/${id}`)
    return unwrap(response)
  },

  getDriverNames: async () => {
    const response = await apiClient.get(`/assets/names/${MODULE_ID}`, {
      params: {
        'filter[]': '',
      },
    })
    const payload = unwrap(response)
    const assets = payload?.data?.assets ?? payload?.assets ?? payload
    return Array.isArray(assets) ? assets : []
  },
}
