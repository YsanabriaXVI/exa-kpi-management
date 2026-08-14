import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import { useRestructureChargeConfigMutation } from '../api/paymentCoreApi'
import type { FrequencyType } from '../types.v2'

/**
 * Restructure a flexible charge-config's schedule.
 *
 * Paid (DEDUCTED) installments are preserved untouched. The NOT_PAID tail is
 * soft-cancelled (status → CANCELLED, rows kept for audit) and a new tranche
 * is appended sized to the remaining balance.
 *
 * The preview table below the inputs is client-computed (identical math to the
 * backend) so the user can verify the schedule before hitting Restructure.
 */
export interface RestructureChargeConfigModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  configId: string
  configName: string
  /** Current total value on the rule. Used as the input default. */
  currentTotalValue: number
  /** Number of already-paid (DEDUCTED) installments. */
  paidCount: number
  /** Sum of already-paid installments, same currency as totalValue. */
  paidAmount: number
  /** Current updatedAt of the config — sent for optimistic concurrency. */
  updatedAt?: string | null
}

const RestructureChargeConfigModal: React.FC<RestructureChargeConfigModalProps> = ({
  visible,
  onClose,
  onSuccess,
  configId,
  configName,
  currentTotalValue,
  paidCount,
  paidAmount,
  updatedAt,
}) => {
  const [newTotalValue, setNewTotalValue] = useState<string>(String(currentTotalValue))
  const [newRemainingCount, setNewRemainingCount] = useState<string>('12')
  const [newFrequency, setNewFrequency] = useState<FrequencyType>('MONTHLY')
  const [newStartDate, setNewStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1) // default: tomorrow, matches backend "not past" guard
    return d.toISOString().slice(0, 10)
  })
  const [reason, setReason] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)

  const [restructure, { isLoading, error }] = useRestructureChargeConfigMutation()

  // Reset form state whenever the modal opens for a different config
  useEffect(() => {
    if (visible) {
      setNewTotalValue(String(currentTotalValue))
      setNewRemainingCount('12')
      setNewFrequency('MONTHLY')
      const d = new Date()
      d.setDate(d.getDate() + 1)
      setNewStartDate(d.toISOString().slice(0, 10))
      setReason('')
      setFormError(null)
    }
  }, [visible, currentTotalValue])

  // Remaining balance after the user-entered new total minus already paid
  const remainingBalance = useMemo(() => {
    const total = parseFloat(newTotalValue)
    if (isNaN(total)) return 0
    return Math.max(0, total - paidAmount)
  }, [newTotalValue, paidAmount])

  // Client-side preview of the new tranche — mirrors the backend's rounding
  // (first n-1 rows at round(remaining/n, 2), last row absorbs the difference)
  const preview = useMemo(() => {
    const count = parseInt(newRemainingCount, 10)
    if (!count || count < 1 || remainingBalance <= 0 || !newStartDate) return []
    const perRow = Math.round((remainingBalance / count) * 100) / 100
    const lastRow = Math.round((remainingBalance - perRow * (count - 1)) * 100) / 100
    const start = new Date(newStartDate + 'T00:00:00')
    const rows: Array<{ num: number; date: string; amount: number }> = []
    for (let i = 0; i < count; i++) {
      const d = new Date(start)
      if (newFrequency === 'WEEKLY') d.setDate(d.getDate() + i * 7)
      else d.setMonth(d.getMonth() + i)
      rows.push({
        num: i + 1,
        date: d.toLocaleDateString(),
        amount: i === count - 1 ? lastRow : perRow,
      })
    }
    return rows
  }, [newRemainingCount, newFrequency, newStartDate, remainingBalance])

  const totalNewAmount = useMemo(
    () => preview.reduce((sum, r) => sum + r.amount, 0),
    [preview],
  )

  const handleSubmit = async () => {
    setFormError(null)

    // Lightweight client-side validation — the backend re-validates, this
    // just catches obvious mistakes before a round-trip.
    const total = parseFloat(newTotalValue)
    const count = parseInt(newRemainingCount, 10)
    if (isNaN(total) || total <= 0) {
      setFormError('New total value must be a positive number.')
      return
    }
    if (total < paidAmount) {
      setFormError(
        `New total (${total.toFixed(2)}) must be at least the amount already paid (${paidAmount.toFixed(2)}).`,
      )
      return
    }
    if (!count || count < 1) {
      setFormError('Remaining count must be at least 1.')
      return
    }
    if (!newStartDate) {
      setFormError('Start date is required.')
      return
    }
    const startMs = new Date(newStartDate + 'T00:00:00').getTime()
    const todayMs = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()
    if (startMs < todayMs) {
      setFormError('Start date cannot be in the past.')
      return
    }

    try {
      await restructure({
        id: configId,
        body: {
          newTotalValue: total !== currentTotalValue ? total : undefined,
          newRemainingCount: count,
          newFrequency,
          newStartDate,
          expectedUpdatedAt: updatedAt ?? undefined,
          reason: reason.trim() || undefined,
        },
      }).unwrap()
      onSuccess()
    } catch (err: any) {
      // RTK Query error shape: { status, data: { error?: { message }, message? } }
      const msg =
        err?.data?.error?.message ||
        err?.data?.message ||
        err?.error ||
        'Failed to restructure the schedule.'
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg" backdrop="static">
      <CModalHeader>
        <CModalTitle>Restructure flexible schedule</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {/* Current state summary */}
        <CAlert color="info" className="mb-3">
          <div className="mb-1">
            <strong>Current state:</strong>
          </div>
          <div className="small">
            Config: <code>{configName}</code>
          </div>
          <div className="small">
            Already paid: <CBadge color="success">{paidCount}</CBadge> installments totaling{' '}
            <strong>{paidAmount.toFixed(2)}</strong> — these will NOT be touched.
          </div>
          <div className="small">
            Original total: <strong>{currentTotalValue.toFixed(2)}</strong> — NOT_PAID installments
            will be cancelled and replaced with a new schedule below.
          </div>
        </CAlert>

        {/* Inputs */}
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">New total value</label>
            <CFormInput
              type="number"
              min={paidAmount}
              step="0.01"
              value={newTotalValue}
              onChange={(e) => setNewTotalValue(e.target.value)}
            />
            <small className="text-body-secondary">
              Remaining to schedule: <strong>{remainingBalance.toFixed(2)}</strong>
            </small>
          </div>
          <div className="col-md-6">
            <label className="form-label">Remaining installments</label>
            <CFormInput
              type="number"
              min={1}
              step={1}
              value={newRemainingCount}
              onChange={(e) => setNewRemainingCount(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">New frequency</label>
            <CFormSelect
              value={newFrequency}
              onChange={(e) => setNewFrequency(e.target.value as FrequencyType)}
            >
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </CFormSelect>
          </div>
          <div className="col-md-6">
            <label className="form-label">New start date</label>
            <CFormInput
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Reason (optional)</label>
            <CFormTextarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Driver renegotiated schedule after missed payment"
            />
            <small className="text-body-secondary">
              Recorded in the audit log for finance review.
            </small>
          </div>
        </div>

        {/* Live preview of the new tranche */}
        {preview.length > 0 && (
          <div className="mt-4">
            <div className="d-flex align-items-center mb-2">
              <strong>New schedule preview</strong>
              <CBadge color="secondary" className="ms-2">
                {preview.length}
              </CBadge>
              <small className="ms-auto text-body-secondary">
                Sum: {totalNewAmount.toFixed(2)} (expected: {remainingBalance.toFixed(2)})
              </small>
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              <CTable small striped hover className="mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: '25%' }}>#</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {preview.map((row) => (
                    <CTableRow key={row.num}>
                      <CTableDataCell>#{row.num}</CTableDataCell>
                      <CTableDataCell>{row.date}</CTableDataCell>
                      <CTableDataCell className="text-end">{row.amount.toFixed(2)}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          </div>
        )}

        {/* Warning + error banners */}
        <CAlert color="warning" className="mt-3 mb-0">
          <strong>Heads up:</strong> restructuring will cancel any NOT_PAID installments on this
          config and create new ones in their place. Already-paid installments stay linked to their
          payments. This is logged in the audit trail and cannot be undone by editing — you'd need
          to restructure again with different numbers.
        </CAlert>

        {formError && (
          <CAlert color="danger" className="mt-3 mb-0">
            {formError}
          </CAlert>
        )}
        {error && !formError && (
          <CAlert color="danger" className="mt-3 mb-0">
            Request failed. Check your inputs and try again.
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </CButton>
        <CButton color="warning" onClick={handleSubmit} disabled={isLoading || preview.length === 0}>
          {isLoading ? <CSpinner size="sm" /> : 'Restructure schedule'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default RestructureChargeConfigModal
