// src/modules/MaterialTypes/api/materialTypes.api.ts
import api from '../../../services/api/axios.config'
import type { MaterialType, MaterialTypeForm } from '../types/materialTypes.types'

const MATERIAL_BASE_URL = '/material-service'

class MaterialTypesApi {
  private mapFormToPayload(form: MaterialTypeForm) {
    return {
      name: form.name,
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
   * GET /material-service
   */
  async fetchMaterialTypes(): Promise<MaterialType[]> {
    const res = await api.get<MaterialType[]>(MATERIAL_BASE_URL)
    const list = res.data ?? []

    // mismo comportamiento legacy: ordenar desc por id
    list.sort((a, b) => (b.materialId ?? 0) - (a.materialId ?? 0))
    return list
  }

  /**
   * GET /material-service/:id
   * (si el backend no lo soporta, lo resolvemos en el slice con fallback a list)
   */
  async fetchMaterialById(id: number): Promise<MaterialType> {
    const res = await api.get<MaterialType>(`${MATERIAL_BASE_URL}/${id}`)
    return res.data
  }

  /**
   * POST /material-service
   */
  async createMaterial(form: MaterialTypeForm): Promise<MaterialType> {
    const payload = this.mapFormToPayload(form)
    const res = await api.post<MaterialType>(MATERIAL_BASE_URL, payload)
    return res.data
  }

  /**
   * PUT /material-service/:id
   */
  async updateMaterial(id: number, form: MaterialTypeForm): Promise<MaterialType> {
    const payload = this.mapFormToPayload(form)
    const res = await api.put<MaterialType>(`${MATERIAL_BASE_URL}/${id}`, payload)
    return res.data
  }

  /**
   * DELETE /material-service/:id
   */
  async deleteMaterial(id: number): Promise<void> {
    await api.delete(`${MATERIAL_BASE_URL}/${id}`)
  }
}

export const materialTypesApi = new MaterialTypesApi()