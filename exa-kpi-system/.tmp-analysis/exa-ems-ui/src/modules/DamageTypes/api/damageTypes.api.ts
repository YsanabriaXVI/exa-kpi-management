// src/modules/DamageTypes/api/damageTypes.api.ts
import api from '../../../services/api/axios.config'
import type { DamageType, DamageTypeForm } from '../types/damageTypes.types'

const DAMAGE_BASE_URL = '/damage-service'

/**
 * API client para Damage Types
 * Mantiene la lógica de normalización y mapeo de payloads
 */
class DamageTypesApi {
  /**
   * Normaliza el form al payload esperado por el backend
   */
  private mapFormToPayload(form: DamageTypeForm) {
    return {
      damageName: form.damageName,
      description: form.description,
      equipmentTypeId: form.equipmentTypeId
        ? parseInt(String(form.equipmentTypeId), 10)
        : undefined,
      code: form.code,
      isoCode: form.isoCode,
      status: form.status ?? 1,
      active: form.active ?? 1,
    }
  }

  /**
   * GET /damage-service
   */
  async fetchDamageTypes(): Promise<DamageType[]> {
    const res = await api.get<DamageType[]>(DAMAGE_BASE_URL)
    const list = res.data ?? []

    // mismo sort que en React viejo
    list.sort((elem1: any, elem2: any) => {
      if (elem1.materialId < elem2.materialId) return 1
      if (elem1.materialId > elem2.materialId) return -1
      return 0
    })

    return list
  }

  /**
   * POST /damage-service
   */
  async createDamage(form: DamageTypeForm): Promise<DamageType> {
    const payload = this.mapFormToPayload(form)
    const res = await api.post<DamageType>(DAMAGE_BASE_URL, payload)
    return res.data
  }

  /**
   * PUT /damage-service/:id
   */
  async updateDamage(form: DamageTypeForm): Promise<DamageType> {
    if (!form.damageId) {
      throw new Error('damageId is required to update a damage type')
    }

    const payload = this.mapFormToPayload(form)
    const res = await api.put<DamageType>(
      `${DAMAGE_BASE_URL}/${form.damageId}`,
      payload,
    )
    return res.data
  }

  /**
   * DELETE /damage-service/:id
   */
  async deleteDamage(id: number): Promise<void> {
    await api.delete(`${DAMAGE_BASE_URL}/${id}`)
  }
}

/**
 * Exportamos una instancia (patrón usado en otros módulos)
 */
export const damageTypesApi = new DamageTypesApi()
