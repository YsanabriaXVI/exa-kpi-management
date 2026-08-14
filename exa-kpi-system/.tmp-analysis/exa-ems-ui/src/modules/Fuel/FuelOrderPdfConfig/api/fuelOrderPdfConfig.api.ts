import api from '../../../../services/api/axios.config'
import formatDate from '../../../../helpers/IsoDateFormatter'
import type { FuelOrderPdfConfig, FuelOrderPdfConfigForm } from '../types/fuelOrderPdfConfig.types'

const BASE_URL = '/fuel-service/pdf-config'

const deserializeRecord = (record: any): FuelOrderPdfConfig => {
  const result: FuelOrderPdfConfig = {
    id: record.id ?? record.pdfConfigId,
    configName: record.configName ?? record.config_name ?? record.name,
    subdivisions: Array.isArray(record.subdivisions)
      ? record.subdivisions.map((s: any) => s?.name ?? s?.subdivisionName ?? String(s)).join(', ')
      : record.subdivisions ?? record.subdivision ?? '',
    subdivisionIds: Array.isArray(record.subdivisions)
      ? record.subdivisions
          .map((s: any) => s?.subdivision_id ?? s?.id ?? Number(s))
          .filter((id: any) => !Number.isNaN(id) && id > 0)
      : [],
    fuelPriceEnabled: record.fuelPriceEnabled ?? record.fuelPrice ?? record.fuel_price ?? false,
    importEnabled: record.importEnabled ?? record.import ?? false,
    totalEnabled: record.totalEnabled ?? record.total ?? false,
    createdate: record.createdate,
    updatedate: record.updatedate,
  }

  if (result.createdate) result.createdateFormat = formatDate(result.createdate) ?? ''
  if (result.updatedate) result.updatedateFormat = formatDate(result.updatedate) ?? ''

  const createdBy = record.createdBy ?? record.UserCreatedBy
  if (createdBy?.fullName) result.createdByName = createdBy.fullName
  else if (createdBy?.firstName) result.createdByName = `${createdBy.firstName} ${createdBy.lastName ?? ''}`.trim()

  const updatedBy = record.updatedBy ?? record.UserUpdatedBy
  if (updatedBy?.fullName) result.updatedByName = updatedBy.fullName
  else if (updatedBy?.firstName) result.updatedByName = `${updatedBy.firstName} ${updatedBy.lastName ?? ''}`.trim()

  return result
}

class FuelOrderPdfConfigApi {
  async fetchList(): Promise<FuelOrderPdfConfig[]> {
    const res = await api.get<any[]>(BASE_URL)
    const list = res.data ?? []
    return list.map(deserializeRecord)
  }

  async fetchById(id: number): Promise<FuelOrderPdfConfig> {
    const res = await api.get<any>(`${BASE_URL}/${id}`)
    return deserializeRecord(res.data)
  }

  async create(form: FuelOrderPdfConfigForm): Promise<FuelOrderPdfConfig> {
    const res = await api.post<any>(BASE_URL, form)
    return deserializeRecord(res.data)
  }

  async update(form: FuelOrderPdfConfigForm): Promise<FuelOrderPdfConfig> {
    if (!form.id) throw new Error('id is required to update a PDF Config')
    const res = await api.put<any>(`${BASE_URL}/${form.id}`, form)
    return deserializeRecord(res.data)
  }

  async remove(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`)
  }
}

export const fuelOrderPdfConfigApi = new FuelOrderPdfConfigApi()
