import apiClient from 'src/services/api/axios.config'
import {
  AttributeItem,
  Client,
  EquipmentRequirement,
  EquipmentRequestForm,
  EquipmentRequestListRow,
  EquipmentSize,
  Trip,
} from '../types'
import { PLACEHOLDER } from '../components/feConstants'
import DateFormatter from '../../../helpers/IsoDateFormatter'

type ApiListResult<T> = { list: T[]; total: number }

type BackendRequest = {
  equipmentRequestId?: number | null
  clientId: number | null
  workOrderId: number | null
  requestTypeId: number | null
  referenceNumberBooking: string | null
  consignee?: string | null
  vesselCode?: string | null
  voyage?: string | null
  comments?: string | null
  requirements: EquipmentRequirement[]
  [key: string]: any
}

class EquipmentRequestAPI {
  private fixRequirementLabels(requirements: EquipmentRequirement[]): EquipmentRequirement[] {
    const cloned = requirements.map((r) => ({ ...r }))
    cloned.forEach((r) => {
      r.containerlabel = r.containerSizeId == null ? null : r.containerSize?.sizeType ?? ''
      r.chassislabel = r.chassisSizeId == null ? null : r.chassisSize?.sizeType ?? ''
      r.gensetlabel = r.genset == null || r.genset === 0 ? null : 'Yes'
      r.triplabel = r.tripId == null ? null : String(r.tripId)
      r.requestTypelabel = r.equipmentRequest?.requestType?.name ?? ''
      r.clientName = r.equipmentRequest?.client?.name ?? ''
      r.workorderRefNumber = r.equipmentRequest?.workOrder?.workOrderId ?? ''
      r.createDate = DateFormatter(r?.createDate)
      // Some list rows rely on this being present
      if (r.equipmentRequestId == null && (r as any).equipmentRequest?.equipmentRequestId != null) {
        r.equipmentRequestId = (r as any).equipmentRequest.equipmentRequestId
      }
    })
    return cloned
  }

  private fixRequest(raw: BackendRequest): EquipmentRequestForm {
    const { requirements, ...rest } = raw
    const reqs = this.fixRequirementLabels(requirements ?? [])

    reqs.forEach((r) => {
      // When editing, first row uses placeholder semantics in legacy UI
      if (r.triplabel == null) r.triplabel = PLACEHOLDER
      if (r.containerlabel == null && r.containerSizeId == null) r.containerlabel = PLACEHOLDER
      if (r.chassislabel == null && r.chassisSizeId == null) r.chassislabel = PLACEHOLDER
      if (r.gensetlabel == null && (r.genset ?? 0) !== 0) r.gensetlabel = 'Yes'
    })

    return {
      requestDetails: {
        equipmentRequestId: raw.equipmentRequestId ?? null,
        clientId: rest.clientId ?? null,
        workOrderId: rest.workOrderId ?? null,
        requestTypeId: rest.requestTypeId ?? null,
        referenceNumberBooking: rest.referenceNumberBooking ?? null,
        consignee: rest.consignee ?? null,
        vesselCode: rest.vesselCode ?? null,
        voyage: rest.voyage ?? null,
        comments: rest.comments ?? null,
      },
      requirements: reqs,
    }
  }

  async loadRequestsList(): Promise<ApiListResult<EquipmentRequestListRow>> {
    const { data } = await apiClient.get<EquipmentRequestListRow[]>('/request-service')
    const list = [...(data ?? [])].sort((a, b) => (a.equipmentRequestId < b.equipmentRequestId ? 1 : -1))
    return { list, total: list.length }
  }

  async loadUnassignedRequestsList(): Promise<ApiListResult<EquipmentRequestListRow>> {
    const { data } = await apiClient.get<EquipmentRequestListRow[]>('/request-service/unassigned')
    const list = [...(data ?? [])].sort((a, b) => (a.equipmentRequestId < b.equipmentRequestId ? 1 : -1))
    return { list, total: list.length }
  }

  async loadRequirementsList(): Promise<ApiListResult<EquipmentRequirement>> {
    const { data } = await apiClient.get<EquipmentRequirement[]>('/request-service/requirement')
    const sorted = [...(data ?? [])].sort((a, b) => ((a as any).requestId < (b as any).requestId ? 1 : -1))
    const fixed = this.fixRequirementLabels(sorted)
    return { list: fixed, total: fixed.length }
  }

  async loadRequests(): Promise<{ request: EquipmentRequestForm }>{
    const { data } = await apiClient.get<any>(`/request-service`)
    return data;
  }

  async loadRequest(id: number): Promise<{ request: EquipmentRequestForm; workOrderId: number | null }>{
    const { data } = await apiClient.get<BackendRequest>(`/request-service/${id}`)
    const request = this.fixRequest(data)
    return { request, workOrderId: data.workOrderId ?? null }
  }

  async loadTripRequest(workOrderId: number): Promise<{ request: EquipmentRequestForm; workOrderId: number | null }>{
    const { data } = await apiClient.get<BackendRequest>(`/request-service/workorder/${workOrderId}`)
    const request = this.fixRequest(data)
    return { request, workOrderId: data.workOrderId ?? null }
  }

  async loadAssignedTrips(workOrderId: number): Promise<Trip[]> {
    const { data } = await apiClient.get<Trip[]>(`/request-service/requirement/assigned-trips/${workOrderId}`)
    return data ?? []
  }

  async loadRequestTypes(): Promise<AttributeItem[]> {
    const { data } = await apiClient.get<AttributeItem[]>(
      '/attribute-service/attributes/?attribute_flat_name_id=request_type&module_flat_name_id=equipment_request'
    )
    return data ?? []
  }

  async createRequest(form: EquipmentRequestForm): Promise<EquipmentRequestForm> {
    const { data } = await apiClient.post<BackendRequest>('/request-service', form)
    return this.fixRequest(data)
  }

  async updateRequest(form: EquipmentRequestForm): Promise<EquipmentRequestForm> {
    const id = form.requestDetails.equipmentRequestId
    if (!id) throw new Error('Missing equipmentRequestId')
    const { data } = await apiClient.put<BackendRequest>(`/request-service/${id}`, form)
    return this.fixRequest(data)
  }

  async deleteRequest(id: number): Promise<void> {
    await apiClient.delete(`/request-service/${id}`)
  }

  async deleteRequirement(requestId: number): Promise<void> {
    await apiClient.delete(`/request-service/requirement/${requestId}`)
  }
  
}

export const equipmentRequestAPI = new EquipmentRequestAPI()
