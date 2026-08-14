import apiClient from '../../../services/api/axios.config'
import { ACTIVE_STATUS_ID } from '../constants'
import type { FormatBuilder, FormatBuilderState, FormatListParams, FormatStatus } from '../types'

const normalizeStatus = (value: any): FormatStatus => {
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

const normalizeFormat = (raw: any): FormatBuilder => {
  if (!raw) {
    return {
      name: '',
      type: 'Invoice',
      tax_rate: 0,
      currency: 0,
      note: 0,
      othercharges: 0,
      totalkm: 0,
      duedays: 0,
      font: 50,
      row: 1,
      status: { id: ACTIVE_STATUS_ID, name: 'ACTIVE' },
      items: {},
    }
  }

  return {
    id: raw.id ?? raw.invoiceformat_id,
    invoiceformat_id: raw.invoiceformat_id ?? raw.id,
    name: raw.name ?? '',
    type: raw.type ?? 'Invoice',
    tax_rate: Number(raw.tax_rate ?? 0),
    currency: raw.currency ?? 0,
    note: raw.note ?? 0,
    othercharges: raw.othercharges ?? 0,
    totalkm: raw.totalkm ?? 0,
    duedays: raw.duedays ?? raw.due_days ?? 0,
    font: raw.font ?? 50,
    row: raw.row ?? 1,
    status: normalizeStatus(raw.status),
    create_user: normalizeAuditUser(raw.create_user),
    update_user: normalizeAuditUser(raw.update_user),
    create_date: raw.create_date ?? raw.createdate,
    update_date: raw.update_date ?? raw.updatedate,
    create_date_format: raw.create_date_format,
    update_date_format: raw.update_date_format,
    items: raw.items || {},
  }
}

const transformListParams = (params: FormatListParams = {}) => {
  return {
    search: params.search || null,
    sortField: params.sortField || 'invoiceformat_id',
    sortOrder: params.sortOrder ?? -1,
    rows: params.rows || 1000,
    first: params.first || 0,
  }
}

const transformFormatForBackend = (format: Partial<FormatBuilder>) => {
  const payload: any = { ...format }
  if (payload.status && typeof payload.status === 'object') {
    payload.status = (payload.status as FormatStatus).id
  }
  // Map id
  if (payload.invoiceformat_id == null && payload.id != null) {
    payload.invoiceformat_id = payload.id
  }
  if (payload.duedays != null && payload.due_days == null) {
    payload.due_days = payload.duedays
  }
  return payload
}

const headers = {
  headers: {
    'Route-Type': 'admin',
  },
}

class FormatBuilderAPI {
  async getFormats(params: FormatListParams = {}) {
    const backend = transformListParams(params)
    const response = await apiClient.get<any>('/invoiceformats', { ...headers, params: backend })
    const payload =
      response.data?.formats ?? response.data?.data?.formats ?? response.data?.data ?? response.data ?? []
    const list = Array.isArray(payload) ? payload : []
    return {
      data: list.map(normalizeFormat),
      total: response.data?.total ?? list.length,
    }
  }

  async getFormat(id: number): Promise<FormatBuilder> {
    const response = await apiClient.get<any>(`/invoiceformats/${id}`, headers)
    const payload = response.data?.format ?? response.data?.data?.format ?? response.data?.data ?? response.data
    return normalizeFormat(payload)
  }

  async createFormat(data: Partial<FormatBuilder>): Promise<FormatBuilder> {
    const payload = transformFormatForBackend(data)
    const response = await apiClient.post<any>('/invoiceformats', payload, headers)
    const format = response.data?.format ?? response.data?.data?.format ?? response.data?.data ?? response.data
    return normalizeFormat(format)
  }

  async updateFormat(id: number, data: Partial<FormatBuilder>): Promise<FormatBuilder> {
    const payload = transformFormatForBackend(data)
    const response = await apiClient.put<any>(`/invoiceformats/${id}`, payload, headers)
    const format = response.data?.format ?? response.data?.data?.format ?? response.data?.data ?? response.data
    return normalizeFormat(format)
  }

  async deleteFormat(id: number): Promise<void> {
    await apiClient.delete(`/invoiceformats/${id}`, headers)
  }
}

export const formatBuilderAPI = new FormatBuilderAPI()
