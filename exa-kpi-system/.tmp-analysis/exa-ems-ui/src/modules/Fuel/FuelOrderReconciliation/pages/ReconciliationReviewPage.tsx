import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CDropdownItem,
  CRow,
  CSmartTable,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCheckCircle, cilDrop, cilOptions, cilTrash } from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ConfirmDialog from '../../../../components/ConfirmationModal'

import {
  fetchUploadSession,
  processReconciliation,
  deleteGasStationTransaction,
  removeTransaction,
  removeAllDuplicates,
  resetStatuses,
  selectReconciliationData,
  selectReconciliationErrors,
  selectReconciliationStatuses,
  selectReconciliationLoadingData,
  selectReconciliationProcessing,
  selectReconciliationGasStationId,
  selectReconciliationGasStationName,
  selectReconciliationUploadDate,
  selectReconciliationTotalTransactions,
  selectReconciliationMatchedTransactions,
  selectReconciliationUnmatchedTransactions,
} from '../store/fuelOrderReconciliation.slice'

import { permissionService, DELETE } from '../../../../services/auth/permission.service'
import { MODULE_FUEL_ORDER_RECONCILIATION } from '../../../../constants/modules'

const ReconciliationReviewPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { uploadSessionId } = useParams<{ uploadSessionId: string }>()

  const reconciliationData = useSelector(selectReconciliationData)
  const errors = useSelector(selectReconciliationErrors)
  const statuses = useSelector(selectReconciliationStatuses)
  const loading = useSelector(selectReconciliationLoadingData)
  const processing = useSelector(selectReconciliationProcessing)
  const gasStationId = useSelector(selectReconciliationGasStationId)
  const gasStationName = useSelector(selectReconciliationGasStationName)
  const uploadDate = useSelector(selectReconciliationUploadDate)
  const totalTransactions = useSelector(selectReconciliationTotalTransactions)
  const matchedTransactions = useSelector(selectReconciliationMatchedTransactions)
  const unmatchedTransactions = useSelector(selectReconciliationUnmatchedTransactions)

  const COLUMN_STORAGE_KEY = 'reconReview_visible_columns'
  const ALL_COLUMN_KEYS = [
    'transactionId', 'documentNumber', 'dateTime', 'licensePlate', 'fuelType',
    'measureUnit', 'quantity', 'unitPrice', 'amount', 'currency',
    'paymentMethod', 'reconciliationStatus', 'discrepancyReason', 'fuelOrderId',
  ]

  const loadSavedColumns = () => {
    const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
    if (saved) {
      try { return JSON.parse(saved) } catch { /* ignore */ }
    }
    return ALL_COLUMN_KEYS
  }

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | string | null>(null)

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const isNewUpload = uploadSessionId === 'new'
  const canDelete = permissionService.checkPermission(MODULE_FUEL_ORDER_RECONCILIATION, DELETE)

  useEffect(() => {
    if (!isNewUpload && uploadSessionId) {
      dispatch(fetchUploadSession(Number(uploadSessionId)))
    }
  }, [dispatch, uploadSessionId, isNewUpload])

  useEffect(() => {
    if (statuses.processed) {
      const toast = (window as any).exaToast
      toast?.success?.('Success', 'Reconciliation processed successfully')
      dispatch(resetStatuses())
      navigate('/fuel/fuelorderreconciliation')
    }
    if (statuses.deleted) {
      const toast = (window as any).exaToast
      toast?.success?.('Success', 'Transaction deleted')
      dispatch(resetStatuses())
    }
  }, [statuses, dispatch, navigate])

  const hasDuplicates = useMemo(() => {
    return reconciliationData.some((t) => t.isDuplicate)
  }, [reconciliationData])

  const handleBack = () => navigate('/fuel/fuelorderreconciliation')

  const handleProcess = () => {
    if (hasDuplicates) {
      const toast = (window as any).exaToast
      toast?.warning?.('Warning', 'Please remove all duplicates before processing')
      return
    }
    if (gasStationId) {
      dispatch(
        processReconciliation({
          data: reconciliationData,
          gasStationId,
        }),
      )
    }
  }

  const handleRemoveDuplicates = () => {
    dispatch(removeAllDuplicates())
  }

  const handleDeleteTransaction = (id: number | string) => {
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return
    if (isNewUpload) {
      dispatch(removeTransaction(String(pendingDeleteId)))
    } else {
      await dispatch(deleteGasStationTransaction(Number(pendingDeleteId)))
    }
  }

  const columns = [
    { key: 'transactionId', label: 'Transaction ID', sorter: true, filter: true },
    { key: 'documentNumber', label: 'Document #', sorter: true, filter: true },
    { key: 'dateTime', label: 'Date/Time', sorter: true, filter: false },
    { key: 'licensePlate', label: 'Plate', sorter: true, filter: true },
    { key: 'fuelType', label: 'Fuel Type', sorter: true, filter: true },
    { key: 'measureUnit', label: 'Unit', sorter: true, filter: true },
    { key: 'quantity', label: 'Quantity', sorter: true, filter: false },
    { key: 'unitPrice', label: 'Unit Price', sorter: true, filter: false },
    { key: 'amount', label: 'Amount', sorter: true, filter: false },
    { key: 'currency', label: 'Currency', sorter: true, filter: true },
    { key: 'paymentMethod', label: 'Payment Method', sorter: true, filter: true },
    { key: 'reconciliationStatus', label: 'Status', sorter: true, filter: true },
    { key: 'discrepancyReason', label: 'Discrepancy Reason', sorter: true, filter: true },
    { key: 'fuelOrderId', label: 'Order ID', sorter: true, filter: true },
    { key: 'actions', label: 'Actions', sorter: false, filter: false, _style: { width: '80px' } },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )

  if (loading) {
    return (
      <CContainer fluid className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-2">Loading reconciliation data...</p>
      </CContainer>
    )
  }

  return (
    <CContainer fluid>
      <PageHero
        kicker="Fuel"
        icon={cilDrop}
        title={
          isNewUpload
            ? 'Review Reconciliation Upload'
            : `Reconciliation Session #${uploadSessionId}`
        }
        actions={
          <div className="d-flex gap-2">
            <CButton color="secondary" variant="outline" onClick={handleBack}>
              <CIcon icon={cilArrowLeft} className="me-2" /> Back
            </CButton>
            <CDropdown alignment="end">
              <CDropdownToggle color="secondary" variant="outline">
                <CIcon icon={cilOptions} className="me-2" />
                Columns ({visibleColumns.length})
              </CDropdownToggle>
              <CDropdownMenu style={{ minWidth: '220px', maxHeight: '360px', overflowY: 'auto' }}>
                <div className="px-3 py-2">
                  <small className="text-body-secondary fw-semibold">SELECT COLUMNS</small>
                </div>
                <div className="dropdown-divider" />
                {columns.filter((c) => c.key !== 'actions').map((col) => (
                  <div key={col.key} className="form-check px-5 py-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`recon-col-${col.key}`}
                      checked={visibleColumns.includes(col.key)}
                      onChange={(e) => {
                        if (e.target.checked) setVisibleColumns([...visibleColumns, col.key])
                        else if (visibleColumns.length > 1)
                          setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                      }}
                    />
                    <label className="form-check-label" htmlFor={`recon-col-${col.key}`}>
                      {col.label}
                    </label>
                  </div>
                ))}
              </CDropdownMenu>
            </CDropdown>
            {isNewUpload && hasDuplicates && (
              <CButton color="warning" onClick={handleRemoveDuplicates}>
                <CIcon icon={cilTrash} className="me-2" /> Delete All Duplicates
              </CButton>
            )}
            {isNewUpload && (
              <CButton
                color="success"
                className="text-white"
                onClick={handleProcess}
                disabled={processing || hasDuplicates}
              >
                {processing ? (
                  <CSpinner size="sm" className="me-2" />
                ) : (
                  <CIcon icon={cilCheckCircle} className="me-2" />
                )}
                Confirm and Process
              </CButton>
            )}
          </div>
        }
      />

      {gasStationName && (
        <CAlert color="info" className="mb-3">
          <strong>Gas Station:</strong> {gasStationName} |{' '}
          <strong>Transactions:</strong> {reconciliationData.length}
          {!isNewUpload && (
            <>
              {' '}| <strong>Session ID:</strong> {uploadSessionId}
              {uploadDate && <>{' '}| <strong>Upload Date:</strong> {new Date(uploadDate).toLocaleDateString()}</>}
              {' '}| <strong>Matched:</strong> {matchedTransactions}
              {' '}| <strong>Unmatched:</strong> {unmatchedTransactions}
            </>
          )}
          {hasDuplicates && (
            <CBadge color="warning" className="ms-2">
              Contains Duplicates
            </CBadge>
          )}
        </CAlert>
      )}

      {errors && (
        <CAlert color="danger" className="mb-3">
          {typeof errors === 'string' ? errors : 'An error occurred'}
        </CAlert>
      )}

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          <CSmartTable
            items={reconciliationData}
            columns={activeColumns}
            itemsPerPage={itemsPerPage}
            pagination
            columnFilter
            columnSorter
            tableProps={{
              hover: true,
              striped: true,
              responsive: true,
              className: 'align-middle',
            }}
            scopedColumns={{
              reconciliationStatus: (item: any) => (
                <td>
                  <CBadge
                    color={
                      item.reconciliationStatus?.toLowerCase()?.includes('matched')
                        ? 'success'
                        : item.reconciliationStatus?.toLowerCase()?.includes('discrepancy')
                          ? 'warning'
                          : item.isDuplicate
                            ? 'danger'
                            : 'secondary'
                    }
                  >
                    {item.isDuplicate ? 'Duplicate' : item.reconciliationStatus ?? 'Unmatched'}
                  </CBadge>
                </td>
              ),
              actions: (item: any) => (
                <td>
                  {(canDelete || isNewUpload) && (
                    <CButton
                      color="danger"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleDeleteTransaction(
                          isNewUpload
                            ? item.transactionId
                            : item.gasStationTransactionId,
                        )
                      }
                      title="Delete"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  )}
                </td>
              ),
            }}
            tableBodyProps={{
              className: reconciliationData.some((t) => t.isDuplicate)
                ? ''
                : '',
            }}
          />
        </CCardBody>

        {/* Custom items-per-page selector */}
        <div className="d-flex justify-content-end align-items-center pe-3 pb-2">
          <span className="me-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
          <CDropdown direction="dropup">
            <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
              {itemsPerPage}
            </CDropdownToggle>
            <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
              {[15, 20, 50, 100].map((n) => (
                <CDropdownItem
                  key={n}
                  active={n === itemsPerPage}
                  onClick={() => setItemsPerPage(n)}
                  style={{ padding: '0.5rem 1.25rem', cursor: 'pointer' }}
                >
                  {n}
                </CDropdownItem>
              ))}
            </CDropdownMenu>
          </CDropdown>
        </div>
      </CCard>

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction?"
        onClose={() => {
          setConfirmVisible(false)
          setPendingDeleteId(null)
        }}
        onConfirm={confirmDelete}
      />
    </CContainer>
  )
}

export default ReconciliationReviewPage
