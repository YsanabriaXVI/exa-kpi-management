// src/modules/MaterialTypes/api/equipmentTypes.api.ts
import api from '../../../services/api/axios.config'

export interface EquipmentType {
  equipmentTypeId: number
  equipmentName: string
  description: string | null
  createUser: number
  createDate: string
  updateUser: number
  updateDate: string
  company: number
  active: number
  status: number
}

/**
 * API client para Equipment Types (usado por MaterialTypes)
 */
class EquipmentTypesApi {
  /**
   * GET /equipment-service
   */
  async loadEquipmentTypes(): Promise<{ equipmentTypesList: EquipmentType[] }> {
    const { data } = await api.get<EquipmentType[]>('/equipment-service')
    return { equipmentTypesList: data }
  }
}

export const equipmentTypesApi = new EquipmentTypesApi()
