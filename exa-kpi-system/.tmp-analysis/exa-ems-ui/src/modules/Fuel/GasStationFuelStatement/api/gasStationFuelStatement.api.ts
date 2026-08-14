import api from '../../../../services/api/axios.config'
import { v4 as uuidv4 } from 'uuid'
import type { GasStationFuelStatement, InvoiceLine } from '../types/gasStationFuelStatement.types'

const BASE_URL = '/fuel-service/gas-station-fuel-statement'
const CONVERSION_FACTOR = 3.785
const GALLON_UNITS = ['galon', 'galones', 'gallon', 'gallons', 'galons']

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
  }

  const viewRecord = (viewData || []).find(
    (v: any) => v.fuelOrderId === line.fuelOrderId && v.equipmentId === line.equipmentId,
  )
  if (viewRecord) {
    line.assetType = viewRecord.assetType
    line.orderType = viewRecord.orderType
    line.series = viewRecord.series
    line.client = viewRecord.client
    line.subdivision = viewRecord.subdivision
    line.city = viewRecord.city
    line.station = viewRecord.station
    line.fuelType = viewRecord.fuelType
    line.fuelRequest = viewRecord.fuelRequest
    line.fuelRequestLtr = viewRecord.fuelRequestLtr
    line.uploadSessionId = viewRecord.uploadSessionId
  }

  const fuelRequestLiters = Number(line.fuelRequestLtr) || 0
  line.fuelRequestLiters = fuelRequestLiters
  line.lempTotal = round4(fuelRequestLiters * fuelPrice)
  line.dollarTotal = round4(line.lempTotal / exchangeRateLps)
  line.gasStationReceiptTotal = receipt.amount

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

function normalizeListItem(item: any): GasStationFuelStatement {
  const fuelOrders = new Set<number>()
  const subdivisions = new Set<string>()
  const reconciliations = new Set<number>()

  const lines = Array.isArray(item.invoiceLines) ? item.invoiceLines : []
  lines.forEach((inv: any) => {
    const foId = inv.fuelorder_data?.fuelOrderId
    if (foId) fuelOrders.add(foId)
  })
  ;(item.linkedSubdivisions ?? []).forEach((s: any) => {
    if (s.name) subdivisions.add(s.name)
  })
  ;(item.linkedGasStationTransactions ?? []).forEach((t: any) => {
    if (t.uploadSessionId) reconciliations.add(t.uploadSessionId)
  })

  return {
    ...item,
    gasStationName: item.GasStation?.name ?? '',
    fuelOrders: Array.from(fuelOrders).join(', '),
    subdivisions: Array.from(subdivisions).join(', '),
    reconciliations: Array.from(reconciliations).join(', '),
  }
}

function normalizeStatement(raw: any): GasStationFuelStatement {
  const linkedSubdivisionIds: number[] = []
  const statement: any = { ...raw }
  statement.gasStationId = raw.gasStationsId ?? raw.gasStationId ?? raw.GasStation?.gasStationsId ?? null
  statement.subdivisionIds = []
  statement.weekIds = []

  const viewData = statement.viewData ?? []
  statement.invoiceLines = (statement.invoiceLines ?? []).map((inv: any) => {
    const line = normalizeStatementInvoiceLine(inv, viewData)

    const subdivisionId = inv.fuelorder_data?.subdivisionId
    if (subdivisionId && !linkedSubdivisionIds.includes(subdivisionId)) {
      statement.subdivisionIds.push(subdivisionId)
      linkedSubdivisionIds.push(subdivisionId)
    }

    return line
  })

  ;(statement.weeks ?? []).forEach((week: any) => {
    const wd = week.week_data ?? {}
    statement.weekIds.push({
      label: `W${wd.weekno} - ${wd.weekyear}`,
      value: week.weekId,
    })
  })

  return statement as GasStationFuelStatement
}

class GasStationFuelStatementApi {
  async fetchList(): Promise<GasStationFuelStatement[]> {
    const res = await api.get<any>(BASE_URL)
    const raw = res.data
    const items = raw?.items ?? (Array.isArray(raw?.data) ? raw.data : null) ?? (Array.isArray(raw) ? raw : [])
    return (Array.isArray(items) ? items : []).map(normalizeListItem)
  }

  async fetchById(id: number): Promise<GasStationFuelStatement> {
    const res = await api.get<any>(`${BASE_URL}/${id}`)
    const raw = res.data?.data ?? res.data
    return normalizeStatement(raw)
  }

  async create(data: any): Promise<GasStationFuelStatement> {
    const res = await api.post<any>(BASE_URL, data)
    return res.data?.data ?? res.data
  }

  async update(id: number, data: any): Promise<GasStationFuelStatement> {
    const res = await api.put<any>(`${BASE_URL}/${id}`, data)
    return res.data?.data ?? res.data
  }

  async remove(id: number): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`)
  }

  async downloadPdf(id: number): Promise<Blob> {
    const res = await api.get(`${BASE_URL}/fuel-statement-pdf/${id}`, {
      responseType: 'blob',
    })
    return res.data
  }

  async downloadXlsx(id: number): Promise<Blob> {
    const res = await api.get(`${BASE_URL}/statement-xlsx/${id}`, {
      responseType: 'blob',
    })
    return res.data
  }

  async loadInvoiceLines(params: any): Promise<InvoiceLine[]> {
    const res = await api.post<any>(`${BASE_URL}/invoice-lines`, params, {
      validateStatus: () => true,
    })
    if (res.status >= 400) return []
    const raw = res.data?.data ?? res.data
    const items = Array.isArray(raw) ? raw : []
    return items.map(normalizePreviewInvoiceLine)
  }
}

export const gasStationFuelStatementApi = new GasStationFuelStatementApi()
