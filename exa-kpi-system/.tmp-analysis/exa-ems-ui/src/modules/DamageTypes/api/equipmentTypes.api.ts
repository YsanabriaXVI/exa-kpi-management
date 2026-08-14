// src/modules/DamageTypes/api/equipmentTypes.api.ts
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
 * API client para Equipment Types (usado por DamageTypes)
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

/**
 * Exportamos una instancia (patrón uniforme con otros módulos)
 */
export const equipmentTypesApi = new EquipmentTypesApi()
