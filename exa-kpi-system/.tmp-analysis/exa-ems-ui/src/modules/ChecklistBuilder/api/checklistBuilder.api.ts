import apiClient from '../../../services/api/axios.config'
import { ChecklistBuilderOverviewRow, ChecklistForm, EquipmentType, EquipmentSize, Depot } from '../types'

/* ------------ Types (adjust to your domain types as you firm them up) ------------ */

export type Id = string | number

export type AttributeItem = any

export type ChecklistSection = {
  name: string
  id: Id | null
  instruction: string
  checkListSectionId?: Id
  [key: string]: any
}

export type ChecklistPart = {
  name: string
  id: Id
  checkListEquipmentId?: Id
  sections: ChecklistSection[]
  [key: string]: any
}

export type LoadChecklistsResponse = {
  list: ChecklistBuilderOverviewRow[]
  total: number
}

export type LoadChecklistResponse = {
  checklist: ChecklistForm
}

export type SaveChecklistResponse = {
  checklist: ChecklistForm
}

export type AddChecklistResponse = {
  checklist: any // often API returns record; type it when you have it
}

/* ---------------- Service ---------------- */

export class ChecklistBuilderAPI {
  /** JS: getDefaultChecklist() */
  getDefaultChecklist(): ChecklistForm {
    return {
      equipmentTypeId: null,
      gensetTypeId: null,
      sizeEquipmentId: null,
      ownedEquipment: 0,
      defaultConfig: 0,
      clientIds: [],
      depotIds: [],
      part: {},
      parts: [],
    }
  }

  /** JS: loadAttributeItems(...) */
  async loadAttributeItems(
    attributeFlatNameId: string,
    moduleFlatNameId: string
  ): Promise<AttributeItem[]> {
    const { data } = await apiClient.get<AttributeItem[]>(
      `/attribute-service/attributes/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`
    )
    return data
  }

  /** JS: _fixList(list) */
  private _fixList(list: ChecklistBuilderOverviewRow[]): ChecklistBuilderOverviewRow[] {
    const listClone = list.map((obj) => ({ ...obj }))

    listClone.forEach((elem: any) => {
      elem.equipmentSizeType = elem.sizeEquipmentdId
        ? `${elem.equipmentTypedId.equipmentName}, ${elem.sizeEquipmentdId.sizeType}`
        : `${elem.equipmentTypedId.equipmentName}, ${elem.gensetTypedId.name}`

      const manyDepots = elem.linked_depots.length > 1
      const manyClients = elem.linked_clients.length > 1

      elem.depots = ''
      elem.clients = ''
      elem.createdBy = ''
      elem.isDefaultConfig = ''
      elem.isOwnedEquipment = ''

      elem.linked_depots.forEach((depot: any) => {
        const depotName = depot?.depotdId?.depotName
        if (!depotName) return
        elem.depots = manyDepots ? (elem.depots ? `${elem.depots}, ${depotName}` : depotName) : depotName
      })

      elem.linked_clients.forEach((client: any) => {
        const clientName = client?.clientdId?.name
        if (!clientName) return
        elem.clients = manyClients ? (elem.clients ? `${elem.clients}, ${clientName}` : clientName) : clientName
      })

      elem.createdBy = `${elem.createdUser?.firstName ?? ''} ${elem.createdUser?.lastName ?? ''}`.trim()
      elem.isDefaultConfig = elem.defaultConfig ? 'Yes' : 'No'
      elem.isOwnedEquipment = elem.ownedEquipment ? 'Yes' : 'No'
      elem.gateType = elem.gateTypedId?.name
    })

    return listClone
  }

  /** Your existing pattern: loadCheckLists() -> returns list + total (no dispatch) */
  async loadCheckLists(): Promise<LoadChecklistsResponse> {
    const { data } = await apiClient.get<ChecklistBuilderOverviewRow[]>('/checklist-builder-service')

    // JS sorted desc by checkListBuilderId
    const sorted = [...data].sort(
      (a: any, b: any) => Number(b.checkListBuilderId) - Number(a.checkListBuilderId)
    )

    const fixedResponse = this._fixList(sorted)

    return { list: fixedResponse, total: fixedResponse.length }
  }

