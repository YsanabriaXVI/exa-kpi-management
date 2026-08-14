import apiClient from '../../../services/api/axios.config'
import type { TruckInternalSupplier } from '../types.v2'

export interface TruckInternalSupplierRow {
  asset_id: number
  truck_label: string | null
  subdivision_id: number | null
  internal_supplier_id: number | null
  internal_supplier_name: string | null
}

export interface InternalSupplierItem {
  value: string
  label: string
  subdivision_id: number | null
}

export interface StatementInternalSupplierRow {
  statement_id: number
  internal_supplier_id: string | null
  internal_supplier_name: string | null
  trips: number
}

const unwrap = (response: any) => response?.data ?? response

/**
 * PHP-API (legacy `/api`) calls used by the Payments module. Kept separate from
 * paymentCoreApi, which targets the payment-core service.
 */
export const paymentsAssetsApi = {
  getTruckInternalSuppliers: async (
    subdivisionIds: Array<string | number>,
  ): Promise<TruckInternalSupplierRow[]> => {
    const response = await apiClient.get('/assets/truck-internal-suppliers', {
      headers: { 'Route-Type': 'admin' },
      params: { subdivision_ids: subdivisionIds.join(',') },
    })
    const payload = unwrap(response)
    const rows = payload?.data?.trucks ?? payload?.trucks ?? payload?.data ?? payload
    return Array.isArray(rows) ? (rows as TruckInternalSupplierRow[]) : []
  },

  getInternalSupplierItems: async (): Promise<InternalSupplierItem[]> => {
    const response = await apiClient.get('/attributes/136/items', { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const items =
      payload?.attribute_items ?? payload?.data?.attribute_items ?? payload?.items ?? payload?.data ?? payload
    return Array.isArray(items)
      ? items.map((item: any) => ({
          value: String(item.attribute_item_id ?? item.id ?? ''),
          label: item.name || item.value || `Item #${item.attribute_item_id ?? item.id}`,
          subdivision_id: item.subdivision_id != null ? Number(item.subdivision_id) : null,
        }))
      : []
  },

  getStatementInternalSuppliers: async (
    statementIds: Array<string | number>,
  ): Promise<StatementInternalSupplierRow[]> => {
    const response = await apiClient.get('/statements/internal-suppliers', {
      headers: { 'Route-Type': 'admin' },
      params: { statement_ids: statementIds.join(',') },
    })
    const payload = unwrap(response)
    const rows = payload?.data?.statements ?? payload?.statements ?? payload?.data ?? payload
    return Array.isArray(rows) ? (rows as StatementInternalSupplierRow[]) : []
  },
}

export const mapTruckInternalSuppliers = (rows: TruckInternalSupplierRow[]): TruckInternalSupplier[] =>
  rows.map((row) => ({
    truckId: String(row.asset_id),
    truckLabel: row.truck_label ?? undefined,
    subdivisionId: row.subdivision_id != null ? String(row.subdivision_id) : null,
    internalSupplierId: row.internal_supplier_id != null ? String(row.internal_supplier_id) : null,
    internalSupplierName: row.internal_supplier_name,
  }))
