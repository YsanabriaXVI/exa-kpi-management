import apiClient from '../../../services/api/axios.config'
import { ACTIVE_STATUS_ID } from '../constants'
import type { AuditUser, City, Country, Department, LocationItem, LocationTypeKey, Variant } from '../types'

const TYPE_ID_MAP: Record<LocationTypeKey, string> = {
  variants: 'variant_id',
  cities: 'city_id',
  departments: 'department_id',
  countries: 'country_id',
}

const normalizeAuditUser = (user: any): AuditUser | undefined => {
  if (!user) return undefined
  const firstName = user.first_name || ''
  const lastName = user.last_name || ''
  return {
    user_id: user.user_id ?? user.id,
    first_name: firstName,
    last_name: lastName,
    full_name: user.full_name || `${firstName} ${lastName}`.trim(),
    email: user.email,
  }
}

const formatDate = (timestamp: any): string => {
  if (!timestamp) return '—'
  const date = new Date(Number(timestamp) * 1000)
  if (isNaN(date.getTime())) return String(timestamp)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const normalizeCommon = (raw: any): any => {
  const source = raw || {}
  const item = { ...source }
  item.create_user = normalizeAuditUser(source.create_user) || { full_name: '' }
  item.update_user = normalizeAuditUser(source.update_user) || { full_name: '' }
  item.update_date_format =
    source.update_date_format ||
    (source.updated_at ? formatDate(source.updated_at) : formatDate(source.update_date))
  return item
}

const normalizeCountry = (raw: any): Country => {
  const base = normalizeCommon(raw)
  return {
    ...base,
    id: raw.country_id ?? raw.id,
    country_id: raw.country_id ?? raw.id,
    name: raw.name ?? '',
    status: raw.status ?? ACTIVE_STATUS_ID,
  }
}

const normalizeVariant = (raw: any): Variant => {
  const base = normalizeCommon(raw)
  return {
    ...base,
    id: raw.variant_id ?? raw.id,
    variant_id: raw.variant_id ?? raw.id,
    name: raw.name ?? '',
    status: raw.status ?? ACTIVE_STATUS_ID,
  }
}

const normalizeDepartment = (raw: any): Department => {
  const base = normalizeCommon(raw)
  const country = raw.country ? normalizeCountry(raw.country) : undefined
  return {
    ...base,
    id: raw.department_id ?? raw.id,
    department_id: raw.department_id ?? raw.id,
    name: raw.name ?? '',
    country_id: raw.country_id ?? country?.country_id,
    country,
    status: raw.status ?? ACTIVE_STATUS_ID,
  }
}

const normalizeCity = (raw: any): City => {
  const base = normalizeCommon(raw)
  const department = raw.department ? normalizeDepartment(raw.department) : undefined
  const country = department?.country || (raw.country ? normalizeCountry(raw.country) : undefined)
  const variant = raw.variant ? normalizeVariant(raw.variant) : undefined
  const city: City = {
    ...base,
    id: raw.city_id ?? raw.id,
    city_id: raw.city_id ?? raw.id,
    name: raw.name ?? '',
    code: raw.code,
    department_id: raw.department_id ?? department?.department_id,
    department,
    country,
    variant_id: raw.variant_id ?? variant?.variant_id ?? null,
    variant: variant || null,
    status: raw.status ?? ACTIVE_STATUS_ID,
    update_date_format: raw.update_date_format,
  }

  const variantName = city.variant?.name ? `, ${city.variant.name}` : ''
  if (city.department?.name && city.country?.name) {
    city.fullName = `${city.name} (${city.department.name}, ${city.country.name}${variantName})`
  }

  return city
}

const normalizers: Record<LocationTypeKey, (raw: any) => LocationItem> = {
  countries: normalizeCountry,
  departments: normalizeDepartment,
  cities: normalizeCity,
  variants: normalizeVariant,
}

const transformListResponse = (data: any) => {
  const result: any = {}
    ; (Object.keys(data || {}) as LocationTypeKey[]).forEach((key) => {
      const normalizer = normalizers[key] || ((item: any) => item)
      result[key] = Array.isArray(data[key]) ? data[key].map(normalizer) : []
    })
  return result
}

const transformPayload = (type: LocationTypeKey, item: Partial<LocationItem>) => {
  const payload: any = { ...item }
  // Ensure name exists
  payload.name = item.name
  payload.status = item.status ?? ACTIVE_STATUS_ID

  // strip response-only fields
  delete payload.create_user
  delete payload.update_user
  delete payload.create_date
  delete payload.update_date
  delete payload.update_date_format
  delete payload.created_by
  delete payload.updated_by
  delete payload.updated_at

  if (type === 'departments') {
    payload.country = Number((item as any).country_id ?? (item as any).country?.country_id ?? (item as any).country)
    delete payload.country_id
  }
  if (type === 'cities') {
    payload.department = Number(
      (item as any).department_id ??
      (item as any).department?.department_id ??
      (item as any).department
    )
    payload.variant = (item as any).variant_id
      ? Number((item as any).variant_id)
      : (item as any).variant
        ? Number((item as any).variant.variant_id ?? (item as any).variant)
        : null
    delete payload.department_id
    delete payload.variant_id
  }

  return payload
}

const headers = {
  headers: {
    'Route-Type': 'admin',
  },
}

class LocationItemsAPI {
  async getAll() {
    const response = await apiClient.get<any>('/locationitems', headers)
    const payload = response.data?.data ?? response.data ?? {}
    return transformListResponse(payload)
  }

  async getByType(type: LocationTypeKey) {
    const response = await apiClient.get<any>(`/locationitems/${type}`, headers)
    const payload = response.data?.data ?? response.data ?? {}
    // Some endpoints might return { countries: [...] } shape; normalize it
    if (Array.isArray(payload)) {
      return { [type]: payload.map(normalizers[type]) }
    }
    if (payload[type]) {
      return { [type]: (payload[type] as any[]).map(normalizers[type]) }
    }
    return transformListResponse(payload)
  }

  async create(type: LocationTypeKey, item: Partial<LocationItem>) {
    const payload = transformPayload(type, item)
    const response = await apiClient.post<any>(`/locationitems/${type}`, payload, headers)
    const data = response.data?.data ?? response.data ?? {}

    // Check if data is already the item (has the specific ID field)
    const idField = TYPE_ID_MAP[type]
    if (data[idField] || data.id) {
      return normalizers[type](data)
    }

    const key = Object.keys(data).find((k) => Array.isArray(data[k]) || data[k]) || type
    const value = Array.isArray((data as any)[key]) ? (data as any)[key][0] || (data as any)[key] : (data as any)[key]
    return normalizers[type](value || payload)
  }

  async update(type: LocationTypeKey, id: number, item: Partial<LocationItem>) {
    const payload = transformPayload(type, item)
    const response = await apiClient.put<any>(`/locationitems/${type}/${id}`, payload, headers)
    const data = response.data?.data ?? response.data ?? {}

    // Check if data is already the item (has the specific ID field)
    const idField = TYPE_ID_MAP[type]
    if (data[idField] || data.id) {
      return normalizers[type](data)
    }

    // Otherwise try to find it nested
    const key = Object.keys(data).find((k) => Array.isArray(data[k]) || data[k]) || type
    const value = Array.isArray((data as any)[key]) ? (data as any)[key][0] || (data as any)[key] : (data as any)[key]
    return normalizers[type](value || payload)
  }

  async delete(type: LocationTypeKey, id: number) {
    await apiClient.delete(`/locationitems/${type}/${id}`, headers)
  }
}

export const locationItemsAPI = new LocationItemsAPI()
