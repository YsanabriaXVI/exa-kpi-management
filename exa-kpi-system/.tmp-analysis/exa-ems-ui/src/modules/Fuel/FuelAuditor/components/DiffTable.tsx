import React from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'

import type { GasStationTransaction, FuelOrderSummary } from '../types/fuelAuditor.types'

interface Props {
  txn: GasStationTransaction
  order: FuelOrderSummary | null
  showDifferences?: boolean
}

const LITERS_PER_GALLON = 3.785411784

const formatQty = (n: number | string | null | undefined): string => {
  const num = Number(n)
  if (!Number.isFinite(num)) return String(n ?? '')
  return num.toFixed(3).replace(/\.?0+$/, '')
}

const formatMoney = (value: number | string | null | undefined, currency?: string): string => {
  if (value == null || value === '') return ''
  const num = Number(value)
  if (!Number.isFinite(num)) return String(value)
  const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return currency ? `${currency} ${formatted}` : formatted
}

const normalizeUnit = (u: string | undefined | null): string => {
  if (!u) return ''
  const s = String(u).trim().toLowerCase()
  if (/(^g$|^gal$|^gallon|^gallons?$|^galon)/i.test(s)) return 'gallon'
  if (/(^l$|^ltr$|^liter|^litre|^liters?$|^litres?$|^litro)/i.test(s)) return 'liter'
  return s
}

const toLiters = (qty: number | string | null | undefined, unit: string | undefined): number => {
  const q = Number(qty)
  if (!Number.isFinite(q)) return NaN
  const u = normalizeUnit(unit)
  if (u === 'gallon') return q * LITERS_PER_GALLON
  return q
}

const sameNumber = (a: number | null | undefined, b: number | null | undefined, eps = 0.01): boolean => {
  if (a == null || b == null) return false
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < eps
}

const fmtDate = (v: string | undefined | null, dateOnly = false): string => {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  const day = d.getDate()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mon = months[d.getMonth()]
  const yr = String(d.getFullYear()).slice(-2)
  if (dateOnly) return `${day}-${mon}-${yr}`
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day}-${mon}-${yr} ${hh}:${mm}`
}

const sameDay = (a: string | undefined, b: string | undefined): boolean => {
  if (!a || !b) return false
  const da = new Date(a)
  const db = new Date(b)
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false
  return da.toISOString().split('T')[0] === db.toISOString().split('T')[0]
}

const getOrderUnitPrice = (order: FuelOrderSummary | null): number | null => {
  if (!order) return null
  if (order.unitPrice != null) return order.unitPrice
  if (order.fuelPrice?.price != null) return order.fuelPrice.price
  if (order.fuelAuditor?.unitPrice != null) return order.fuelAuditor.unitPrice
  return null
}

const getOrderCurrency = (order: FuelOrderSummary | null): string => {
  if (!order) return ''
  if (order.currency) return order.currency
  if (order.fuelPrice?.currency) return order.fuelPrice.currency
  if (order.fuelAuditor?.currency) return order.fuelAuditor.currency
  return ''
}

const getOrderAmount = (order: FuelOrderSummary | null): number | null => {
  if (!order) return null
  const unitPrice = getOrderUnitPrice(order)
  const qtyLtr = Number(order.fuelRequestLtr) || 0
  if (unitPrice && qtyLtr) return unitPrice * qtyLtr
  return null
}

const stationFromTxn = (t: GasStationTransaction): string => {
  if (t.gasStationName) return t.gasStationName
  if (t.gasStation?.name) return t.gasStation.name
  if (t.GasStation?.name) return t.GasStation.name
  return ''
}

const stationFromOrder = (o: FuelOrderSummary): string => {
  if (o.gasStation?.name) return o.gasStation.name
  if (o.station) return o.station
  if (o.gasStationName) return o.gasStationName
  if (o.gasStationsId) return `#${o.gasStationsId}`
  return ''
}

interface DiffDisplay {
  formatted: string
  percentage: string | null
  color: string
}

interface FieldRow {
  key: string
  label: string
  left: string
  right: string | null
  match: boolean
  diff: DiffDisplay | null
}

