import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CBadge,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilDrop,
  cilFilterX,
  cilOptions,
  cilCloudDownload,
  cilMagnifyingGlass,
} from '@coreui/icons'

import type { AppDispatch, RootState } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ConfirmDialog from '../../../../components/ConfirmationModal'
import exportToXlsx from '../../../../utils/exportToXlsx'

import {
  fetchFuelOrdersList,
  deleteFuelOrder,
  resetStatuses,
  downloadFuelOrderPdf,
  selectFuelOrderList,
  selectFuelOrderTotal,
  selectFuelOrderErrors,
  selectFuelOrderStatuses,
  selectFuelOrderLoadingList,
} from '../store/fuelOrder.slice'

import {
  permissionService,
  CREATE,
  UPDATE,
  DELETE,
  UPDATE_STATUS,
} from '../../../../services/auth/permission.service'
import { MODULE_FUEL_ORDERS } from '../../../../constants/modules'

const VIEW_ALL_SUBDIVISIONS = 'View All Subdivisions'

const COLUMN_STORAGE_KEY = 'fuelOrder_visible_columns_v2'
const DEFAULT_COLUMNS = [
  'fuelOrderId',
  'gasStationName',
  'plate',
  'fuelTank',
  'fuelRequest',
  'fuelRequestLtr',
  'suggested',
  'supplied',
  'totalLps',
  'totalDollar',
  'orderTypeName',
  'typeContainerName',
  'fuelTypeName',
  'approvalDateFormat',
  'tripsid',
  'createDateFormat',
  'statusFuelOrderName',
  'supplierStatementStatus',
  'fuelStatementStatus',
  'createdByUser',
]

const ROWS_PER_PAGE_OPTIONS = [15, 30, 50, 100]
const MAX_EXPORT_ROWS = 5000

const loadSavedColumns = () => {
  const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return DEFAULT_COLUMNS
}

const getStatusBadgeColor = (status: string | undefined): string => {
  if (!status) return 'secondary'
  const s = status.toLowerCase()
  if (s.includes('approved')) return 'success'
  if (s.includes('pending')) return 'warning'
  if (s.includes('rejected') || s.includes('cancel')) return 'danger'
  return 'info'
}

const FuelOrderListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectFuelOrderList)
  const total = useSelector(selectFuelOrderTotal)
  const errors = useSelector(selectFuelOrderErrors)
  const statuses = useSelector(selectFuelOrderStatuses)
  const loading = useSelector(selectFuelOrderLoadingList)

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [searchValue, setSearchValue] = useState('')
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [currentPage, setCurrentPage] = useState(1)
  // Gap 30: Items per page as state (synced with API)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [sortState, setSortState] = useState<{ column: string; state: string | number }>({
    column: 'fuelOrderId',
    state: 'desc',
  })
  const [exporting, setExporting] = useState(false)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const canCreate = permissionService.checkPermission(MODULE_FUEL_ORDERS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_FUEL_ORDERS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_FUEL_ORDERS, DELETE)
  // Gap 19: Also check UPDATE_STATUS for edit access
  const canUpdateStatus = permissionService.checkPermission(MODULE_FUEL_ORDERS, UPDATE_STATUS)
  const canEdit = canUpdate || canUpdateStatus
  const canViewAllSubdivisions = permissionService.checkPermission(MODULE_FUEL_ORDERS, VIEW_ALL_SUBDIVISIONS)

  const subdivisionsList = useSelector(
    (s: RootState) => (s.auth as any)?.details?.details?.subdivisions ?? [],
  )
  const allowedSubdivisionIds = useMemo(
    () => subdivisionsList.map((s: any) => Number(s.subdivision_id)).filter((v: number) => !Number.isNaN(v)),
    [subdivisionsList],
  )

  const fetchData = useCallback(() => {
    const filters: Record<string, any> = {}
    if (searchValue.trim()) filters.q = searchValue.trim()
    Object.entries(columnFilterValues).forEach(([key, value]) => {
      const v = String(value ?? '').trim()
      if (v) filters[key] = v
    })
    if (!canViewAllSubdivisions && allowedSubdivisionIds.length > 0) {
      filters.subdivisionIds = allowedSubdivisionIds
    }
    dispatch(
      fetchFuelOrdersList({
        page: currentPage,
        size: itemsPerPage,
        sortField: sortState.column,
        sortOrder: sortState.state === 'asc' || sortState.state === 0 ? 'ASC' : 'DESC',
        filters,
      }),
    )
  }, [dispatch, currentPage, itemsPerPage, sortState, searchValue, columnFilterValues, canViewAllSubdivisions, allowedSubdivisionIds])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    if (!errors) return
    const toast = (window as any).exaToast
    const msg = typeof errors === 'string' ? errors : 'An error occurred loading Fuel Orders'
    toast?.error ? toast.error('Error', msg) : console.error(msg)
  }, [errors])

  useEffect(() => {
    const toast = (window as any).exaToast
    if (statuses.added) toast?.success?.('Success', 'Fuel Order was created')
    if (statuses.updated) toast?.success?.('Success', 'Fuel Order was updated')
    if (statuses.deleted) toast?.success?.('Success', 'Fuel Order was deleted')
    if (statuses.added || statuses.updated || statuses.deleted) {
      dispatch(resetStatuses())
      fetchData()
    }
  }, [statuses, dispatch, fetchData])

  const handleOpenNew = () => canCreate && navigate('/fuel/fuelorder/new')
  const handleOpenEdit = (id: number) => navigate(`/fuel/fuelorder/${id}`)
  const handleView = (id: number) =>
    navigate(`/fuel/fuelorder/${id}`, { state: { viewMode: true } })

  const handleAskDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await dispatch(deleteFuelOrder(pendingDeleteId))
  }

  const handleDownloadPdf = (id: number) => {
    dispatch(downloadFuelOrderPdf(id))
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1)
    }, 600)
  }

  const handleColumnFilterChange = useCallback((filters: Record<string, any>) => {
    setColumnFilterValues(filters)
  }, [])

  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter((key) => {
    const val = columnFilterValues[key]
    return Array.isArray(val) ? val.length > 0 : String(val ?? '').trim().length > 0
  }).length
  const hasSearchFilter = searchValue.trim().length > 0
  const hasActiveFilters = activeColumnFiltersCount > 0 || hasSearchFilter
  const totalActiveFilters = activeColumnFiltersCount + (hasSearchFilter ? 1 : 0)

  const handleClearFilters = () => {
    setSearchValue('')
    setColumnFilterValues({})
    setCurrentPage(1)
  }

  // Gap 29: All columns now have filter: true (including numeric columns)
  const columns = [
    { key: 'fuelOrderId', label: 'Fuel Order ID', sorter: true, filter: true, _style: { width: '100px' } },
    { key: 'tripsid', label: 'Trip ID', sorter: true, filter: true, _style: { width: '80px' } },
    { key: 'gasStationName', label: 'Gas Station Name', sorter: true, filter: true },
    { key: 'plate', label: 'Plate', sorter: true, filter: true },
    { key: 'subdivisionName', label: 'Subdivision', sorter: true, filter: true },
    { key: 'orderTypeName', label: 'Order Type', sorter: true, filter: true },
    { key: 'typeContainerName', label: 'Type of Container', sorter: true, filter: true },
    { key: 'fuelTypeName', label: 'Fuel Type', sorter: true, filter: true },
    { key: 'fuelTank', label: 'Fuel Tank', sorter: true, filter: true },
    { key: 'fuelRequest', label: 'Fuel Request (gal)', sorter: true, filter: true },
    { key: 'fuelRequestLtr', label: 'Fuel Request (Ltr)', sorter: true, filter: true },
    { key: 'suggested', label: 'Suggested', sorter: true, filter: true },
    { key: 'supplied', label: 'Supplied', sorter: true, filter: true },
    { key: 'totalLps', label: 'Total Lps', sorter: true, filter: true },
    { key: 'totalDollar', label: 'Total Dollar', sorter: true, filter: true },
    { key: 'approvalDateFormat', label: 'Approval Date', sorter: true, filter: true },
    { key: 'dateSuppliedFormat', label: 'Date Supplied', sorter: true, filter: true },
    { key: 'dateSchedule', label: 'Date Schedule', sorter: true, filter: true },
    { key: 'createDateFormat', label: 'Created At', sorter: true, filter: true },
    { key: 'createdByUser', label: 'Created By', sorter: true, filter: true },
    { key: 'statusFuelOrderName', label: 'Status Fuel Order', sorter: true, filter: true },
    { key: 'supplierStatementStatus', label: 'Gas Supplier Statement Status', sorter: true, filter: true },
    { key: 'fuelStatementStatus', label: 'Fuel Subdivision Statement Status', sorter: true, filter: true },
    { key: 'actions', label: 'Actions', sorter: false, filter: false, _style: { width: '140px' } },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )

  const tableItems = useMemo(() => {
    let items = (list ?? []).map((x: any) => ({
      ...x,
      dateSchedule: x.dateScheduleFormat ?? x.dateSchedule ?? '',
      createDateFormat: x.createdAtFormat ?? '',
      approvalDateFormat: x.approveAtFormat ?? x.approvalDateFormat ?? '',
      dateSuppliedFormat: x.dateSuppliedFormat ?? '',
      createdByUser: x.createdByUser ?? '',
    }))

    if (!canViewAllSubdivisions && allowedSubdivisionIds.length > 0) {
      items = items.filter(
        (item) => item.subdivisionId && allowedSubdivisionIds.includes(Number(item.subdivisionId)),
      )
    }

    return items
  }, [list, canViewAllSubdivisions, allowedSubdivisionIds])

  // Gap 20: Full export up to MAX_EXPORT_ROWS
  const handleExportXlsx = async () => {
    const exportColumns = activeColumns
      .filter((col) => col.key !== 'actions')
      .map((col) => ({ key: col.key as string, label: col.label as string }))

    setExporting(true)
    try {
      const { fuelOrderApi } = await import('../api/fuelOrder.api')
      const filters: Record<string, any> = {}
      if (searchValue.trim()) filters.q = searchValue.trim()
      Object.entries(columnFilterValues).forEach(([key, value]) => {
        const v = String(value ?? '').trim()
        if (v) filters[key] = v
      })
      if (!canViewAllSubdivisions && allowedSubdivisionIds.length > 0) {
        filters.subdivisionIds = allowedSubdivisionIds
      }

      const result = await fuelOrderApi.fetchList({
        page: 1,
        size: MAX_EXPORT_ROWS,
        sortField: sortState.column,
        sortOrder: sortState.state === 'asc' || sortState.state === 0 ? 'ASC' : 'DESC',
        filters,
      })

      let exportItems = (result.data ?? (result as any).items ?? []).map((x: any) => ({
        ...x,
        dateSchedule: x.dateScheduleFormat ?? x.dateSchedule ?? '',
        createDateFormat: x.createdAtFormat ?? '',
        approvalDateFormat: x.approveAtFormat ?? x.approvalDateFormat ?? '',
        dateSuppliedFormat: x.dateSuppliedFormat ?? '',
        createdByUser: x.createdByUser ?? '',
      }))

      if (!canViewAllSubdivisions && allowedSubdivisionIds.length > 0) {
        exportItems = exportItems.filter(
          (item: any) => item.subdivisionId && allowedSubdivisionIds.includes(Number(item.subdivisionId)),
        )
      }

      await exportToXlsx({
        columns: exportColumns,
        rows: exportItems,
        fileName: `fuel_orders_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Fuel Orders',
      })
    } catch (err) {
      const toast = (window as any).exaToast
      toast?.error?.('Export Error', 'Failed to export fuel orders.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <CContainer fluid>
      <PageHero
        kicker="Fuel"
        icon={cilDrop}
        title="Fuel Orders"
        actions={
          <div className="d-flex gap-2">
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
                  {columns.filter((col) => col.key !== 'actions').map((col) => (
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
              onClick={handleExportXlsx}
              disabled={!tableItems.length || exporting}
            >
              <CIcon icon={cilCloudDownload} className="me-2" />
              {exporting ? 'Exporting...' : 'Export XLSX'}
            </CButton>
            {canCreate && (
              <CButton color="primary" className="text-white" onClick={handleOpenNew}>
                <CIcon icon={cilPlus} className="me-2" /> New Fuel Order
              </CButton>
            )}
          </div>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          {errors && (
            <CAlert color="danger" className="mb-3">
              {typeof errors === 'string' ? errors : 'An error occurred loading Fuel Orders'}
            </CAlert>
          )}
          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto" className="mb-2 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
                <input
                  className="form-control w-auto"
                  type="text"
                  placeholder="Search by plate, station, trip..."
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  style={{ minWidth: '280px' }}
                />
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm d-flex align-items-center ms-3"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={handleClearFilters}
                  >
                    <CIcon icon={cilFilterX} className="me-1" /> Clear Filters ({totalActiveFilters})
                  </button>
                )}
              </div>
            </CCol>
          </CRow>

          <CSmartTable
            items={tableItems}
            columns={activeColumns}
            itemsPerPage={itemsPerPage}
            activePage={currentPage}
            pagination
            paginationProps={{
              pages: Math.ceil(total / itemsPerPage) || 1,
              activePage: currentPage,
              onActivePageChange: setCurrentPage,
            }}
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
              className: 'align-middle',
            }}
            scopedColumns={{
              statusFuelOrderName: (item: any) => (
                <td>
                  <CBadge color={getStatusBadgeColor(item.statusFuelOrderName)}>
                    {item.statusFuelOrderName ?? '-'}
                  </CBadge>
                </td>
              ),
              actions: (item: any) => (
                <td>
                  <div className="d-flex gap-1">
                    <CButton
                      color="info"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(item.fuelOrderId)}
                      title="View"
                    >
                      <CIcon icon={cilMagnifyingGlass} />
                    </CButton>
                    {/* Gap 19: Check UPDATE or UPDATE_STATUS */}
                    {canEdit && (
                      <CButton
                        color="primary"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(item.fuelOrderId)}
                        title="Edit"
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                    )}
                    {item.statusFuelOrderName?.toLowerCase()?.includes('approved') && (
                      <CButton
                        color="success"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPdf(item.fuelOrderId)}
                        title="Download PDF"
                      >
                        <CIcon icon={cilCloudDownload} />
                      </CButton>
                    )}
                    {canDelete && (
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAskDelete(item.fuelOrderId)}
                        title="Delete"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    )}
                  </div>
                </td>
              ),
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
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
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
      </CCard>

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Confirmation"
        message="Are you sure you want to delete this fuel order?"
        onClose={() => {
          setConfirmVisible(false)
          setPendingDeleteId(null)
        }}
        onConfirm={confirmDelete}
      />
    </CContainer>
  )
}

export default FuelOrderListPage
