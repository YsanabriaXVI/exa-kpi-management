import apiClient from '../../../services/api/axios.config'
import type { Company } from '../types'
import { ACTIVE_STATUS_ID, DEFAULT_STATUS_ID } from '../constants'

const headers = {
  headers: {
    'Route-Type': 'admin',
  },
}

const normalizeUser = (user: any) => {
  if (!user) return undefined
  const first = user.first_name || ''
  const last = user.last_name || ''
  return {
    user_id: user.user_id ?? user.id,
    first_name: first,
    last_name: last,
    full_name: user.full_name || `${first} ${last}`.trim(),
    email: user.email,
  }
}

const normalizeCompany = (raw: any): Company => ({
  company_id: raw.company_id ?? raw.id,
  id: raw.company_id ?? raw.id,
  name: raw.name ?? '',
  description: raw.description ?? '',
  address: raw.address ?? '',
  phone: raw.phone ?? '',
  reference: raw.reference ?? '',
  status: raw.status ?? DEFAULT_STATUS_ID,
  logo_url: raw.logo_url ?? raw.logo ?? null,
  create_user: normalizeUser(raw.create_user),
  update_user: normalizeUser(raw.update_user),
  update_date_format: raw.update_date_format,
})

const transformForBackend = (company: Partial<Company>) => {
  const payload: any = { ...company }
  payload.name = company.name
  payload.description = company.description ?? ''
  payload.address = company.address ?? ''
  payload.phone = company.phone ?? ''
  payload.reference = company.reference ?? ''
  payload.status = company.status ?? DEFAULT_STATUS_ID

  delete payload.company_id
  delete payload.id
  delete payload.create_user
  delete payload.update_user
  delete payload.update_date_format
  delete payload.logo_url

  return payload
}

class CompaniesAPI {
  async getCompanies() {
    const response = await apiClient.get<any>('/companies', headers)
    const payload = response.data?.companies ?? response.data?.data?.companies ?? response.data?.data ?? response.data ?? []
    const list = Array.isArray(payload) ? payload : []
    const normalized = list.map(normalizeCompany)
    return {
      data: normalized,
      total: normalized.length,
    }
  }

  async getCompany(id: number): Promise<Company> {
    const response = await apiClient.get<any>(`/companies/${id}`, headers)
    const payload = response.data?.company ?? response.data?.data?.company ?? response.data?.data ?? response.data
    return normalizeCompany(payload)
  }

  async createCompany(company: Partial<Company>): Promise<Company> {
    const payload = transformForBackend(company)
    const response = await apiClient.post<any>('/companies', payload, headers)
    const data = response.data?.company ?? response.data?.data?.company ?? response.data?.data ?? response.data
    return normalizeCompany(data || payload)
  }

  async updateCompany(id: number, company: Partial<Company>): Promise<Company> {
    const payload = transformForBackend(company)
    const response = await apiClient.put<any>(`/companies/${id}`, payload, headers)
    const data = response.data?.company ?? response.data?.data?.company ?? response.data?.data ?? response.data
    return normalizeCompany(data || payload)
  }

  async deleteCompany(id: number): Promise<void> {
    await apiClient.delete(`/companies/${id}`, headers)
  }

  async uploadLogo(id: number, filename: string, file: File): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    await apiClient.post(`/companies/${id}/logo/${encodeURIComponent(filename)}`, formData, {
      ...headers,
      headers: {
        ...headers.headers,
        'Content-Type': 'multipart/form-data',
      },
    })
  }
}

export const companiesAPI = new CompaniesAPI()
