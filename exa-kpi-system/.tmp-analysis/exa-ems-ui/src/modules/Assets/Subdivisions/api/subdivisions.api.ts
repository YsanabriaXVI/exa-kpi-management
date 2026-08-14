import apiClient from '../../../../services/api/axios.config'
import { InternalSupplier, Subdivision } from '../types'

const unwrap = (response: any) => response?.data ?? response
const getSubdivisionsPayload = (payload: any) => payload?.data?.subdivisions ?? payload?.subdivisions ?? payload
const getSubdivisionPayload = (payload: any) => payload?.data?.subdivision ?? payload?.subdivision ?? payload
const getInternalSuppliersPayload = (payload: any) =>
  payload?.data?.internal_suppliers ?? payload?.internal_suppliers ?? payload
const getInternalSupplierPayload = (payload: any) =>
  payload?.data?.internal_supplier ?? payload?.internal_supplier ?? payload

const formatDate = (value: any) => {
  if (!value) return undefined
  const num = Number(value)
  const date = Number.isFinite(num) ? new Date(num * 1000) : new Date(value)
  return isNaN(date.getTime()) ? undefined : date.toLocaleDateString()
}

const normalizeSubdivision = (subdivision: any): Subdivision => {
  const update_date_format = subdivision.update_date_format || formatDate(subdivision.update_date)
  return {
    ...subdivision,
    update_date_format,
  }
}

export const subdivisionsAPI = {
  getSubdivisions: async () => {
    const response = await apiClient.get('/subdivisions', { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const items = getSubdivisionsPayload(payload)
    return Array.isArray(items) ? (items as Subdivision[]).map(normalizeSubdivision) : []
  },
  getSubdivision: async (id: number | string) => {
    const response = await apiClient.get(`/subdivisions/${id}`, { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const subdivision = getSubdivisionPayload(payload) as Subdivision
    return normalizeSubdivision(subdivision)
  },
  createSubdivision: async (subdivision: Subdivision) => {
    const response = await apiClient.post('/subdivisions', subdivision, { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const created = getSubdivisionPayload(payload) as Subdivision
    return normalizeSubdivision(created)
  },
  updateSubdivision: async (id: number | string, subdivision: Subdivision) => {
    const response = await apiClient.put(`/subdivisions/${id}`, subdivision, { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const updated = getSubdivisionPayload(payload) as Subdivision
    return normalizeSubdivision(updated)
  },
  deleteSubdivision: async (id: number | string) => {
    const response = await apiClient.delete(`/subdivisions/${id}`, { headers: { 'Route-Type': 'admin' } })
    return unwrap(response)
  },
  getInternalSuppliers: async (subdivisionId: number | string) => {
    const response = await apiClient.get(`/subdivisions/${subdivisionId}/internal-suppliers`, {
      headers: { 'Route-Type': 'admin' },
    })
    const payload = unwrap(response)
    const items = getInternalSuppliersPayload(payload)
    return Array.isArray(items) ? (items as InternalSupplier[]) : []
  },
  createInternalSupplier: async (subdivisionId: number | string, body: { name: string }) => {
    const response = await apiClient.post(`/subdivisions/${subdivisionId}/internal-suppliers`, body, {
      headers: { 'Route-Type': 'admin' },
    })
    const payload = unwrap(response)
    return getInternalSupplierPayload(payload) as InternalSupplier
  },
  updateInternalSupplier: async (
    attributeItemId: number | string,
    body: { name?: string; subdivision_id?: number },
  ) => {
    const response = await apiClient.put(`/internal-suppliers/${attributeItemId}`, body, {
      headers: { 'Route-Type': 'admin' },
    })
    const payload = unwrap(response)
    return getInternalSupplierPayload(payload) as InternalSupplier
  },
  deleteInternalSupplier: async (attributeItemId: number | string) => {
    const response = await apiClient.delete(`/internal-suppliers/${attributeItemId}`, {
      headers: { 'Route-Type': 'admin' },
    })
    return unwrap(response)
  },
}
