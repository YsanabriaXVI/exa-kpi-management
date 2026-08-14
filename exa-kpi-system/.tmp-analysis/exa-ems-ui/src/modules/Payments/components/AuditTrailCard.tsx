import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
} from '@coreui/react-pro'
import { useGetPaymentAuditQuery } from '../api/paymentCoreApi'
import { useEntityNames } from '../hooks/useEntityNames'
import type { AuditEntry } from '../types.v2'

const INITIAL_VISIBLE = 5

interface AuditTrailCardProps {
  paymentId: string
}

function formatAmount(amount: string | number | undefined): string {
  if (amount == null) return ''
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return ''
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAuditDetail(entry: AuditEntry, t: any): string | null {
  const prev = entry.previousState as Record<string, unknown> | null
  const next = entry.newState as Record<string, unknown> | null
  const meta = entry.metadata as Record<string, unknown> | null

  const formatChargeDetail = (
    desc: unknown, ref: unknown, entryVal: unknown, amount: unknown,
  ): string => {
    const entryType = entryVal === 'DEBIT' ? t('audit.detail.debit', 'Debito') : t('audit.detail.credit', 'Credito')
    const refStr = ref ? ` #${ref}` : ''
    return `${desc}${refStr} (${entryType}) — ${formatAmount(amount as string)}`
  }

  switch (entry.action) {
    case 'CHARGE_REMOVED': {
      // Single charge removal (has description + amountUsd directly)
      if (prev?.description && prev?.amountUsd) {
        return formatChargeDetail(prev.description, prev.reference, prev.entry, prev.amountUsd)
      }
      // Bulk removal with charge details
      const charges = prev?.charges as Array<{ description: string; reference?: string; entry: string; amountUsd: string }> | undefined
      if (charges && charges.length > 0) {
        return charges
          .map(c => formatChargeDetail(c.description, c.reference, c.entry, c.amountUsd))
          .join('; ')
      }
      // Bulk removal without details (old records)
      if (prev?.count && Number(prev.count) > 1) {
        return `${prev.count} ${t('audit.detail.chargesRemoved', 'cargos eliminados')}`
      }
      return null
    }
    case 'CHARGE_ADDED': {
      if (next?.description && next?.amountUsd) {
        return formatChargeDetail(next.description, next.reference, next.entry, next.amountUsd)
      }
      return null
    }
    case 'CHARGE_EDITED': {
      if (next?.description) {
        return `${next.description}`
      }
      return null
    }
    case 'TOTALS_RECALCULATED': {
      const chargesApplied = next?.chargesApplied as number | undefined
      const fuelAdded = next?.fuelChargesAdded as number | undefined
      const parts: string[] = []
      if (chargesApplied) parts.push(`${chargesApplied} ${t('audit.detail.chargesCalculated', 'cargos calculados')}`)
      if (fuelAdded) parts.push(`${fuelAdded} ${t('audit.detail.fuelChargesAdded', 'cargos de combustible agregados')}`)
      return parts.length > 0 ? parts.join(', ') : null
    }
    case 'STATEMENT_ADDED': {
      const ids = next?.statementIds as string[] | undefined
      if (ids && ids.length > 0) {
        return `${ids.length} ${t('audit.detail.statementsAdded', ids.length === 1 ? 'estado de cuenta' : 'estados de cuenta')}`
      }
      return null
    }
    case 'STATEMENT_REMOVED': {
      const stmtId = prev?.statementId as string | undefined
      if (stmtId) {
        return `ID: ${stmtId.substring(0, 8)}...`
      }
      return null
    }
    case 'CLOSED': {
      const transferNum = next?.transferNumber as string | undefined
      const transferVal = next?.transferValue as number | undefined
      if (transferNum) {
        return `${t('audit.detail.transfer', 'Transferencia')} #${transferNum}${transferVal ? ` — ${formatAmount(transferVal)}` : ''}`
      }
      return null
    }
    case 'VOIDED': {
      const reason = meta?.reason as string | undefined
      if (reason) return reason
      return null
    }
    default:
      return null
  }
}

const AuditTrailCard: React.FC<AuditTrailCardProps> = ({ paymentId }) => {
  const { t } = useTranslation('payments')
  const { resolveUserName } = useEntityNames()
  const { data, isLoading, isError } = useGetPaymentAuditQuery(paymentId)
  const entries = data?.data ?? []
  const [expanded, setExpanded] = useState(false)
  const visibleEntries = expanded ? entries : entries.slice(0, INITIAL_VISIBLE)
  const hasMore = entries.length > INITIAL_VISIBLE

  if (isLoading) {
    return (
      <CCard className="shadow-sm border-0 mb-3">
        <CCardHeader className="bg-transparent">
          <strong>{t('audit.title')}</strong>
        </CCardHeader>
        <CCardBody className="text-center py-4">
          <CSpinner />
        </CCardBody>
      </CCard>
    )
  }

  if (isError) {
    return null
  }

  const statusColor = (status: string): string => {
    switch (status?.toUpperCase()) {
      case 'DRAFT': return 'secondary'
      case 'OPEN': return 'info'
      case 'REVIEW': return 'warning'
      case 'APPROVED': return 'success'
      case 'CLOSED': return 'primary'
      case 'VOID': return 'danger'
      default: return 'secondary'
    }
  }

  return (
    <CCard className="shadow-sm border-0 mb-3">
      <CCardHeader className="bg-transparent">
        <strong>{t('audit.title')}</strong>
        {entries.length > 0 && (
          <CBadge color="secondary" className="ms-2">{entries.length}</CBadge>
        )}
      </CCardHeader>
      <CCardBody>
        {entries.length === 0 ? (
          <CAlert color="info" className="mb-0">{t('audit.noEntries')}</CAlert>
        ) : (
          <div className="position-relative ps-4">
            {/* Timeline line */}
            <div
              className="position-absolute start-0 top-0 bottom-0"
              style={{
                width: 2,
                backgroundColor: 'var(--cui-border-color)',
                marginLeft: 8,
              }}
            />
            {visibleEntries.map((entry, idx) => {
              const prevStatus = entry.previousState?.status as string | undefined
              const newStatus = entry.newState?.status as string | undefined
              const detail = getAuditDetail(entry, t)

              return (
                <div key={entry.id} className={`position-relative ${idx < visibleEntries.length - 1 ? 'pb-4' : ''}`}>
                  {/* Timeline dot */}
                  <div
                    className="position-absolute bg-primary rounded-circle"
                    style={{
                      width: 12,
                      height: 12,
                      left: -19,
                      top: 4,
                      border: '2px solid var(--cui-body-bg)',
                    }}
                  />
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <span className="fw-semibold">
                        {t(`audit.action.${entry.action}`, entry.action)}
                      </span>
                      <small className="text-body-secondary">
                        {new Date(entry.changedAt).toLocaleString()}
                      </small>
                    </div>
                    {detail && (
                      <div className="mb-1">
                        <small className="text-body-secondary fst-italic">{detail}</small>
                      </div>
                    )}
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <small className="text-body-secondary">{resolveUserName(entry.changedBy) || entry.changedBy}</small>
                      {prevStatus && newStatus && prevStatus !== newStatus && (
                        <span className="d-flex align-items-center gap-1">
                          <CBadge color={statusColor(prevStatus)} size="sm">{prevStatus}</CBadge>
                          <span className="text-body-secondary">&rarr;</span>
                          <CBadge color={statusColor(newStatus)} size="sm">{newStatus}</CBadge>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {hasMore && (
          <div className="text-center mt-3">
            <CButton
              color="link"
              size="sm"
              onClick={() => setExpanded(prev => !prev)}
            >
              {expanded
                ? t('audit.showLess', 'Mostrar menos')
                : t('audit.showAll', `Mostrar todos (${entries.length})`)}
            </CButton>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default React.memo(AuditTrailCard)
