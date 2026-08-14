import apiClient from '../../../../services/api/axios.config'
import { MODULE_TRUCKS, getModuleIdByName } from '../../../../constants/modules'
import { Truck } from '../types'

const MODULE_ID = getModuleIdByName(MODULE_TRUCKS)

// Legacy APIs wrap payloads differently. Normalize here so the rest of the app gets plain objects.
const unwrap = (response: any) => response?.data ?? response
const getAssetsPayload = (payload: any) => payload?.data?.assets ?? payload?.assets ?? payload
const getAssetPayload = (payload: any) => payload?.data?.asset ?? payload?.asset ?? payload

export const trucksAPI = {
  getTrucks: async () => {
    const response = await apiClient.get(`/assets/${MODULE_ID}`)
    const payload = unwrap(response)
    const assets = getAssetsPayload(payload)
    return Array.isArray(assets) ? (assets as Truck[]) : []
  },

  getTruck: async (id: number | string) => {
    const response = await apiClient.get(`/assets/${MODULE_ID}/${id}`)
    const payload = unwrap(response)
    return getAssetPayload(payload) as Truck
  },

  createTruck: async (truck: Truck) => {
    const response = await apiClient.post(`/assets/${MODULE_ID}`, truck)
    const payload = unwrap(response)
    return getAssetPayload(payload) as Truck
  },

  updateTruck: async (id: number | string, truck: Truck) => {
    const response = await apiClient.put(`/assets/${MODULE_ID}/${id}`, truck)
    const payload = unwrap(response)
    return getAssetPayload(payload) as Truck
  },

  getAttributesWithItems: async () => {
    const response = await apiClient.get<any>(`/attributes_with_items/${MODULE_ID}`)
    return response.data?.data?.attributes || response.data?.attributes || []
  },

  getTruckNames: async () => {
    const response = await apiClient.get(`/assets/names/${MODULE_ID}`, {
      params: {
        'filter[]': '',
      },
    })
    const payload = unwrap(response)
    const assets = payload?.data?.assets ?? payload?.assets ?? payload
    return Array.isArray(assets) ? assets : []
  },

  deleteTruck: async (id: number | string) => {
    const response = await apiClient.delete(`/assets/${MODULE_ID}/${id}`)
    return unwrap(response)
  }
}
