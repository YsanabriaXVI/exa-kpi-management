import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CDateRangePicker,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CPlaceholder,
  CRow,
  CSmartTable,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilLibrary,
  cilPlus,
  cilArrowRight,
  cilCheckAlt,
  cilActionUndo,
  cilBan,
  cilReload,
  cilTrash,
  cilLockLocked,
  cilSearch,
  cilX,
  cilFilterX,
} from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import {
  useGetPaymentsQuery,
  useDeletePaymentMutation,
  useSubmitPaymentMutation,
  useApprovePaymentMutation,
  useReturnPaymentMutation,
  useVoidPaymentMutation,
  useReopenPaymentMutation,
} from '../api/paymentCoreApi'
import StatusBadge from '../components/StatusBadge'
import CurrencyDisplay from '../components/CurrencyDisplay'
import { useEntityNames } from '../hooks/useEntityNames'
import { useToast } from '../hooks/useToast'
import type { PaymentListItem, PaymentListParams, PaymentStatus, PaymentType } from '../types.v2'
import { loadWeeks } from '../../Weeks/store/weeksSlice'
import { MODULE_PAYMENTS } from '../../../constants/modules'
import type { RootState, AppDispatch } from '../../../store'
import {
  permissionService,
  CREATE,
  UPDATE,
  DELETE as DELETE_PERMISSION,
  APPROVE as APPROVE_PERMISSION,
} from '../../../services/auth/permission.service'
import './PaymentsList.scss'

const ALL_STATUSES: PaymentStatus[] = ['DRAFT', 'OPEN', 'REVIEW', 'APPROVED', 'CLOSED', 'VOID']

const TYPE_TABS: { key: PaymentType | ''; label: string }[] = [
  { key: '', label: 'filters.allTypes' },
  { key: 'CLIENT_INVOICE', label: 'type.CLIENT_INVOICE' },
  { key: 'SUBDIVISION_STATEMENT', label: 'type.SUBDIVISION_STATEMENT' },
  { key: 'DRIVER', label: 'type.DRIVER' },
  { key: 'GAS_SUPPLIER', label: 'type.GAS_SUPPLIER' },
]

const STATUS_COLORS: Record<PaymentStatus, string> = {
  DRAFT: 'secondary',
  OPEN: 'success',
  REVIEW: 'warning',
  APPROVED: 'info',
  CLOSED: 'dark',
  VOID: 'danger',
}

interface PendingAction {
  type: 'delete' | 'submit' | 'approve' | 'return' | 'void' | 'reopen' | 'close'
  payment: PaymentListItem
}

