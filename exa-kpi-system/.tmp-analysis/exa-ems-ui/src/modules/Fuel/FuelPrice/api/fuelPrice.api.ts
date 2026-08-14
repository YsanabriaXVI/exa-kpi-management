import api from '../../../../services/api/axios.config'
import formatDate from '../../../../helpers/IsoDateFormatter'
import type {
  FuelPrice,
  FuelPriceForm,
  CountryOption,
  DepartmentOption,
  CityOption,
  FuelTypeOption,
  UnitTypeOption,
} from '../types/fuelPrice.types'

const BASE_URL = '/fuel-service/fuelPrice'

const fullName = (user?: { firstName?: string; lastName?: string }): string => {
  if (!user) return ''
  return [user.firstName, user.lastName].filter(Boolean).join(' ')
}

const deserializeRecord = (record: any): FuelPrice => {
  const result: any = { ...record }

  if (!result.fuelPrices) result.fuelPrices = []

  if (record.Week) {
    result.weekLabel = `${record.Week.weekyear} - W ${record.Week.weekno}`
  }

  const loc = record.FuelPriceLocation
  if (loc) {
    result.countryName = loc.country?.name ?? ''
    result.departmentName = loc.department?.name ?? ''
    result.cityName = loc.city?.name ?? ''
  }

  result.createdByName = fullName(record.UserCreatedBy)
  result.updatedByName = fullName(record.UserUpdatedBy)

  if (record.createdAt) {
    result.createdAtFormat = formatDate(record.createdAt) ?? ''
  }
  if (record.updatedAt) {
    result.updatedAtFormat = formatDate(record.updatedAt) ?? ''
  }

  return result as FuelPrice
}

class FuelPriceApi {
  async fetchList(): Promise<FuelPrice[]> {
    const res = await api.get<any[]>(BASE_URL)
    return (res.data ?? []).map(deserializeRecord)
  }

  async fetchById(id: number): Promise<FuelPrice> {
    const res = await api.get<any>(`${BASE_URL}/${id}`)
    return deserializeRecord(res.data)
  }

  async create(form: FuelPriceForm): Promise<FuelPrice> {
    const payload = this.buildPayload(form)
    const res = await api.post<any>(BASE_URL, payload)
    return deserializeRecord(res.data)
  }

  async update(form: FuelPriceForm, originalRecord?: FuelPrice | null): Promise<FuelPrice> {
    if (!form.fuelPriceLocationWeekId) {
      throw new Error('fuelPriceLocationWeekId is required to update')
    }
    const payload = this.buildPayload(form, originalRecord)
    const res = await api.put<any>(
      `${BASE_URL}/${form.fuelPriceLocationWeekId}`,
      payload,
    )
    return deserializeRecord(res.data)
  }

  async remove(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`)
  }

  async fetchCountries(): Promise<CountryOption[]> {
    const res = await api.get<any[]>('/fuel-service/countries')
    return (res.data ?? []).map((c: any) => ({
      countryId: c.countryId,
      name: c.name,
    }))
  }

  async fetchDepartments(countryId: number): Promise<DepartmentOption[]> {
    const res = await api.get<any[]>(
      `/fuel-service/countries/${countryId}/departments`,
    )
    return (res.data ?? []).map((d: any) => ({
      deparmentid: d.deparmentid,
      name: d.name,
    }))
  }

  async fetchCities(departmentId: number): Promise<CityOption[]> {
    const res = await api.get<any[]>(
      `/fuel-service/cities/department/${departmentId}`,
    )
    return (res.data ?? [])
      .filter((c: any) => c.variantid == null)
      .map((c: any) => ({
        citieid: c.citieid,
        name: c.name,
      }))
  }

  async fetchFuelTypes(): Promise<FuelTypeOption[]> {
    const res = await api.get<any[]>('/fuel-service/fuelTypes')
    return (res.data ?? []).map((f: any) => ({
      attributeItemid: f.attributeItemid,
      name: f.name,
    }))
  }

  async fetchUnitTypes(): Promise<UnitTypeOption[]> {
    const res = await api.get<any[]>('/fuel-service/unitTypes')
    return (res.data ?? []).map((u: any) => ({
      unitTypeId: u.unitTypeId,
      name: u.name,
    }))
  }

  private buildPayload(form: FuelPriceForm, originalRecord?: FuelPrice | null) {
    const payload: Record<string, any> = {}

    if (originalRecord) {
      payload.fuelPriceLocationWeekId = originalRecord.fuelPriceLocationWeekId
      payload.fuelPriceLocationId = originalRecord.fuelPriceLocationId
      payload.companyId = originalRecord.companyId
      payload.createdBy = originalRecord.createdBy
      payload.createdAt = originalRecord.createdAt
      payload.updatedBy = originalRecord.updatedBy
      payload.updatedAt = originalRecord.updatedAt
      payload.Prices = (originalRecord.fuelPrices ?? []).map((p: any) => ({
        fuelPriceId: p.fuelPriceId,
        fuelTypeId: p.fuelTypeId,
        unitTypeId: p.unitTypeId,
        price: p.price,
        fuelPriceLocationWeekId: p.fuelPriceLocationWeekId,
      }))
    } else {
      payload.Prices = []
    }

    Object.entries(form.prices).forEach(([key, price]) => {
      payload[key] = String(price)
    })

    payload.weekId = form.weekId ? Number(form.weekId) : null
    payload.fuelWeek = form.weekId ? Number(form.weekId) : null
    payload.fuelCountry = form.countryId ? Number(form.countryId) : null
    payload.fuelDepartment = form.departmentId ? Number(form.departmentId) : null
    payload.fuelCity = form.cityId ? Number(form.cityId) : null
    payload.cityId = form.cityId ? Number(form.cityId) : null
    payload.exchangeRate = form.exchangeRate || null

    return payload
  }
}

export const fuelPriceApi = new FuelPriceApi()
