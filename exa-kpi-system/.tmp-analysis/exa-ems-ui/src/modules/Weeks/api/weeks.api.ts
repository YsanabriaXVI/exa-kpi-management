import apiClient from '../../../services/api/axios.config'
import type { Week } from '../types'
import { ACTIVE_STATUS_ID, DEFAULT_ACTIVE, DEFAULT_STATUS_ID } from '../constants'

const headers = {
  headers: {
    'Route-Type': 'admin',
  },
}

const toDate = (value: any): Date | null => {
  if (!value && value !== 0) return null
  if (value instanceof Date) return value
  if (typeof value === 'number') {
    const ms = value > 1_000_000_000_000 ? value : value * 1000
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'string') {
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
      const ms = numeric > 1_000_000_000_000 ? numeric : numeric * 1000
      const date = new Date(ms)
      if (!Number.isNaN(date.getTime())) return date
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

const formatDate = (date: Date | null): string | null => {
  if (!date) return null
  const pad = (num: number) => String(num).padStart(2, '0')
  // Use UTC methods to avoid timezone shifts when storing dates
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

const formatDisplayDate = (date: Date | null): string | null => {
  if (!date) return null
  return date.toLocaleDateString('en-US')
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

const normalizeWeek = (raw: any): Week => {
  const start = toDate(raw?.start_date ?? raw?.startDate ?? raw?.start_date_format ?? raw?.start)
  const end = toDate(raw?.end_date ?? raw?.endDate ?? raw?.end_date_format ?? raw?.end)

  return {
    week_id: raw.week_id ?? raw.id,
    id: raw.week_id ?? raw.id,
    week_no: raw.week_no ?? raw.weekNo ?? raw.no,
    week_year: raw.week_year ?? raw.weekYear ?? raw.year,
    start_date: formatDate(start),
    end_date: formatDate(end),
    start_date_display: formatDisplayDate(start),
    end_date_display: formatDisplayDate(end),
    active: raw.active ?? DEFAULT_ACTIVE,
    status: raw.status ?? DEFAULT_STATUS_ID,
    create_user: normalizeUser(raw.create_user),
    update_user: normalizeUser(raw.update_user),
    update_date_format: raw.update_date_format,
  }
}

const transformWeekForBackend = (week: Partial<Week>) => {
  const payload: any = { ...week }
  payload.week_no = week.week_no
  payload.week_year = week.week_year
  payload.start_date = typeof week.start_date === 'string' ? week.start_date : formatDate(toDate(week.start_date))
  payload.end_date = typeof week.end_date === 'string' ? week.end_date : formatDate(toDate(week.end_date))
  payload.status = week.status ?? DEFAULT_STATUS_ID
  payload.active = week.active ?? ACTIVE_STATUS_ID

  delete payload.week_id
  delete payload.id
  delete payload.create_user
  delete payload.update_user
  delete payload.update_date_format
  delete payload.start_date_display
  delete payload.end_date_display

  return payload
}

class WeeksAPI {
  async getWeeks() {
    // Prefer legacy active names endpoint to match filtered lists (e.g., payments)
    try {
      const response = await apiClient.get<any>('/weeks/active_names', headers)
      const payload =
        response.data?.weeks ?? response.data?.data?.weeks ?? response.data?.data ?? response.data ?? []
      const data = Array.isArray(payload) ? payload : []
      const normalized = data.filter(Boolean).map(normalizeWeek)
      return {
        data: normalized,
        total: normalized.length,
      }
    } catch (err) {
      // Fallback to full list if active endpoint fails
      const response = await apiClient.get<any>('/weeks', headers)
      const payload =
        response.data?.weeks ?? response.data?.data?.weeks ?? response.data?.data ?? response.data ?? []
      const data = Array.isArray(payload) ? payload : []
      const normalized = data.filter(Boolean).map(normalizeWeek)
      return {
        data: normalized,
        total: normalized.length,
      }
    }
  }

  async getWeek(id: number): Promise<Week> {
    const response = await apiClient.get<any>(`/weeks/${id}`, headers)
    const payload = response.data?.week ?? response.data?.data?.week ?? response.data?.data ?? response.data
    return normalizeWeek(payload)
  }

  async createWeek(week: Partial<Week>): Promise<Week> {
    const payload = transformWeekForBackend(week)
    const response = await apiClient.post<any>('/weeks', payload, headers)
    const data = response.data?.week ?? response.data?.data?.week ?? response.data?.data ?? response.data
    return normalizeWeek(data || payload)
  }

  async updateWeek(id: number, week: Partial<Week>): Promise<Week> {
    const payload = transformWeekForBackend(week)
    const response = await apiClient.put<any>(`/weeks/${id}`, payload, headers)
    const data = response.data?.week ?? response.data?.data?.week ?? response.data?.data ?? response.data
    return normalizeWeek(data || payload)
  }

  async deleteWeek(id: number): Promise<void> {
    await apiClient.delete(`/weeks/${id}`, headers)
  }
}

export const weeksAPI = new WeeksAPI()
