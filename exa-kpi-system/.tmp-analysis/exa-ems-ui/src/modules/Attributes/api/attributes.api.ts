/**
 * Attributes API Client
 */

import apiClient from '../../../services/api/axios.config'
import {
  Attribute,
  AttributeItem,
  AttributeListParams,
  AttributeModule,
  AttributeStatus,
  FieldType,
} from '../types'
import { ACTIVE_STATUS_ID, DROPDOWN_FIELD_TYPE_ID } from '../constants'

const normalizeStatus = (value: any): AttributeStatus => {
  if (typeof value === 'object' && value !== null) {
    return {
      id: Number((value as any).id ?? (value as any).status ?? ACTIVE_STATUS_ID),
      name:
        (value as any).name ||
        (Number((value as any).id ?? (value as any).status ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID
          ? 'ACTIVE'
          : 'DISABLED'),
    }
  }

  const id = Number(value ?? ACTIVE_STATUS_ID)
  return {
    id,
    name: id === ACTIVE_STATUS_ID ? 'ACTIVE' : 'DISABLED',
  }
}

const normalizeModule = (value: any, fallbackId?: any): AttributeModule | undefined => {
  if (!value && fallbackId == null) return undefined
  const raw = value || {}
  if (typeof raw === 'object') {
    return {
      module_id: Number(raw.module_id ?? raw.id ?? fallbackId),
      name: raw.name ?? '',
      section: raw.section,
    }
  }
  return {
    module_id: Number(raw ?? fallbackId),
    name: '',
  }
}

const normalizeFieldType = (value: any, fallbackId?: any): FieldType | undefined => {
  if (!value && fallbackId == null) return undefined
  const raw = value || {}
  if (typeof raw === 'object') {
    return {
      field_type_id: Number(raw.field_type_id ?? raw.id ?? fallbackId),
      name: raw.name ?? '',
      code: raw.code,
      has_items: raw.has_items,
    }
  }
  return {
    field_type_id: Number(raw ?? fallbackId),
    name: '',
  }
}

const normalizeFlag = (value: any): number => {
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }
  const numeric = Number(value ?? 0)
  return Number.isNaN(numeric) ? 0 : numeric
}

const normalizeItems = (raw: any): AttributeItem[] => {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      attribute_item_id:
        item?.attribute_item_id ?? item?.id ?? item?.attributeItemId ?? null,
      name: item?.name ?? '',
      status: Number(item?.status ?? ACTIVE_STATUS_ID),
      attribute_id: item?.attribute_id ?? item?.attributeId,
    }))
  }
  return []
}

const normalizeAttribute = (raw: any): Attribute => {
  if (!raw) {
    return {
      name: '',
      module_id: undefined,
      field_type_id: undefined,
      integral: 0,
      required: 0,
      row: 0,
      order: 0,
      status: normalizeStatus(ACTIVE_STATUS_ID),
      items: [],
    }
  }

  const module = normalizeModule(raw.module, raw.module_id ?? raw.moduleId)
  const fieldType = normalizeFieldType(raw.type, raw.field_type_id ?? raw.fieldTypeId ?? raw.type_id)
  const attribute: Attribute = {
    attribute_id: raw.attribute_id ?? raw.id ?? raw.attributeId,
    name: raw.name ?? '',
    module_id: raw.module_id ?? raw.moduleId ?? module?.module_id,
    module,
    field_type_id: raw.field_type_id ?? raw.fieldTypeId ?? raw.type_id ?? fieldType?.field_type_id,
    type: fieldType,
    integral: normalizeFlag(raw.integral),
    required: normalizeFlag(raw.required),
    row: raw.row != null ? Number(raw.row) : 0,
    order: raw.order != null ? Number(raw.order) : 0,
    column: raw.column ?? raw.col ?? null,
    status: normalizeStatus(raw.status),
    primary_key: raw.primary_key ?? null,
    secondary_key: raw.secondary_key ?? null,
    items: normalizeItems(raw.items ?? raw.attribute_items ?? raw.attributeItems),
  }

  return attribute
}

const transformListParams = (params: AttributeListParams = {}) => {
  const query: Record<string, any> = {}
  if (params.moduleId) {
    query.module_id = params.moduleId
  }
  if (params.search) {
    query.search = params.search
  }
  if (params.sortField) {
    query.sortField = params.sortField
    query.sortOrder = params.sortOrder ?? -1
  }
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value != null && value !== '') {
        query[key] = value
      }
    })
  }
  return query
}

const transformAttributeForBackend = (attribute: Partial<Attribute>) => {
  const payload: any = {
    ...attribute,
  }

  payload.module_id = attribute.module_id ?? attribute.module?.module_id
  payload.field_type_id = attribute.field_type_id ?? attribute.type?.field_type_id
  payload.integral = normalizeFlag(attribute.integral)
  payload.required = normalizeFlag(attribute.required)

  if (attribute.status != null) {
    payload.status =
      typeof attribute.status === 'object'
        ? (attribute.status as AttributeStatus).id
        : attribute.status
  }

  delete payload.module
  delete payload.type
  delete payload.items

  return payload
}

const sanitizeItemsForBackend = (attributeId: number, items: AttributeItem[] = []) => {
  return items
    .filter((item) => (item.name || '').trim().length > 0)
    .map((item) => ({
      attribute_item_id:
        typeof item.attribute_item_id === 'string' && item.attribute_item_id.startsWith('tmp-')
          ? 0
          : item.attribute_item_id ?? 0,
      name: item.name?.trim(),
      status: item.status ?? ACTIVE_STATUS_ID,
      attribute_id: attributeId,
    }))
}

