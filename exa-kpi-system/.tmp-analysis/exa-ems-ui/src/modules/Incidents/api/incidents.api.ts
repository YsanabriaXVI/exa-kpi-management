import apiClient from '../../../services/api/axios.config'
import type { Incident } from '../types'

const unwrap = (response: any) => response?.data ?? response

const normalizeIncident = (raw: any): Incident => {
  if (!raw) return {}

  const formatNames = (arr?: Array<{ name?: string }>) => {
    if (!Array.isArray(arr)) return undefined
    return arr.map((i) => i?.name).filter(Boolean).join(', ')
  }

  const eventDate = raw.event_date ?? raw.eventDate
  let event_date_format = raw.event_date_format ?? raw.eventDateFormat
  if (!event_date_format && eventDate) {
    const num = Number(eventDate)
    if (!Number.isNaN(num)) {
      event_date_format = new Date(num * 1000).toLocaleDateString()
    }
  }

  return {
    ...raw,
    incident_id: raw.incident_id ?? raw.id,
    incident_type_obj_format: raw.incident_type_obj_format ?? formatNames(raw.incident_type_obj),
    incident_cause_obj_format: raw.incident_cause_obj_format ?? formatNames(raw.incident_cause_obj),
    responsible_data_format: raw.responsible_data_format ?? formatNames(raw.responsible_data),
    driver_name: raw.driver_name ?? raw.driver,
    truck_plate: raw.truck_plate ?? raw.truck,
    chassis_no: raw.chassis_no ?? raw.chassis,
    genset_no: raw.genset_no ?? raw.genset,
    event_date_format,
  }
}

export const incidentsAPI = {
  async getIncidents(params?: { module?: string; id?: string | number }): Promise<Incident[]> {
    const url = params?.module && params.id ? `/incidents/${params.module}/${params.id}` : '/incidents'
    const response = await apiClient.get(url)
    const payload = unwrap(response)
    const list = payload?.incidents ?? payload?.data?.incidents ?? payload?.data ?? payload ?? []
    return Array.isArray(list) ? list.map(normalizeIncident) : []
  },

  async getIncident(id: number | string): Promise<Incident> {
    const response = await apiClient.get(`/incidents/${id}`)
    const payload = unwrap(response)
    const incident = payload?.incident ?? payload?.data?.incident ?? payload?.data ?? payload
    return normalizeIncident(incident)
  },

  async createIncident(data: Partial<Incident>): Promise<Incident> {
    const response = await apiClient.post('/incidents', data)
    const payload = unwrap(response)
    const incident = payload?.incident ?? payload?.data?.incident ?? payload?.data ?? payload
    return normalizeIncident(incident)
  },

  async updateIncident(id: number | string, data: Partial<Incident>): Promise<Incident> {
    const response = await apiClient.put(`/incidents/${id}`, data)
    const payload = unwrap(response)
    const incident = payload?.incident ?? payload?.data?.incident ?? payload?.data ?? payload
    return normalizeIncident(incident)
  },

  async deleteIncident(id: number | string): Promise<void> {
    await apiClient.delete(`/incidents/${id}`)
  },
}
