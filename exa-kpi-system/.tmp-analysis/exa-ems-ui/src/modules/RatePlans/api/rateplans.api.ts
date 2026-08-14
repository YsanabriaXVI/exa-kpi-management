import apiClient from '../../../services/api/axios.config'
import { ACTIVE_STATUS_ID, DISABLED_STATUS_ID } from '../constants'
import type { RatePlan, RatePlanListParams, RatePlanStatus } from '../types'

const normalizeStatus = (value: any): RatePlanStatus => {
  if (typeof value === 'object' && value !== null) {
    const id = Number(value.id ?? value.status ?? ACTIVE_STATUS_ID)
    return {
      id,
      name: value.name || (id === ACTIVE_STATUS_ID ? 'ACTIVE' : 'DISABLED'),
    }
  }
  const id = Number(value ?? ACTIVE_STATUS_ID)
  return {
    id,
    name: id === ACTIVE_STATUS_ID ? 'ACTIVE' : 'DISABLED',
  }
}

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

const normalizeRatePlan = (raw: any): RatePlan => {
  if (!raw) {
    return {
      name: '',
      status: { id: ACTIVE_STATUS_ID, name: 'ACTIVE' },
    }
  }

  return {
    id: raw.id ?? raw.rateplan_id ?? raw.ratePlanId,
    name: raw.name ?? '',
    status: normalizeStatus(raw.status),
    create_user: normalizeAuditUser(raw.create_user),
    update_user: normalizeAuditUser(raw.update_user),
    create_date: raw.create_date ?? raw.createdate,
    update_date: raw.update_date ?? raw.updatedate,
    update_date_format: raw.update_date_format,
  }
}

const transformListParams = (params: RatePlanListParams = {}) => {
  const payload: any = {
    search: params.search || null,
    sortField: params.sortField || 'id',
    sortOrder: params.sortOrder ?? -1,
    rows: params.rows || 1000,
    first: params.first || 0,
  }
  return payload
}

const transformRatePlanForBackend = (plan: Partial<RatePlan>) => {
  const payload: any = {
    ...plan,
  }
  if (payload.status && typeof payload.status === 'object') {
    payload.status = (payload.status as RatePlanStatus).id
  }
  return payload
}

const headers = {
  headers: {
    'Route-Type': 'admin',
  },
}

class RatePlansAPI {
  async getRatePlans(params: RatePlanListParams = {}) {
    const backend = transformListParams(params)
    const response = await apiClient.get<any>('/rateplans', {
      ...headers,
      params: backend,
    })
    const payload =
      response.data?.rateplans ?? response.data?.data?.rateplans ?? response.data?.data ?? response.data ?? []
    const list = Array.isArray(payload) ? payload : []
    return {
      data: list.map(normalizeRatePlan),
      total: response.data?.total ?? list.length,
    }
  }

  async getRatePlan(id: number): Promise<RatePlan> {
    const response = await apiClient.get<any>(`/rateplans/${id}`, headers)
    const payload = response.data?.rateplan ?? response.data?.data?.rateplan ?? response.data?.data ?? response.data
    return normalizeRatePlan(payload)
  }

  async createRatePlan(data: Partial<RatePlan>): Promise<RatePlan> {
    const payload = transformRatePlanForBackend(data)
    const response = await apiClient.post<any>('/rateplans', payload, headers)
    const plan = response.data?.rateplan ?? response.data?.data?.rateplan ?? response.data?.data ?? response.data
    return normalizeRatePlan(plan)
  }

  async updateRatePlan(id: number, data: Partial<RatePlan>): Promise<RatePlan> {
    const payload = transformRatePlanForBackend(data)
    const response = await apiClient.put<any>(`/rateplans/${id}`, payload, headers)
    const plan = response.data?.rateplan ?? response.data?.data?.rateplan ?? response.data?.data ?? response.data
    return normalizeRatePlan(plan)
  }

  async deleteRatePlan(id: number): Promise<void> {
    await apiClient.delete(`/rateplans/${id}`, headers)
  }
}

export const ratePlansAPI = new RatePlansAPI()
