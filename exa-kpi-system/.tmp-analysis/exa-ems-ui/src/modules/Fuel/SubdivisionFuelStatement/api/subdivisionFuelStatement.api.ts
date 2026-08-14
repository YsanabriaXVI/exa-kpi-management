import api from '../../../../services/api/axios.config'
import { v4 as uuidv4 } from 'uuid'
import type {
  SubdivisionFuelStatement,
  InvoiceLine,
  LinkedStatementOption,
} from '../types/subdivisionFuelStatement.types'

const BASE_URL = '/fuel-service/subdivision-fuel-statement'
const CONVERSION_FACTOR = 3.785
const GALLON_UNITS = ['galon', 'galones', 'gallon', 'gallons', 'galons']

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isGallons(unit: string | undefined | null): boolean {
  if (!unit) return false
  return GALLON_UNITS.includes(unit.toLowerCase())
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

function normalizePreviewInvoiceLine(raw: any): InvoiceLine {
  const fuelPrice = Number(raw.fuelPrice) || 0
  const exchangeRateLps = Number(raw.fuelExchangeRateLps) || 1
  const fuelRequestLiters = Number(raw.fuelRequestLtr) || 0
  const lempTotal = round4(fuelRequestLiters * fuelPrice)
  const dollarTotal = round4(lempTotal / exchangeRateLps)

  const inGal = isGallons(raw.gasStationReceiptMeasureUnit)
  const fuelSupplied = Number(raw.gasStationReceiptFuelSupplied) || 0
  const gsReceiptFuelSuppliedLiters = round4(inGal ? fuelSupplied * CONVERSION_FACTOR : fuelSupplied)
  const gsReceiptLempTotal = inGal
    ? round4(gsReceiptFuelSuppliedLiters * fuelPrice)
    : Number(raw.gasStationReceiptTotal) || 0
  const gsReceiptDollarTotal = round4(gsReceiptLempTotal / exchangeRateLps)

  return {
    ...raw,
    id: uuidv4(),
    fuelPrice,
    fuelExchangeRateLps: exchangeRateLps,
    exchangeRateLps,
    fuelRequestLiters,
    lempTotal,
    dollarTotal,
    gsReceiptFuelPrice: Number(raw.gasStationReceiptUnitPrice) || 0,
    gsReceiptFuelSuppliedLiters,
    gsReceiptLempTotal,
    gsReceiptDollarTotal,
    formattedDateScheduled: formatDate(raw.dateSchedule),
  }
}

function normalizeStatementInvoiceLine(invoice: any, viewData: any[]): InvoiceLine {
  const fuelPrice = Number(invoice.fuelPrice) || 0
  const exchangeRateLps = Number(invoice.exchangeRateLps) || 1
  const fuelOrderData = invoice.fuelorder_data ?? {}
  const receipt = invoice.GasStationTransaction ?? {}

  let line: any = {
    ...invoice,
    id: uuidv4(),
    tripId: fuelOrderData.tripsid,
    fuelOrderId: fuelOrderData.fuelOrderId,
    statementId: invoice.paymentid,
    equipmentId: fuelOrderData.equipmentId,
    fuelPrice,
    exchangeRateLps,
    internalSupplier: invoice.internalSupplierAttrItem?.name ?? '',
  }

  const viewRecord = (viewData || []).find(
    (v: any) => v.fuelOrderId === line.fuelOrderId && v.equipmentId === line.equipmentId,
  )
  if (viewRecord) {
    line.assetType = viewRecord.assetType
    line.orderType = viewRecord.orderType
    line.series = viewRecord.series
    line.client = viewRecord.client
    line.city = viewRecord.city
    line.station = viewRecord.station
    line.fuelType = viewRecord.fuelType
    line.fuelRequest = viewRecord.fuelRequest
    line.fuelRequestLtr = viewRecord.fuelRequestLtr
    line.formattedDateScheduled = formatDate(viewRecord.dateSchedule)
  }

  const fuelRequestLiters = Number(line.fuelRequestLtr) || 0
  line.fuelRequestLiters = fuelRequestLiters
  line.lempTotal = round4(fuelRequestLiters * fuelPrice)
  line.dollarTotal = round4(line.lempTotal / exchangeRateLps)

  const inGal = isGallons(receipt.measureUnit)
  const fuelSupplied = Number(receipt.quantity) || 0
  line.gasStationReceiptTransactionId = receipt.transactionId
  line.gasStationReceiptDocumentNo = receipt.documentNumber
  line.gsReceiptFuelSuppliedLiters = round4(inGal ? fuelSupplied * CONVERSION_FACTOR : fuelSupplied)
  line.gsReceiptLempTotal = inGal
    ? round4(line.gsReceiptFuelSuppliedLiters * fuelPrice)
    : Number(receipt.amount) || 0
  line.gsReceiptDollarTotal = round4(line.gsReceiptLempTotal / exchangeRateLps)

  return line
}

function normalizeListItem(item: any): SubdivisionFuelStatement {
  const gasStations = new Set<string>()
  const linkedStatements = new Set<string | number>()
  const fuelOrders = new Set<number>()

  const lines = Array.isArray(item.invoiceLines) ? item.invoiceLines : []
  lines.forEach((inv: any) => {
    const station = inv.fuelorder_data?.gasStation?.name
    if (station) gasStations.add(station)
    if (inv.paymentid) linkedStatements.add(inv.paymentid)
    const foId = inv.fuelorder_data?.fuelOrderId
    if (foId) fuelOrders.add(foId)
  })

  return {
    ...item,
    gasStations: Array.from(gasStations).join(', '),
    linkedStatements: Array.from(linkedStatements).join(', '),
    fuelOrders: Array.from(fuelOrders).join(', '),
    subdivisionName: item.subdivision_data?.name ?? '',
  }
}

function normalizeStatement(raw: any): SubdivisionFuelStatement {
  const linkedStatementIds: (string | number)[] = []
  const linkedGasStationIds: number[] = []
  let personalizedTrips = 'no'

  const statement: any = { ...raw }
  statement.linkedStatements = []
  statement.gasSupplierIds = []
  statement.weekIds = []

  const viewData = statement.viewData ?? []
  statement.invoiceLines = (statement.invoiceLines ?? []).map((inv: any) => {
    const line = normalizeStatementInvoiceLine(inv, viewData)

    if (line.statementId && !linkedStatementIds.includes(line.statementId)) {
      statement.linkedStatements.push({ label: line.statementId, value: line.statementId })
      linkedStatementIds.push(line.statementId)
    }

    const gasStationId = inv.fuelorder_data?.gasStation?.gasStationsId
    if (gasStationId && !linkedGasStationIds.includes(gasStationId)) {
      statement.gasSupplierIds.push(gasStationId)
      linkedGasStationIds.push(gasStationId)
    }

    const orderTypeId = viewData.find(
      (v: any) => v.fuelOrderId === line.fuelOrderId && v.equipmentId === line.equipmentId,
    )?.orderTypeId
    if (orderTypeId === 1588) personalizedTrips = 'yes'

    return line
  })

  ;(statement.weeks ?? []).forEach((week: any) => {
    const wd = week.week_data ?? {}
    statement.weekIds.push({
      label: `W${wd.weekno} - ${wd.weekyear}`,
      value: week.weekId,
    })
  })

  statement.personalizedTrips = personalizedTrips
  return statement as SubdivisionFuelStatement
}

class SubdivisionFuelStatementApi {
  async fetchList(params?: { page?: number; pageSize?: number }): Promise<{
    data: SubdivisionFuelStatement[]
    meta: { total: number; page: number; pageSize: number; lastPage: number }
  }> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    const qs = searchParams.toString()
    const res = await api.get<any>(`${BASE_URL}${qs ? `?${qs}` : ''}`)
    const raw = res.data

    if (raw?.meta) {
      const items = Array.isArray(raw.data) ? raw.data : []
      return { data: items.map(normalizeListItem), meta: raw.meta }
    }

    const items = raw?.items ?? (Array.isArray(raw?.data) ? raw.data : null) ?? (Array.isArray(raw) ? raw : [])
    const normalized = (Array.isArray(items) ? items : []).map(normalizeListItem)
    return { data: normalized, meta: { total: normalized.length, page: 1, pageSize: normalized.length, lastPage: 1 } }
  }

  async fetchById(id: number): Promise<SubdivisionFuelStatement> {
    const res = await api.get<any>(`${BASE_URL}/${id}`)
    const raw = res.data?.data ?? res.data
    return normalizeStatement(raw)
  }

  async create(data: any): Promise<SubdivisionFuelStatement> {
    const res = await api.post<any>(BASE_URL, data)
    return res.data?.data ?? res.data
  }

  async update(id: number, data: any): Promise<SubdivisionFuelStatement> {
    const res = await api.put<any>(`${BASE_URL}/${id}`, data)
    return res.data?.data ?? res.data
  }

  async remove(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`)
  }

  async loadLinkedStatements(params: {
    subdivisionId: number
    gasSupplierIds: number[]
  }): Promise<LinkedStatementOption[]> {
    const res = await api.post<any>(`${BASE_URL}/subdivision-statements`, params)
    const raw = res.data?.data ?? res.data
    return Array.isArray(raw) ? raw : []
  }

  async loadInvoiceLines(params: any): Promise<InvoiceLine[]> {
    const res = await api.post<any>(`${BASE_URL}/invoice-lines`, params)
    const raw = res.data?.data ?? res.data
    const items = Array.isArray(raw) ? raw : []
    return items.map(normalizePreviewInvoiceLine)
  }

  async downloadPdf(id: number): Promise<Blob> {
    const res = await api.get(`${BASE_URL}/fuel-statement-pdf/${id}`, { responseType: 'blob' })
    return res.data
  }

  async downloadXlsx(id: number): Promise<Blob> {
    const res = await api.get(`${BASE_URL}/statement-xlsx/${id}`, { responseType: 'blob' })
    return res.data
  }
}

export const subdivisionFuelStatementApi = new SubdivisionFuelStatementApi()
