import apiClient from 'src/services/api/axios.config'
import type {
  GateForm,
  GateListRow,
  GateRecord,
  ChecklistBuilder,
  DriverRecord,
  TripRecord,
  HaulageTypeRecord,
  TiresGateData,
  GateImagesFlatInfo
} from '../types'

import { v4 as uuidv4 } from "uuid";
import { buildGateFormData } from '../helpers/buildGateFormData';

/**
 * Gates API client
 * - Keeps backend normalization/mapping here (legacy _fixGatesListData/_fixForm moved from actions)
 */
class GatesAPI {
  private stripBase64Prefix(value: string | null | undefined): string | null {
    if (!value) return null
    return value.replace('data:image/png;base64,', '')
  }

  /** Legacy list normalization: flattens gateDetails into rows for the table */
  private normalizeList(list: any[]): GateListRow[] {
    const fixed = (list ?? []).flatMap((gate: any) =>
      (gate?.gateDetails ?? []).map((detail: any) => ({
        gateId: gate.gateId,
        gateDetailId: detail.gateDetailId,
        depotId: gate.depotId ?? null,
        requestId: gate.requestId ?? null,
        ownedEquipment: detail?.ownedEquipment === 1 ? 'Yes' : 'No',
        equipmentTypeId: detail?.equipmentTypedId?.equipmentName ?? '', // legacy used equipment name here
        equipmentId: detail?.equipmentId ?? null,
        clientId: detail?.clientId ?? null,
        gateType: gate?.gateTypedId?.name ?? '',
        truckId: gate?.truckId ?? null,
        tripId: gate?.tripId ?? null,
        createDate: gate?.createDate ?? null,
      }))
    )
    return fixed
  }

  /** Legacy form mapping: coerces ids to ints, maps damage fields, strips base64 prefixes */
  private toBackendPayload(form: GateForm): any {
    const allowedEquipmentTypeIds = [2, 1, 3] // container, chassis, genset (legacy)
    const filteredGateDetails = (form.gateDetails ?? []).filter((d) =>
      allowedEquipmentTypeIds.includes(Number(d.equipmentTypeId))
    )

    return {
      gateId: form.gateId || null,
      depotId: form.depotId != null ? Number(form.depotId) : null,
      gateTypeId: form.gateTypeId != null ? Number(form.gateTypeId) : null,
      gateDetails: filteredGateDetails.map((detail: any) => ({
        equipmentTypeId: detail.equipmentTypeId != null ? Number(detail.equipmentTypeId) : null,
        equipmentId: detail.equipmentId != null ? Number(detail.equipmentId) : null,
        clientId: detail.clientId != null ? Number(detail.clientId) : null,
        subdivisionId: detail.subdivisionId != null ? Number(detail.subdivisionId) : null,
        sizeEquipmentId: detail.sizeEquipmentId != null ? Number(detail.sizeEquipmentId) : null,
        remarks: detail.remarks || '',
        gensetTypeId: detail.gensetTypeId != null ? Number(detail.gensetTypeId) : null,
        fuelLevel: detail.fuelLevel ?? null,
        engineHours: detail.engineHours ?? null,
        haulage: detail.haulage != null ? Number(detail.haulage) : null,
        loaded: detail.loaded ?? 0,
        tiresData: detail.tiresData ?? null,
        gateDamageData: (detail.gateDamageData ?? []).map((damage: any) => {
          // legacy UI used partId + sectionId; backend expects equipmentPartId + partSectionId
          const { sectionId, partId, ...rest } = damage
          return {
            ...rest,
            equipmentPartId: partId ?? damage.equipmentPartId ?? null,
            partSectionId: sectionId ?? damage.partSectionId ?? null,
          }
        }),
        gateChecklistData: [detail.gateChecklistData] || [],
        ownedEquipment: detail.ownedEquipment != null ? Number(detail.ownedEquipment) : 0,
      })),
      requestId: form.requestId != null ? Number(form.requestId) : null,
      truckId: form.truckId != null ? Number(form.truckId) : null,
      driverId: form.driverId != null ? Number(form.driverId) : null,
      tripId: form.tripId != null ? Number(form.tripId) : null,
      subdivisionId: form.subdivisionId != null ? Number(form.subdivisionId) : null,
      signatureDriver: this.stripBase64Prefix(form.signatureDriver),
      signatureInspector: this.stripBase64Prefix(form.signatureInspector),
      gateIdTemp: form.gateIdTemp || null,
    }
  }

  async loadList() {
    const { data } = await apiClient.get<any[]>('/gates-service')
    const list = this.normalizeList(data ?? [])
    return { list, total: list.length }
  }

  async loadGateInList() {
    const payload = { gateTypeId: 1492, status: 1 }
    const { data } = await apiClient.post<any>('/gates-service/filtered', payload)
    const list = this.normalizeList(data ?? [])
    return { list, total: list.length }
  }

  async loadGateOutList() {
    const payload = { gateTypeId: 1493, status: 1 }
    const { data } = await apiClient.post<any>('/gates-service/filtered', payload)
    const list = this.normalizeList(data ?? [])
    return { list, total: list.length }
  }

  async loadOne(id: number) {
    const { data } = await apiClient.get<Partial<GateRecord>>(`/gates-service/${id}`)
    console.log('loadOne', data);
    if ("requestdId" in data && data.requestdId != null) {
      data.equipmentRequestId = data.requestdId.equipmentRequestId;
    }
    return { gate: data }
  }

  /* async create(form: GateForm) {
    const payload = this.toBackendPayload(form)
    const { data } = await apiClient.post<GateRecord>('/gates-service', payload)
    return { gate: data }
  } */

