import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CurrencyDisplay from './CurrencyDisplay'
import { useGetPaymentTotalsQuery } from '../api/paymentCoreApi'

interface TotalsBreakdownCardProps {
  paymentId: string
}

type RowKind = 'item' | 'section' | 'subtotal' | 'total'

interface BreakdownRow {
  label: string
  usd?: number
  lps?: number
  kind: RowKind
  color?: string
}

const sectionStyle: React.CSSProperties = { fontSize: '0.75rem', letterSpacing: '0.05em' }

const BreakdownRowView: React.FC<{ row: BreakdownRow }> = ({ row }) => {
  if (row.kind === 'section') {
    return (
      <CTableRow>
        <CTableDataCell
          colSpan={3}
          className={`text-uppercase fw-semibold pt-3 pb-1 border-0 ${row.color ?? 'text-body-secondary'}`}
          style={sectionStyle}
        >
          {row.label}
        </CTableDataCell>
      </CTableRow>
    )
  }

  const isSubtotal = row.kind === 'subtotal'
  const isTotal = row.kind === 'total'
  const isBold = isSubtotal || isTotal

  const rowClass = isTotal
    ? 'fw-bold border-top border-2 border-dark'
    : isSubtotal
      ? 'fw-bold bg-body-tertiary'
      : ''

  const labelClass = [
    isBold ? 'fw-bold' : '',
    row.color ?? '',
    !isBold ? 'ps-3' : '',
  ].filter(Boolean).join(' ')

  return (
    <CTableRow className={rowClass}>
      <CTableDataCell className={labelClass}>{row.label}</CTableDataCell>
      <CTableDataCell className={`text-end ${isBold ? 'fw-bold' : ''} ${isTotal ? 'text-primary' : ''} ${row.color ?? ''}`}>
        <CurrencyDisplay value={row.usd ?? null} currency="USD" />
      </CTableDataCell>
      <CTableDataCell className={`text-end ${isBold ? 'fw-bold' : ''} ${isTotal ? 'text-success' : ''} ${row.color ?? ''}`}>
        <CurrencyDisplay value={row.lps ?? null} currency="LPS" />
      </CTableDataCell>
    </CTableRow>
  )
}

