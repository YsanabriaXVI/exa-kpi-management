import apiClient from '../../../services/api/axios.config'
import type { SubdivisionStatement, SubdivisionStatementTableData, PaginatedStatementsResult } from '../types'

const unwrap = (response: any) => response?.data ?? response

const normalizeStatement = (raw: any): SubdivisionStatement => {
  if (!raw) return {}

  const format = raw.format || {}
  const subdivision = raw.subdivision || {}
  const resolvedId = raw.paymentId ?? raw.payment_id ?? raw.paymentid ?? raw.id ?? raw.subdivision_statement_id

  // Handle weeks being in various properties
  let weekList: any[] = []
  if (Array.isArray(raw.week_list)) weekList = raw.week_list
  else if (Array.isArray(raw.weeks_list)) weekList = raw.weeks_list
  else if (Array.isArray(raw.weeks)) weekList = raw.weeks

  // Generate comma-separated string of IDs
  let weeksValue = raw.weeks

  if (weekList.length > 0) {
    weeksValue = weekList
      .map((w: any) => w.week_id ?? w.id ?? w.value)
      .filter(Boolean)
      .join(',')
  } else if (typeof raw.weeks === 'string') {
    weeksValue = raw.weeks
  } else if (typeof raw.week_ids === 'string') {
    weeksValue = raw.week_ids
  }

  return {
    ...raw,
    week_list: weekList,
    weeks: weeksValue,
    paymentId: resolvedId,
    id: resolvedId,
    subdivisionid: raw.subdivisionid ?? subdivision.subdivision_id ?? subdivision.id,
    subdivision_name: subdivision.name ?? raw.subdivision_name ?? raw.clients,
    invoiceformatid: raw.invoiceformatid ?? format.invoiceformat_id ?? format.id,
    format_name: format.name ?? raw.format_name,
    status_format: raw.status_format,
  }
}

export const subdivisionStatementsAPI = {
  async getStatements(search?: any): Promise<{ list: SubdivisionStatement[] }> {
    const response = search
      ? await apiClient.post('/statements/search', search)
      : await apiClient.get('/statements')
    const payload = unwrap(response)
    const statements = payload?.data?.statements ?? payload?.statements ?? payload?.data ?? payload ?? []
    const list = Array.isArray(statements) ? statements.map(normalizeStatement) : []
    return { list }
  },

  async getStatementsPaginated(params: { limit: number; offset: number; search?: string }): Promise<PaginatedStatementsResult> {
    const query = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    })
    if (params.search) query.set('search', params.search)
    const response = await apiClient.get(`/statements/paginated?${query.toString()}`)
    const payload = unwrap(response)
    const statements = payload?.data?.statements ?? payload?.statements ?? payload?.data ?? payload ?? []
    const list = Array.isArray(statements) ? statements.map(normalizeStatement) : []
    return {
      list,
      total: payload?.total ?? list.length,
      limit: payload?.limit ?? params.limit,
      offset: payload?.offset ?? params.offset,
    }
  },

  async getStatement(id: number | string): Promise<SubdivisionStatement> {
    const response = await apiClient.get(`/statements/${id}`)
    const payload = unwrap(response)
    const statement = payload?.data?.statement ?? payload?.statement ?? payload?.data ?? payload
    return normalizeStatement(statement)
  },

  async createStatement(data: any): Promise<SubdivisionStatement> {
    // Adapter for Legacy Backend:
    // 1. Map subdivisionid -> clientid (Legacy DTO expects clientid for Subdivision ID)
    // 2. Pass along the 'clients' string provided by the UI

    const payloadData = {
      ...data,
      clientid: Number(data.subdivisionid), // IMPORTANT: Backend maps clientid to setSubdivision
      clients: data.clients, // IMPORTANT: Backend SubdivisionStatementMapper requires this
    }

    const response = await apiClient.post('/statements', payloadData)
    const payload = unwrap(response)
    if (payload?.status === 'fail') {
      const msg = (Array.isArray(payload.data) ? payload.data[0] : payload.data) || payload.message || 'Failed to create statement'
      throw new Error(msg)
    }
    const statement = payload?.data?.statement ?? payload?.statement ?? payload?.data ?? payload
    return normalizeStatement(statement)
  },

  async updateStatement(id: number | string, data: any): Promise<SubdivisionStatement> {
    // Adapter for Legacy Backend:
    // Map subdivisionid -> clientid if present (Legacy DTO expects clientid for Subdivision ID)
    const payloadData = {
      ...data,
      clientid: data.subdivisionid ? Number(data.subdivisionid) : undefined,
    }
    // Note: For update, 'clients' is optional in DTO, so we can omit if not changing.
    // If we needed to change clients, we'd fetch them here too.

    const response = await apiClient.put(`/statements/${id}`, payloadData)
    const payload = unwrap(response)
    const statement = payload?.data?.statement ?? payload?.statement ?? payload?.data ?? payload
    return normalizeStatement(statement)
  },

  async deleteStatementTrips(statementId: number | string, tripIds: Array<number | string>): Promise<SubdivisionStatement | undefined> {
    if (!tripIds?.length) return
    const response = await apiClient.delete(`/statements/trips/${statementId}`, { data: tripIds })
    const payload = unwrap(response)
    const statement = payload?.data?.statement ?? payload?.statement ?? payload?.data ?? payload
    return statement ? normalizeStatement(statement) : undefined
  },

  async assignStatementTrips(statementId: number | string, tripIds: Array<number | string>): Promise<SubdivisionStatement | undefined> {
    if (!tripIds?.length) return
    const response = await apiClient.put(`/statements/trips/${statementId}`, tripIds)
    const payload = unwrap(response)
    const statement = payload?.data?.statement ?? payload?.statement ?? payload?.data ?? payload
    return statement ? normalizeStatement(statement) : undefined
  },

  async deleteStatement(id: number | string): Promise<void> {
    await apiClient.delete(`/statements/${id}`)
  },

  async getTripTable(id: number | string, opts?: { isFree?: boolean }): Promise<SubdivisionStatementTableData> {
    const query = opts?.isFree ? '?isFree=true' : ''
    const response = await apiClient.get(`/statements/trips_table/${id}${query}`)
    const payload = unwrap(response)
    const table = payload?.data?.statement_table ?? payload?.statement_table ?? payload?.data ?? payload ?? {}
    return table
  },

  async downloadStatementPDF(id: number | string): Promise<void> {
    const response = await apiClient.get(`/documents/subdivision_statement/pdf/${id}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `subdivision_statement_${id}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  },

  async downloadStatementXLSX(id: number | string): Promise<void> {
    const response = await apiClient.get(`/documents/subdivision_statement/xlsx/${id}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `subdivision_statement_${id}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  },
}
