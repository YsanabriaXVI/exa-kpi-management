import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { WeeklyReportData } from '../types.v2'
import CurrencyDisplay from './CurrencyDisplay'
import './WeeklyReportTable.scss'

type Currency = 'USD' | 'LPS'

interface WeeklyReportTableProps {
  data: WeeklyReportData
  currency: Currency
  subdivisionNameMap: Map<string, string>
  internalSupplierMap: Map<string, string>
  bankNameMap: Map<string, string>
}

function chargeValue(
  charges: { typeName: string; creditUsd?: number; creditLps?: number; debitUsd?: number; debitLps?: number }[],
  typeName: string,
  field: 'creditUsd' | 'creditLps' | 'debitUsd' | 'debitLps',
): number {
  const c = charges.find((ch) => ch.typeName === typeName)
  return c ? (c[field] ?? 0) : 0
}

function sumCharges(
  charges: { creditUsd?: number; creditLps?: number; debitUsd?: number; debitLps?: number }[],
  field: 'creditUsd' | 'creditLps' | 'debitUsd' | 'debitLps',
): number {
  return charges.reduce((sum, c) => sum + (c[field] ?? 0), 0)
}

const WeeklyReportTable: React.FC<WeeklyReportTableProps> = ({
  data,
  currency,
  subdivisionNameMap,
  internalSupplierMap,
  bankNameMap,
}) => {
  const { t } = useTranslation('payments')
  const navigate = useNavigate()
  const cols = data.chargeColumns
  const cur = currency

  const creditField = cur === 'USD' ? 'creditUsd' : 'creditLps' as const
  const debitField = cur === 'USD' ? 'debitUsd' : 'debitLps' as const
  const stmtField = cur === 'USD' ? 'statementTotalUsd' : 'statementTotalLps' as const
  const dueField = cur === 'USD' ? 'totalDueUsd' : 'totalDueLps' as const

  const otherIncludedCols = cols.otherIncludedDebits ?? []

  const totals = useMemo(() => {
    let stmtTotal = 0
    let creditsTotal = 0
    let inclDebitsTotal = 0
    let otherInclDebitsTotal = 0
    let notInclDebitsTotal = 0
    let dueTotal = 0

    const creditColTotals: Record<string, number> = {}
    const inclDebitColTotals: Record<string, number> = {}
    const otherInclDebitColTotals: Record<string, number> = {}
    const notInclDebitColTotals: Record<string, number> = {}

    for (const name of cols.credits) creditColTotals[name] = 0
    for (const name of cols.includedDebits) inclDebitColTotals[name] = 0
    for (const name of otherIncludedCols) otherInclDebitColTotals[name] = 0
    for (const name of cols.notIncludedDebits) notInclDebitColTotals[name] = 0

    for (const row of data.rows) {
      stmtTotal += row[stmtField]
      creditsTotal += sumCharges(row.credits, creditField)
      inclDebitsTotal += sumCharges(row.includedDebits, debitField)
      otherInclDebitsTotal += sumCharges(row.otherIncludedDebits ?? [], debitField)
      notInclDebitsTotal += sumCharges(row.notIncludedDebits, debitField)
      dueTotal += row[dueField]

      for (const name of cols.credits) {
        creditColTotals[name] += chargeValue(row.credits, name, creditField)
      }
      for (const name of cols.includedDebits) {
        inclDebitColTotals[name] += chargeValue(row.includedDebits, name, debitField)
      }
      for (const name of otherIncludedCols) {
        otherInclDebitColTotals[name] += chargeValue(row.otherIncludedDebits ?? [], name, debitField)
      }
      for (const name of cols.notIncludedDebits) {
        notInclDebitColTotals[name] += chargeValue(row.notIncludedDebits, name, debitField)
      }
    }

    return {
      stmtTotal,
      creditsTotal,
      stmtCreditsTotal: stmtTotal + creditsTotal,
      inclDebitsTotal,
      otherInclDebitsTotal,
      totalInclCostsTotal: inclDebitsTotal + otherInclDebitsTotal,
      notInclDebitsTotal,
      dueTotal,
      creditColTotals,
      inclDebitColTotals,
      otherInclDebitColTotals,
      notInclDebitColTotals,
    }
  }, [data, cols, otherIncludedCols, stmtField, dueField, creditField, debitField])

  const resolveName = (ids: string[], map: Map<string, string>, fallback: string) => {
    if (!ids.length) return '-'
    return ids.map((id) => map.get(id) || `${fallback} #${id}`).join(', ')
  }

  // Prefer the per-payment snapshot names when present; fall back to the live
  // attribute map for older payments that predate the snapshot.
  const resolveInternalSupplier = (row: WeeklyReportData['rows'][number]) => {
    if (row.internalSupplierNames && row.internalSupplierNames.length) {
      return row.internalSupplierNames.join(', ')
    }
    return resolveName(row.internalSupplierIds, internalSupplierMap, 'Supplier')
  }

  return (
    <div className="weekly-report-wrapper">
      <table className="weekly-report-table">
        <thead>
          {/* Group header row */}
          <tr className="group-header-row">
            <th rowSpan={2} className="sticky-col col-subdivision">{t('weeklyReport.subdivision')}</th>
            <th rowSpan={2} className="sticky-col col-supplier">{t('weeklyReport.internalSupplier')}</th>
            <th rowSpan={2}>{t('weeklyReport.bankAccount')}</th>
            <th rowSpan={2}>{t('weeklyReport.totalStatements')}</th>
            {cols.credits.length > 0 && (
              <th colSpan={cols.credits.length} className="group-credits">{t('weeklyReport.credits')}</th>
            )}
            <th rowSpan={2} className="col-subtotal">{t('weeklyReport.totalStmtCredits')}</th>
            {cols.includedDebits.length > 0 && (
              <th colSpan={cols.includedDebits.length} className="group-debits">{t('weeklyReport.debitsIncluded')}</th>
            )}
            {otherIncludedCols.length > 0 && (
              <th colSpan={otherIncludedCols.length} className="group-debits">{t('weeklyReport.otherIncludedDebits', 'Other Included Costs')}</th>
            )}
            <th rowSpan={2} className="col-subtotal">{t('weeklyReport.totalInclCosts', 'Total Incl. Costs')}</th>
            <th rowSpan={2}>{t('weeklyReport.invoice')}</th>
            {cols.notIncludedDebits.length > 0 && (
              <th colSpan={cols.notIncludedDebits.length} className="group-not-included">{t('weeklyReport.notIncludedDebits')}</th>
            )}
            <th rowSpan={2} className="col-total">{t('weeklyReport.toPay')} {cur}</th>
          </tr>
          {/* Sub-header row with individual charge names */}
          <tr className="sub-header-row">
            {cols.credits.map((name) => (
              <th key={`ch-${name}`} className="col-credit">{name}</th>
            ))}
            {cols.includedDebits.map((name) => (
              <th key={`di-${name}`} className="col-debit">{name}</th>
            ))}
            {otherIncludedCols.map((name) => (
              <th key={`oi-${name}`} className="col-debit">{name}</th>
            ))}
            {cols.notIncludedDebits.map((name) => (
              <th key={`ni-${name}`} className="col-not-included">{name}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.rows.map((row, idx) => {
            const stmtVal = row[stmtField]
            const creditsSum = sumCharges(row.credits, creditField)
            const stmtCredits = stmtVal + creditsSum
            const inclDebitsSum = sumCharges(row.includedDebits, debitField)
            const otherInclDebitsSum = sumCharges(row.otherIncludedDebits ?? [], debitField)
            const totalInclCostsSum = inclDebitsSum + otherInclDebitsSum

            return (
              <tr
                key={row.paymentId}
                className={`data-row ${idx % 2 === 1 ? 'alt-row' : ''}`}
                onClick={() => navigate(`/payments/${row.paymentId}`)}
              >
                <td className="sticky-col col-subdivision">{resolveName(row.subdivisionIds, subdivisionNameMap, 'Sub')}</td>
                <td className="sticky-col col-supplier">{resolveInternalSupplier(row)}</td>
                <td>{row.bankId ? (bankNameMap.get(row.bankId) || row.bankId) : '-'}</td>
                <td className="text-end"><CurrencyDisplay value={stmtVal} currency={cur} /></td>
                {cols.credits.map((name) => (
                  <td key={`c-${name}`} className="text-end col-credit-cell">
                    <CurrencyDisplay value={chargeValue(row.credits, name, creditField) || null} currency={cur} />
                  </td>
                ))}
                <td className="text-end fw-semibold col-subtotal-cell"><CurrencyDisplay value={stmtCredits} currency={cur} /></td>
                {cols.includedDebits.map((name) => (
                  <td key={`d-${name}`} className="text-end col-debit-cell">
                    <CurrencyDisplay value={chargeValue(row.includedDebits, name, debitField) || null} currency={cur} />
                  </td>
                ))}
                {otherIncludedCols.map((name) => (
                  <td key={`oi-${name}`} className="text-end col-debit-cell">
                    <CurrencyDisplay value={chargeValue(row.otherIncludedDebits ?? [], name, debitField) || null} currency={cur} />
                  </td>
                ))}
                <td className="text-end fw-semibold col-subtotal-cell text-danger"><CurrencyDisplay value={-totalInclCostsSum || null} currency={cur} /></td>
                <td className="text-center">#{row.paymentNumber}</td>
                {cols.notIncludedDebits.map((name) => (
                  <td key={`n-${name}`} className="text-end col-not-included-cell">
                    <CurrencyDisplay value={chargeValue(row.notIncludedDebits, name, debitField) || null} currency={cur} />
                  </td>
                ))}
                <td className="text-end fw-bold col-total-cell"><CurrencyDisplay value={row[dueField]} currency={cur} /></td>
              </tr>
            )
          })}
        </tbody>

        <tfoot>
          <tr className="totals-row">
            <td className="sticky-col col-subdivision fw-bold">{t('weeklyReport.totals')}</td>
            <td className="sticky-col col-supplier"></td>
            <td></td>
            <td className="text-end fw-bold"><CurrencyDisplay value={totals.stmtTotal} currency={cur} /></td>
            {cols.credits.map((name) => (
              <td key={`tc-${name}`} className="text-end fw-bold">
                <CurrencyDisplay value={totals.creditColTotals[name] || null} currency={cur} />
              </td>
            ))}
            <td className="text-end fw-bold"><CurrencyDisplay value={totals.stmtCreditsTotal} currency={cur} /></td>
            {cols.includedDebits.map((name) => (
              <td key={`td-${name}`} className="text-end fw-bold">
                <CurrencyDisplay value={totals.inclDebitColTotals[name] || null} currency={cur} />
              </td>
            ))}
            {otherIncludedCols.map((name) => (
              <td key={`toi-${name}`} className="text-end fw-bold">
                <CurrencyDisplay value={totals.otherInclDebitColTotals[name] || null} currency={cur} />
              </td>
            ))}
            <td className="text-end fw-bold text-danger"><CurrencyDisplay value={-totals.totalInclCostsTotal || null} currency={cur} /></td>
            <td></td>
            {cols.notIncludedDebits.map((name) => (
              <td key={`tn-${name}`} className="text-end fw-bold">
                <CurrencyDisplay value={totals.notInclDebitColTotals[name] || null} currency={cur} />
              </td>
            ))}
            <td className="text-end fw-bold"><CurrencyDisplay value={totals.dueTotal} currency={cur} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default React.memo(WeeklyReportTable)
