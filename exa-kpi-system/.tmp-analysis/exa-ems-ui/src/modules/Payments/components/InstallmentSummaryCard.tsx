import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
  CSpinner,
} from '@coreui/react-pro'
import { useGetInstallmentSummaryQuery } from '../api/paymentCoreApi'

interface InstallmentSummaryCardProps {
  chargeConfigId: string
  currency?: 'USD' | 'HNL' | 'GTQ'
  exchangeRate?: number
}

const CURRENCY_PREFIX: Record<string, string> = { USD: '$', HNL: 'L', GTQ: 'Q' }

const InstallmentSummaryCard: React.FC<InstallmentSummaryCardProps> = ({
  chargeConfigId,
  currency = 'USD',
  exchangeRate,
}) => {
  const fmt = (v: number) => {
    const converted = currency !== 'USD' && exchangeRate ? v * exchangeRate : v
    const prefix = CURRENCY_PREFIX[currency] ?? '$'
    return `${prefix} ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  const { data, isLoading, isError } = useGetInstallmentSummaryQuery(chargeConfigId)
  const summary = data?.data

  if (isLoading) {
    return (
      <CCard className="shadow-sm border-0 mb-0">
        <CCardBody className="text-center py-4">
          <CSpinner size="sm" />
        </CCardBody>
      </CCard>
    )
  }

  if (isError || !summary) return null

  return (
    <CCard className="shadow-sm border-0 mb-0 border-start border-primary border-4" id="installment-summary-card">
      <CCardHeader className="bg-transparent">
        <strong>Installment Balance</strong>
        <span className="text-body-secondary ms-2 small">
          {summary.paidCount} of {summary.installmentCount} installments paid
        </span>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3 text-center mb-3">
          <CCol xs={6} md={3}>
            <div className="text-body-secondary small text-uppercase">Total</div>
            <div className="fs-5 fw-semibold">{fmt(summary.totalAmount)}</div>
          </CCol>
          <CCol xs={6} md={3}>
            <div className="text-success small text-uppercase">Paid</div>
            <div className="fs-5 fw-semibold text-success">{fmt(summary.paidAmount)}</div>
          </CCol>
          <CCol xs={6} md={3}>
            <div className="text-warning small text-uppercase">Remaining</div>
            <div className="fs-5 fw-semibold text-warning">{fmt(summary.remainingAmount)}</div>
          </CCol>
          {summary.cancelledAmount > 0 && (
            <CCol xs={6} md={3}>
              <div className="text-danger small text-uppercase">Cancelled</div>
              <div className="fs-5 fw-semibold text-danger">{fmt(summary.cancelledAmount)}</div>
            </CCol>
          )}
        </CRow>
        <CProgress
          value={summary.progressPercent}
          color="success"
          className="mb-1"
          style={{ height: 8 }}
        />
        <div className="text-end text-body-secondary small">
          {summary.progressPercent.toFixed(1)}% complete
        </div>
      </CCardBody>
    </CCard>
  )
}

export default React.memo(InstallmentSummaryCard)
