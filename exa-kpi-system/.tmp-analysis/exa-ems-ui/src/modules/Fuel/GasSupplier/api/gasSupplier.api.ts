import api from '../../../../services/api/axios.config'
import type {
  GasSupplier,
  GasSupplierForm,
  GasStore,
  GasStoreForm,
} from '../types/gasSupplier.types'

const PARENT_URL = '/stations-service/gasStationsParent'
const STORE_URL = '/stations-service/gasStations'

const adminHeaders = { headers: { 'Route-Type': 'admin' } }

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const fmtDate = (val: any): string => {
  if (!val) return ''
  try {
    const iso = String(val)
    const [datePart, timePart] = iso.slice(0, 19).split('T')
    if (!datePart) return iso
    const [y, m, d] = datePart.split('-')
    const mon = months[parseInt(m, 10) - 1] ?? m
    const day = parseInt(d, 10)
    return `${day}-${mon}-${y} ${timePart ?? '00:00:00'}`
  } catch { return String(val) }
}

const deserializeSupplier = (record: any): GasSupplier => {
  const result: GasSupplier = { ...record }

  if (record.company) {
    result.companyId = record.company.companyId
    result.company_format = record.company.name
  }
  if (record.country) {
    result.countryId = record.country.countryId
    result.country_format = record.country.name
  }
  if (record.department) {
    result.departmentId = record.department.deparmentid
    result.department_format = record.department.name
  }
  if (record.city) {
    result.cityId = record.city.citieid
    result.city_format = record.city.name
  }
  if (record.createdAt) {
    result.createdAtFormat = fmtDate(record.createdAt)
  }
  if (record.updatedAt) {
    result.updatedAtFormat = fmtDate(record.updatedAt)
  }
  if (Array.isArray(record.Subdivisions)) {
    result.subdivisions = record.Subdivisions.map(
      (s: any) => s.subdivisionId,
    )
  } else {
    result.subdivisions = []
  }

  return result
}

const deserializeStore = (record: any): GasStore => {
  const result: GasStore = { ...record }

  if (record.company) {
    result.companyId = record.company.companyId ?? record.company.company_id
    result.company_format = record.company.name
  }
  if (record.country) {
    result.countryId = record.country.countryId
    result.country_format = record.country.name
  }
  if (record.department) {
    result.departmentId = record.department.deparmentid
    result.department_format = record.department.name
  }
  if (record.city) {
    result.cityId = record.city.citieid
    result.city_format = record.city.name
  }
  if (record.createdAt) {
    result.createdAtFormat = fmtDate(record.createdAt)
  }
  if (record.updatedAt) {
    result.updatedAtFormat = fmtDate(record.updatedAt)
  }
  if (Array.isArray(record.Subdivisions)) {
    result.subdivisions = record.Subdivisions.map(
      (s: any) => s.subdivisionId,
    )
  }

  return result
}

class GasSupplierApi {
  async fetchSuppliers(): Promise<GasSupplier[]> {
    const res = await api.get<any[]>(PARENT_URL, adminHeaders)
    return (res.data ?? []).map(deserializeSupplier)
  }

  async fetchSupplier(id: number): Promise<GasSupplier> {
    const res = await api.get<any>(`${PARENT_URL}/${id}`, adminHeaders)
    return deserializeSupplier(res.data)
  }

  async createSupplier(form: GasSupplierForm): Promise<GasSupplier> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      creditDays: form.creditDays ? parseInt(String(form.creditDays), 10) : 0,
      countryId: form.countryId ? parseInt(String(form.countryId), 10) : 0,
      departmentId: form.departmentId
        ? parseInt(String(form.departmentId), 10)
        : 0,
      cityId: form.cityId ? parseInt(String(form.cityId), 10) : 0,
      companyId: 5,
      status: form.status ?? 1,
      active: form.active ?? 0,
      subdivisions: form.subdivisions ?? [],
      createdBy: 0,
      updatedBy: 0,
      createdAt: now,
      updatedAt: now,
    }
    const res = await api.post<any>(PARENT_URL, payload, adminHeaders)
    return deserializeSupplier(res.data)
  }

  async updateSupplier(form: GasSupplierForm): Promise<GasSupplier> {
    if (!form.gasStationsParentId) {
      throw new Error('gasStationsParentId is required to update a supplier')
    }
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      creditDays: form.creditDays,
      countryId: form.countryId,
      departmentId: form.departmentId,
      cityId: form.cityId,
      status: form.status,
      active: form.active,
      subdivisions: form.subdivisions ?? [],
    }
    const res = await api.put<any>(
      `${PARENT_URL}/${form.gasStationsParentId}`,
      payload,
      adminHeaders,
    )
    return deserializeSupplier(res.data?.gasSupplier ?? res.data)
  }

  async deleteSupplier(id: number): Promise<void> {
    await api.delete(`${PARENT_URL}/${id}`, adminHeaders)
  }

  async fetchAllStores(): Promise<GasStore[]> {
    const res = await api.get<any[]>(`${STORE_URL}/all`, adminHeaders)
    return (res.data ?? []).map(deserializeStore)
  }

  async fetchStores(parentId: number): Promise<GasStore[]> {
    const res = await api.get<any[]>(
      `${STORE_URL}?gasStationsParentId=${parentId}`,
      adminHeaders,
    )
    return (res.data ?? []).map(deserializeStore)
  }

  async fetchStore(id: number): Promise<GasStore> {
    const res = await api.get<any>(`${STORE_URL}/${id}`, adminHeaders)
    return deserializeStore(res.data)
  }

  async createStore(
    form: GasStoreForm,
    parentId: number,
  ): Promise<GasStore> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      creditDays: form.creditDays ? parseInt(String(form.creditDays), 10) : 0,
      countryId: form.countryId ? parseInt(String(form.countryId), 10) : 0,
      departmentId: form.departmentId
        ? parseInt(String(form.departmentId), 10)
        : 0,
      cityId: form.cityId ? parseInt(String(form.cityId), 10) : 0,
      companyId: 5,
      status: form.status ?? 1,
      active: form.active ?? 0,
      gasStationsParentId: parentId,
      subdivisions: form.subdivisions ?? [],
      createdBy: 0,
      updatedBy: 0,
      createdAt: now,
      updatedAt: now,
    }
    const res = await api.post<any>(STORE_URL, payload, adminHeaders)
    return deserializeStore(res.data)
  }

  async updateStore(form: GasStoreForm): Promise<GasStore> {
    if (!form.gasStationsId) {
      throw new Error('gasStationsId is required to update a store')
    }
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      creditDays: form.creditDays,
      countryId: form.countryId,
      departmentId: form.departmentId,
      cityId: form.cityId,
      status: form.status,
      active: form.active,
      subdivisions: form.subdivisions ?? [],
    }
    const res = await api.put<any>(
      `${STORE_URL}/${form.gasStationsId}`,
      payload,
      adminHeaders,
    )
    return deserializeStore(res.data?.gasSupplier ?? res.data)
  }

  async deleteStore(id: number): Promise<void> {
    await api.delete(`${STORE_URL}/${id}`, adminHeaders)
  }
}

export const gasSupplierApi = new GasSupplierApi()