const TotalsBreakdownCard: React.FC<TotalsBreakdownCardProps> = ({ paymentId }) => {
  const { t } = useTranslation('payments')
  const { data, isLoading, isError } = useGetPaymentTotalsQuery(paymentId)
  const totals = data?.data

  if (isLoading) {
    return (
      <CCard className="shadow-sm border-0 mb-3">
        <CCardBody className="text-center py-4">
          <CSpinner />
        </CCardBody>
      </CCard>
    )
  }

  if (isError || !totals) {
    return null
  }

  // 3-tier breakdown (Excel structure). Use server aggregates; fall back to
  // legacy fields for backward compatibility if the API hasn't deployed yet.
  const absorbedUsd = totals.absorbedCreditUsd ?? totals.includedCostCharges.totalCredit ?? 0
  const absorbedLps = totals.absorbedCreditLps ?? totals.includedCostCharges.totalCreditLps ?? 0
  const hasAbsorbed = absorbedUsd > 0 || absorbedLps > 0

  const adjUsd = totals.adjustments.balance ?? 0
  const adjLps = totals.adjustments.balanceLps ?? 0

  const grossUsd = totals.grossUsd ?? (totals.statementTotalUsd + absorbedUsd + (adjUsd > 0 ? adjUsd : 0))
  const grossLps = totals.grossLps ?? (totals.statementTotalLps + absorbedLps + (adjLps > 0 ? adjLps : 0))

  // Tier 1 — Included costs (absorbed).
  const inclUsd = totals.includedCostsDebitUsd ?? (totals.includedCostCharges.totalDebit ?? 0)
  const inclLps = totals.includedCostsDebitLps ?? (totals.includedCostCharges.totalDebitLps ?? 0)
  // Tier 2 — Other included (Fuel & GPS).
  const otherInclUsd = totals.otherIncludedDebitUsd ?? (totals.includedCostCharges.fuelTotal ?? 0)
  const otherInclLps = totals.otherIncludedDebitLps ?? (totals.includedCostCharges.fuelTotalLps ?? 0)
  const totalInclUsd = totals.totalIncludedCostsUsd ?? (inclUsd + otherInclUsd)
  const totalInclLps = totals.totalIncludedCostsLps ?? (inclLps + otherInclLps)

  const invoiceUsd = totals.invoiceAmountUsd ?? (grossUsd - totalInclUsd)
  const invoiceLps = totals.invoiceAmountLps ?? (grossLps - totalInclLps)

  // Tier 3 — Non-included (loans, reserve, advances).
  const nonInclUsd = totals.nonIncludedDebitUsd ?? (totals.otherCharges.totalDebit ?? 0)
  const nonInclLps = totals.nonIncludedDebitLps ?? (totals.otherCharges.totalDebit ?? 0)

  const hasOtherIncl = otherInclUsd !== 0 || otherInclLps !== 0
  const hasNonIncl = nonInclUsd !== 0 || nonInclLps !== 0

  const rows: BreakdownRow[] = [
    // 1. Statements (Services Rendered)
    { label: t('totals.credits'), kind: 'section', color: 'text-success' },
    { label: t('totals.statementTotal'), usd: totals.statementTotalUsd, lps: totals.statementTotalLps, kind: 'item', color: 'text-success' },
    ...(hasAbsorbed
      ? [{ label: t('totals.absorbedByExa'), usd: absorbedUsd, lps: absorbedLps, kind: 'item' as const, color: 'text-success' }]
      : []),
    ...(adjUsd > 0 || adjLps > 0
      ? [{ label: t('totals.adjustments') + ' (+)', usd: adjUsd, lps: adjLps, kind: 'item' as const, color: 'text-success' }]
      : []),
    { label: t('totals.grossTotal'), usd: grossUsd, lps: grossLps, kind: 'subtotal' },

    // 2. Deductions — Included tiers
    { label: t('totals.includedDeductions', 'INCLUDED COSTS'), kind: 'section', color: 'text-danger' },
    { label: t('totals.includedCosts'), usd: -inclUsd, lps: -inclLps, kind: 'item', color: 'text-danger' },
    ...(hasOtherIncl
      ? [{ label: t('totals.otherIncludedCosts', 'Other Included Costs (Fuel & GPS)'), usd: -otherInclUsd, lps: -otherInclLps, kind: 'item' as const, color: 'text-danger' }]
      : []),
    { label: t('totals.totalIncluded', 'Total Included Costs'), usd: -totalInclUsd, lps: -totalInclLps, kind: 'subtotal', color: 'text-danger' },

    // 3. Invoice Amount
    { label: t('totals.invoiceTotal', 'Invoice Amount'), usd: invoiceUsd, lps: invoiceLps, kind: 'subtotal' },

    // 4. Non-Included Costs
    ...(hasNonIncl ? [
      { label: t('totals.nonIncludedDeductions', 'NON-INCLUDED COSTS'), kind: 'section' as const, color: 'text-danger' },
      { label: t('totals.nonIncludedCosts', 'Non-Included Costs'), usd: -nonInclUsd, lps: -nonInclLps, kind: 'item' as const, color: 'text-danger' },
      { label: t('totals.totalNonIncluded', 'Total Non-Included Costs'), usd: -nonInclUsd, lps: -nonInclLps, kind: 'subtotal' as const, color: 'text-danger' },
    ] : []),

    // 5. Net Payment Due
    { label: t('totals.netPaymentDue'), usd: totals.totalDueUsd, lps: totals.totalDueLps, kind: 'total' },
  ]

  return (
    <CCard className="shadow-sm border-0 mb-3 border-start border-dark border-4">
      <CCardHeader className="bg-transparent">
        <strong>{t('totals.title')}</strong>
      </CCardHeader>
      <CCardBody className="p-0">
        <CTable hover className="align-middle mb-0">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>{t('totals.item')}</CTableHeaderCell>
              <CTableHeaderCell className="text-end">USD</CTableHeaderCell>
              <CTableHeaderCell className="text-end">LPS</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {rows.map((row, idx) => (
              <BreakdownRowView key={`${row.label}-${idx}`} row={row} />
            ))}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

export default React.memo(TotalsBreakdownCard)
