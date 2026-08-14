import api from '../../../../services/api/axios.config'
import formatDate from '../../../../helpers/IsoDateFormatter'
import type {
  FuelOrderSettings,
  FuelOrderSettingsForm,
  PlateOption,
  SubdivisionUser,
  AttributeItem,
} from '../types/fuelOrderSettings.types'

const BASE_URL = '/fuel-service/fuelSettings'

const deserializeRecord = (record: any): FuelOrderSettings => {
  const result = { ...record }
  for (const field of ['CreatedBy', 'UpdatedBy']) {
    if (result[field]) {
      result[field].fullName =
        `${result[field].firstName ?? ''} ${result[field].lastName ?? ''}`.trim()
    }
  }
  for (const field of ['createdAt', 'updatedAt']) {
    if (result[field]) {
      result[`${field}Format`] = formatDate(result[field]) ?? ''
    }
  }

  // Flatten company object
  if (result.company && typeof result.company === 'object' && !result.company_id) {
    result.company_id = result.company.company_id ?? result.company.companyId
  }

  // Flatten nested arrays (API may return objects instead of IDs)
  const flattenIds = (arr: any[] | undefined, idKey: string): number[] => {
    if (!Array.isArray(arr)) return []
    return arr.map((item) => (typeof item === 'object' ? item[idKey] ?? item.id : item)).filter(Boolean)
  }

  if (result.Subdivisions || result.subdivisionData) {
    const raw = result.Subdivisions ?? result.subdivisionData
    if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') {
      result.subdivisions = flattenIds(raw, 'subdivision_id')
    }
  }

  if (result.WorkTypes && Array.isArray(result.WorkTypes) && typeof result.WorkTypes[0] === 'object') {
    result.workTypes = flattenIds(result.WorkTypes, 'attribute_item_id')
  }

  if (result.AssetTypes && Array.isArray(result.AssetTypes) && typeof result.AssetTypes[0] === 'object') {
    result.assetTypes = flattenIds(result.AssetTypes, 'attribute_item_id')
  }

  if (result.Clients && Array.isArray(result.Clients) && typeof result.Clients[0] === 'object') {
    result.clients = flattenIds(result.Clients, 'client_id')
  }

  if (result.FuelLimitRules && Array.isArray(result.FuelLimitRules)) {
    result.fuelLimitRules = result.FuelLimitRules.map((rule: any) => ({
      period: rule.period,
      assetIds: flattenIds(rule.assets ?? rule.AssetIds ?? rule.assetIds, 'asset_id'),
      fuelLimitLtrs: rule.fuelLimitLtrs ?? rule.fuel_limit_ltrs,
    }))
  }

  if (result.Approvers && Array.isArray(result.Approvers)) {
    result.approvers = result.Approvers.map((a: any) =>
      typeof a === 'object' ? `${a.user_id ?? a.userId}-${a.subdivision_id ?? a.subdivisionId ?? 0}` : a,
    )
  }

  return result
}

class FuelOrderSettingsApi {
  async fetchList(): Promise<FuelOrderSettings[]> {
    const res = await api.get<FuelOrderSettings[]>(BASE_URL)
    const list = res.data ?? []
    return list.map(deserializeRecord)
  }

  async fetchById(id: number): Promise<FuelOrderSettings> {
    const res = await api.get<any>(`${BASE_URL}/${id}`)
    const record = res.data?.data ?? res.data
    return deserializeRecord(record)
  }

  async create(form: FuelOrderSettingsForm): Promise<FuelOrderSettings> {
    const res = await api.post<any>(BASE_URL, form)
    return deserializeRecord(res.data?.data ?? res.data)
  }

  async update(form: FuelOrderSettingsForm): Promise<FuelOrderSettings> {
    if (!form.fuelModuleConfigId) {
      throw new Error('fuelModuleConfigId is required to update fuel order settings')
    }
    const res = await api.put<any>(
      `${BASE_URL}/${form.fuelModuleConfigId}`,
      form,
    )
    return deserializeRecord(res.data?.data ?? res.data)
  }

  async remove(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`)
  }

  async loadPlatesList(payload: {
    subdivisionIds: number[]
    assetTypeIds: number[]
  }): Promise<PlateOption[]> {
    const res = await api.post<any>(
      `${BASE_URL}/subdivision-asset-plates`,
      payload,
    )
    return res.data?.data ?? res.data ?? []
  }

  async loadSubdivisionUsers(payload: {
    subdivisionIds: number[]
  }): Promise<SubdivisionUser[]> {
    const res = await api.post<any>(
      `${BASE_URL}/subdivision-users`,
      payload,
    )
    return res.data?.data ?? res.data ?? []
  }

  async loadAttributeItems(
    attributeFlatNameId: string,
    moduleFlatNameId: string,
  ): Promise<AttributeItem[]> {
    const res = await api.get<any>(
      `/attribute-service/attributes/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`,
    )
    const attrs = res.data?.data?.attributes ?? res.data?.attributes ?? res.data ?? []
    if (Array.isArray(attrs) && attrs.length > 0 && attrs[0]?.items) {
      return attrs[0].items
    }
    return attrs
  }
}

export const fuelOrderSettingsApi = new FuelOrderSettingsApi()
