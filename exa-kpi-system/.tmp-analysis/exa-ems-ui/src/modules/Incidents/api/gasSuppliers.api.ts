import apiClient from '../../../services/api/axios.config'

export interface GasSupplierOption {
  value: string
  label: string
}

const normalizeGasSupplier = (raw: any): GasSupplierOption | null => {
  if (!raw) return null
  const id = raw.gasStationsParentId ?? raw.gasSupplierId ?? raw.id
  const name = raw.name ?? raw.company?.name
  if (!id || !name) return null
  return {
    value: String(id),
    label: String(name),
  }
}

export const gasSuppliersAPI = {
  async getGasSuppliers(): Promise<GasSupplierOption[]> {
    // Legacy endpoint used by incidents form to populate gas supplier dropdown.
    const response = await apiClient.get('/stations-service/gasStationsParent')
    const payload = response?.data ?? []
    if (!Array.isArray(payload)) return []
    return payload
      .map(normalizeGasSupplier)
      .filter(Boolean) as GasSupplierOption[]
  },
}
