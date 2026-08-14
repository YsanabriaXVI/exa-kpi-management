import React, { useMemo, useState } from 'react'
import { CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CFormInput, CFormLabel, CFormSelect, CRow } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilMoney, cilSync, cilPencil } from '@coreui/icons'
import type { TripDetails, SelectOption, TripChargeItem } from '../types'
import { formatCurrency, RATE_TYPES, RATES } from '../utils/tripTransformers'
import { permissionService, ADMIN_INVOICE, ADMIN_STATEMENT } from '../../../services/auth/permission.service'
import { MODULE_RATE_BUILDER_ADMIN } from '../../../constants/modules'
import ModalCharges from './ModalCharges'

interface TripPriceFormProps {
  trip: TripDetails | null
  invoiceStatusOptions: SelectOption[]
  paymentStatusOptions: SelectOption[]
  invoiceChargeOptions: SelectOption[]
  paymentChargeOptions: SelectOption[]
  onChange: (event: { target: { name: string; value: any } }) => void
  onRefreshRate: (type: keyof typeof RATE_TYPES) => void
  isAudit?: boolean
}

const TripPriceForm: React.FC<TripPriceFormProps> = ({
  trip,
  invoiceStatusOptions,
  paymentStatusOptions,
  invoiceChargeOptions,
  paymentChargeOptions,
  onChange,
  onRefreshRate,
  isAudit = false,
}) => {
  const [editClientRates, setEditClientRates] = useState(false)
  const [editSubdivisionRates, setEditSubdivisionRates] = useState(false)
  const canEditClient = permissionService.checkPermission(MODULE_RATE_BUILDER_ADMIN, ADMIN_INVOICE)
  const canEditSubdivision = permissionService.checkPermission(MODULE_RATE_BUILDER_ADMIN, ADMIN_STATEMENT)

  const totals = useMemo(() => {
    if (!trip?.rates || !trip.rates.length) {
      return {
        invKm: 0,
        invPrice: 0,
        payKm: 0,
        payPrice: 0,
        invoiceCharge: 0,
        paymentCharge: 0,
      }
    }
    return trip.rates.reduce(
      (acc, rate) => {
        const counter = Number(rate.counter_rate) || 1
        const invKm = Number(rate.inv_km) || 0
        const invPrice = Number(rate.inv_price) || 0
        const payKm = Number(rate.pay_km) || 0
        const payPrice = Number(rate.pay_price) || 0

        acc.invKm += invKm * counter
        acc.invPrice += invPrice * counter
        acc.payKm += payKm * counter
        acc.payPrice += payPrice * counter
        return acc
      },
      {
        invKm: 0,
        invPrice: 0,
        payKm: 0,
        payPrice: 0,
        invoiceCharge: (trip.invoice_charge_items || []).reduce((sum, item) => sum + Number(item.value || 0), 0),
        paymentCharge: (trip.payment_charge_items || []).reduce((sum, item) => sum + Number(item.value || 0), 0),
      }
    )
  }, [trip])

  if (!trip) return null
  const showClientSection = true
  const showSubdivisionSection = true
  const hasRates = Boolean(trip.rates && trip.rates.length)



  const handleChargesChange = (name: string) => (items: TripChargeItem[]) => {
    onChange({ target: { name, value: items } })
  }

  const getNumericValue = (value: any): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined
    const parsed = typeof value === 'string' ? Number(value) : value
    return Number.isFinite(parsed as number) ? (parsed as number) : undefined
  }

  const formatUsdValue = (value?: number | string | null) =>
    formatCurrency(value, { minimumFractionDigits: 4, maximumFractionDigits: 4 })

  const formatKmValue = (value: number) => {
    const parsed = getNumericValue(value)
    if (parsed === undefined) return '-'
    return parsed % 1 === 0 ? parsed.toString() : parsed.toFixed(2)
  }

  const formatLempirasValue = (value?: number | string | null) => {
    const parsed = getNumericValue(value)
    if (parsed === undefined) return 'L. 0.0000'
    return `L. ${parsed.toFixed(4)}`
  }

  const clientUsdTotal = totals.invPrice + totals.invoiceCharge
  const subdivisionUsdTotal = totals.payPrice + totals.paymentCharge
  const clientExchangeRate = getNumericValue(trip.work_order?.client?.exchange_rate)
  const subdivisionExchangeRate = getNumericValue(trip.subdivision?.exchange_rate)

  const renderSummaryRows = (
    rows: { key: string; label: string; value: React.ReactNode; interactive?: boolean }[]
  ) => (
    <div className="border border-light-subtle rounded-2 overflow-hidden bg-body-tertiary small">
      {rows.map((row, index) => {
        const rowClasses = [
          'd-flex align-items-center justify-content-between gap-2 flex-wrap px-3 py-2',
          index !== rows.length - 1 ? 'border-bottom border-light-subtle' : '',
          row.interactive ? 'bg-body shadow-sm position-relative' : '',
        ]
        const rowStyle: React.CSSProperties = { minHeight: '48px' }
        if (row.interactive) {
          rowStyle.boxShadow = 'inset 0 0 0 1px rgba(13,110,253,.15)'
          rowStyle.borderLeft = '3px solid rgba(13,110,253,.35)'
        }
        return (
          <div key={row.key} className={rowClasses.filter(Boolean).join(' ')} style={rowStyle}>
            <div className="text-body-secondary text-uppercase small fw-semibold flex-shrink-0">
              {row.label}
            </div>
            <div className="text-sm-end fw-semibold flex-grow-1 d-flex justify-content-sm-end text-break">
              {row.value}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderHnlValue = (usdTotal: number, exchangeRate?: number) => {
    if (!exchangeRate) {
      return <span className="fst-italic text-body-secondary">No exchange rate available</span>
    }
    return <span>{formatLempirasValue(usdTotal * exchangeRate)}</span>
  }

  const renderRateValue = (price: number, km: number) => {
    if (!km) return <span className="text-body-secondary">-</span>
    return <span>{formatUsdValue(price / km)}</span>
  }

  const renderChargesValue = (
    amount: number,
    editable: boolean,
    modalTitle: string,
    options: SelectOption[],
    items: TripChargeItem[],
    changeField: 'invoice_charge_items' | 'payment_charge_items'
  ) => {
    if (!editable) {
      return <span>{formatUsdValue(amount)}</span>
    }
    return (
      <ModalCharges
        title={modalTitle}
        items={items}
        options={options}
        onChange={handleChargesChange(changeField)}
        renderTrigger={(openModal) => (
          <CButton
            type="button"
            size="sm"
            color="success"
            variant="ghost"
            className="rounded-pill fw-semibold px-3 d-inline-flex align-items-center gap-2 text-success border-0"
            style={{ backgroundColor: 'rgba(25, 135, 84, 0.15)' }}
            onClick={openModal}
          >
            <CIcon icon={cilPencil} />
            {formatUsdValue(amount)}
          </CButton>
        )}
      />
    )
  }

  const renderRatesEditor = (prefix: string, enabled: boolean) => {
    if (!trip?.rates?.length || !enabled) return null
    return (
      <div className="mt-3 border rounded bg-body p-3">
        <div className="fw-semibold small text-body-secondary mb-2">Route Rates</div>
        {trip.rates.map((rate) => (
          <div key={`rate-${rate.trip_rate_id}`} className="mb-3 pb-3 border-bottom">
            <div className="fw-semibold mb-2">{rate.route?.route_code || `Route #${rate.trip_rate_id}`}</div>
            <CRow className="g-3">
              <CCol sm={6}>
                <CFormLabel className="small text-body-secondary">KM</CFormLabel>
                <CFormInput
                  type="number"
                  size="sm"
                  value={rate[`${prefix}_km`] ?? ''}
                  onChange={(e) =>
                    onChange({
                      target: { name: 'rates', value: { rate, field: `${prefix}_km`, value: e.target.value } },
                    })
                  }
                />
              </CCol>
              <CCol sm={6}>
                <CFormLabel className="small text-body-secondary">Price</CFormLabel>
                <CFormInput
                  type="number"
                  size="sm"
                  value={rate[`${prefix}_price`] ?? ''}
                  onChange={(e) =>
                    onChange({
                      target: { name: 'rates', value: { rate, field: `${prefix}_price`, value: e.target.value } },
                    })
                  }
                />
              </CCol>
            </CRow>
          </div>
        ))}
      </div>
    )
  }

  return (
    <CCard className="mb-4 shadow-sm">
      <CCardHeader>
        <div className="d-flex align-items-center">
          <CIcon icon={cilMoney} className="me-2 text-success" />
          <strong>Client and Subdivision Payment Information</strong>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-4">
          {showClientSection && (
            <CCol md={6}>
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <h6 className="text-body-secondary text-uppercase mb-0">Client</h6>
                <CBadge color={trip.invoice ? 'success' : 'secondary'} className="text-uppercase">
                  {trip.invoice ? `Invoice #${trip.invoice}` : 'Invoice Pending'}
                </CBadge>
              </div>
              {renderSummaryRows([
                { key: 'client-price', label: 'Client Price', value: <span>{formatUsdValue(totals.invPrice)}</span> },
                {
                  key: 'client-other-charges',
                  label: 'Client Other Charges',
                  interactive: !trip.invoice && canEditClient,
                  value: (
                    <div className="d-flex align-items-center gap-2 justify-content-end flex-wrap">
                      {renderChargesValue(
                        totals.invoiceCharge,
                        !trip.invoice && canEditClient,
                        'Client Charges',
                        invoiceChargeOptions,
                        trip.invoice_charge_items || [],
                        'invoice_charge_items'
                      )}
                    </div>
                  ),
                },
                { key: 'client-total-usd', label: 'Total USD', value: <span>{formatUsdValue(clientUsdTotal)}</span> },
                {
                  key: 'client-total-hnl',
                  label: 'Total HNL',
                  value: renderHnlValue(clientUsdTotal, clientExchangeRate),
                },
                {
                  key: 'client-total-km',
                  label: 'Client Total Km',
                  value: <span>{formatKmValue(totals.invKm)}</span>,
                },
                {
                  key: 'client-rate',
                  label: 'Client Rate',
                  value: renderRateValue(totals.invPrice, totals.invKm),
                },
              ])}
              {isAudit && canEditClient && (
                <CFormSelect
                  label="Invoice Status"
                  name="invoice_status"
                  value={trip.invoice_status ?? ''}
                  onChange={(e) => onChange(e)}
                  disabled={!!trip.invoice}
                >
                  <option value="">Select status</option>
                  {invoiceStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              )}
              {canEditClient && hasRates && (
                <div className="mt-3 d-flex gap-2 flex-wrap">
                  {!trip.invoice && (
                    <CButton color="primary" size="sm" className="text-white" onClick={() => onRefreshRate(RATE_TYPES.INV as keyof typeof RATE_TYPES)}>
                      <CIcon icon={cilSync} className="me-2" />
                      Refresh Client Rate
                    </CButton>
                  )}
                  <CButton
                    color="warning"
                    size="sm"
                    className="text-dark fw-semibold"
                    variant={editClientRates ? 'outline' : undefined}
                    onClick={() => setEditClientRates((prev) => !prev)}
                    disabled={!!trip.invoice}
                  >
                    {editClientRates ? 'Hide Rates Editor' : 'Edit Rates'}
                  </CButton>
                </div>
              )}
              {editClientRates && renderRatesEditor(RATES[RATE_TYPES.INV].prefix, canEditClient && !trip.invoice)}
            </CCol>
          )}
          {showSubdivisionSection && (
            <CCol md={6}>
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <h6 className="text-body-secondary text-uppercase mb-0">Subdivision</h6>
                <CBadge color={trip.payment ? 'success' : 'secondary'} className="text-uppercase">
                  {trip.payment ? `Payment #${trip.payment}` : 'Payment Pending'}
                </CBadge>
              </div>
              {renderSummaryRows([
                { key: 'subdivision-price', label: 'Subdivision Price', value: <span>{formatUsdValue(totals.payPrice)}</span> },
                {
                  key: 'subdivision-other-charges',
                  label: 'Subdivision Other Charges',
                  interactive: !trip.payment && canEditSubdivision,
                  value: (
                    <div className="d-flex align-items-center gap-2 justify-content-end flex-wrap">
                      {renderChargesValue(
                        totals.paymentCharge,
                        !trip.payment && canEditSubdivision,
                        'Subdivision Charges',
                        paymentChargeOptions,
                        trip.payment_charge_items || [],
                        'payment_charge_items'
                      )}
                    </div>
                  ),
                },
                { key: 'subdivision-total-usd', label: 'Total USD', value: <span>{formatUsdValue(subdivisionUsdTotal)}</span> },
                {
                  key: 'subdivision-total-hnl',
                  label: 'Total HNL',
                  value: renderHnlValue(subdivisionUsdTotal, subdivisionExchangeRate),
                },
                {
                  key: 'subdivision-total-km',
                  label: 'Subdivision Total Km',
                  value: <span>{formatKmValue(totals.payKm)}</span>,
                },
                {
                  key: 'subdivision-rate',
                  label: 'Subdivision Rate',
                  value: renderRateValue(totals.payPrice, totals.payKm),
                },
              ])}
              {isAudit && canEditSubdivision && (
                <CFormSelect
                  label="Payment Status"
                  name="payment_status"
                  value={trip.payment_status ?? ''}
                  onChange={(e) => onChange(e)}
                  disabled={!!trip.payment}
                >
                  <option value="">Select status</option>
                  {paymentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              )}
              {canEditSubdivision && hasRates && (
                <div className="mt-3 d-flex gap-2 flex-wrap">
                  {!trip.payment && (
                    <CButton color="primary" size="sm" className="text-white" onClick={() => onRefreshRate(RATE_TYPES.PAY as keyof typeof RATE_TYPES)}>
                      <CIcon icon={cilSync} className="me-2" />
                      Refresh Subdivision Rate
                    </CButton>
                  )}
                  <CButton
                    color="warning"
                    size="sm"
                    className="text-dark fw-semibold"
                    variant={editSubdivisionRates ? 'outline' : undefined}
                    onClick={() => setEditSubdivisionRates((prev) => !prev)}
                    disabled={!!trip.payment}
                  >
                    {editSubdivisionRates ? 'Hide Rates Editor' : 'Edit Rates'}
                  </CButton>
                </div>
              )}
              {editSubdivisionRates && renderRatesEditor(RATES[RATE_TYPES.PAY].prefix, canEditSubdivision && !trip.payment)}
            </CCol>
          )}
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default TripPriceForm
