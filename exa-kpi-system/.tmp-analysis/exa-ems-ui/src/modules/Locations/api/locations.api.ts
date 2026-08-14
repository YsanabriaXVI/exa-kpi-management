import apiClient from '../../../services/api/axios.config'
import type { CityRef, GeofencePoint, Location } from '../types'
import { ACTIVE_STATUS_ID, DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from '../constants'

const normalizeAuditUser = (user: any) => {
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

const normalizeGeofenceCoordinates = (value: any): GeofencePoint[] | null => {
  if (!Array.isArray(value)) return null

  const points = value
    .map((point: any) => {
      if (Array.isArray(point)) {
        return { lat: Number(point[0]), lng: Number(point[1]) }
      }
      return { lat: Number(point?.lat), lng: Number(point?.lng) }
    })
    .filter((point: GeofencePoint) => Number.isFinite(point.lat) && Number.isFinite(point.lng))

  return points.length >= 3 ? points : null
}

const normalizeLocation = (raw: any): Location => {
  if (!raw) {
    return {
      name: '',
      status: ACTIVE_STATUS_ID,
    }
  }

  const city = raw.city
    ? {
      city_id: raw.city.city_id ?? raw.city.id,
      name: raw.city.name,
      department: raw.city.department
        ? {
          department_id: raw.city.department.department_id ?? raw.city.department.id,
          name: raw.city.department.name,
          country: raw.city.department.country
            ? {
              country_id: raw.city.department.country.country_id ?? raw.city.department.country.id,
              name: raw.city.department.country.name,
            }
            : undefined,
        }
        : undefined,
    }
    : undefined

  const position = raw.position || {}

  return {
    location_id: raw.location_id ?? raw.id,
    id: raw.location_id ?? raw.id,
    name: raw.name ?? '',
    city_id: raw.city_id ?? city?.city_id,
    city,
    address: raw.address ?? '',
    reference: raw.reference ?? '',
    phone: raw.phone ?? '',
    status: raw.status ?? ACTIVE_STATUS_ID,
    latitud: raw.latitud ?? raw.latitude ?? position.y ?? null,
    longitud: raw.longitud ?? raw.longitude ?? position.x ?? null,
    geofence_coordinates: normalizeGeofenceCoordinates(raw.geofence_coordinates ?? raw.geofenceCoordinates),
    create_user: normalizeAuditUser(raw.create_user),
    update_user: normalizeAuditUser(raw.update_user),
    update_date_format: raw.update_date_format,
    update_date: raw.update_date,
    updated_at: raw.updated_at,
  }
}

const transformLocationForBackend = (location: Partial<Location>) => {
  const payload: any = { ...location }
  payload.name = location.name
  const cityId = location.city_id ?? location.city?.city_id ?? (location.city as any)
  payload.city = cityId !== undefined && cityId !== null && !Number.isNaN(Number(cityId)) ? Number(cityId) : undefined
  payload.status = location.status ?? ACTIVE_STATUS_ID
  const lat = Number(location.latitud ?? DEFAULT_LATITUDE)
  const lng = Number(location.longitud ?? DEFAULT_LONGITUDE)
  payload.latitud = Number.isFinite(lat) ? lat : DEFAULT_LATITUDE
  payload.longitud = Number.isFinite(lng) ? lng : DEFAULT_LONGITUDE

  if (Array.isArray(location.geofence_coordinates)) {
    payload.geofence_coordinates = location.geofence_coordinates
      .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
  } else if (location.geofence_coordinates === null) {
    payload.geofence_coordinates = []
  }

  delete payload.city_id
  delete payload.city?.department
  delete payload.city?.country
  delete payload.create_user
  delete payload.update_user
  delete payload.update_date_format
  delete payload.location_id
  delete payload.id

  return payload
}

const headers = {
  headers: {
    'Route-Type': 'admin',
  },
}

class LocationsAPI {
  async getLocations() {
    const response = await apiClient.get<any>('/locations', headers)
    const payload = response.data?.locations ?? response.data?.data?.locations ?? response.data?.data ?? response.data ?? []
    const list = Array.isArray(payload) ? payload : []
    return {
      data: list.map(normalizeLocation),
      total: list.length,
    }
  }

  async getLocation(id: number): Promise<Location> {
    const response = await apiClient.get<any>(`/locations/${id}`, headers)
    const payload = response.data?.location ?? response.data?.data?.location ?? response.data?.data ?? response.data
    return normalizeLocation(payload)
  }

  async createLocation(location: Partial<Location>): Promise<Location> {
    const payload = transformLocationForBackend(location)
    const response = await apiClient.post<any>('/locations', payload, headers)
    const data = response.data?.location ?? response.data?.data?.location ?? response.data?.data ?? response.data
    return normalizeLocation(data || payload)
  }

  async updateLocation(id: number, location: Partial<Location>): Promise<Location> {
    const payload = transformLocationForBackend(location)
    const response = await apiClient.put<any>(`/locations/${id}`, payload, headers)
    const data = response.data?.location ?? response.data?.data?.location ?? response.data?.data ?? response.data
    return normalizeLocation(data || payload)
  }

  async deleteLocation(id: number): Promise<void> {
    await apiClient.delete(`/locations/${id}`, headers)
  }

  async getCities(): Promise<CityRef[]> {
    const response = await apiClient.get<any>('/locationitems/cities', headers)
    const payload = response.data?.cities ?? response.data?.data?.cities ?? response.data?.data ?? response.data ?? []
    const list = Array.isArray(payload) ? payload : []
    return list.map((raw: any) => ({
      city_id: raw.city_id ?? raw.id,
      name: raw.name,
      department: raw.department
        ? {
          department_id: raw.department.department_id ?? raw.department.id,
          name: raw.department.name,
          country: raw.department.country
            ? {
              country_id: raw.department.country.country_id ?? raw.department.country.id,
              name: raw.department.country.name,
            }
            : undefined,
        }
        : undefined,
    }))
  }
}

export const locationsAPI = new LocationsAPI()