  async create(form: GateForm) {
  const payload = this.toBackendPayload(form);

  const formData = buildGateFormData(payload);

  console.log("payload json:", formData.get("payload"));

  const { data } = await apiClient.post<GateRecord>(
    "/gates-service",
    formData,
    {
      // DO NOT set Content-Type manually; axios will set the multipart boundary
      headers: { "Content-Type": "multipart/form-data" },
    } 
  );

  return { gate: data };
}

  async update(id: number, form: GateForm) {
    const payload = this.toBackendPayload(form)
    const { data } = await apiClient.put<GateRecord>(`/gates-service/${id}`, payload)
    return { gate: data }
  }

  async delete(id: number) {
    await apiClient.delete(`/gates-service/${id}`)
    return { id }
  }

  /** Checklist builder endpoint is param-segment based (legacy behavior). */
  async loadChecklist(params: {
    clientId: number | null
    depotId: number | null
    gateId: number | null
    equipmentType: number | null
    equipmentSizeId: number | null
    ownedEquipment: number | 0 | 1
  }): Promise<{ checkListBuilder: ChecklistBuilder; currentEquipmentTypeId: number | null }> {
    let url = '/checklist-builder-service'
    const owner = params.ownedEquipment === 1 ? 1 : 0

    if (params.clientId !== null) url += `/${params.clientId}`
    if (params.depotId !== null) url += `/${params.depotId}`
    if (params.gateId !== null) url += `/${params.gateId}`
    if (params.equipmentType !== null) url += `/${params.equipmentType}`
    if (params.equipmentSizeId !== null) url += `/${params.equipmentSizeId}`
    if (owner !== null) url += `/${owner}`

    const { data } = await apiClient.get<any>(url)
    return { checkListBuilder: data, currentEquipmentTypeId: params.equipmentType }
  }

  async loadAttributeItems(attributeFlatNameId: string | number, moduleFlatNameId: string | number) {
    const url = `/attribute-service/attributes/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`
    const { data } = await apiClient.get<any>(url)
    return { items: data }
  }

  async uploadDamageImage(gateIdTemp: string, file: File) {
    const formData = new FormData()
    formData.append('damageImage', file)
    const { data } = await apiClient.post<any>(
      `/gates-service/upload-image-damage?gateIdTemp=${encodeURIComponent(gateIdTemp)}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return { image: data }
  }

  async deleteDamageImage(imageId: number, gateIdTemp: string) {
    await apiClient.delete(`/gates-service/delete-image-damage/${imageId}/${gateIdTemp}`)
    return { imageId }
  }

  async checkTireData(id: number, gateTypeId: number, chassisId: number): Promise<{ tiresGate: TiresGateData }> {
    const { data } = await apiClient.get<any>(`/gates-service/check-tire-data/${id}/${gateTypeId}/${chassisId}`)
    return { tiresGate: data }
  }

  async loadDriver(driverId: number): Promise<{ driver: DriverRecord }> {
    const { data } = await apiClient.get<any>(`/assets-service/${driverId}`)
    return { driver: data }
  }

  async loadHaulageType(params: {
    clientId: number
    tripClientId: number
    depotId: number
    gateTypeId: number
    containerSizeId: number
  }): Promise<{ haulage: HaulageTypeRecord }> {
    const { data } = await apiClient.get<any>(
      `/gates-service/get-haulage-type/${params.clientId}/${params.tripClientId}/${params.depotId}/${params.gateTypeId}/${params.containerSizeId}`
    )
    return { haulage: data }
  }

  async loadLastTruckTrip(truckId: number): Promise<{ trip: TripRecord }> {
    const { data } = await apiClient.get<any>(`/gates-service/last-truck-trip/${truckId}`)
    return { trip: data }
  }

  async loadTrip(tripId: number): Promise<{ trip: TripRecord }> {
    const { data } = await apiClient.get<any>(`/gates-service/last-trip/${tripId}`)
    return { trip: data }
  }

  async createOtherAsset(data: any): Promise<any> {
    const response = await apiClient.post<any>('/assets-service', data)
    return response;
  }

  async createAssetAndRelatedAsset(data: any): Promise<any> {
    const response = await apiClient.post<any>('/assets-service/related-assets', data)
    return response;
  }

  async downloadGatePDF(id: number | string): Promise<void> {
    const response = await apiClient.get(`/gates-service/gate-pdf/${id}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `gate_${id}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  async loadGateImage(id: number, key: string): Promise<any | null> {
      try {
  
        const v = Date.now(); 
  
        const res = await apiClient.get<Blob>(
          `/gates-service/depot-images/${id}`,
          {
            params: { v },
            responseType: "blob",   
            validateStatus: (status) => status < 500 
          }
        );
  
        // Handle no-image case
        if (res.status === 404) {
          return null;
        }
  
        // Handle error case
        if (res.status < 200 || res.status >= 300) {
          let text = "";
          try {
            text = await res.data.text();
          } catch {}
          throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
        }
  
        // axios gives us the Blob directly as res.data
        const blob = res.data;
        const contentType = res.headers["content-type"] || blob.type || "image/png";
        const lastModified = res.headers["last-modified"] ?? null;
  
        // Create a browser URL from the blob
        const objectUrl = URL.createObjectURL(blob);
  
        // Build response structure
        const image: any = {
          control_id: uuidv4(),
          attachment_id: id,
          name: key,
          type: contentType,
          url: objectUrl,
          lastModified
        };
  
        return image;
  
      } catch (error) {
        console.error("Failed to load gate image", error);
        return null;
      }
  }

  async loadGateImagesData (id: number): Promise<any> {
    const { data } = await apiClient.get<GateImagesFlatInfo>(`/gates-service/gates/${id}/images`)
    return { info : data }
  }
}

export const gatesAPI = new GatesAPI()