const DiffTable: React.FC<Props> = ({ txn, order, showDifferences = true }) => {
  if (!order) {
    return (
      <div className="text-center text-body-secondary py-4">
        <p className="mb-1 fw-semibold">No fuel order linked</p>
        <small>Link a fuel order to see the comparison.</small>
      </div>
    )
  }

  const hasOrder = !!order.fuelOrderId
  const txnCurrency = txn.currency || ''
  const orderCurrency = getOrderCurrency(order) || txnCurrency
  const displayCurrency = txnCurrency || orderCurrency

  const txnStation = stationFromTxn(txn)
  const orderStation = hasOrder ? stationFromOrder(order) : null

  const txnUnit = normalizeUnit(txn.measureUnit)
  const txnUnitLabel = txnUnit === 'gallon' ? 'gallons' : txnUnit === 'liter' ? 'liters' : (txn.measureUnit ?? '')

  const txnQtyLiters = toLiters(txn.quantity, txn.measureUnit)
  const orderQtyLiters = Number(order.fuelRequestLtr) || 0

  const txnUnitPrice = Number(txn.unitPrice) || 0
  const orderUnitPrice = getOrderUnitPrice(order)
  const txnAmount = Number(txn.amount) || 0
  const orderAmount = getOrderAmount(order)

  const currenciesMatch = (): boolean => {
    if (!txnCurrency || !orderCurrency) return true
    return txnCurrency.toLowerCase() === orderCurrency.toLowerCase()
  }

  const fields: FieldRow[] = [
    {
      key: 'gasStation',
      label: 'Gas Station',
      left: txnStation || '\u2014',
      right: hasOrder ? (orderStation || '\u2014') : null,
      match: hasOrder ? txnStation === orderStation : false,
      diff: null,
    },
    {
      key: 'licensePlate',
      label: 'License Plate',
      left: txn.licensePlate || '\u2014',
      right: hasOrder ? (order.plate || '\u2014') : null,
      match: hasOrder
        ? (txn.licensePlate ?? '').toLowerCase() === (order.plate ?? '').toLowerCase()
        : false,
      diff: null,
    },
    {
      key: 'fuelType',
      label: 'Fuel Type',
      left: txn.fuelType || '\u2014',
      right: hasOrder
        ? (order.fuelTypeAttr?.name || order.fuelTypeName || order.fuelType || '\u2014')
        : null,
      match: hasOrder
        ? (txn.fuelType ?? '').toLowerCase() ===
          (order.fuelTypeAttr?.name || order.fuelTypeName || order.fuelType || '').toLowerCase()
        : false,
      diff: null,
    },
    {
      key: 'measureUnit',
      label: 'Measure Unit',
      left: txnUnitLabel || '\u2014',
      right: hasOrder ? 'liters' : null,
      match: hasOrder ? txnUnit === 'liter' : false,
      diff: null,
    },
    (() => {
      const match = hasOrder ? sameNumber(txnQtyLiters, orderQtyLiters) : false
      let diff: DiffDisplay | null = null
      if (hasOrder && Number.isFinite(txnQtyLiters) && Number.isFinite(orderQtyLiters)) {
        const d = txnQtyLiters - orderQtyLiters
        diff = {
          formatted: `${d >= 0 ? '+' : ''}${formatQty(d)} liters`,
          percentage: orderQtyLiters !== 0
            ? ((d / orderQtyLiters) * 100).toFixed(2)
            : null,
          color: match ? 'text-success' : 'text-danger',
        }
      }
      return {
        key: 'quantity',
        label: 'Quantity',
        left: `${formatQty(txn.quantity)} ${txnUnitLabel}`.trim(),
        right: hasOrder ? `${formatQty(order.fuelRequestLtr)} liters` : null,
        match,
        diff,
      }
    })(),
    (() => {
      const match = hasOrder && currenciesMatch()
        ? sameNumber(txnUnitPrice, orderUnitPrice)
        : false
      let diff: DiffDisplay | null = null
      if (hasOrder && Number.isFinite(txnUnitPrice) && orderUnitPrice != null && Number.isFinite(orderUnitPrice)) {
        const d = txnUnitPrice - orderUnitPrice
        diff = {
          formatted: `${d >= 0 ? '+' : ''}${formatMoney(Math.abs(d), displayCurrency)}`,
          percentage: orderUnitPrice !== 0
            ? ((d / orderUnitPrice) * 100).toFixed(2)
            : null,
          color: match ? 'text-success' : 'text-danger',
        }
      }
      return {
        key: 'unitPrice',
        label: 'Unit Price',
        left: formatMoney(txn.unitPrice, txnCurrency),
        right: hasOrder ? formatMoney(orderUnitPrice, orderCurrency) : null,
        match,
        diff,
      }
    })(),
    (() => {
      const match = hasOrder && currenciesMatch()
        ? sameNumber(txnAmount, orderAmount)
        : false
      let diff: DiffDisplay | null = null
      if (hasOrder && Number.isFinite(txnAmount)) {
        const d = orderAmount != null && Number.isFinite(orderAmount)
          ? txnAmount - orderAmount
          : txnAmount
        diff = {
          formatted: `${d >= 0 ? '+' : ''}${formatMoney(Math.abs(d), displayCurrency)}`,
          percentage: orderAmount != null && Number.isFinite(orderAmount) && orderAmount !== 0
            ? ((d / orderAmount) * 100).toFixed(2)
            : null,
          color: match ? 'text-success' : 'text-danger',
        }
      }
      return {
        key: 'amount',
        label: 'Amount',
        left: formatMoney(txn.amount, txnCurrency),
        right: hasOrder ? formatMoney(orderAmount, orderCurrency) : null,
        match,
        diff,
      }
    })(),
    {
      key: 'dateTime',
      label: 'Date',
      left: fmtDate(txn.dateTime, true),
      right: hasOrder ? fmtDate(order.dateSchedule, true) : null,
      match: hasOrder ? sameDay(txn.dateTime, order.dateSchedule) : false,
      diff: null,
    },
  ]

  return (
    <CTable className="fuel-auditor-diff-table" responsive>
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell style={{ width: 180 }}>Field</CTableHeaderCell>
          <CTableHeaderCell>Transaction</CTableHeaderCell>
          <CTableHeaderCell>Fuel Order</CTableHeaderCell>
          {showDifferences && hasOrder && <CTableHeaderCell style={{ width: 160 }}>Difference</CTableHeaderCell>}
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {fields.map((f) => {
          const missing = f.right == null
          return (
            <CTableRow
              key={f.key}
              className={
                f.match && hasOrder
                  ? 'fuel-auditor-diff-table__row--match'
                  : !f.match && hasOrder && !missing
                    ? 'fuel-auditor-diff-table__row--warning'
                    : ''
              }
              color={
                f.match && hasOrder
                  ? 'success'
                  : !f.match && hasOrder && !missing
                    ? 'warning'
                    : undefined
              }
            >
              <CTableDataCell className="fuel-auditor-diff-table__label">
                <div className="d-flex align-items-center justify-content-end gap-1">
                  <span>{f.label}</span>
                  {hasOrder && !missing && (
                    <span className={f.match ? 'text-success' : 'text-warning'}>
                      {f.match ? '\u2713' : '\u26A0'}
                    </span>
                  )}
                </div>
              </CTableDataCell>
              <CTableDataCell className="fuel-auditor-diff-table__value">{f.left || '\u2014'}</CTableDataCell>
              <CTableDataCell className="fuel-auditor-diff-table__value">{missing ? '\u2014' : (f.right || '\u2014')}</CTableDataCell>
              {showDifferences && hasOrder && (
                <CTableDataCell className="fuel-auditor-diff-table__difference">
                  {f.diff ? (
                    <div className="fuel-auditor-diff-table__difference-content">
                      <div className={f.diff.color} style={{ fontWeight: 'bold' }}>
                        {f.diff.formatted}
                      </div>
                      {f.diff.percentage != null && (
                        <small className="text-body-secondary">
                          ({Number(f.diff.percentage) >= 0 ? '+' : ''}{f.diff.percentage}%)
                        </small>
                      )}
                    </div>
                  ) : (
                    <span className="text-body-secondary">{'\u2014'}</span>
                  )}
                </CTableDataCell>
              )}
            </CTableRow>
          )
        })}
      </CTableBody>
    </CTable>
  )
}

export default DiffTable
