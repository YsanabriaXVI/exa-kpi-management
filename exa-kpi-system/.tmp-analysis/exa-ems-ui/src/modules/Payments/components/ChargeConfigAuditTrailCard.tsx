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
import { useGetChargeConfigAuditQuery } from '../api/paymentCoreApi'
import { useEntityNames } from '../hooks/useEntityNames'
import type { AuditEntry } from '../types.v2'

const INITIAL_VISIBLE = 5

interface Props {
  chargeConfigId: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getChargeConfigAuditDetail(entry: AuditEntry, t: any): string | null {
  const prev = entry.previousState as Record<string, unknown> | null
  const next = entry.newState as Record<string, unknown> | null
  const meta = (entry.metadata ?? {}) as Record<string, unknown>

  switch (entry.action) {
    case 'CREATED': {
      const chargeType = (meta.chargeType as string) ?? 'flexible'
      const initialPaid = meta.initialPaidCount as number | undefined
      let text = t('chargeConfig.audit.detail.createdAs', {
        type: chargeType,
        defaultValue: `Created as ${chargeType} charge config`,
      })
      if (initialPaid && initialPaid > 0) {
        text += ` ${t('chargeConfig.audit.detail.withInitialPaid', {
          count: initialPaid,
          defaultValue: `with ${initialPaid} initial-paid installments (legacy loan)`,
        })}`
      }
      return text
    }

    case 'RESTRUCTURED': {
      const parts: string[] = []
      if (meta.paidCount != null) {
        parts.push(
          t('chargeConfig.audit.detail.restructured', {
            paidCount: meta.paidCount,
            cancelledCount: meta.cancelledCount ?? 0,
            newCount: meta.newRemainingCount ?? 0,
            defaultValue: `${meta.paidCount} paid, ${meta.cancelledCount ?? 0} cancelled, ${meta.newRemainingCount ?? 0} new installments`,
          }),
        )
      }
      if (meta.reason) {
        parts.push(
          t('chargeConfig.audit.detail.reason', {
            reason: meta.reason,
            defaultValue: `Reason: "${meta.reason}"`,
          }),
        )
      }
      return parts.length > 0 ? parts.join('. ') : null
    }

    case 'CHARGE_EDITED': {
      if (!next || typeof next !== 'object') return null
      const changedKeys = Object.keys(next).filter(
        (k) => next[k] !== undefined && (prev == null || next[k] !== prev[k]),
      )
      if (changedKeys.length === 0) return null

      const fieldLabels: Record<string, string> = {
        name: 'Name',
        nameEs: 'Name (ES)',
        description: 'Description',
        entry: 'Entry Type',
        appliesToType: 'Applies To',
        costType: 'Cost Type',
        isMandatory: 'Mandatory',
        isAdjustment: 'Adjustment',
        scopes: 'Scopes',
        calculatedRule: 'Calculated Rule',
      }

      const diffs = changedKeys.map((k) => {
        const label = fieldLabels[k] ?? k
        const oldVal = prev?.[k]
        const newVal = next[k]
        if (oldVal != null && newVal != null && newVal !== 'updated') {
          return `${label}: "${oldVal}" → "${newVal}"`
        }
        return label
      })

      return t('chargeConfig.audit.detail.changedFields', {
        fields: diffs.join(', '),
        defaultValue: `Changed: ${diffs.join(', ')}`,
      })
    }

    case 'STATUS_CHANGED': {
      const to = meta.to as string | undefined
      if (to === 'active') {
        return t('chargeConfig.audit.detail.activated', 'Activated')
      }
      if (to === 'inactive') {
        return t('chargeConfig.audit.detail.deactivated', 'Deactivated')
      }
      return null
    }

    default:
      return null
  }
}

const ChargeConfigAuditTrailCard: React.FC<Props> = ({ chargeConfigId }) => {
  const { t } = useTranslation('payments')
  const { resolveUserName } = useEntityNames()
  const { data, isLoading, isError } = useGetChargeConfigAuditQuery(chargeConfigId)
  const entries = data?.data ?? []
  const [expanded, setExpanded] = useState(false)
  const visibleEntries = expanded ? entries : entries.slice(0, INITIAL_VISIBLE)
  const hasMore = entries.length > INITIAL_VISIBLE

  if (isLoading) {
    return (
      <CCard className="shadow-sm border-0 mb-3">
        <CCardHeader className="bg-transparent">
          <strong>{t('chargeConfig.audit.title', 'Activity History')}</strong>
        </CCardHeader>
        <CCardBody className="text-center py-4">
          <CSpinner />
        </CCardBody>
      </CCard>
    )
  }

  if (isError) return null

  const statusColor = (to: string): string => {
    switch (to) {
      case 'active': return 'success'
      case 'inactive': return 'secondary'
      default: return 'info'
    }
  }

  const actionColor = (action: string): string => {
    switch (action) {
      case 'CREATED': return 'primary'
      case 'RESTRUCTURED': return 'warning'
      case 'CHARGE_EDITED': return 'info'
      case 'STATUS_CHANGED': return 'secondary'
      default: return 'primary'
    }
  }

  return (
    <CCard className="shadow-sm border-0 mb-3">
      <CCardHeader className="bg-transparent">
        <strong>{t('chargeConfig.audit.title', 'Activity History')}</strong>
        {entries.length > 0 && (
          <CBadge color="secondary" className="ms-2">{entries.length}</CBadge>
        )}
      </CCardHeader>
      <CCardBody>
        {entries.length === 0 ? (
          <CAlert color="info" className="mb-0">
            {t('chargeConfig.audit.noEntries', 'No activity recorded yet.')}
          </CAlert>
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
              const detail = getChargeConfigAuditDetail(entry, t)
              const meta = (entry.metadata ?? {}) as Record<string, unknown>

              return (
                <div
                  key={entry.id}
                  className={`position-relative ${idx < visibleEntries.length - 1 ? 'pb-4' : ''}`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`position-absolute bg-${actionColor(entry.action)} rounded-circle`}
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
                        {t(`chargeConfig.audit.action.${entry.action}`, entry.action)}
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
                      <small className="text-body-secondary">
                        {resolveUserName(entry.changedBy) || entry.changedBy}
                      </small>
                      {entry.action === 'STATUS_CHANGED' && typeof meta.to === 'string' && (
                        <CBadge color={statusColor(meta.to)} size="sm">
                          {meta.to.toUpperCase()}
                        </CBadge>
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
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded
                ? t('chargeConfig.audit.showLess', 'Show less')
                : t('chargeConfig.audit.showAll', `Show all activity (${entries.length})`)}
            </CButton>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default React.memo(ChargeConfigAuditTrailCard)
