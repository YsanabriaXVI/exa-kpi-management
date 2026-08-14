import api from '../../../../services/api/axios.config'
import type { SummaryRow, AttributeOption } from '../types/fuelWeekSummary.types'

const SUMMARY_URL = '/fuel-service/fuel-week-summary/summary'
const XLSX_URL = '/fuel-service/fuel-week-summary/xlsx'
const ATTRIBUTE_URL = '/attribute-service/attributes'

class FuelWeekSummaryApi {
  async generateReport(filters: any): Promise<SummaryRow[]> {
    const res = await api.post<any>(SUMMARY_URL, filters)
    const raw = res.data?.data ?? res.data
    return Array.isArray(raw) ? raw : []
  }

  async downloadXlsx(filters: any): Promise<Blob> {
    const res = await api.post(XLSX_URL, filters, { responseType: 'blob' })
    return res.data
  }

  async loadAttributeItems(
    attributeFlatNameId: string,
    moduleFlatNameId: string,
  ): Promise<AttributeOption[]> {
    const res = await api.get<any>(
      `${ATTRIBUTE_URL}/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`,
    )
    const raw = res.data?.data ?? res.data
    const attrs = Array.isArray(raw) ? raw : raw?.attributes ?? []
    const items =
      Array.isArray(attrs) && attrs.length > 0 && attrs[0]?.items
        ? attrs[0].items
        : attrs
    return (Array.isArray(items) ? items : []).map((item: any) => ({
      value: item.attributeItemId ?? item.attribute_item_id,
      label: item.name,
    }))
  }
}

export const fuelWeekSummaryApi = new FuelWeekSummaryApi()
