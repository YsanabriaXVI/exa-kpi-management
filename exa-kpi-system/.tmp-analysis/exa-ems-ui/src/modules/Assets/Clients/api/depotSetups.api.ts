import apiClient from '../../../../services/api/axios.config'
import { DepotSetup } from '../types'
import { v4 as uuidv4 } from "uuid";

const unwrap = (response: any) => response?.data ?? response
const getSetupsPayload = (payload: any) => payload?.data?.setups ?? payload?.setups ?? payload
const getSetupPayload = (payload: any) => payload?.data?.setup ?? payload?.setup ?? payload


const normalizeJobs = (jobs: any[] | undefined | null) => {
  const list = Array.isArray(jobs) ? jobs : []
  return list.map((job) => {
    return {
      ...job,
      id: uuidv4()
    }
  })
}

const _fixSetups = (setups: any) => {
  if (Array.isArray(setups)) {
    return setups.map((setup: any) => {
      return {
        ...setup,
        jobs: normalizeJobs(setup.jobs)
      }
    })
  }
    console.log("fixed Setups ", setups);
    return setups;
}

export const depotSetupAPI = {
  getClientSetups: async (clientId: number | string): Promise<DepotSetup[]> => {
    if (!clientId) {
      return []
    }
    const response = await apiClient.get(`/depot-setup-service/client/${clientId}`, {
      headers: { 'Route-Type': 'admin' },
    })
    const payload = unwrap(response)
    const setups = getSetupsPayload(payload)
    console.log("SETUPS: ",  _fixSetups(setups));
    return Array.isArray(setups) ? _fixSetups(setups) : []
  },
  updateDepotSetup: async (setupId: number | string, data: DepotSetup): Promise<DepotSetup> => {
    if (!setupId) {
      throw new Error('setupId is required')
    }
    const response = await apiClient.put(`/depot-setup-service/${setupId}`, data, {
      headers: { 'Route-Type': 'admin' },
    })
    const payload = unwrap(response)
    return getSetupPayload(payload) as DepotSetup
  },
  getDepotSetup: async (setupId: number | string): Promise<DepotSetup> => {
    if (!setupId) {
      throw new Error('setupId is required')
    }
    const response = await apiClient.get(`/depot-setup-service/${setupId}`, {
      headers: { 'Route-Type': 'admin' },
    })
    const payload = unwrap(response)
    return getSetupPayload(payload) as DepotSetup
  },
  createDepotSetup: async (data: DepotSetup): Promise<DepotSetup> => {
    const response = await apiClient.post('/depot-setup-service', data, {
      headers: { 'Route-Type': 'admin' },
    })
    const payload = unwrap(response)
    return getSetupPayload(payload) as DepotSetup
  },
}

