import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CFormSelect,
  CRow,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilDrop, cilLink, cilLinkBroken } from '@coreui/icons'
import { Link } from 'react-router-dom'

import type { AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import DiffTable from '../components/DiffTable'
import InfoTable from '../components/InfoTable'
import LookupModal from '../components/LookupModal'
import {
  validatePaymentStatusChange,
  getStatusGroup,
  GAS_NOT_READY,
  GAS_NOT_APPLY,
  SUB_NOT_READY,
  SUB_NOT_APPLY,
} from '../utils/fuelAuditorUtils'
import './FuelAuditorView.scss'

import {
  fetchFuelAuditorTransaction,
  fetchLinkedFuelOrder,
  linkFuelOrder,
  updateAuditorPaymentStatus,
  loadGasSupplierPaymentStatusOptions,
  loadSubdivisionPaymentStatusOptions,
  resetStatuses,
  selectFuelAuditorCurrent,
  selectFuelAuditorCurrentFuelOrder,
  selectFuelAuditorErrors,
  selectFuelAuditorStatuses,
  selectFuelAuditorLoadingCurrent,
  selectFuelAuditorGasSupplierStatuses,
  selectFuelAuditorSubdivisionStatuses,
} from '../store/fuelAuditor.slice'

const formatMoney = (value: number | string | null | undefined, currency?: string): string => {
  if (value == null || value === '') return '-'
  const num = Number(value)
  if (isNaN(num)) return String(value)
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${currency} ${formatted}` : formatted
}

const getReconBadgeColor = (status?: string): string => {
  if (!status) return 'secondary'
  const lower = status.toLowerCase()
  if (lower.includes('matched') && !lower.includes('unmatched')) return 'success'
  if (lower.includes('discrepancy')) return 'warning'
  if (lower.includes('unmatched')) return 'danger'
  return 'secondary'
}

const FuelAuditorViewPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const txn = useSelector(selectFuelAuditorCurrent)
  const fuelOrder = useSelector(selectFuelAuditorCurrentFuelOrder)
  const errors = useSelector(selectFuelAuditorErrors)
  const statuses = useSelector(selectFuelAuditorStatuses)
  const loading = useSelector(selectFuelAuditorLoadingCurrent)
  const gasSupplierStatuses = useSelector(selectFuelAuditorGasSupplierStatuses)
  const subdivisionStatuses = useSelector(selectFuelAuditorSubdivisionStatuses)

  const [lookupOpen, setLookupOpen] = useState(false)
  const [gsPaymentStatus, setGsPaymentStatus] = useState<number | undefined>()
  const [subPaymentStatus, setSubPaymentStatus] = useState<number | undefined>()
  const [paymentDirty, setPaymentDirty] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSaveRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (id) {
      dispatch(fetchFuelAuditorTransaction(Number(id)))
      dispatch(loadGasSupplierPaymentStatusOptions())
      dispatch(loadSubdivisionPaymentStatusOptions())
    }
  }, [dispatch, id])

  useEffect(() => {
    if (txn?.fuelOrderId) {
      dispatch(fetchLinkedFuelOrder(txn.fuelOrderId))
    }
  }, [dispatch, txn?.fuelOrderId])

  useEffect(() => {
    if (fuelOrder) {
      setGsPaymentStatus(fuelOrder.gasSupplierPaymentStatus ?? undefined)
      setSubPaymentStatus(fuelOrder.subdivisionPaymentStatus ?? undefined)
      setPaymentDirty(false)
    }
  }, [fuelOrder])

  useEffect(() => {
    const toast = (window as any).exaToast
    if (statuses.updated) {
      toast?.success?.('Success', 'Updated successfully')
      dispatch(resetStatuses())
      if (id) {
        dispatch(fetchFuelAuditorTransaction(Number(id)))
      }
    }
  }, [statuses, dispatch, id])

  const handleBack = () => navigate('/fuel/fuelauditor')

  const handleLinkSelect = useCallback(
    (order: any) => {
      if (txn) {
        dispatch(
          linkFuelOrder({
            transactionId: txn.gasStationTransactionId,
            fuelOrderId: order.fuelOrderId,
          }),
        )
        setLookupOpen(false)
      }
    },
    [dispatch, txn],
  )

  const gasPaymentId = fuelOrder?.gasSupplierPaymentStatus ?? (txn as any)?.gas_supplier_payment_status
  const subPaymentId = fuelOrder?.subdivisionPaymentStatus ?? (txn as any)?.subdivision_payment_status
  const canUnlink =
    (gasPaymentId === GAS_NOT_READY || gasPaymentId === GAS_NOT_APPLY) &&
    (subPaymentId === SUB_NOT_READY || subPaymentId === SUB_NOT_APPLY)

  const handleUnlink = () => {
    if (!canUnlink) {
      const toast = (window as any).exaToast
      const msg = 'Cannot unlink: Gas Supplier and Subdivision payment statuses must be "Not Ready" or "Does Not Apply".'
      toast?.error ? toast.error('Validation', msg) : alert(msg)
      return
    }
    if (txn) {
      dispatch(
        linkFuelOrder({
          transactionId: txn.gasStationTransactionId,
          fuelOrderId: null,
        }),
      )
    }
  }

  const handleSavePaymentStatus = () => {
    if (!fuelOrder?.fuelOrderId) return
    const toast = (window as any).exaToast

    if (gsPaymentStatus != null) {
      const gsCheck = validatePaymentStatusChange(
        fuelOrder,
        'gas_supplier_payment_status',
        gsPaymentStatus,
      )
      if (!gsCheck.valid) {
        toast?.error?.('Validation', gsCheck.message ?? 'Invalid gas supplier status transition')
        return
      }
    }
    if (subPaymentStatus != null) {
      const subCheck = validatePaymentStatusChange(
        fuelOrder,
        'subdivision_payment_status',
        subPaymentStatus,
      )
      if (!subCheck.valid) {
        toast?.error?.('Validation', subCheck.message ?? 'Invalid subdivision status transition')
        return
      }
    }

    dispatch(
      updateAuditorPaymentStatus({
        fuelOrderId: fuelOrder.fuelOrderId,
        gasSupplierPaymentStatus: gsPaymentStatus,
        subdivisionPaymentStatus: subPaymentStatus,
      }),
    )
  }

  handleSaveRef.current = handleSavePaymentStatus

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        navigate('/fuel/fuelauditor')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  useEffect(() => {
    if (!fuelOrder?.fuelOrderId || !paymentDirty) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveRef.current()
      setPaymentDirty(false)
    }, 2000)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [gsPaymentStatus, subPaymentStatus, fuelOrder?.fuelOrderId, paymentDirty])

  const isReconciled = txn?.reconciliationStatus?.toLowerCase()?.includes('matched') ?? false
  const inGsStatement = !!(fuelOrder as any)?.gasStationStatementId
  const inSubStatement = !!(fuelOrder as any)?.fuelStatementId

  const filterStatusesByState = useCallback(
    (statuses: any[], isInStatement: boolean) => {
      return statuses.filter((s) => {
        const group = getStatusGroup(s.value)
        if (isInStatement) return true
        if (!isReconciled) return group === 'not_ready' || group === 'not_apply'
        return group !== 'completed'
      })
    },
    [isReconciled],
  )

  const filteredGsStatuses = useMemo(
    () => filterStatusesByState(gasSupplierStatuses, inGsStatement),
    [gasSupplierStatuses, inGsStatement, filterStatusesByState],
  )
  const filteredSubStatuses = useMemo(
    () => filterStatusesByState(subdivisionStatuses, inSubStatement),
    [subdivisionStatuses, inSubStatement, filterStatusesByState],
  )

  if (loading) {
    return (
      <CContainer fluid className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-2">Loading transaction...</p>
      </CContainer>
    )
  }

  if (!txn) {
    return (
      <CContainer fluid>
        <CCard>
          <CCardBody>Transaction not found.</CCardBody>
        </CCard>
      </CContainer>
    )
  }

  const stationName =
    txn.gasStationName ?? txn.gasStation?.name ?? txn.GasStation?.name ?? '-'
  const amountDifferenceColor =
    txn.amountDifference != null && Math.abs(txn.amountDifference) < 0.01 ? 'text-success' : 'text-warning'
  const unitPriceDifferenceColor =
    txn.unitPriceDifference != null && Math.abs(txn.unitPriceDifference) < 0.01 ? 'text-success' : 'text-warning'
  const matchScore = (() => {
    if (txn.amountDifference == null || txn.amount == null || txn.amount === 0) return null
    const pct = Math.max(0, 100 - (Math.abs(txn.amountDifference) / Math.abs(Number(txn.amount))) * 100)
    return Math.round(pct * 10) / 10
  })()
  const matchScoreColor =
    matchScore == null ? 'text-body-secondary' : matchScore >= 95 ? 'text-success' : matchScore >= 80 ? 'text-warning' : 'text-danger'

  return (
    <CContainer fluid className="fuel-auditor-view-page">
      <PageHero
        kicker="Fuel Auditor"
        icon={cilDrop}
        title={`Transaction #${txn.gasStationTransactionId}`}
        subtitle={stationName}
        highlights={[
          { label: 'Reconciliation', value: txn.reconciliationStatus ?? 'Unknown', color: getReconBadgeColor(txn.reconciliationStatus) },
          { label: 'Source', value: txn.source ?? 'Unknown' },
          { label: 'Fuel Order', value: txn.fuelOrderId ?? 'Unlinked', color: txn.fuelOrderId ? 'primary' : 'light' },
          { label: 'Duplicate', value: txn.isDuplicate ? 'Yes' : 'No', color: txn.isDuplicate ? 'warning' : 'light' },
        ]}
        actions={
          <div className="d-flex gap-2 flex-wrap">
            <CButton color="secondary" variant="outline" onClick={handleBack}>
              <CIcon icon={cilArrowLeft} className="me-2" /> Back
            </CButton>
            {!txn.fuelOrderId && (
              <CButton color="primary" onClick={() => setLookupOpen(true)}>
                <CIcon icon={cilLink} className="me-2" /> Link Fuel Order
              </CButton>
            )}
            {txn.fuelOrderId && (
              <CButton
                color="warning"
                onClick={handleUnlink}
                disabled={!canUnlink}
                title={canUnlink ? 'Unlink fuel order' : 'Payment statuses must be "Not Ready" or "Does Not Apply" to unlink'}
              >
                <CIcon icon={cilLinkBroken} className="me-2" /> Unlink
              </CButton>
            )}
          </div>
        }
      />

      <div className="fuel-auditor-view-overview">
        <div className="view-overview-card">
          <span className="view-overview-card__label">Document</span>
          <strong className="view-overview-card__value">{txn.documentNumber ?? '-'}</strong>
        </div>
        <div className="view-overview-card">
          <span className="view-overview-card__label">Date/Time</span>
          <strong className="view-overview-card__value">{txn.dateTimeFormat ?? txn.dateTime ?? '-'}</strong>
        </div>
        <div className="view-overview-card">
          <span className="view-overview-card__label">Amount</span>
          <strong className="view-overview-card__value">{formatMoney(txn.amount, txn.currency)}</strong>
        </div>
        <div className="view-overview-card">
          <span className="view-overview-card__label">Fuel Type</span>
          <strong className="view-overview-card__value">{txn.fuelType ?? '-'}</strong>
        </div>
      </div>

      <CRow className="g-3">
        <CCol lg={fuelOrder ? 6 : 12}>
          <CCard className="mb-3 fuel-auditor-view-card">
            <CCardHeader className="fuel-auditor-view-card__header">
              <div>
                <div className="fuel-auditor-view-card__eyebrow">Transaction details</div>
                <strong>Audited transaction snapshot</strong>
              </div>
            </CCardHeader>
            <CCardBody className="fuel-auditor-view-card__body">
              <InfoTable
                rows={[
                  ['Transaction ID', txn.gasStationTransactionId],
                  ['POS Transaction', txn.transactionId],
                  ['Fuel Order', txn.fuelOrderId ? <Link to={`/fuel/fuelorder/${txn.fuelOrderId}`}>{txn.fuelOrderId}</Link> : null],
                  ['Fuel Order Ref', txn.fuelOrderIdReference],
                  ['Document #', txn.documentNumber],
                  ['Date/Time', txn.dateTimeFormat ?? txn.dateTime],
                  ['Gas Station', stationName],
                  ['Measure Unit', txn.measureUnit],
                  ['Quantity', txn.quantity != null ? Number(txn.quantity).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(/0+$/, '').replace(/\.$/, '') : '-'],
                  ['Unit Price', (() => {
                    const txnPrice = formatMoney(txn.unitPrice, txn.currency)
                    const orderPrice = fuelOrder?.unitPrice != null ? formatMoney(fuelOrder.unitPrice, fuelOrder.currency ?? txn.currency) : '--'
                    return `Txn: ${txnPrice} | Order: ${orderPrice}`
                  })()],
                  ['Currency', txn.currency],
                  ['Amount', formatMoney(txn.amount, txn.currency)],
                  ['Payment Method', txn.paymentMethod],
                  ['Fuel Type', txn.fuelType],
                  ['Reconciliation', <CBadge color={getReconBadgeColor(txn.reconciliationStatus)}>{txn.reconciliationStatus ?? '-'}</CBadge>],
                  ['Duplicate', txn.isDuplicate ? 'Yes' : 'No'],
                  ['Source', txn.source],
                  ['GS Payment Status', txn.gasSupplierPaymentStatusName],
                  ['Subdivision Payment Status', txn.subdivisionPaymentStatusName],
                ]}
              />
            </CCardBody>
          </CCard>
        </CCol>

        {fuelOrder && (
          <CCol lg={6}>
            <CCard className="mb-3 fuel-auditor-view-card">
              <CCardHeader className="fuel-auditor-view-card__header">
                <div>
                  <div className="fuel-auditor-view-card__eyebrow">Payment workflow</div>
                  <strong>Payment status</strong>
                </div>
              </CCardHeader>
              <CCardBody className="fuel-auditor-view-card__body">
                <p className="fuel-auditor-view-card__description">
                  Update fuel order payment statuses directly from the audited transaction context.
                </p>
                <CRow className="g-3 mb-3">
                  <CCol md={6}>
                    <label className="form-label fuel-auditor-view-label">Gas Supplier Payment</label>
                    <CFormSelect
                      className="fuel-auditor-view-select"
                      value={gsPaymentStatus ?? ''}
                      onChange={(e) => {
                        setGsPaymentStatus(Number(e.target.value) || undefined)
                        setPaymentDirty(true)
                      }}
                    >
                      <option value="">Select...</option>
                      {filteredGsStatuses.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={6}>
                    <label className="form-label fuel-auditor-view-label">Subdivision Payment</label>
                    <CFormSelect
                      className="fuel-auditor-view-select"
                      value={subPaymentStatus ?? ''}
                      onChange={(e) => {
                        setSubPaymentStatus(Number(e.target.value) || undefined)
                        setPaymentDirty(true)
                      }}
                    >
                      <option value="">Select...</option>
                      {filteredSubStatuses.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>
                <CButton
                  color="primary"
                  size="sm"
                  className="fuel-auditor-view-save"
                  onClick={handleSavePaymentStatus}
                >
                  Save Payment Status
                </CButton>
              </CCardBody>
            </CCard>
          </CCol>
        )}
      </CRow>

      {fuelOrder && (
        <CRow className="mb-3 g-3">
          <CCol md={4}>
            <CCard className="fuel-auditor-metric-card text-center">
              <CCardBody>
                <div className="fuel-auditor-metric-card__label">Amount Difference</div>
                <h4 className={`fuel-auditor-metric-card__value ${amountDifferenceColor}`}>
                  {txn.amountDifference != null ? `${txn.amountDifference >= 0 ? '+' : ''}${txn.amountDifference.toFixed(2)}` : 'N/A'}
                </h4>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={4}>
            <CCard className="fuel-auditor-metric-card text-center">
              <CCardBody>
                <div className="fuel-auditor-metric-card__label">Unit Price Difference</div>
                <h4 className={`fuel-auditor-metric-card__value ${unitPriceDifferenceColor}`}>
                  {txn.unitPriceDifference != null ? `${txn.unitPriceDifference >= 0 ? '+' : ''}${txn.unitPriceDifference.toFixed(2)}%` : 'N/A'}
                </h4>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={4}>
            <CCard className="fuel-auditor-metric-card text-center">
              <CCardBody>
                <div className="fuel-auditor-metric-card__label">Match Score</div>
                <h4 className={`fuel-auditor-metric-card__value ${matchScoreColor}`}>
                  {matchScore == null ? 'N/A' : `${matchScore}%`}
                </h4>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}

      <CCard className="mb-3 fuel-auditor-view-card">
        <CCardHeader className="fuel-auditor-view-card__header">
          <div>
            <div className="fuel-auditor-view-card__eyebrow">Reconciliation analysis</div>
            <strong>Comparison</strong>
          </div>
        </CCardHeader>
        <CCardBody className="fuel-auditor-view-card__body">
          <DiffTable txn={txn} order={fuelOrder ?? null} />
        </CCardBody>
      </CCard>

      <LookupModal
        isOpen={lookupOpen}
        toggle={() => setLookupOpen(false)}
        onSelect={handleLinkSelect}
        transactionData={txn}
      />
    </CContainer>
  )
}

export default FuelAuditorViewPage
