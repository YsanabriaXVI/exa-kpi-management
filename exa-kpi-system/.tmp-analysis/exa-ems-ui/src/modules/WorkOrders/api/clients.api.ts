import apiClient from '../../../services/api/axios.config'

const adminHeaders = {
  headers: {
    'Route-Type': 'admin',
  },
}

export interface ClientRef {
  client_id: number
  name: string
}

class ClientsAPI {
  async getClients(): Promise<ClientRef[]> {
    const response = await apiClient.get<any>('/clients', adminHeaders)
    const payload = response.data?.clients ?? response.data?.data?.clients ?? response.data?.data ?? response.data ?? []
    return Array.isArray(payload)
      ? payload.map((c: any) => ({
          client_id: c.client_id ?? c.id,
          name: c.name ?? c.label ?? c.client_name,
        }))
      : []
  }
}

export const clientsAPI = new ClientsAPI()
