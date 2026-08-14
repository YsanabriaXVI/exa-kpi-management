import api from '../../../../services/api/axios.config'
import type {
  UploadSession,
  ReconciliationTransaction,
  ValidateReconciliationPayload,
  ProcessReconciliationPayload,
  ReconciliationSessionData,
} from '../types/fuelOrderReconciliation.types'

const BASE_URL = '/fuel-service/reconciliations'
const GST_URL = '/fuel-service/gas-station-transaction'

class FuelOrderReconciliationApi {
  async fetchList(): Promise<UploadSession[]> {
    const res = await api.get<any>(BASE_URL)
    const raw = res.data?.data ?? res.data ?? []
    const list = Array.isArray(raw) ? raw : []
    return list.map((r: any) => ({
      ...r,
      gasStationName:
        r.gasSupplier?.name ?? r.gasStation?.name ?? r.GasStation?.name ?? r.gasStationName ?? '',
      createdByName: r.CreatedBy
        ? `${r.CreatedBy.firstName ?? ''} ${r.CreatedBy.lastName ?? ''}`.trim()
        : '',
    }))
  }

  async fetchById(uploadSessionId: number): Promise<ReconciliationSessionData> {
    const res = await api.get<any>(`${BASE_URL}/${uploadSessionId}`)
    const raw = res.data?.data ?? res.data
    return {
      reconciliationData: raw?.reconciliationData ?? raw?.transactions ?? [],
      gasStationId:
        raw?.gasStationsId ??
        raw?.gasStationId ??
        raw?.gasSupplierId ??
        raw?.gasSupplier?.gasStationsId ??
        null,
      gasStationName:
        raw?.gasStationName ??
        raw?.gasSupplier?.name ??
        raw?.GasStation?.name ??
        '',
      uploadSessionId: raw?.uploadSessionId ?? uploadSessionId,
      uploadDate: raw?.uploadDate ?? raw?.createdAt,
      totalTransactions: raw?.totalTransactions ?? 0,
      matchedTransactions: raw?.matchedTransactions ?? 0,
      unmatchedTransactions: raw?.unmatchedTransactions ?? 0,
    }
  }

  async validateData(
    payload: ValidateReconciliationPayload,
  ): Promise<ReconciliationTransaction[]> {
    const res = await api.post<any>(`${BASE_URL}/validate`, {
      data: payload.data,
      gasStationId: payload.gasStationId,
    })
    return res.data?.data ?? res.data ?? []
  }

  async processReconciliation(
    payload: ProcessReconciliationPayload,
  ): Promise<any> {
    const res = await api.post<any>(`${BASE_URL}/process`, {
      data: payload.data,
      gasStationId: payload.gasStationId,
    })
    return res.data
  }

  async deleteUploadSession(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`)
  }

  async deleteGasStationTransaction(id: number): Promise<void> {
    await api.delete(`${GST_URL}/delete/${id}`)
  }
}

export const fuelOrderReconciliationApi = new FuelOrderReconciliationApi()
