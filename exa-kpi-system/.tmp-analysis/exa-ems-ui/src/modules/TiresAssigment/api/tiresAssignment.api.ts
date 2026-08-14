// src/modules/TiresAssignment/api/tiresAssignment.api.ts

import api from '../../../services/api/axios.config'
import type {
  SelectOption,
  TiresAssignment,
  TiresAssignmentForm,
  TiresCatalogs,
} from '../types/tiresAssignment.types'

const TIRE_UNITS_BASE_URL = '/tires-assignment-service/tires'
const CATALOGS_BASE_URL = '/tires-assignment-service/catalogs'
const CHASSIS_BASE_URL = '/chassis-service'

const toNumber = (value: any, fallback = 0): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const toString = (value: any): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

const normalizeSerial = (value: any): string => toString(value).trim().toUpperCase()

const getRawValue = (raw: any, ...keys: string[]) => {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null) return raw[key]
  }
  return undefined
}

const normalizeTire = (raw: any): TiresAssignment => {
  const tiresId = toNumber(getRawValue(raw, 'tiresId', 'tiresAssignId', 'id'))
  const serialNo = normalizeSerial(getRawValue(raw, 'serialNo', 'SerieNumber', 'seriesNumber'))

  const brandId = getRawValue(raw, 'brandId', 'brand') ?? ''
  const tireTypeId = getRawValue(raw, 'tireTypeId', 'TireType', 'tireType') ?? ''
  const statusId = getRawValue(raw, 'statusId', 'status') ?? ''
  const remarks = getRawValue(raw, 'remarks', 'observations') ?? ''

  return {
    ...raw,
    tiresId,
    tiresAssignId: tiresId,

    seriesNumber: serialNo,
    serialNo,

    year: toString(raw?.year),

    brand: brandId,
    brandId,
    brandName: raw?.brandName ?? null,

    depth: raw?.depth === null || raw?.depth === undefined ? '' : Number(raw.depth),

    owned: Boolean(raw?.owned ?? raw?.owner ?? true),
    owner: Boolean(raw?.owned ?? raw?.owner ?? true),

    tireType: tireTypeId,
    tireTypeId,
    tireTypeName: raw?.tireTypeName ?? null,

    statusId,
    statusName: raw?.statusName ?? null,

    remarks,
    observations: toString(remarks),

    assignedToId: raw?.assignedToId ?? '',
    positionId: raw?.positionId ?? '',
    categoryId: raw?.categoryId ?? '',

    isAssigned: Boolean(raw?.isAssigned ?? raw?.assignedToId),
  }
}

const normalizeOption = (raw: any): SelectOption => {
  const value =
    raw?.value ??
    raw?.attributeItemId ??
    raw?.attributeItemid ??
    raw?.assetsid ??
    raw?.assetid ??
    raw?.assetId ??
    raw?.chassisId ??
    raw?.equipmentId ??
    raw?.id ??
    ''

  const label =
    raw?.label ??
    raw?.itemName ??
    raw?.name ??
    raw?.description ??
    raw?.plate ??
    raw?.serieNo ??
    raw?.serialNo ??
    raw?.chassisNo ??
    raw?.chassisNumber ??
    raw?.equipmentName ??
    raw?.genericvalue3 ??
    raw?.genericValue3 ??
    raw?.genericvalue2 ??
    raw?.genericValue2 ??
    raw?.genericvalue1 ??
    raw?.genericValue1 ??
    String(value)

  return { label: String(label ?? ''), value }
}

const normalizeOptions = (list: any): SelectOption[] => {
  if (!Array.isArray(list)) return []

  return list
    .map(normalizeOption)
    .filter((item) => item.value !== '' && item.value !== undefined && item.label !== '')
}

const getCatalogItems = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  return []
}

class TiresAssignmentApi {
  private mapFormToPayload(form: TiresAssignmentForm) {
    return {
      serialNo: normalizeSerial(form.serialNo ?? form.seriesNumber),
      year: form.year !== undefined && form.year !== '' ? String(form.year) : undefined,
      brand: form.brandId ?? form.brand,
      depth: form.depth !== undefined && form.depth !== '' ? Number(form.depth) : undefined,
      owned: Boolean(form.owner ?? form.owned ?? true),
      tireType: form.tireTypeId ?? form.tireType,
      remarks: form.observations ?? form.remarks ?? null,
      statusId: form.statusId ?? form.status,
    }
  }

  async fetchAssignments(): Promise<TiresAssignment[]> {
    const { data } = await api.get<any[]>(TIRE_UNITS_BASE_URL)

    return (data ?? [])
      .map(normalizeTire)
      .sort((a, b) => (b.tiresId ?? 0) - (a.tiresId ?? 0))
  }

  async fetchAssignmentById(serialNo: string): Promise<TiresAssignment> {
    const { data } = await api.get<any>(`${TIRE_UNITS_BASE_URL}/${encodeURIComponent(serialNo)}`)
    return normalizeTire(data)
  }

  async createAssignment(form: TiresAssignmentForm): Promise<TiresAssignment> {
    const payload = this.mapFormToPayload(form)
    const { data } = await api.post<any>(TIRE_UNITS_BASE_URL, payload)
    return normalizeTire(data)
  }

  async updateAssignment(serialNo: string, form: TiresAssignmentForm): Promise<TiresAssignment> {
    const payload = this.mapFormToPayload(form)

    // serialNo is immutable in the backend route. Do not send it in the update body.
    const { serialNo: _serialNo, ...body } = payload

    const { data } = await api.put<any>(
      `${TIRE_UNITS_BASE_URL}/${encodeURIComponent(serialNo)}`,
      body,
    )

    return normalizeTire(data)
  }

  async deleteAssignment(serialNo: string): Promise<void> {
    await api.post(`${TIRE_UNITS_BASE_URL}/batch-dispose`, {
      serialNos: [serialNo],
    })
  }

  private async fetchCatalog(flatNameId: string): Promise<SelectOption[]> {
    const { data } = await api.get(`${CATALOGS_BASE_URL}/${flatNameId}`)
    return normalizeOptions(getCatalogItems(data))
  }

  async fetchAttributeCatalogs(): Promise<Omit<TiresCatalogs, 'assignedTo'>> {
    const [brands, tireTypes, statuses, positions] = await Promise.all([
      this.fetchCatalog('tire_brand'),
      this.fetchCatalog('tire_type'),
      this.fetchCatalog('tires_condition'),
      this.fetchCatalog('axis').catch(() => []),
    ])

    return {
      brands,
      tireTypes,
      positions,
      categories: [],
      statuses,
    }
  }

  async fetchAssignedToOptions(): Promise<SelectOption[]> {
    try {
      const { data } = await api.get(CHASSIS_BASE_URL)
      const list = Array.isArray(data) ? data : (data?.data ?? data?.items ?? [])
      return normalizeOptions(list)
    } catch {
      return []
    }
  }

  async fetchTiresCatalogs(): Promise<TiresCatalogs> {
    const [attributeCatalogs, assignedTo] = await Promise.all([
      this.fetchAttributeCatalogs(),
      this.fetchAssignedToOptions(),
    ])

    return {
      ...attributeCatalogs,
      assignedTo,
    }
  }
}

export const tiresAssignmentApi = new TiresAssignmentApi()
