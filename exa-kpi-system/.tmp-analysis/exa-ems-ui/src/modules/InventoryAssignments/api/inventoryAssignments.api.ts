import apiClient from '../../../services/api/axios.config'

const unwrap = (response: any) => response?.data ?? response
const getPayloadAssets = (payload: any) => payload?.data?.assets ?? payload?.assets ?? payload
const getAssetPayload = (payload: any) => payload?.data?.asset ?? payload?.asset ?? payload

export const inventoryAssignmentsAPI = {
  getInventory: async () => {
    const response = await apiClient.get('/assets/inventory', { headers: { 'Route-Type': 'admin' } })
    const payload = unwrap(response)
    const assets = getPayloadAssets(payload)
    return Array.isArray(assets) ? assets : []
  },
  getInternalSupplierItems: async () => {
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
  updateAssetAttribute: async (
    moduleId: number | string,
    assetId: number | string,
    attributeId: number | string,
    value: string | number | null,
  ) => {
    const body = {
      asset_id: assetId,
      attributes: {
        [attributeId]: value,
      },
    }
    const response = await apiClient.put(`/assets/${moduleId}/${assetId}`, body, {
      headers: { 'Route-Type': 'admin' },
    })
    const payload = unwrap(response)
    return getAssetPayload(payload)
  },
}
