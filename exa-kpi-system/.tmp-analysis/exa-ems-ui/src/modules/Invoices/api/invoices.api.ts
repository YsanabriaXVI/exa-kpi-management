import apiClient from '../../../services/api/axios.config'
import type { Invoice, InvoiceTableData } from '../types'

const unwrap = (response: any) => response?.data ?? response

const normalizeInvoice = (raw: any): Invoice => {
  if (!raw) return {}

  const format = raw.format || {}
  const client = raw.client || {}

  // Handle weeks being in various properties (week_list, weeks_list, or weeks as array)
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
    invoice_id: raw.invoice_id ?? raw.id,
    id: raw.id ?? raw.invoice_id,
    clientid: raw.clientid ?? client.client_id ?? client.id,
    client_name: client.name ?? raw.client_name,
    invoiceformatid: raw.invoiceformatid ?? format.invoiceformat_id ?? format.id,
    format_name: format.name ?? raw.format_name,
    status_format: raw.status_format,
  }
}

export const invoicesAPI = {
  async getInvoicesPaginated(params: { limit: number; offset: number; search?: string }): Promise<{ list: Invoice[]; total: number; limit: number; offset: number }> {
    const query = new URLSearchParams()
    query.set('limit', String(params.limit))
    query.set('offset', String(params.offset))
    if (params.search) query.set('search', params.search)
    const response = await apiClient.get(`/invoices/paginated?${query.toString()}`)
    const payload = unwrap(response)
    const invoices = payload?.data?.invoices ?? payload?.invoices ?? payload?.data ?? payload ?? []
    const list = Array.isArray(invoices) ? invoices.map(normalizeInvoice) : []
    const pagination = payload?.data?.pagination ?? payload?.pagination ?? {}
    return {
      list,
      total: pagination.total ?? list.length,
      limit: pagination.limit ?? params.limit,
      offset: pagination.offset ?? params.offset,
    }
  },

  async getInvoices(search?: any): Promise<{ list: Invoice[] }> {
    const response = search
      ? await apiClient.post('/invoices/search', search)
      : await apiClient.get('/invoices')
    const payload = unwrap(response)
    const invoices = payload?.data?.invoices ?? payload?.invoices ?? payload?.data ?? payload ?? []
    const list = Array.isArray(invoices) ? invoices.map(normalizeInvoice) : []
    return { list }
  },

  async getInvoice(id: number | string): Promise<Invoice> {
    const response = await apiClient.get(`/invoices/${id}`)
    const payload = unwrap(response)
    const invoice = payload?.data?.invoice ?? payload?.invoice ?? payload?.data ?? payload
    return normalizeInvoice(invoice)
  },

  async createInvoice(data: any): Promise<Invoice> {
    const response = await apiClient.post('/invoices', data)
    const payload = unwrap(response)
    const invoice = payload?.data?.invoice ?? payload?.invoice ?? payload?.data ?? payload
    return normalizeInvoice(invoice)
  },

  async updateInvoice(id: number | string, data: any): Promise<Invoice> {
    const response = await apiClient.put(`/invoices/${id}`, data)
    const payload = unwrap(response)
    const invoice = payload?.data?.invoice ?? payload?.invoice ?? payload?.data ?? payload
    return normalizeInvoice(invoice)
  },

  async deleteInvoiceTrips(invoiceId: number | string, tripIds: Array<number | string>): Promise<Invoice | undefined> {
    if (!tripIds?.length) return
    const response = await apiClient.delete(`/invoices/trips/${invoiceId}`, { data: tripIds })
    const payload = unwrap(response)
    const invoice = payload?.data?.invoice ?? payload?.invoice ?? payload?.data ?? payload
    return invoice ? normalizeInvoice(invoice) : undefined
  },

  async assignInvoiceTrips(invoiceId: number | string, tripIds: Array<number | string>): Promise<Invoice | undefined> {
    if (!tripIds?.length) return
    const response = await apiClient.put(`/invoices/trips/${invoiceId}`, tripIds)
    const payload = unwrap(response)
    const invoice = payload?.data?.invoice ?? payload?.invoice ?? payload?.data ?? payload
    return invoice ? normalizeInvoice(invoice) : undefined
  },

  async deleteInvoice(id: number | string): Promise<void> {
    await apiClient.delete(`/invoices/${id}`)
  },

  async getTripTable(id: number | string, opts?: { isFree?: boolean }): Promise<InvoiceTableData> {
    const query = opts?.isFree ? '?isFree=true' : ''
    const response = await apiClient.get(`/invoices/trips_table/${id}${query}`)
    const payload = unwrap(response)
    // The API returns { invoice_table: { ... } }
    const table = payload?.data?.invoice_table ?? payload?.invoice_table ?? payload?.data ?? payload ?? {}
    return table
  },

  async downloadClientStatementPDF(id: number | string): Promise<void> {
    const response = await apiClient.get(`/documents/client_statement/pdf/${id}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `client_statement_${id}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  },

  async downloadClientStatementXLSX(id: number | string): Promise<void> {
    const response = await apiClient.get(`/documents/client_statement/xlsx/${id}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `client_statement_${id}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  },
}
