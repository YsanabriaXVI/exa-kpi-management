import apiClient from '../../../../services/api/axios.config'
import { Client } from '../types'

const unwrap = (response: any) => response?.data ?? response
const getClientsPayload = (payload: any) => payload?.data?.clients ?? payload?.clients ?? payload
const getClientPayload = (payload: any) => payload?.data?.client ?? payload?.client ?? payload

const formatDate = (value: any) => {
  if (!value) return undefined
  const num = Number(value)
  const date = Number.isFinite(num) ? new Date(num * 1000) : new Date(value)
  return isNaN(date.getTime()) ? undefined : date.toLocaleDateString()
}

const normalizeClient = (client: any): Client => {
  const update_date_format = client.update_date_format || formatDate(client.update_date)
  return {
    ...client,
    update_date_format,
  }
}

export const clientsAPI = {
  getClients: async () => {
    const response = await apiClient.get('/clients', { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const items = getClientsPayload(payload)
    return Array.isArray(items) ? (items as Client[]).map(normalizeClient) : []
  },
  getClient: async (id: number | string) => {
    const response = await apiClient.get(`/clients/${id}`, { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const client = getClientPayload(payload) as Client
    return normalizeClient(client)
  },
  createClient: async (client: Client) => {
    const response = await apiClient.post('/clients', client, { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    return getClientPayload(payload) as Client
  },
  updateClient: async (id: number | string, client: Client) => {
    const response = await apiClient.put(`/clients/${id}`, client, { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    return getClientPayload(payload) as Client
  },
  deleteClient: async (id: number | string) => {
    const response = await apiClient.delete(`/clients/${id}`, { headers: { 'Route-Type': 'admin' } })
    return unwrap(response)
  },
}
