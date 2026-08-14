import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CBadge,
  CContainer,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CFormSelect,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilMagnifyingGlass,
  cilTrash,
  cilFilterX,
  cilOptions,
  cilDrop,
  cilCloudDownload,
  cilCheck,
  cilX,
} from '@coreui/icons'
import { Link } from 'react-router-dom'

import type { AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ConfirmDialog from '../../../../components/ConfirmationModal'

import {
  fetchFuelAuditorList,
  deleteFuelAuditorTransaction,
  bulkDeleteTransactions,
  bulkUpdatePaymentStatus,
  exportFuelAuditorExcel,
  loadGasSupplierPaymentStatusOptions,
  loadSubdivisionPaymentStatusOptions,
  resetStatuses,
  selectFuelAuditorList,
  selectFuelAuditorTotal,
  selectFuelAuditorErrors,
  selectFuelAuditorStatuses,
  selectFuelAuditorLoadingList,
  selectFuelAuditorGasSupplierStatuses,
  selectFuelAuditorSubdivisionStatuses,
} from '../store/fuelAuditor.slice'

import { permissionService, DELETE } from '../../../../services/auth/permission.service'
import { MODULE_FUEL_AUDITOR } from '../../../../constants/modules'
import { getStatusGroup } from '../utils/fuelAuditorUtils'
import './FuelAuditorList.scss'

const COLUMN_STORAGE_KEY = 'fuelAuditor_visible_columns_v2'
const DEFAULT_COLUMNS = [
  'gasStationTransactionId',
  'transactionId',
  'gasStationName',
  'documentNumber',
  'dateTimeFormat',
  'fuelType',
  'paymentMethod',
  'unitPrice',
  'quantity',
  'measureUnit',
  'currency',
  'amount',
  'amountDifference',
  'unitPriceDifference',
  'licensePlate',
  'orderNumber',
  'subdivisionId',
  'reconciliationStatus',
  'isDuplicate',
  'fuelOrderId',
  'fuelOrderIdReference',
  'createdAtFormat',
  'updatedAtFormat',
  'status',
  'source',
  'gasSupplierPaymentStatusName',
  'subdivisionPaymentStatusName',
]

const loadSavedColumns = () => {
  const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return DEFAULT_COLUMNS
}

const FuelAuditorListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectFuelAuditorList)
  const total = useSelector(selectFuelAuditorTotal)
  const errors = useSelector(selectFuelAuditorErrors)
  const statuses = useSelector(selectFuelAuditorStatuses)
  const loading = useSelector(selectFuelAuditorLoadingList)
  const gasSupplierStatuses = useSelector(selectFuelAuditorGasSupplierStatuses)
  const subdivisionStatuses = useSelector(selectFuelAuditorSubdivisionStatuses)

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [searchValue, setSearchValue] = useState('')
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})

  // Toggle filter state
  const [selectedGsStatuses, setSelectedGsStatuses] = useState<string[]>([])
  const [selectedSubStatuses, setSelectedSubStatuses] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedReconStatuses, setSelectedReconStatuses] = useState<string[]>(['Unmatched', 'Discrepancy Found'])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortState, setSortState] = useState<{ column: string; state: string | number }>({
    column: 'gasStationTransactionId',
    state: 'desc',
  })
  const [fuelOrderFilter, setFuelOrderFilter] = useState<'all' | 'with' | 'without'>('all')
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([])
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<number[]>([])
  const [bulkModalVisible, setBulkModalVisible] = useState(false)
  const [bulkField, setBulkField] = useState<'gas_supplier_payment_status' | 'subdivision_payment_status'>('gas_supplier_payment_status')
  const [bulkStatusId, setBulkStatusId] = useState<number | ''>('')
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const canDelete = permissionService.checkPermission(MODULE_FUEL_AUDITOR, DELETE)

  const fetchData = useCallback(() => {
    const filters: Record<string, any> = {}
    if (searchValue.trim()) filters.q = searchValue.trim()
    Object.entries(columnFilterValues).forEach(([key, value]) => {
      const v = String(value ?? '').trim()
      if (v) filters[key] = v
    })
    if (selectedGsStatuses.length > 0) filters.gas_supplier_payment_status = selectedGsStatuses
    if (selectedSubStatuses.length > 0) filters.subdivision_payment_status = selectedSubStatuses
    if (selectedSources.length > 0) filters.source = selectedSources
    if (selectedReconStatuses.length > 0) filters.reconciliationStatus = selectedReconStatuses
    if (fuelOrderFilter === 'with') filters.hasFuelOrderId = true
    if (fuelOrderFilter === 'without') filters.showUnmatchedOnly = true
    dispatch(
      fetchFuelAuditorList({
        page: currentPage,
        size: itemsPerPage,
        sortField: sortState.column,
        sortOrder: sortState.state === 'asc' || sortState.state === 0 ? 1 : -1,
        filters,
      }),
    )
  }, [dispatch, currentPage, sortState, searchValue, columnFilterValues, selectedGsStatuses, selectedSubStatuses, selectedSources, selectedReconStatuses, fuelOrderFilter])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    dispatch(loadGasSupplierPaymentStatusOptions())
    dispatch(loadSubdivisionPaymentStatusOptions())
  }, [dispatch])

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    if (!errors) return
    const toast = (window as any).exaToast
    const msg = typeof errors === 'string' ? errors : 'An error occurred'
    toast?.error ? toast.error('Error', msg) : console.error(msg)
  }, [errors])

  useEffect(() => {
    const toast = (window as any).exaToast
    if (statuses.deleted) toast?.success?.('Success', 'Transaction deleted')
    if (statuses.updated) toast?.success?.('Success', 'Payment status updated')
    if (statuses.deleted || statuses.updated) {
      dispatch(resetStatuses())
      fetchData()
    }
  }, [statuses, dispatch, fetchData])

  const handleView = (id: number) => navigate(`/fuel/fuelauditor/${id}`)

  const handleAskDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (pendingDeleteId) {
      await dispatch(deleteFuelAuditorTransaction(pendingDeleteId))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedDeleteIds.length > 0) {
      await dispatch(bulkDeleteTransactions(selectedDeleteIds))
      setSelectedDeleteIds([])
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setCurrentPage(1), 600)
  }

  const handleColumnFilterChange = useCallback((filters: Record<string, any>) => {
    setColumnFilterValues(filters)
    setCurrentPage(1)
  }, [])

  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter((key) => {
    const val = columnFilterValues[key]
    return Array.isArray(val) ? val.length > 0 : String(val ?? '').trim().length > 0
  }).length
  const hasSearchFilter = searchValue.trim().length > 0
  const activeToggleCount =
    (selectedGsStatuses.length > 0 ? 1 : 0) +
    (selectedSubStatuses.length > 0 ? 1 : 0) +
    (selectedSources.length > 0 ? 1 : 0) +
    (selectedReconStatuses.length > 0 ? 1 : 0) +
    (fuelOrderFilter !== 'all' ? 1 : 0)
  const hasActiveFilters = activeColumnFiltersCount > 0 || hasSearchFilter || activeToggleCount > 0
  const totalActiveFilters = activeColumnFiltersCount + (hasSearchFilter ? 1 : 0) + activeToggleCount
  const hasPaymentSelection = selectedPaymentIds.length > 0
  const hasDeleteSelection = canDelete && selectedDeleteIds.length > 0

  const handleClearFilters = () => {
    setSearchValue('')
    setColumnFilterValues({})
    setSelectedGsStatuses([])
    setSelectedSubStatuses([])
    setSelectedSources([])
    setSelectedReconStatuses([])
    setFuelOrderFilter('all')
    setCurrentPage(1)
  }

  const SOURCE_OPTIONS = ['csv', 'Manual Input', 'compensa', 'platino']
  const RECON_STATUS_OPTIONS = ['Unmatched', 'Discrepancy Found', 'Matched']

  const toggleFilter = (
    value: string,
    selected: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    )
    setCurrentPage(1)
  }

  const handleExport = () => {
    const filters: Record<string, any> = {}
    if (searchValue.trim()) filters.q = searchValue.trim()
    Object.entries(columnFilterValues).forEach(([key, value]) => {
      const v = String(value ?? '').trim()
      if (v) filters[key] = v
    })
    if (selectedGsStatuses.length > 0) filters.gas_supplier_payment_status = selectedGsStatuses
    if (selectedSubStatuses.length > 0) filters.subdivision_payment_status = selectedSubStatuses
    if (selectedSources.length > 0) filters.source = selectedSources
    if (selectedReconStatuses.length > 0) filters.reconciliationStatus = selectedReconStatuses
    if (fuelOrderFilter === 'with') filters.hasFuelOrderId = true
    if (fuelOrderFilter === 'without') filters.showUnmatchedOnly = true
    dispatch(
      exportFuelAuditorExcel({
        page: 1,
        size: total || 9999,
        sortField: sortState.column,
        sortOrder: sortState.state === 'asc' || sortState.state === 0 ? 1 : -1,
        filters,
      }),
    )
  }

  const handleTogglePaymentSelect = (id: number) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleToggleDeleteSelect = (id: number) => {
    setSelectedDeleteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const paymentSelectableItems = useMemo(
    () => list.filter((item: any) => item.fuelOrderId),
    [list],
  )

  const deleteSelectableItems = useMemo(
    () => list.filter((item: any) => !item.fuelOrderId),
    [list],
  )

  const handleSelectAllPayment = () => {
    const allIds = paymentSelectableItems.map((item: any) => item.gasStationTransactionId)
    const allSelected = allIds.length > 0 && allIds.every((id: number) => selectedPaymentIds.includes(id))
    if (allSelected) {
      setSelectedPaymentIds((prev) => prev.filter((id) => !allIds.includes(id)))
    } else {
      setSelectedPaymentIds((prev) => [...new Set([...prev, ...allIds])])
    }
  }

  const handleSelectAllDelete = () => {
    const allIds = deleteSelectableItems.map((item: any) => item.gasStationTransactionId)
    const allSelected = allIds.length > 0 && allIds.every((id: number) => selectedDeleteIds.includes(id))
    if (allSelected) {
      setSelectedDeleteIds((prev) => prev.filter((id) => !allIds.includes(id)))
    } else {
      setSelectedDeleteIds((prev) => [...new Set([...prev, ...allIds])])
    }
  }

  const openBulkModal = (field: 'gas_supplier_payment_status' | 'subdivision_payment_status') => {
    setBulkField(field)
    setBulkStatusId('')
    setBulkModalVisible(true)
  }

  const handleBulkPaymentSubmit = async () => {
    if (selectedPaymentIds.length === 0 || bulkStatusId === '') return
    await dispatch(
      bulkUpdatePaymentStatus({
        transactionIds: selectedPaymentIds,
        field: bulkField === 'gas_supplier_payment_status' ? 'gasSupplierPaymentStatus' : 'subdivisionPaymentStatus',
        statusId: Number(bulkStatusId),
      }),
    )
    setSelectedPaymentIds([])
    setBulkModalVisible(false)
  }

  const bulkStatusOptions = (bulkField === 'gas_supplier_payment_status'
    ? gasSupplierStatuses
    : subdivisionStatuses
  ).filter((opt) => {
    const group = getStatusGroup(opt.value)
    return group === 'not_ready' || group === 'ready'
  })

  const FUEL_ORDER_OPTIONS = ['With Fuel Order', 'Without Fuel Order']

  const columns = [
    { key: 'select', label: '', sorter: false, filter: false, _style: { width: '40px' } },
    { key: 'selectDelete', label: '', sorter: false, filter: false, _style: { width: '40px' } },
    { key: 'gasStationTransactionId', label: 'Txn ID', sorter: true, filter: true, _style: { width: '70px' } },
    { key: 'transactionId', label: 'POS Txn', sorter: true, filter: true },
    { key: 'documentNumber', label: 'Doc #', sorter: true, filter: true },
    { key: 'dateTimeFormat', label: 'Date/Time', sorter: true, filter: true },
    { key: 'fuelType', label: 'Fuel Type', sorter: true, filter: true },
    { key: 'paymentMethod', label: 'Pay Method', sorter: true, filter: true },
    { key: 'unitPrice', label: 'Unit Price', sorter: true, filter: false },
    { key: 'quantity', label: 'Qty', sorter: true, filter: false },
    { key: 'measureUnit', label: 'Unit', sorter: true, filter: true },
    { key: 'currency', label: 'Currency', sorter: true, filter: true },
    { key: 'amount', label: 'Amount', sorter: true, filter: false },
    { key: 'amountDifference', label: 'Amount Diff', sorter: true, filter: false },
    { key: 'unitPriceDifference', label: 'Unit Price Diff', sorter: true, filter: false },
    { key: 'licensePlate', label: 'Plate', sorter: true, filter: true },
    { key: 'orderNumber', label: 'Order #', sorter: true, filter: true },
    { key: 'gasStationName', label: 'Station', sorter: true, filter: true },
    { key: 'subdivisionId', label: 'Subdivision', sorter: true, filter: true },
    { key: 'reconciliationStatus', label: 'Recon Status', sorter: true, filter: true },
    { key: 'isDuplicate', label: 'Dup?', sorter: true, filter: true, _style: { width: '70px' } },
    { key: 'fuelOrderId', label: 'Fuel Order', sorter: true, filter: true, _style: { width: '90px' } },
    { key: 'fuelOrderIdReference', label: 'Fuel Order Ref', sorter: true, filter: true },
    { key: 'createdAtFormat', label: 'Created', sorter: true, filter: false },
    { key: 'updatedAtFormat', label: 'Updated', sorter: true, filter: false },
    { key: 'status', label: 'Status', sorter: true, filter: true, _style: { width: '70px' } },
    { key: 'source', label: 'Source', sorter: true, filter: true },
    { key: 'gasSupplierPaymentStatusName', label: 'Gas Supplier Status', sorter: true, filter: true },
    { key: 'subdivisionPaymentStatusName', label: 'Subdivision Status', sorter: true, filter: true },
    { key: 'actions', label: 'Actions', sorter: false, filter: false, _style: { width: '100px' } },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || col.key === 'select' || col.key === 'selectDelete' || visibleColumns.includes(col.key),
  )

  return (
    <CContainer fluid className="fuel-auditor-page">
      <PageHero
        kicker="Fuel"
        icon={cilDrop}
        title="Fuel Auditor"
        subtitle="Transactions"
        highlights={[
          { label: 'Total Records', value: total.toLocaleString() },
          { label: 'Visible Rows', value: list.length.toLocaleString() },
          { label: 'Active Filters', value: totalActiveFilters || 'None', color: totalActiveFilters ? 'primary' : 'light' },
        ]}
        actions={
          <div className="d-flex gap-2 flex-wrap">
            <CDropdown>
              <CDropdownToggle color="secondary" variant="outline">
                <CIcon icon={cilOptions} className="me-2" />
                Visible Columns ({visibleColumns.length})
              </CDropdownToggle>
              <CDropdownMenu className="column-selector-dropdown">
                <div className="px-3 py-2">
                  <small className="text-body-secondary fw-semibold">SELECT COLUMNS</small>
                </div>
                <div className="dropdown-divider" />
                <div className="column-selector-list">
                  {columns.filter((col) => !['actions', 'select', 'selectDelete'].includes(col.key)).map((col) => (
                    <div key={col.key} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`col-${col.key}`}
                        checked={visibleColumns.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) setVisibleColumns([...visibleColumns, col.key])
                          else if (visibleColumns.length > 1)
                            setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                        }}
                      />
                      <label className="form-check-label" htmlFor={`col-${col.key}`}>
                        {col.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CDropdownMenu>
            </CDropdown>
            <CButton
              color="success"
              variant="outline"
              onClick={handleExport}
              disabled={!list.length || loading}
            >
              <CIcon icon={cilCloudDownload} className="me-2" />
              Export XLSX
            </CButton>
          </div>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          {errors && (
            <CAlert color="danger" className="mb-3">
              {typeof errors === 'string' ? errors : 'An error occurred'}
            </CAlert>
          )}
          <div className="fuel-auditor-filters mb-3">
            <div className="fuel-auditor-toolbar">
              <div className="fuel-auditor-toolbar__summary">
                <div className="toolbar-stat toolbar-stat--primary">
                  <span className="toolbar-stat__label">Total Records</span>
                  <strong className="toolbar-stat__value">{total.toLocaleString()}</strong>
                </div>
                <div className="toolbar-stat">
                  <span className="toolbar-stat__label">Visible Rows</span>
                  <strong className="toolbar-stat__value">{list.length.toLocaleString()}</strong>
                </div>
                <div className="toolbar-context">Showing {list.length} of {total.toLocaleString()} transactions</div>
                {hasActiveFilters && <CBadge color="info">Filters Active: {totalActiveFilters}</CBadge>}
              </div>

              <div className="fuel-auditor-toolbar__controls">
                <div className="fuel-auditor-search">
                  <CIcon icon={cilMagnifyingGlass} className="fuel-auditor-search__icon" />
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Search transactions, plates, stations..."
                    value={searchValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>

                {hasActiveFilters && (
                  <CButton
                    color="danger"
                    variant="outline"
                    size="sm"
                    className="fuel-auditor-clear-btn"
                    onClick={handleClearFilters}
                  >
                    <CIcon icon={cilFilterX} size="sm" className="me-1" />
                    Clear Filters ({totalActiveFilters})
                  </CButton>
                )}
              </div>
            </div>

            {(hasPaymentSelection || hasDeleteSelection) && (
              <div className="fuel-auditor-bulk-bar">
                <div className="fuel-auditor-bulk-bar__summary">
                  <span className="fuel-auditor-bulk-bar__eyebrow">Bulk actions</span>
                  <strong>
                    {hasPaymentSelection && `${selectedPaymentIds.length} ready for payment updates`}
                    {hasPaymentSelection && hasDeleteSelection && ' · '}
                    {hasDeleteSelection && `${selectedDeleteIds.length} ready for deletion`}
                  </strong>
                </div>

                <div className="fuel-auditor-bulk-bar__actions">
                  {hasPaymentSelection && (
                    <>
                      <CButton
                        color="info"
                        size="sm"
                        onClick={() => openBulkModal('gas_supplier_payment_status')}
                      >
                        Update Gas Supplier Status ({selectedPaymentIds.length})
                      </CButton>
                      <CButton
                        color="info"
                        variant="outline"
                        size="sm"
                        onClick={() => openBulkModal('subdivision_payment_status')}
                      >
                        Update Subdivision Status ({selectedPaymentIds.length})
                      </CButton>
                      <CButton
                        color="secondary"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPaymentIds([])}
                      >
                        Clear Payment Selection
                      </CButton>
                    </>
                  )}

                  {hasDeleteSelection && (
                    <>
                      <CButton color="danger" size="sm" onClick={handleBulkDelete}>
                        <CIcon icon={cilTrash} className="me-2" />
                        Delete Selected ({selectedDeleteIds.length})
                      </CButton>
                      <CButton
                        color="secondary"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDeleteIds([])}
                      >
                        Clear Delete Selection
                      </CButton>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="fuel-auditor-filter-panel">
              <div className="fuel-auditor-filter-panel__header">
                <div>
                  <div className="fuel-auditor-filter-panel__eyebrow">Advanced filters</div>
                  <h6 className="mb-0">Refine transaction review</h6>
                </div>
                <div className="fuel-auditor-filter-panel__count">
                  {totalActiveFilters} active
                </div>
              </div>

              <div className="fuel-auditor-filter-grid">
                <div className="filter-group-card filter-group-card--wide">
                  <div className="filter-group-card__header">
                    <span className="filter-label">Gas Supplier Payment Status</span>
                    {selectedGsStatuses.length > 0 && (
                      <span className="filter-group-card__count">{selectedGsStatuses.length} selected</span>
                    )}
                  </div>
                  <div className="filter-chip-list">
                    {gasSupplierStatuses.map((s: any) => (
                      <CBadge
                        key={s.value}
                        role="button"
                        className="filter-badge"
                        color={selectedGsStatuses.includes(s.label) ? 'primary' : 'light'}
                        textColor={selectedGsStatuses.includes(s.label) ? 'white' : 'dark'}
                        onClick={() => toggleFilter(s.label, selectedGsStatuses, setSelectedGsStatuses)}
                      >
                        {s.label}
                      </CBadge>
                    ))}
                  </div>
                </div>

                <div className="filter-group-card filter-group-card--wide">
                  <div className="filter-group-card__header">
                    <span className="filter-label">Subdivision Payment Status</span>
                    {selectedSubStatuses.length > 0 && (
                      <span className="filter-group-card__count">{selectedSubStatuses.length} selected</span>
                    )}
                  </div>
                  <div className="filter-chip-list">
                    {subdivisionStatuses.map((s: any) => (
                      <CBadge
                        key={s.value}
                        role="button"
                        className="filter-badge"
                        color={selectedSubStatuses.includes(s.label) ? 'primary' : 'light'}
                        textColor={selectedSubStatuses.includes(s.label) ? 'white' : 'dark'}
                        onClick={() => toggleFilter(s.label, selectedSubStatuses, setSelectedSubStatuses)}
                      >
                        {s.label}
                      </CBadge>
                    ))}
                  </div>
                </div>

                <div className="filter-group-card filter-group-card--third">
                  <div className="filter-group-card__header">
                    <span className="filter-label">Source</span>
                    {selectedSources.length > 0 && (
                      <span className="filter-group-card__count">{selectedSources.length} selected</span>
                    )}
                  </div>
                  <div className="filter-chip-list">
                    {SOURCE_OPTIONS.map((src) => (
                      <CBadge
                        key={src}
                        role="button"
                        className="filter-badge"
                        color={selectedSources.includes(src) ? 'primary' : 'light'}
                        textColor={selectedSources.includes(src) ? 'white' : 'dark'}
                        onClick={() => toggleFilter(src, selectedSources, setSelectedSources)}
                      >
                        {src === 'Manual Input' ? 'MANUAL' : src.toUpperCase()}
                      </CBadge>
                    ))}
                  </div>
                </div>

                <div className="filter-group-card filter-group-card--third">
                  <div className="filter-group-card__header">
                    <span className="filter-label">Reconciliation Status</span>
                    {selectedReconStatuses.length > 0 && (
                      <span className="filter-group-card__count">{selectedReconStatuses.length} selected</span>
                    )}
                  </div>
                  <div className="filter-chip-list">
                    {RECON_STATUS_OPTIONS.map((rs) => (
                      <CBadge
                        key={rs}
                        role="button"
                        className="filter-badge"
                        color={selectedReconStatuses.includes(rs) ? (rs === 'Matched' ? 'success' : rs === 'Discrepancy Found' ? 'warning' : 'danger') : 'light'}
                        textColor={selectedReconStatuses.includes(rs) ? 'white' : 'dark'}
                        onClick={() => toggleFilter(rs, selectedReconStatuses, setSelectedReconStatuses)}
                      >
                        {rs}
                      </CBadge>
                    ))}
                  </div>
                </div>

                <div className="filter-group-card filter-group-card--third">
                  <div className="filter-group-card__header">
                    <span className="filter-label">Fuel Order</span>
                    {fuelOrderFilter !== 'all' && (
                      <span className="filter-group-card__count">
                        {fuelOrderFilter === 'with' ? 'With' : 'Without'}
                      </span>
                    )}
                  </div>
                  <div className="filter-chip-list">
                    {FUEL_ORDER_OPTIONS.map((fo) => {
                      const filterVal = fo === 'With Fuel Order' ? 'with' : 'without'
                      const isActive = fuelOrderFilter === filterVal
                      return (
                        <CBadge
                          key={fo}
                          role="button"
                          className="filter-badge"
                          color={isActive ? 'primary' : 'light'}
                          textColor={isActive ? 'white' : 'dark'}
                          onClick={() => {
                            setFuelOrderFilter(isActive ? 'all' : filterVal)
                            setCurrentPage(1)
                          }}
                        >
                          {fo}
                        </CBadge>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="active-filters-row">
                <div className="active-filters-row__label">
                  <CBadge color="success">Active Filters</CBadge>
                </div>
                <div className="active-filters-row__chips">
                  {selectedReconStatuses.length > 0 && (
                    <CBadge color="info">
                      Reconciliation Status ({selectedReconStatuses.length})
                    </CBadge>
                  )}
                  {selectedGsStatuses.length > 0 && (
                    <CBadge color="info">
                      Gas Supplier Status ({selectedGsStatuses.length})
                    </CBadge>
                  )}
                  {selectedSubStatuses.length > 0 && (
                    <CBadge color="info">
                      Subdivision Status ({selectedSubStatuses.length})
                    </CBadge>
                  )}
                  {selectedSources.length > 0 && (
                    <CBadge color="info">
                      Source ({selectedSources.length})
                    </CBadge>
                  )}
                  {fuelOrderFilter !== 'all' && (
                    <CBadge color="info">
                      Fuel Order ({fuelOrderFilter === 'with' ? 'With' : 'Without'})
                    </CBadge>
                  )}
                  {activeColumnFiltersCount > 0 && (
                    <CBadge color="info">
                      Column Filters ({activeColumnFiltersCount})
                    </CBadge>
                  )}
                  {hasSearchFilter && (
                    <CBadge color="info">Search</CBadge>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="fuel-auditor-table-panel">
            <CSmartTable
              items={list}
              columns={activeColumns}
              itemsPerPage={itemsPerPage}
              activePage={currentPage}
              pagination
              paginationProps={{
                pages: Math.ceil(total / itemsPerPage) || 1,
                activePage: currentPage,
                onActivePageChange: setCurrentPage,
              }}
              itemsPerPageSelect={false as any}
              loading={loading}
              columnFilter
              columnSorter
              columnFilterValue={columnFilterValues}
              tableFilter={false}
              onColumnFilterChange={handleColumnFilterChange}
              onSorterChange={(sorter: any) => {
                if (sorter?.column) {
                  setSortState({ column: sorter.column, state: sorter.state })
                  setCurrentPage(1)
                }
              }}
              tableProps={{
                hover: true,
                striped: true,
                responsive: true,
                className: 'fuel-auditor-table align-middle',
              }}
              scopedColumns={{
              select: (item: any) => (
                <td className="text-center">
                  {item.fuelOrderId && (
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      checked={selectedPaymentIds.includes(item.gasStationTransactionId)}
                      onChange={() => handleTogglePaymentSelect(item.gasStationTransactionId)}
                      title="Select for payment status update"
                    />
                  )}
                </td>
              ),
              selectDelete: (item: any) => (
                <td className="text-center">
                  {!item.fuelOrderId && canDelete && (
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      checked={selectedDeleteIds.includes(item.gasStationTransactionId)}
                      onChange={() => handleToggleDeleteSelect(item.gasStationTransactionId)}
                      title="Select for deletion"
                    />
                  )}
                </td>
              ),
              gasStationTransactionId: (item: any) => (
                <td>
                  <CBadge
                    color="primary"
                    shape="rounded-pill"
                    role="button"
                    className="text-decoration-none"
                    onClick={() => handleView(item.gasStationTransactionId)}
                  >
                    {item.gasStationTransactionId}
                  </CBadge>
                </td>
              ),
              fuelOrderId: (item: any) => (
                <td>
                  {item.fuelOrderId ? (
                    <Link to={`/fuel/fuelorder/${item.fuelOrderId}`} className="text-primary text-decoration-underline">
                      {item.fuelOrderId}
                    </Link>
                  ) : '-'}
                </td>
              ),
              amountDifference: (item: any) => {
                const val = item.amountDifference
                if (val == null) return <td>-</td>
                const color = Math.abs(val) < 0.01 ? 'text-success' : 'text-danger'
                const cur = item.currency ?? ''
                return (
                  <td className={color} style={{ fontWeight: 600 }}>
                    {cur && `${cur} `}{val >= 0 ? '+' : ''}{Number(val).toFixed(2)}
                  </td>
                )
              },
              unitPriceDifference: (item: any) => {
                const val = item.unitPriceDifference
                if (val == null) return <td>-</td>
                const color = Math.abs(val) < 0.01 ? 'text-success' : 'text-danger'
                return (
                  <td className={color} style={{ fontWeight: 600 }}>
                    {val >= 0 ? '+' : ''}{Number(val).toFixed(2)}%
                  </td>
                )
              },
              isDuplicate: (item: any) => (
                <td className="text-center">{item.isDuplicate ? 'Yes' : 'No'}</td>
              ),
              status: (item: any) => (
                <td className="text-center">
                  {item.status ? (
                    <CIcon icon={cilCheck} className="text-success" style={{ fontWeight: 'bold' }} />
                  ) : (
                    <CIcon icon={cilX} className="text-danger" style={{ fontWeight: 'bold' }} />
                  )}
                </td>
              ),
              reconciliationStatus: (item: any) => (
                <td>
                  <CBadge
                    className="table-status-badge"
                    color={
                      item.reconciliationStatus?.toLowerCase()?.includes('matched')
                        ? 'success'
                        : item.reconciliationStatus?.toLowerCase()?.includes('discrepancy')
                          ? 'warning'
                          : item.reconciliationStatus?.toLowerCase()?.includes('unmatched')
                            ? 'danger'
                            : 'secondary'
                    }
                  >
                    {item.reconciliationStatus ?? '-'}
                  </CBadge>
                </td>
              ),
              source: (item: any) => {
                const display = item.source === 'Manual Input' ? 'MANUAL' : (item.source ?? '-').toUpperCase()
                const src = display.toLowerCase()
                const color = src === 'platino' ? 'primary'
                  : src === 'compensa' ? 'info'
                  : src === 'csv' ? 'success'
                  : src === 'manual' ? 'warning'
                  : 'secondary'
                return (
                  <td><CBadge className="table-source-badge" color={color}>{display}</CBadge></td>
                )
              },
              actions: (item: any) => (
                <td>
                  <div className="fuel-auditor-actions">
                    <CButton
                      color="info"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(item.gasStationTransactionId)}
                      title="View"
                    >
                      <CIcon icon={cilMagnifyingGlass} size="sm" />
                    </CButton>
                    {canDelete && !item.fuelOrderId && (
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleAskDelete(item.gasStationTransactionId)
                        }
                        title="Delete"
                      >
                        <CIcon icon={cilTrash} size="sm" />
                      </CButton>
                    )}
                  </div>
                </td>
              ),
              }}
            />
            <div className="fuel-auditor-table-footer">
              <div className="fuel-auditor-table-footer__meta">
                Showing {list.length.toLocaleString()} of {total.toLocaleString()} transactions
              </div>
              <div className="fuel-auditor-table-footer__controls">
                <span className="me-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
                <CDropdown direction="dropup">
                  <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
                    {itemsPerPage}
                  </CDropdownToggle>
                  <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
                    {[15, 30, 50, 100].map((n) => (
                      <CDropdownItem
                        key={n}
                        active={n === itemsPerPage}
                        onClick={() => { setItemsPerPage(n); setCurrentPage(1) }}
                        style={{ padding: '0.5rem 1.25rem', cursor: 'pointer' }}
                      >
                        {n}
                      </CDropdownItem>
                    ))}
                  </CDropdownMenu>
                </CDropdown>
              </div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Confirmation"
        message="Are you sure you want to delete this transaction?"
        onClose={() => {
          setConfirmVisible(false)
          setPendingDeleteId(null)
        }}
        onConfirm={confirmDelete}
      />

      <CModal
        visible={bulkModalVisible}
        onClose={() => setBulkModalVisible(false)}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>Bulk Update Payment Status</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            <strong>{selectedPaymentIds.length}</strong> transaction(s) selected.
          </p>
          <p className="text-body-secondary small">
            You can only change between Not Ready To Pay/Deduct and Ready To Pay/Deduct statuses.
          </p>
          <CFormSelect
            value={bulkStatusId}
            onChange={(e) => setBulkStatusId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select new status...</option>
            {bulkStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </CFormSelect>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setBulkModalVisible(false)}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            disabled={bulkStatusId === ''}
            onClick={handleBulkPaymentSubmit}
          >
            Update
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default FuelAuditorListPage