const PaymentsListPage: React.FC = () => {
  const { t } = useTranslation('payments')
  const navigate = useNavigate()
  const { addToast, ToasterComponent } = useToast()

  // Pagination & filter state
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<PaymentType | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Entity name resolution
  const { resolveClientName, resolveSubdivisionName } = useEntityNames()

  // Weeks name resolution
  const dispatch = useDispatch<AppDispatch>()
  const weeksState = useSelector((state: RootState) => (state as any).weeks || {})
  useEffect(() => { dispatch(loadWeeks()) }, [dispatch])
  const weekNameById = useMemo(() => {
    const map: Record<number, string> = {}
    for (const wk of (weeksState.weeks || [])) {
      const id = Number(wk.week_id ?? wk.id)
      map[id] = wk.week_name || wk.name || (wk.week_no ? `W${wk.week_no} - ${wk.week_year}` : String(id))
    }
    return map
  }, [weeksState.weeks])

  const queryParams: PaymentListParams = useMemo(() => ({
    page,
    perPage,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    sortBy,
    sortDir,
  }), [page, perPage, statusFilter, typeFilter, dateFrom, dateTo, sortBy, sortDir])

  const { data, isLoading, isFetching } = useGetPaymentsQuery(queryParams)

  // Mutations
  const [deletePayment, { isLoading: isDeleting }] = useDeletePaymentMutation()
  const [submitPayment, { isLoading: isSubmitting }] = useSubmitPaymentMutation()
  const [approvePayment, { isLoading: isApproving }] = useApprovePaymentMutation()
  const [returnPayment, { isLoading: isReturning }] = useReturnPaymentMutation()
  const [voidPayment, { isLoading: isVoiding }] = useVoidPaymentMutation()
  const [reopenPayment, { isLoading: isReopening }] = useReopenPaymentMutation()

  const isMutating = isDeleting || isSubmitting || isApproving || isReturning || isVoiding || isReopening

  // Confirmation modal state
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  // Permissions
  const canCreate = permissionService.checkPermission(MODULE_PAYMENTS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_PAYMENTS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_PAYMENTS, DELETE_PERMISSION)
  const canApprove = permissionService.checkPermission(MODULE_PAYMENTS, APPROVE_PERMISSION)

  const rawItems = data?.data ?? []
  const meta = data?.meta ?? { total: 0, page: 1, perPage: 20, lastPage: 1 }

  // Resolve entity names for each item (for column + search)
  const resolveEntities = useCallback((item: PaymentListItem): string[] => {
    const names: string[] = []
    for (const id of item.clientIds || []) names.push(resolveClientName(id))
    for (const id of item.subdivisionIds || []) names.push(resolveSubdivisionName(id))
    return names
  }, [resolveClientName, resolveSubdivisionName])

  // Client-side search filter (within current page results)
  const items = useMemo(() => {
    if (!searchTerm.trim()) return rawItems
    const term = searchTerm.toLowerCase()
    return rawItems.filter((item) => {
      if (String(item.paymentNumber ?? '').toLowerCase().includes(term)) return true
      const entityNames = resolveEntities(item)
      return entityNames.some((name) => name.toLowerCase().includes(term))
    })
  }, [rawItems, searchTerm, resolveEntities])

  const hasFilters = statusFilter || typeFilter || dateFrom || dateTo

  const clearAllFilters = useCallback(() => {
    setStatusFilter('')
    setTypeFilter('')
    setDateFrom('')
    setDateTo('')
    setSearchTerm('')
    setPage(1)
  }, [])

  const getActionsForStatus = useCallback((status: PaymentStatus) => {
    const actions: PendingAction['type'][] = []
    switch (status) {
      case 'DRAFT':
        if (canDelete) actions.push('delete')
        break
      case 'OPEN':
        if (canUpdate) actions.push('submit')
        if (canDelete) actions.push('void')
        break
      case 'REVIEW':
        if (canApprove) actions.push('approve')
        if (canUpdate) actions.push('return')
        if (canDelete) actions.push('void')
        break
      case 'APPROVED':
        if (canUpdate) actions.push('close')
        if (canDelete) actions.push('void')
        break
      case 'CLOSED':
        if (canUpdate) actions.push('reopen')
        break
      case 'VOID':
        break
    }
    return actions
  }, [canUpdate, canDelete, canApprove])

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    const { type, payment } = pendingAction
    try {
      switch (type) {
        case 'delete': await deletePayment(payment.id).unwrap(); break
        case 'submit': await submitPayment(payment.id).unwrap(); break
        case 'approve': await approvePayment(payment.id).unwrap(); break
        case 'return': await returnPayment(payment.id).unwrap(); break
        case 'void': await voidPayment(payment.id).unwrap(); break
        case 'reopen': await reopenPayment(payment.id).unwrap(); break
      }
      addToast(t(`actions.${type}`) + ' — OK', 'success')
    } catch (err: any) {
      addToast(err?.data?.message || t('errors.actionFailed', { action: t(`actions.${type}`) }), 'danger')
    } finally {
      setPendingAction(null)
    }
  }

  const actionIcon = (type: PendingAction['type']) => {
    switch (type) {
      case 'delete': return cilTrash
      case 'submit': return cilArrowRight
      case 'approve': return cilCheckAlt
      case 'return': return cilActionUndo
      case 'void': return cilBan
      case 'reopen': return cilReload
      case 'close': return cilLockLocked
    }
  }

  const actionColor = (type: PendingAction['type']) => {
    switch (type) {
      case 'delete': return 'danger'
      case 'submit': return 'info'
      case 'approve': return 'success'
      case 'return': return 'warning'
      case 'void': return 'danger'
      case 'reopen': return 'primary'
      case 'close': return 'dark'
    }
  }

  const columns = [
    { key: 'paymentNumber', label: t('columns.paymentNumber'), sorter: true },
    { key: 'type', label: t('columns.type'), sorter: true },
    { key: 'status', label: t('columns.status'), sorter: true },
    { key: 'entities', label: t('columns.entities') },
    { key: 'weekIds', label: t('columns.weekIds') },
    { key: 'dateRange', label: t('columns.dateRange') },
    { key: 'totalUsd', label: t('columns.totalUsd'), sorter: true },
    { key: 'totalLps', label: t('columns.totalLps'), sorter: true },
    { key: 'statementCount', label: t('columns.statementCount') },
    { key: 'createdAt', label: t('columns.createdAt'), sorter: true },
    { key: 'actions', label: t('columns.actions') },
  ]

  const scopedColumns = {
    paymentNumber: (item: PaymentListItem) => (
      <td>
        <CBadge
          color="primary"
          shape="rounded-pill"
          role="button"
          onClick={() => navigate(`/operations/payments/${item.id}`)}
          style={{ cursor: 'pointer' }}
        >
          {item.paymentNumber}
        </CBadge>
      </td>
    ),
    type: (item: PaymentListItem) => (
      <td>{t(`type.${item.type}`, item.type)}</td>
    ),
    status: (item: PaymentListItem) => (
      <td><StatusBadge status={item.status} /></td>
    ),
    entities: (item: PaymentListItem) => {
      const names = resolveEntities(item)
      if (names.length === 0) return <td>-</td>
      const shown = names.slice(0, 2)
      const extra = names.length - 2
      return (
        <td>
          {shown.join(', ')}
          {extra > 0 && <span className="text-body-secondary"> +{extra}</span>}
        </td>
      )
    },
    weekIds: (item: PaymentListItem) => {
      const ids = item.weekIds?.length ? item.weekIds : (() => {
        if (!item.dateRangeStart || !item.dateRangeEnd) return []
        const from = new Date(item.dateRangeStart)
        const to = new Date(item.dateRangeEnd)
        return (weeksState.weeks || [])
          .filter((wk: any) => {
            const ws = new Date(wk.start_date)
            const we = new Date(wk.end_date)
            return ws <= to && we >= from
          })
          .map((wk: any) => Number(wk.week_id ?? wk.id))
      })()
      return (
        <td>
          {ids.length ? (
            <div className="d-flex flex-wrap gap-1">
              {ids.map((id) => (
                <CBadge key={id} color="secondary" shape="rounded-pill" className="fw-normal" style={{ fontSize: '0.75rem' }}>
                  {weekNameById[id] || id}
                </CBadge>
              ))}
            </div>
          ) : '-'}
        </td>
      )
    },
    dateRange: (item: PaymentListItem) => (
      <td>
        {item.dateRangeStart && item.dateRangeEnd
          ? `${new Date(item.dateRangeStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} — ${new Date(item.dateRangeEnd).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
          : '-'}
      </td>
    ),
    totalUsd: (item: PaymentListItem) => (
      <td><CurrencyDisplay value={item.totalUsd} currency="USD" /></td>
    ),
    totalLps: (item: PaymentListItem) => (
      <td><CurrencyDisplay value={item.totalLps} currency="LPS" /></td>
    ),
    statementCount: (item: PaymentListItem) => (
      <td>{item.statementCount}</td>
    ),
    createdAt: (item: PaymentListItem) => (
      <td>{new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
    ),
    actions: (item: PaymentListItem) => {
      const availableActions = getActionsForStatus(item.status)
      return (
        <td className="text-nowrap">
          {availableActions.map((action) => (
            <CButton
              key={action}
              color={actionColor(action)}
              variant="ghost"
              size="sm"
              className="me-1"
              disabled={isMutating}
              onClick={() => {
                if (action === 'close') {
                  navigate(`/operations/payments/${item.id}`)
                } else {
                  setPendingAction({ type: action, payment: item })
                }
              }}
              title={t(`actions.${action}`)}
            >
              <CIcon icon={actionIcon(action)} />
            </CButton>
          ))}
        </td>
      )
    },
  }

  // Skeleton placeholder rows for loading state
  const skeletonRows = (
    <CTable hover striped className="align-middle">
      <CTableHead>
        <CTableRow>
          {columns.map((col) => (
            <CTableHeaderCell key={col.key}>{col.label}</CTableHeaderCell>
          ))}
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <CTableRow key={i}>
            {columns.map((col) => (
              <CTableDataCell key={col.key}>
                <CPlaceholder animation="glow" xs={col.key === 'actions' ? 4 : 8}>
                  <CPlaceholder xs={col.key === 'actions' ? 4 : 8} />
                </CPlaceholder>
              </CTableDataCell>
            ))}
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  )

  return (
    <div className="payments-page">
      <ToasterComponent />
      <PageHero
        kicker="Operations"
        icon={cilLibrary}
        title={t('title')}
        subtitle={t('subtitle')}
        highlights={[
          { label: 'Total', value: meta.total, color: 'primary' },
        ]}
        actions={
          canCreate ? (
            <CButton color="primary" className="text-white" onClick={() => navigate('/operations/payments/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              {t('actions.newPayment')}
            </CButton>
          ) : undefined
        }
      />

      <CRow>
        <CCol xs={12}>
          <CCard className="shadow-sm border-0">
            <CCardBody>
              {/* ─── Toolbar: Stats + Search ─── */}
              <div className="payments-toolbar">
                <div className="payments-toolbar__summary">
                  <div className="toolbar-stat toolbar-stat--primary">
                    <span className="toolbar-stat__label">Records</span>
                    <span className="toolbar-stat__value">{meta.total}</span>
                  </div>
                  {isFetching && <CSpinner size="sm" className="text-primary" />}
                </div>
                <div className="payments-toolbar__controls">
                  <div className="payments-search">
                    <span className="payments-search__icon">
                      <CIcon icon={cilSearch} size="sm" />
                    </span>
                    <CFormInput
                      placeholder={t('filters.search')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {hasFilters && (
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      className="payments-clear-btn"
                      onClick={clearAllFilters}
                    >
                      <CIcon icon={cilFilterX} size="sm" className="me-1" />
                      Clear
                    </CButton>
                  )}
                </div>
              </div>

              {/* ─── Filter Panel ─── */}
              <div className="payments-filter-panel">
                <div className="payments-filter-grid">
                  {/* Payment Type */}
                  <div className="payments-filter-card payments-filter-card--half">
                    <div className="payments-filter-card__header">
                      <span className="payments-filter-label">Payment Type</span>
                    </div>
                    <div className="payments-filter-chip-list">
                      {TYPE_TABS.map(({ key, label }) => (
                        <CBadge
                          key={key || 'all'}
                          color={typeFilter === key ? 'primary' : 'light'}
                          className="payments-filter-badge"
                          role="button"
                          onClick={() => { setTypeFilter(key); setPage(1) }}
                        >
                          {t(label)}
                        </CBadge>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="payments-filter-card payments-filter-card--half">
                    <div className="payments-filter-card__header">
                      <span className="payments-filter-label">Status</span>
                    </div>
                    <div className="payments-filter-chip-list">
                      <CBadge
                        color={statusFilter === '' ? 'primary' : 'light'}
                        className="payments-filter-badge"
                        role="button"
                        onClick={() => { setStatusFilter(''); setPage(1) }}
                      >
                        All
                      </CBadge>
                      {ALL_STATUSES.map((s) => (
                        <CBadge
                          key={s}
                          color={statusFilter === s ? (STATUS_COLORS[s] || 'primary') : 'light'}
                          className="payments-filter-badge"
                          role="button"
                          onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1) }}
                        >
                          {t(`status.${s}`)}
                        </CBadge>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="payments-filter-card payments-filter-card--half">
                    <div className="payments-filter-card__header">
                      <span className="payments-filter-label">Date Range</span>
                    </div>
                    <CDateRangePicker
                      size="sm"
                      locale="en-US"
                      placeholder={[t('fields.dateRangeStart'), t('fields.dateRangeEnd')]}
                      startDate={dateFrom || undefined}
                      endDate={dateTo || undefined}
                      onStartDateChange={(date: string | Date | null) => {
                        if (date instanceof Date) setDateFrom(date.toISOString().split('T')[0])
                        else if (typeof date === 'string') setDateFrom(date)
                        else setDateFrom('')
                        setPage(1)
                      }}
                      onEndDateChange={(date: string | Date | null) => {
                        if (date instanceof Date) setDateTo(date.toISOString().split('T')[0])
                        else if (typeof date === 'string') setDateTo(date)
                        else setDateTo('')
                        setPage(1)
                      }}
                      cleaner
                    />
                  </div>
                </div>

                {/* Active filters summary */}
                {hasFilters && (
                  <div className="payments-active-filters">
                    <span className="text-body-secondary small fw-semibold">Active:</span>
                    <div className="payments-active-filters__chips">
                      {typeFilter && (
                        <CBadge color="info" className="payments-filter-badge" role="button" onClick={() => setTypeFilter('')}>
                          {t(`type.${typeFilter}`)} <CIcon icon={cilX} size="sm" />
                        </CBadge>
                      )}
                      {statusFilter && (
                        <CBadge color={STATUS_COLORS[statusFilter] || 'info'} className="payments-filter-badge" role="button" onClick={() => setStatusFilter('')}>
                          {t(`status.${statusFilter}`)} <CIcon icon={cilX} size="sm" />
                        </CBadge>
                      )}
                      {(dateFrom || dateTo) && (
                        <CBadge color="warning" className="payments-filter-badge" role="button" onClick={() => { setDateFrom(''); setDateTo('') }}>
                          {dateFrom || '...'} — {dateTo || '...'} <CIcon icon={cilX} size="sm" />
                        </CBadge>
                      )}
                    </div>
                    <CButton
                      color="secondary"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="ms-auto"
                    >
                      Clear All
                    </CButton>
                  </div>
                )}
              </div>

              {/* ─── Table ─── */}
              <div className="payments-table-panel">
                {isLoading ? skeletonRows : (
                  <div className="table-responsive">
                    <CSmartTable
                      items={items}
                      columns={columns as any}
                      itemsPerPage={items.length || perPage}
                      activePage={1}
                      scopedColumns={scopedColumns}
                      sorterValue={{ column: sortBy, state: sortDir }}
                      onSorterValueChange={(val) => {
                        if (val.column && val.state) {
                          setSortBy(val.column)
                          setSortDir(val.state as 'asc' | 'desc')
                          setPage(1)
                        }
                      }}
                      noItemsLabel={t('empty')}
                      onActivePageChange={(val) => setPage(val)}
                      tableProps={{
                        hover: true,
                        striped: true,
                        responsive: true,
                        className: 'align-middle payments-table',
                      }}
                      paginationProps={{
                        pages: meta.lastPage,
                        activePage: page,
                      }}
                    />
                  </div>
                )}

                {/* Footer */}
                <div className="payments-table-footer">
                  <div className="payments-table-footer__meta">
                    Showing {items.length.toLocaleString()} of {meta.total.toLocaleString()} records
                  </div>
                  <div className="payments-table-footer__controls">
                    <label className="small text-body-secondary me-2 mb-0">Items per page:</label>
                    <select
                      className="form-select form-select-sm w-auto"
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value))
                        setPage(1)
                      }}
                    >
                      {[15, 20, 30, 50, 100].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Confirmation Modal */}
      <CModal alignment="center" visible={pendingAction !== null} onClose={() => setPendingAction(null)}>
        <CModalHeader closeButton>
          <CModalTitle>{t('confirm.title')}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {pendingAction && t(`confirm.${pendingAction.type}`, { number: pendingAction.payment.paymentNumber })}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setPendingAction(null)}>
            {t('confirm.cancel')}
          </CButton>
          <CButton
            color={pendingAction ? actionColor(pendingAction.type) : 'primary'}
            className="text-white"
            disabled={isMutating}
            onClick={handleConfirmAction}
          >
            {isMutating ? <CSpinner size="sm" /> : t('confirm.confirm')}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default PaymentsListPage