  /** JS: _fixChecklist(checklist) */
  private _fixChecklist(checklist: any): ChecklistForm {
    const checklistClone: ChecklistForm = { ...checklist }

    const clientIds: Id[] = []
    const depotIds: Id[] = []
    const addedParts: Id[] = []

    checklistClone.linked_clients?.forEach((client: any) => clientIds.push(client.clientId))
    checklistClone.linked_depots?.forEach((depot: any) => depotIds.push(depot.depotId))

    checklistClone.clientIds = clientIds
    checklistClone.depotIds = depotIds
    checklistClone.parts = []
    checklistClone.part = {}

    checklistClone.linked_sections?.forEach((section: any) => {
      const partId: Id = section.partSectiondId?.EquipmentPartdId?.equipmentPartId
      const partName: string = section.partSectiondId?.EquipmentPartdId?.partName
      const code: string = section.partSectiondId?.code
      const partSectionId: Id = section.partSectionId
      const instruction: string = section.instruction
      const checkListSectionId: Id = section.checkListSectionId

      const linked = checklistClone.linked_parts?.find((p: any) => p.equipmentPartId === partId)
      const checkListEquipmentId: Id | undefined = linked?.checkListEquipmentId

      if (!addedParts.includes(partId)) {
        addedParts.push(partId)
        checklistClone.parts.push({
          name: partName,
          id: partId,
          checkListEquipmentId,
          sections: [
            {
              name: code,
              id: partSectionId,
              instruction,
              checkListSectionId,
            },
          ],
        })
      } else {
        const index = checklistClone.parts.findIndex((p) => p.id === partId)
        checklistClone.parts[index].sections.push({
          name: code,
          id: partSectionId,
          instruction,
          checkListSectionId,
        })
      }
    })

    return checklistClone
  }

  /** JS: loadChecklist(id) */
  async loadChecklist(id: Id): Promise<LoadChecklistResponse> {
    const { data } = await apiClient.get<any>(`/checklist-builder-service/${id}`)
    const fixedChecklist = this._fixChecklist(data)
    return { checklist: fixedChecklist }
  }

  /** JS: _fixForm(form) */
  private _fixForm(form: ChecklistForm) {
    const equipmentPartsIds: Id[] = []
    const sectionPartsIds: (Id | null)[] = []
    const instruction: string[] = []
    const checkListSectionIds: (Id | undefined)[] = []

    form.parts.forEach((part) => {
      equipmentPartsIds.push(part.id)
      part.sections.forEach((section) => {
        sectionPartsIds.push(section.id)
        instruction.push(section.instruction)
        checkListSectionIds.push(section.checkListSectionId)
      })
    })

    return {
      ...form,
      equipmentPartsIds,
      sectionPartsIds,
      checkListSectionIds,
      instruction,
      equipmentTypeId: form.equipmentTypeId !== null ? Number(form.equipmentTypeId) : null,
      gensetTypeId: form.gensetTypeId !== null ? Number(form.gensetTypeId) : null,
      gateTypeId: form.gateTypeId !== undefined ? Number(form.gateTypeId) : undefined,
      sizeEquipmentId: form.sizeEquipmentId !== null ? Number(form.sizeEquipmentId) : null,
    }
  }

  /** JS: addChecklist(form) */
  async addChecklist(form: ChecklistForm): Promise<AddChecklistResponse> {
    const fixedForm = this._fixForm(form)
    const { data } = await apiClient.post<any>('/checklist-builder-service', fixedForm)
    return { checklist: data }
  }

  /** JS: saveChecklist(form) */
  async saveChecklist(form: ChecklistForm): Promise<SaveChecklistResponse> {
    if (!form.checkListBuilderId) {
      throw new Error('checkListBuilderId is required to saveChecklist')
    }

    const fixedForm = this._fixForm(form)
    const { data } = await apiClient.put<any>(
      `/checklist-builder-service/${form.checkListBuilderId}`,
      fixedForm
    )

    // old code fixed checklist after save
    const fixedChecklist = this._fixChecklist(data)
    return { checklist: fixedChecklist }
  }

  /** JS: deleteChecklist(id) */
  async deleteChecklist(id: number): Promise<void> {
    console.log('api deleteChecklist', id)
    await apiClient.delete(`/checklist-builder-service/${id}`)
  }

  async loadEquipmentTypes(): Promise<{ equipmentTypesList: EquipmentType[] }> {
    const { data } = await apiClient.get<EquipmentType[]>('/equipment-service');
    return {
      equipmentTypesList: data
    }
  }

  async loadEquipmentSizesList(): Promise<{ equipmentSizesList: EquipmentSize[] }> {
    const { data } = await apiClient.get<EquipmentSize[]>('/equipment-service/size');
    return {
      equipmentSizesList: data
    }
  }

  async loadDepotsList(): Promise<{ depotsList: Depot[] }> {
    const { data } = await apiClient.get<Depot[]>('/depot-service');
    return {
      depotsList: data
    }
  }

}

export const checklistBuilderAPI = new ChecklistBuilderAPI()
