import apiClient from '../../../../services/api/axios.config'
import type { AttributeItem } from '../../../Attributes/types'
import type { AttributeField, OtherAsset } from '../types'

const getPayload = (response: any) => response?.data?.data ?? response?.data ?? response

const normalizeAttributeItem = (item: any): AttributeItem => ({
  attribute_item_id: item?.attribute_item_id ?? item?.attributeItemId ?? item?.id ?? null,
  name: item?.name ?? '',
  status: item?.status ?? item?.state ?? null,
  attribute_id: item?.attribute_id ?? item?.attributeId,
})

const normalizeAttribute = (raw: any): AttributeField => {
  const fieldType =
    raw?.field_type_id ??
    raw?.fieldTypeId ??
    raw?.fieldtypeid ??
    raw?.fieldType?.fieldTypeId ??
    raw?.fieldType?.field_type_id ??
    raw?.type?.field_type_id ??
    raw?.type?.fieldTypeId

  const items = raw?.attributeItems ?? raw?.attribute_items ?? raw?.items ?? []

  return {
    attribute_id: Number(raw?.attribute_id ?? raw?.attributeId ?? raw?.attributeid ?? raw?.id),
    name: raw?.name ?? raw?.attribute_name ?? '',
    required: Number(raw?.required ?? raw?.is_required ?? raw?.isRequired ?? 0),
    order: Number(raw?.order ?? raw?.attribute_order ?? 0),
    field_type_id: fieldType != null ? Number(fieldType) : undefined,
    fieldTypeId: fieldType != null ? Number(fieldType) : undefined,
    attribute_items: Array.isArray(items) ? items.map(normalizeAttributeItem) : [],
  }
}

const normalizeAttributes = (list: any): AttributeField[] => {
  if (!Array.isArray(list)) return []
  return list
    .map(normalizeAttribute)
    .filter((attr) => attr.attribute_id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

const normalizeAsset = (raw: any): OtherAsset => {
  if (!raw) return { attributes: {} }

  const assetId = raw.assetsid ?? raw.asset_id ?? raw.id
  const attributesArray = Array.isArray(raw.AssetsData ?? raw.assetsData)
    ? raw.AssetsData ?? raw.assetsData
    : []

  const attributes: Record<string, any> = {}
  attributesArray.forEach((item: any) => {
    const key = item?.attributeid ?? item?.attribute_id ?? item?.id
    if (key != null) {
      attributes[String(key)] = item?.value ?? item?.attribute_value ?? item?.attributeValue ?? ''
    }
  })

  const relatedAssets = raw.RelatedAssets ?? raw.relatedAssets ?? []
  const relatedAssetIds = Array.isArray(relatedAssets)
    ? relatedAssets
        .map((rel: any) => rel?.relatedAssetId ?? rel?.assetsid ?? rel?.id)
        .filter(Boolean)
    : []

  const vehicleType = attributes['134'] ?? raw.vehicleType ?? raw.vehicle_type
  const otherAssetType = raw.genericname1 ?? raw.otherAssetType ?? raw.asset_type

  return {
    assetsid: assetId,
    moduleid: raw.moduleid ?? raw.module_id ?? raw.moduleId,
    genericname1: raw.genericname1 ?? raw.generic_name1,
    company_id: raw.company_id ?? raw.companyId ?? null,
    subdivisionId: raw.subdivisionId ?? raw.subdivision_id ?? null,
    subdivision_id: raw.subdivision_id ?? raw.subdivisionId ?? null,
    otherAssetType,
    vehicleType: vehicleType != null ? vehicleType : undefined,
    attributes,
    AssetsData: raw.AssetsData ?? raw.assetsData,
    RelatedAssets: relatedAssets,
    relatedAssetIds,
  }
}

class OtherAssetsAPI {
  async getList(params?: { offset?: number; limit?: number }): Promise<{ data: OtherAsset[]; total: number }> {
    const response = await apiClient.get<any>('/assets-service', { params })
    const payload = getPayload(response)
    if (payload && Array.isArray(payload.data)) {
      return { data: payload.data.map(normalizeAsset), total: payload.total ?? payload.data.length }
    }
    const list = Array.isArray(payload) ? payload.map(normalizeAsset) : []
    return { data: list, total: list.length }
  }

  async getById(id: number | string): Promise<OtherAsset> {
    const response = await apiClient.get<any>(`/assets-service/${id}`)
    const payload = getPayload(response)
    return normalizeAsset(payload)
  }

  async create(data: any): Promise<OtherAsset> {
    const response = await apiClient.post<any>('/assets-service', data)
    const payload = getPayload(response)
    return normalizeAsset(payload)
  }

  async update(id: number | string, data: any): Promise<OtherAsset> {
    const response = await apiClient.put<any>(`/assets-service/${id}`, data)
    const payload = getPayload(response)
    return normalizeAsset(payload)
  }

  async delete(id: number | string): Promise<void> {
    await apiClient.put(`/assets-service/${id}/deactivate`)
  }

  async getFormAttributes(otherAssetType: string, vehicleTypeId?: string): Promise<AttributeField[]> {
    if (!otherAssetType) return []
    const query = vehicleTypeId ? `?vehicleTypeId=${vehicleTypeId}` : ''
    const url = `/attribute-service/module/other_assets/${otherAssetType}/${query}`
    const response = await apiClient.get<any>(url.replace(/\/+$/, '/'))
    const payload = getPayload(response)
    return normalizeAttributes(payload)
  }

  async getVehicleTypes(): Promise<AttributeItem[]> {
    const response = await apiClient.get<any>('/attribute-service/attributes/', {
      params: { attribute_flat_name_id: 'vehicle_type', module_flat_name_id: 'trucks' },
    })
    const payload = getPayload(response)
    return Array.isArray(payload) ? payload.map(normalizeAttributeItem) : []
  }
}

export const otherAssetsAPI = new OtherAssetsAPI()
