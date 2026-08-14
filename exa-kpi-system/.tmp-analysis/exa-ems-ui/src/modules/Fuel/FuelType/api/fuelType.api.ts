import api from '../../../../services/api/axios.config'
import formatDate from '../../../../helpers/IsoDateFormatter'
import type { FuelType, FuelTypeForm } from '../types/fuelType.types'

const BASE_URL = '/fuel-service/fuelTypes'

const deserializeRecord = (record: any): FuelType => {
  const result: FuelType = {
    fuelTypeId: record.fuelTypeId ?? record.attributeItemid ?? record.attribute_item_id,
    name: record.name,
    attributeid: record.attributeid,
    status: record.status,
    flat_name_id: record.flat_name_id,
    createuser: record.createuser,
    updateuser: record.updateuser,
    createdate: record.createdate,
    updatedate: record.updatedate,
  }

  if (result.createdate) {
    result.createdateFormat = formatDate(result.createdate) ?? ''
  }
  if (result.updatedate) {
    result.updatedateFormat = formatDate(result.updatedate) ?? ''
  }

  const createdBy = record.createdBy ?? record.UserCreatedBy
  if (createdBy?.fullName) result.createdByName = createdBy.fullName
  else if (createdBy?.firstName) result.createdByName = `${createdBy.firstName} ${createdBy.lastName ?? ''}`.trim()

  const updatedBy = record.updatedBy ?? record.UserUpdatedBy
  if (updatedBy?.fullName) result.updatedByName = updatedBy.fullName
  else if (updatedBy?.firstName) result.updatedByName = `${updatedBy.firstName} ${updatedBy.lastName ?? ''}`.trim()

  return result
}

class FuelTypesApi {
  async fetchFuelTypes(): Promise<FuelType[]> {
    const res = await api.get<any[]>(BASE_URL)
    const list = res.data ?? []
    return list.map(deserializeRecord)
  }

  async createFuelType(form: FuelTypeForm): Promise<FuelType> {
    const payload = { name: form.name }
    const res = await api.post<any>(BASE_URL, payload)
    return deserializeRecord(res.data)
  }

  async updateFuelType(form: FuelTypeForm): Promise<FuelType> {
    if (!form.fuelTypeId) {
      throw new Error('fuelTypeId is required to update a fuel type')
    }
    const payload = { name: form.name }
    const res = await api.put<any>(
      `${BASE_URL}/${form.fuelTypeId}`,
      payload,
    )
    return deserializeRecord(res.data)
  }

  async deleteFuelType(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`)
  }
}

export const fuelTypesApi = new FuelTypesApi()
