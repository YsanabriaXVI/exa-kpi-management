// src/modules/RepairStatus/api/repairStatus.api.ts

import api from '../../../services/api/axios.config'
import type { RepairStatus } from '../types/repairStatus.types'

const BASE_URL = '/repair-status-service'

/**
 * Obtener lista de Repair Status
 */
export const fetchRepairStatusesApi = async (): Promise<RepairStatus[]> => {
  const { data } = await api.get<RepairStatus[]>(BASE_URL)

  return (data || []).sort((a, b) => {
    if (!a.repairStatusId || !b.repairStatusId) return 0
    return b.repairStatusId - a.repairStatusId
  })
}

/**
 * Crear Repair Status
 */
export const createRepairStatusApi = async (
  payload: RepairStatus,
): Promise<RepairStatus> => {
  const { data } = await api.post<RepairStatus>(BASE_URL, payload)
  return data
}

/**
 * Actualizar Repair Status
 */
export const updateRepairStatusApi = async (
  payload: RepairStatus,
): Promise<RepairStatus> => {
  if (!payload.repairStatusId) {
    throw new Error('repairStatusId is required to update Repair Status')
  }

  const { data } = await api.put<RepairStatus>(
    `${BASE_URL}/${payload.repairStatusId}`,
    payload,
  )

  return data
}

/**
 * Eliminar Repair Status
 */
export const deleteRepairStatusApi = async (
  repairStatusId: number,
): Promise<void> => {
  await api.delete(`${BASE_URL}/${repairStatusId}`)
}