const headers = {
  headers: {
    'Route-Type': 'admin',
  },
}

const ATTR_DEBUG_ENABLED =
  import.meta.env?.VITE_ATTRIBUTE_FORM_DEBUG === 'true' ||
  (typeof window !== 'undefined' && window.location.search.includes('debugAttributeForm=true'))

class AttributesAPI {
  async getAttributesList(params: AttributeListParams = {}) {
    const query = transformListParams(params)
    const response = await apiClient.get<any>('/attributes', {
      ...headers,
      params: query,
    })
    if (ATTR_DEBUG_ENABLED) {
      console.log('🔎 [AttributesAPI] GET /attributes params:', query)
      console.log('🔎 [AttributesAPI] GET /attributes response:', response.data)
    }
    const payload =
      response.data?.attributes ??
      response.data?.data?.attributes ??
      response.data?.data ??
      response.data ??
      []

    const data = Array.isArray(payload) ? payload : payload.data || []
    const total = response.data?.total ?? data.length

    return {
      data: data.map(normalizeAttribute),
      total,
    }
  }

  async getAttribute(id: number): Promise<Attribute> {
    const response = await apiClient.get<any>(`/attributes/${id}`, headers)
    if (ATTR_DEBUG_ENABLED) {
      console.log('🔎 [AttributesAPI] GET /attributes/:id', id, 'response:', response.data)
    }
    const payload =
      response.data?.attribute ?? response.data?.data?.attribute ?? response.data?.data ?? response.data
    const attribute = normalizeAttribute(payload)

    try {
      const itemsResponse = await apiClient.get<any>(`/attributes/${id}/items`, headers)
      if (ATTR_DEBUG_ENABLED) {
        console.log('🔎 [AttributesAPI] GET /attributes/:id/items', id, 'response:', itemsResponse.data)
      }
      const itemsPayload =
        itemsResponse.data?.attribute_items ??
        itemsResponse.data?.data?.attribute_items ??
        itemsResponse.data?.data ??
        itemsResponse.data ??
        []
      attribute.items = normalizeItems(itemsPayload)
    } catch (error) {
      console.warn('Failed to load attribute items', error)
    }

    return attribute
  }

  async createAttribute(attribute: Partial<Attribute>): Promise<Attribute> {
    const payload = transformAttributeForBackend(attribute)
    const response = await apiClient.post<any>('/attributes', payload, headers)
    const data =
      response.data?.attribute ?? response.data?.data?.attribute ?? response.data?.data ?? response.data
    return normalizeAttribute(data)
  }

  async updateAttribute(id: number, attribute: Partial<Attribute>): Promise<Attribute> {
    const payload = transformAttributeForBackend(attribute)
    const response = await apiClient.put<any>(`/attributes/${id}`, payload, headers)
    const data =
      response.data?.attribute ?? response.data?.data?.attribute ?? response.data?.data ?? response.data
    return normalizeAttribute(data)
  }

  async deleteAttribute(id: number): Promise<void> {
    await apiClient.delete(`/attributes/${id}`, headers)
  }

  async getModules(): Promise<AttributeModule[]> {
    const response = await apiClient.get<any>('/modules', headers)
    const payload =
      response.data?.modules ??
      response.data?.data?.modules ??
      response.data?.data ??
      response.data ??
      []
    if (Array.isArray(payload)) {
      return payload.map(normalizeModule).filter(Boolean) as AttributeModule[]
    }
    if (payload?.modules && Array.isArray(payload.modules)) {
      return payload.modules.map(normalizeModule).filter(Boolean) as AttributeModule[]
    }
    return []
  }

  async getFieldTypes(): Promise<FieldType[]> {
    const response = await apiClient.get<any>('/fieldtypes', headers)
    const payload =
      response.data?.fieldtypes ??
      response.data?.data?.fieldtypes ??
      response.data?.data ??
      response.data ??
      []

    if (Array.isArray(payload)) {
      return payload.map(normalizeFieldType).filter(Boolean) as FieldType[]
    }

    if (payload?.fieldtypes && Array.isArray(payload.fieldtypes)) {
      return payload.fieldtypes.map(normalizeFieldType).filter(Boolean) as FieldType[]
    }

    return []
  }

  async saveAttributeItems(attributeId: number, items: AttributeItem[]): Promise<AttributeItem[]> {
    const sanitized = sanitizeItemsForBackend(attributeId, items)
    const response = await apiClient.put<any>(`/attributes/${attributeId}/items`, sanitized, headers)
    const payload =
      response.data?.attribute_items ??
      response.data?.data?.attribute_items ??
      response.data?.data ??
      response.data ??
      []
    return normalizeItems(payload)
  }

  async getAttributeItems(attributeId: number): Promise<AttributeItem[]> {
    const response = await apiClient.get<any>(`/attributes/${attributeId}/items`, headers)
    const payload =
      response.data?.attribute_items ??
      response.data?.data?.attribute_items ??
      response.data?.data ??
      response.data ??
      []
    return normalizeItems(payload)
  }

  isDropdownType(typeId?: number, typeName?: string) {
    if (typeId === DROPDOWN_FIELD_TYPE_ID) {
      return true
    }
    if (typeName) {
      const normalized = typeName.toLowerCase()
      return normalized.includes('dropdown') || normalized.includes('select') || normalized.includes('list')
    }
    return false
  }
}

export const attributesAPI = new AttributesAPI()
