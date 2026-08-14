import apiClient from '../../../../services/api/axios.config'
import { MODULE_CHASSIS, MODULE_GENSET, getModuleIdByName } from '../../../../constants/modules'
import type { Equipment, EquipmentKind } from '../types'

const MODULE_ID_MAP: Record<EquipmentKind, number> = {
  chassis: getModuleIdByName(MODULE_CHASSIS),
  genset: getModuleIdByName(MODULE_GENSET),
}

const unwrap = (response: any) => response?.data ?? response
const getAssetsPayload = (payload: any) => payload?.data?.assets ?? payload?.assets ?? payload
const getAssetPayload = (payload: any) => payload?.data?.asset ?? payload?.asset ?? payload
const getAttributesPayload = (payload: any) => payload?.data?.attributes ?? payload?.attributes ?? payload

const normalizeEquipment = (raw: any): Equipment => {
  if (!raw) return { attributes: {} }
  const attributesArray = Array.isArray(raw.AssetsData ?? raw.assetsData) ? raw.AssetsData ?? raw.assetsData : []
  const attributes: Record<string, any> = {}

  // Map array-based attributes
  attributesArray.forEach((item: any) => {
    const key = item?.attributeid ?? item?.attribute_id ?? item?.id
    if (key != null) attributes[String(key)] = item?.value ?? item?.attribute_value ?? item?.attributeValue ?? ''
  })

  // Merge object-based attributes
  if (raw.attributes && typeof raw.attributes === 'object') {
    Object.entries(raw.attributes).forEach(([key, val]) => {
      attributes[String(key)] = val
    })
  }

  return {
    assetsid: raw.assetsid ?? raw.asset_id ?? raw.id,
    asset_id: raw.asset_id ?? raw.assetsid ?? raw.id,
    moduleid: raw.moduleid ?? raw.module_id ?? raw.moduleId,
    generic_name1: raw.generic_name1,
    generic_name2: raw.generic_name2,
    generic_name3: raw.generic_name3,
    generic_value1: raw.generic_value1,
    generic_value2: raw.generic_value2,
    generic_value3: raw.generic_value3,
    attributes,
  }
}

export const equipmentsAPI = {
  async list(kind: EquipmentKind): Promise<Equipment[]> {
    const moduleId = MODULE_ID_MAP[kind]
    const response = await apiClient.get(`/assets/${moduleId}`)
    const payload = unwrap(response)
    const assets = getAssetsPayload(payload)
    return Array.isArray(assets) ? assets.map(normalizeEquipment) : []
  },

  async get(kind: EquipmentKind, id: number | string): Promise<Equipment> {
    const moduleId = MODULE_ID_MAP[kind]
    const response = await apiClient.get(`/assets/${moduleId}/${id}`)
    const payload = unwrap(response)
    return normalizeEquipment(getAssetPayload(payload))
  },

  async create(kind: EquipmentKind, data: any): Promise<Equipment> {
    const moduleId = MODULE_ID_MAP[kind]
    const response = await apiClient.post(`/assets/${moduleId}`, data)
    const payload = unwrap(response)
    return normalizeEquipment(getAssetPayload(payload))
  },

  async update(kind: EquipmentKind, id: number | string, data: any): Promise<Equipment> {
    const moduleId = MODULE_ID_MAP[kind]
    const response = await apiClient.put(`/assets/${moduleId}/${id}`, data)
    const payload = unwrap(response)
    return normalizeEquipment(getAssetPayload(payload))
  },

  async remove(kind: EquipmentKind, id: number | string): Promise<void> {
    const moduleId = MODULE_ID_MAP[kind]
    await apiClient.delete(`/assets/${moduleId}/${id}`)
  },

  async getAttributes(kind: EquipmentKind): Promise<any[]> {
    const moduleId = MODULE_ID_MAP[kind]
    const response = await apiClient.get<any>(`/attributes_with_items/${moduleId}`)
    const payload = unwrap(response)
    const attrs = getAttributesPayload(payload)
    return Array.isArray(attrs) ? attrs : []
  },

  async getEquipmentSizes(): Promise<any[]> {
    const response = await apiClient.get('/assets/equipment-sizes')
    const payload = unwrap(response)
    const sizes = payload?.data ?? payload
    return Array.isArray(sizes) ? sizes : []
  },

  async getAttributeItems(attributeFlatNameId: string, moduleFlatNameId: string): Promise<any[]> {
    const response = await apiClient.get(
      `/attribute-service/attributes/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`
    )
    const payload = unwrap(response)
    // The response structure from legacy seems to be directly the payload or inside data
    // Based on EquipmentSizeActions.js: result.data.attribute_items or directly response
    // Let's assume unwrap handles the data wrapper.
    // Legacy: /attributes/${attributeId}/items -> result.data.attribute_items
    // Legacy: /attribute-service/attributes/?... -> response
    return Array.isArray(payload) ? payload : []
  },
}
