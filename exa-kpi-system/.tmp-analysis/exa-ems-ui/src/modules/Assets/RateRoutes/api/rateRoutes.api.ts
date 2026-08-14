import apiClient from '../../../../services/api/axios.config'
import { RateRoute } from '../types'

const unwrap = (response: any) => response?.data ?? response
const getRoutesPayload = (payload: any) => payload?.data?.routes ?? payload?.routes ?? payload
const getRoutePayload = (payload: any) => payload?.data?.route ?? payload?.route ?? payload

const normalizeRoute = (route: any): RateRoute => {
  const cityA = route.city_a || {}
  const cityB = route.city_b || {}
  const prepared: RateRoute = {
    ...route,
    city_a_id: route.city_a_id || cityA.city_id,
    city_b_id: route.city_b_id || cityB.city_id,
    route: route.route || `${cityA.code || ''} - ${cityB.code || ''}`.trim(),
    name: route.name || `${cityA.name || ''} - ${cityB.name || ''}`.trim(),
  }

  // Flatten rate_routes into km_{id}, price_{id}, fuel_{id}, fuelgenset_{id}
  ;(route.rate_routes || []).forEach((rr: any) => {
    const rbId = rr.rate_builder?.id
    if (!rbId) return
    prepared[`km_${rbId}`] = rr.km
    prepared[`price_${rbId}`] = rr.price
    prepared[`fuel_${rbId}`] = rr.fuel
    prepared[`fuelgenset_${rbId}`] = rr.fuelgenset
  })

  return prepared
}

export const rateRoutesAPI = {
  getRateRoutes: async () => {
    const response = await apiClient.get('/routes', { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const routes = getRoutesPayload(payload)
    return Array.isArray(routes) ? routes.map(normalizeRoute) : []
  },
  getRateRoute: async (id: number | string) => {
    const response = await apiClient.get(`/routes/${id}`, { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const route = getRoutePayload(payload)
    return normalizeRoute(route)
  },
  createRateRoute: async (route: RateRoute) => {
    const response = await apiClient.post('/routes', route, { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const created = getRoutePayload(payload)
    return normalizeRoute(created)
  },
  updateRateRoute: async (id: number | string, route: RateRoute) => {
    const response = await apiClient.put(`/routes/${id}`, route, { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const updated = getRoutePayload(payload)
    return normalizeRoute(updated)
  },
  deleteRateRoute: async (id: number | string) => {
    const response = await apiClient.delete(`/routes/${id}`, { headers: { 'Route-Type': 'admin' } })
    return unwrap(response)
  },
}
