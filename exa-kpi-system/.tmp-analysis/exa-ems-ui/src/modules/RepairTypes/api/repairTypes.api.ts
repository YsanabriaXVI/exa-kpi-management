// src/modules/RepairTypes/api/repairTypes.api.ts
import api from '../../../services/api/axios.config'
import type { RepairType, RepairTypeForm } from '../types/repairTypes.types'

const REPAIR_BASE_URL = '/repair-types-service'

class RepairTypesApi {
  private mapFormToPayload(form: RepairTypeForm) {
    return {
      equipmentTypeId: form.equipmentTypeId
        ? parseInt(String(form.equipmentTypeId), 10)
        : undefined,
      repairName: form.repairName,
      description: form.description,
      internalCode: form.internalCode,
      ISOCode: form.ISOCode,
      status: form.status ?? 1,
      active: form.active ?? 1,
    }
  }

  async fetchRepairTypes(): Promise<RepairType[]> {
    const res = await api.get<RepairType[]>(REPAIR_BASE_URL)
    const list = res.data ?? []

    // igual al sort legacy: desc por id
    list.sort((a, b) => {
      if (a.repairTypesId < b.repairTypesId) return 1
      if (a.repairTypesId > b.repairTypesId) return -1
      return 0
    })

    return list
  }

  async createRepairType(form: RepairTypeForm): Promise<RepairType> {
    const payload = this.mapFormToPayload(form)
    const res = await api.post<RepairType>(REPAIR_BASE_URL, payload)
    return res.data
  }

  async updateRepairType(form: RepairTypeForm): Promise<RepairType> {
    if (!form.repairTypesId) {
      throw new Error('repairTypesId is required to update a repair type')
    }
    const payload = this.mapFormToPayload(form)
    const res = await api.put<RepairType>(
      `${REPAIR_BASE_URL}/${form.repairTypesId}`,
      payload,
    )
    return res.data
  }

  async deleteRepairType(id: number): Promise<void> {
    await api.delete(`${REPAIR_BASE_URL}/${id}`)
  }
}

export const repairTypesApi = new RepairTypesApi()
