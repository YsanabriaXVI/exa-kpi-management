// src/modules/RentalPlan/api/rentalPlan.api.ts

import api from '../../../services/api/axios.config'

/* ======================================================
 * Helpers (normalización)
 * ====================================================== */

// Convierte linked_clients → "MAERSK, MSC, CMA"
const buildClientsLabel = (linkedClients: any[] = []) => {
  if (!Array.isArray(linkedClients)) return ''

  return linkedClients
    .map((c) => c?.client_data?.name)
    .filter(Boolean)
    .join(', ')
}

// Normaliza plan para LIST
const normalizePlanForList = (plan: any) => ({
  rentalPlanId: plan.rentalPlanId,
  planName: plan.planName,
  clients: buildClientsLabel(plan.linked_clients),
  status: plan.status,
})

// Normaliza plan para EDIT
const normalizePlanForEdit = (plan: any) => {
  const clientIds = Array.isArray(plan.linked_clients)
    ? plan.linked_clients.map((c) => c.clientId)
    : []

  return {
    ...plan,

    clientIds,

    jobRates: Array.isArray(plan.jobRates)
      ? plan.jobRates.map((job: any) => ({
          ...job,
          joblabel: job.job_data?.name ?? '',
          ratelabel: job.jobRate !== undefined ? `$ ${job.jobRate}` : '',
        }))
      : [],

    comboRates: Array.isArray(plan.comboRates)
      ? plan.comboRates.map((combo: any) => ({
          ...combo,
          chassislabel: combo.chassis_data?.sizeType ?? '',
          containerlabel: combo.container_data?.sizeType ?? '',
          gensetLabel: combo.genset_data?.name ?? '',
          rateLabel: combo.rate !== undefined ? `$ ${combo.rate}` : '',
          periodLabel: combo.period_data?.name ?? '',
        }))
      : [],
  }
}

// Default object (equivalente a getDefaultPlanObject)
const getDefaultPlan = () => ({
  planName: '',
  clientIds: [],
  comboRates: [
    {
      chassisSizeId: null,
      containerSizeId: null,
      gensetTypeId: null,
      rate: null,
      period: null,
      containerlabel: 'Click here to add',
      chassislabel: 'Click here to add',
      gensetLabel: 'Click here to add',
      rateLabel: 'Click here to add',
      periodLabel: 'Click here to add',
    },
  ],
  jobRates: [
    {
      jobId: null,
      jobRate: null,
      joblabel: 'Click here to add',
      ratelabel: 'Click here to add',
    },
  ],
  status: 1,
})

/* ======================================================
 * API
 * ====================================================== */

export const rentalPlanApi = {
  // -----------------------
  // LIST
  // -----------------------
  async fetchList() {
    const { data } = await api.get('/depot-setup-service/rental-plan')

    const sorted = [...data].sort((a, b) => b.rentalPlanId - a.rentalPlanId)

    return sorted.map(normalizePlanForList)
  },

  // -----------------------
  // GET ONE
  // -----------------------
  async fetchById(id: number) {
    const { data } = await api.get(`/depot-setup-service/rental-plan/${id}`)

    return normalizePlanForEdit(data)
  },

  // -----------------------
  // DEFAULT
  // -----------------------
  async getDefault() {
    return getDefaultPlan()
  },

  // -----------------------
  // ADD
  // -----------------------
  async add(form: any) {
    const payload = {
      planName: form.planName,

      gateIn: null,
      gateOut: null,
      liftOn: null,
      liftOff: null,
      onHire: null,
      offHire: null,

      clientIds: form.clientIds ?? [],

      comboRates: (form.comboRates ?? [])
        .filter((c: any) => c.rate != null && c.period != null)
        .map((c: any) => ({
          chassisSizeId: c.chassisSizeId,
          containerSizeId: c.containerSizeId,
          gensetTypeId: c.gensetTypeId,
          rate: String(c.rate),
          period: c.period,
        })),

      jobRates: (form.jobRates ?? [])
        .filter((j: any) => j.jobId != null && j.jobRate != null)
        .map((j: any) => ({
          jobId: j.jobId,
          jobRate: String(j.jobRate),
        })),

      status: form.status ?? 1,
    }

    console.log('RentalPlan payload:', payload)

    const { data } = await api.post('/depot-setup-service/rental-plan', payload)

    return data
  },

  // -----------------------
  // UPDATE
  // -----------------------
  async update(form: any) {
    const now = new Date().toISOString()
    const existingLinkedClients = Array.isArray(form.linked_clients) ? form.linked_clients : []

    const payload = {
      ...form,
      updateDate: now,

      linked_clients: [
        // Clientes que el usuario mantiene o agrega
        ...(form.clientIds ?? []).map((clientId: number) => {
          const existing = existingLinkedClients.find((c: any) => c.clientId === clientId)

          if (existing) {
            return { ...existing, active: 1, status: 1, updateDate: now }
          }

          return {
            rentalPlanClientId: null,
            rentalPlanId: form.rentalPlanId,
            clientId,
            createUser: form.createUser,
            createDate: form.createDate,
            updateUser: form.updateUser,
            updateDate: now,
            company: form.company,
            active: 1,
            status: 1,
          }
        }),
        // Clientes eliminados: existían pero el usuario los quitó
        ...existingLinkedClients
          .filter((c: any) => !(form.clientIds ?? []).includes(c.clientId))
          .map((c: any) => ({ ...c, active: 0, status: 0, updateDate: now })),
      ],

      comboRates: (form.comboRates ?? []).map((c: any) => ({
        ...c,
        rate: Number(c.rate).toFixed(4),
        updateDate: now,
      })),

      jobRates: (form.jobRates ?? []).map((j: any) => ({
        ...j,
        jobRate: Number(j.jobRate).toFixed(4),
        updateDate: now,
      })),
    }

    console.log('UPDATE PAYLOAD', payload)

    const { data } = await api.put(`/depot-setup-service/rental-plan/${form.rentalPlanId}`, payload)

    return data
  },

  // -----------------------
  // DELETE
  // -----------------------
  async remove(id: number) {
    await api.delete(`/depot-setup-service/rental-plan/${id}`)
  },

  // -----------------------
  // AUX DATA (attributes)
  // -----------------------
  async loadAttributeItems(attributeFlatNameId: string, moduleFlatNameId: string): Promise<any[]> {
    const { data } = await api.get<any[]>(
      `/attribute-service/attributes/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`,
    )
    return data
  },

  async fetchUnavailableClients() {
    const { data } = await api.get('/depot-setup-service/rental-plan/clients')

    if (!Array.isArray(data)) return []

    return data.map((c) => c.clientId)
  },
}