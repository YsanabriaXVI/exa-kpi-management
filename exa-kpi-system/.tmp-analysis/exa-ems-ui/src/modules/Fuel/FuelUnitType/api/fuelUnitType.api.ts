import api from '../../../../services/api/axios.config'
import formatDate from '../../../../helpers/IsoDateFormatter'
import type { FuelUnitType, FuelUnitTypeForm } from '../types/fuelUnitType.types'

const BASE_URL = '/fuel-service/UnitTypes'

const deserializeRecord = (record: any): FuelUnitType => {
  const result = { ...record }

  for (const field of ['createdBy', 'updatedBy']) {
    if (result[field]) {
      result[field].fullName =
        `${result[field].firstName ?? ''} ${result[field].lastName ?? ''}`.trim()
    }
  }

  for (const field of ['createDate', 'updateDate']) {
    if (result[field]) {
      result[`${field}Format`] = formatDate(result[field]) ?? ''
    }
  }

  return result
}

class FuelUnitTypesApi {
  async fetchFuelUnitTypes(): Promise<FuelUnitType[]> {
    const res = await api.get<FuelUnitType[]>(BASE_URL)
    const list = res.data ?? []
    return list.map(deserializeRecord)
  }

  async createFuelUnitType(form: FuelUnitTypeForm): Promise<FuelUnitType> {
    const payload = { name: form.name }
    const res = await api.post<FuelUnitType>(BASE_URL, payload)
    return deserializeRecord(res.data)
  }

  async updateFuelUnitType(form: FuelUnitTypeForm): Promise<FuelUnitType> {
    if (!form.unitTypeId) {
      throw new Error('unitTypeId is required to update a fuel unit type')
    }
    const payload = { name: form.name }
    const res = await api.put<FuelUnitType>(
      `${BASE_URL}/${form.unitTypeId}`,
      payload,
    )
    return deserializeRecord(res.data)
  }

  async deleteFuelUnitType(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`)
  }
}

export const fuelUnitTypesApi = new FuelUnitTypesApi()
