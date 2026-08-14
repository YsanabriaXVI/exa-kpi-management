import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSmartTable,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilBan, cilCalendar } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import CurrencyDisplay from '../components/CurrencyDisplay'
import {
  useGetPendingInstallmentsQuery,
  useGetUpcomingInstallmentsQuery,
  useUpdateInstallmentMutation,
  useCancelInstallmentMutation,
} from '../api/paymentCoreApi'
import type { InstallmentListItem } from '../types.v2'
import { useToast } from '../hooks/useToast'

const statusColor = (status: string): string => {
  switch (status) {
    case 'PENDING': return 'warning'
    case 'DEDUCTED': return 'success'
    case 'CANCELLED': return 'danger'
    default: return 'secondary'
  }
}

const InstallmentsPage: React.FC = () => {
  const { t } = useTranslation('payments')
  const { addToast, ToasterComponent } = useToast()

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  // Queries
  const { data: pendingData, isLoading: isLoadingPending } = useGetPendingInstallmentsQuery({ page, pageSize })
  const { data: upcomingData, isLoading: isLoadingUpcoming } = useGetUpcomingInstallmentsQuery(10)

  const pendingItems = pendingData?.data ?? []
  const upcomingItems = upcomingData?.data ?? []
  const totalPages = pendingData?.meta?.lastPage ?? 1

  // Mutations
  const [updateInstallment, { isLoading: isUpdating }] = useUpdateInstallmentMutation()
  const [cancelInstallment, { isLoading: isCancelling }] = useCancelInstallmentMutation()

  // Edit modal
  const [editItem, setEditItem] = useState<InstallmentListItem | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editError, setEditError] = useState('')

  // Cancel confirm
  const [cancelId, setCancelId] = useState<string | null>(null)

  const openEdit = (item: InstallmentListItem) => {
    setEditItem(item)
    setEditLabel(item.label ?? '')
    setEditDate(item.scheduledDate?.slice(0, 10) ?? '')
    setEditAmount(String(item.value))
    setEditError('')
  }

  const handleSaveEdit = async () => {
    if (!editItem) return
    const amount = parseFloat(editAmount)
    if (editAmount && (!amount || amount <= 0)) {
      setEditError(t('installments.amountError'))
      return
    }
    setEditError('')
    try {
      await updateInstallment({
        id: editItem.id,
        body: {
          ...(editLabel !== (editItem.label ?? '') ? { label: editLabel } : {}),
          ...(editDate !== editItem.scheduledDate?.slice(0, 10) ? { scheduledDate: editDate } : {}),
          ...(amount !== editItem.value ? { amount } : {}),
        },
      }).unwrap()
      setEditItem(null)
      addToast(t('installments.updateSuccess'), 'success')
    } catch (err: any) {
      setEditError(err?.data?.message || t('installments.updateFailed'))
    }
  }

  const handleCancel = async () => {
    if (!cancelId) return
    try {
      await cancelInstallment(cancelId).unwrap()
      setCancelId(null)
      addToast(t('installments.cancelSuccess'), 'success')
    } catch (err: any) {
      setCancelId(null)
      addToast(err?.data?.message || t('installments.cancelFailed'), 'danger')
    }
  }

  const columns = [
    { key: 'chargeConfigName', label: t('installments.chargeConfig') },
    { key: 'sequenceNumber', label: '#', _style: { width: '60px' } },
    { key: 'label', label: t('installments.label') },
    { key: 'scheduledDate', label: t('installments.scheduledDate') },
    { key: 'value', label: t('installments.amount') },
    { key: 'status', label: t('columns.status') },
    { key: 'actions', label: '', _style: { width: '100px' }, filter: false, sorter: false },
  ]

  const scopedColumns = {
    scheduledDate: (item: InstallmentListItem) => (
      <td>{item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—'}</td>
    ),
    value: (item: InstallmentListItem) => (
      <td><CurrencyDisplay value={item.value} currency="USD" /></td>
    ),
    label: (item: InstallmentListItem) => (
      <td>{item.label || '—'}</td>
    ),
    status: (item: InstallmentListItem) => (
      <td><CBadge color={statusColor(item.status)}>{t(`installments.status.${item.status}`, item.status)}</CBadge></td>
    ),
    actions: (item: InstallmentListItem) => (
      <td>
        {item.status === 'PENDING' && (
          <div className="d-flex gap-1">
            <CButton
              color="primary"
              variant="ghost"
              size="sm"
              onClick={() => openEdit(item)}
              title={t('actions.edit')}
            >
              <CIcon icon={cilPencil} />
            </CButton>
            <CButton
              color="danger"
              variant="ghost"
              size="sm"
              onClick={() => setCancelId(item.id)}
              title={t('installments.cancelInstallment')}
            >
              <CIcon icon={cilBan} />
            </CButton>
          </div>
        )}
      </td>
    ),
  }

  return (
    <>
      <ToasterComponent />
      <PageHero
        kicker="Operations"
        icon={cilCalendar}
        title={t('installments.title')}
        subtitle={t('installments.subtitle')}
      />

      <CRow className="g-4">
        {/* Main: Pending installments */}
        <CCol xs={12} lg={8}>
          <CCard className="shadow-sm border-0">
            <CCardHeader className="bg-transparent">
              <strong>{t('installments.pending')}</strong>
            </CCardHeader>
            <CCardBody>
              {isLoadingPending ? (
                <div className="text-center py-4"><CSpinner /></div>
              ) : pendingItems.length === 0 ? (
                <CAlert color="info" className="mb-0">{t('installments.noPending')}</CAlert>
              ) : (
                <>
                  <CSmartTable
                    items={pendingItems}
                    columns={columns as any}
                    scopedColumns={scopedColumns}
                    itemsPerPage={pageSize}
                    tableProps={{
                      hover: true,
                      striped: true,
                      responsive: true,
                      className: 'align-middle',
                    }}
                  />
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center gap-2 mt-3">
                      <CButton
                        color="secondary"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        {t('installments.prev')}
                      </CButton>
                      <span className="align-self-center text-body-secondary small">
                        {page} / {totalPages}
                      </span>
                      <CButton
                        color="secondary"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {t('installments.next')}
                      </CButton>
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* Sidebar: Upcoming installments */}
        <CCol xs={12} lg={4}>
          <CCard className="shadow-sm border-0">
            <CCardHeader className="bg-transparent">
              <strong>{t('installments.upcoming')}</strong>
            </CCardHeader>
            <CCardBody>
              {isLoadingUpcoming ? (
                <div className="text-center py-3"><CSpinner size="sm" /></div>
              ) : upcomingItems.length === 0 ? (
                <div className="text-body-secondary small">{t('installments.noUpcoming')}</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {upcomingItems.map((item) => (
                    <div
                      key={item.id}
                      className="d-flex justify-content-between align-items-center p-2 bg-body-tertiary rounded"
                    >
                      <div>
                        <div className="fw-semibold small">{item.chargeConfigName}</div>
                        <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
                          {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—'}
                          {item.label && ` — ${item.label}`}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-semibold">
                          <CurrencyDisplay value={item.value} currency="USD" />
                        </div>
                        <CBadge color={statusColor(item.status)} size="sm">
                          {t(`installments.status.${item.status}`, item.status)}
                        </CBadge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Edit Modal */}
      <CModal alignment="center" visible={editItem !== null} onClose={() => setEditItem(null)}>
        <CModalHeader closeButton>
          <CModalTitle>{t('installments.editTitle')}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {editError && (
            <CAlert color="danger" dismissible onClose={() => setEditError('')}>
              {editError}
            </CAlert>
          )}
          <div className="mb-3">
            <CFormLabel>{t('installments.label')}</CFormLabel>
            <CFormInput
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="mb-3">
            <CFormLabel>{t('installments.scheduledDate')}</CFormLabel>
            <CFormInput
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <CFormLabel>{t('installments.amount')}</CFormLabel>
            <CFormInput
              type="number"
              min="0"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setEditItem(null)}>
            {t('confirm.cancel')}
          </CButton>
          <CButton
            color="primary"
            className="text-white"
            disabled={isUpdating}
            onClick={handleSaveEdit}
          >
            {isUpdating ? <CSpinner size="sm" /> : t('installments.save')}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Cancel Confirmation Modal */}
      <CModal alignment="center" visible={cancelId !== null} onClose={() => setCancelId(null)}>
        <CModalHeader closeButton>
          <CModalTitle>{t('confirm.title')}</CModalTitle>
        </CModalHeader>
        <CModalBody>{t('installments.confirmCancel')}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setCancelId(null)}>
            {t('confirm.cancel')}
          </CButton>
          <CButton
            color="danger"
            className="text-white"
            disabled={isCancelling}
            onClick={handleCancel}
          >
            {isCancelling ? <CSpinner size="sm" /> : t('installments.cancelInstallment')}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default InstallmentsPage
