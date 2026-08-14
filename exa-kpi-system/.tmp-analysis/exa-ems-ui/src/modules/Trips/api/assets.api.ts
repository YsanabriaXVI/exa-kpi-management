import apiClient from '../../../services/api/axios.config'
import type { Asset } from '../types'

const adminHeaders = {
  headers: {
    'Route-Type': 'admin',
  },
}

export const MODULE_CHASSIS = 24
export const MODULE_GENSET = 25

class AssetsAPI {
  /**
   * Get assets with attributes by module ID
   * Used for fetching Gensets and Chassis
   */
  async getAssetNamesAttributes(moduleId: number): Promise<Asset[]> {
    const response = await apiClient.get<any>(`/assets/${moduleId}/attributes`, adminHeaders)
    // Response structure: { data: { assets: [...] } }
    const assets = response.data?.data?.assets || response.data?.assets || []

    return assets.map((item: any) => ({
      id: item.asset_id,
      ...item.attributes,
      // Map specific fields if needed, but attributes usually contain the data
      // For Chassis: chassis_no, plate
      // For Genset: genset_no
    }))
  }
}

export const assetsAPI = new AssetsAPI()
