// src/modules/ItemTypes/api/itemTypes.api.ts
import api from '../../../services/api/axios.config'
import type { ItemType, ItemTypeForm } from '../types/itemTypes.types'

const ITEM_TYPES_BASE_URL = '/item-type-service'

class ItemTypesApi {
  private mapFormToPayload(form: ItemTypeForm) {
    return {
      ISOCode: form.ISOCode,
      description: form.description,
      // En legacy no venían, pero otros módulos sí los mandan; los dejamos seguros
      status: form.status ?? 1,
      active: form.active ?? 1,
    }
  }

  async fetchItemTypes(): Promise<ItemType[]> {
    const res = await api.get<ItemType[]>(ITEM_TYPES_BASE_URL)
    const list = res.data ?? []

    // igual al sort legacy: desc por itemTypeId
    list.sort((a, b) => {
      if (a.itemTypeId < b.itemTypeId) return 1
      if (a.itemTypeId > b.itemTypeId) return -1
      return 0
    })

    return list
  }

  async createItemType(form: ItemTypeForm): Promise<ItemType> {
    const payload = this.mapFormToPayload(form)
    const res = await api.post<ItemType>(ITEM_TYPES_BASE_URL, payload)
    return res.data
  }

  async updateItemType(form: ItemTypeForm): Promise<ItemType> {
    if (!form.itemTypeId) {
      throw new Error('itemTypeId is required to update an item type')
    }
    const payload = this.mapFormToPayload(form)
    const res = await api.put<ItemType>(
      `${ITEM_TYPES_BASE_URL}/${form.itemTypeId}`,
      payload,
    )
    return res.data
  }

  async deleteItemType(id: number): Promise<void> {
    await api.delete(`${ITEM_TYPES_BASE_URL}/${id}`)
  }
}

export const itemTypesApi = new ItemTypesApi()
