// src/modules/EquipmentSize/api/equipmentSize.api.ts
import api from '../../../services/api/axios.config'
import type { AxleItem, EquipmentSize, EquipmentSizeForm } from '../types/equipmentSize.types'

class EquipmentSizeApi {
  async fetchSizes(): Promise<EquipmentSize[]> {
    const { data } = await api.get<EquipmentSize[]>('/equipment-service/size')
    return data
  }

  async fetchSizeById(id: number): Promise<EquipmentSize> {
    const { data } = await api.get<EquipmentSize>(`/equipment-service/size/${id}`)
    return data
  }

  async createSize(form: EquipmentSizeForm): Promise<EquipmentSize> {
    const { data } = await api.post<EquipmentSize>('/equipment-service/size', form)
    return data
  }

  async updateSize(form: EquipmentSizeForm): Promise<EquipmentSize> {
    if (!form.sizeEquipmentId) {
      throw new Error('sizeEquipmentId is required to update')
    }
    const { data } = await api.put<EquipmentSize>(
      `/equipment-service/size/${form.sizeEquipmentId}`,
      form,
    )
    return data
  }

  async deleteSize(id: number): Promise<void> {
    await api.delete(`/equipment-service/size/${id}`)
  }

  async fetchAxles(): Promise<AxleItem[]> {
    const { data } = await api.get<any>(
      '/attribute-service/attributes/?attribute_flat_name_id=axis&module_flat_name_id=chassis',
    )

    const candidates =
      data?.attribute_items ??
      data?.data?.attribute_items ??
      data?.items ??
      data?.data?.items ??
      data

    return Array.isArray(candidates) ? candidates : []
  }
}

export const equipmentSizeApi = new EquipmentSizeApi()
