import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CCollapse,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CMultiSelect,
  CBadge,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilNotes,
  cilOptions,
  cilCloudDownload,
  cilFilterX,
  cilPencil,
  cilSearch,
} from '@coreui/icons'
import type { AppDispatch, RootState } from '../../../store'
import {
  loadTripAuditorList,
  updateTripStatementStatus,
  resetAuditorLoading,
} from '../store/tripsSlice'
import type { TripAuditorListParams, TripAuditorRow, SelectOption } from '../types'
import { tripsAPI } from '../api/trips.api'
import { MODULE_TRIP, MODULE_TRIP_AUDITOR, getModuleIdByName } from '../../../constants/modules'
import { formatDateTime, formatCurrency, formatLempiras } from '../utils/tripTransformers'
import { permissionService, UPDATE } from '../../../services/auth/permission.service'
import PageHero from '../../../components/PageHero'
import './TripsList.scss'

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
const STORAGE_KEY = 'tripauditor_api_params'
const COLUMN_STORAGE_KEY = 'tripauditor_visible_columns'
const INV_STATUS_ALLOWED = [266, 267]
const PAY_STATUS_ALLOWED = [270, 271]

const buildPageList = (current: number, total: number, maxLength = 5) => {
  if (total <= 0) return [1]
  const safeMax = Math.max(1, maxLength)
  const half = Math.floor(safeMax / 2)
  let start = Math.max(1, current - half)
  let end = Math.min(total, start + safeMax - 1)

  if (end - start + 1 < safeMax) {
    start = Math.max(1, end - safeMax + 1)
  }

  const pages: number[] = []
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  return pages
}

const loadSavedParams = (): TripAuditorListParams => {
  const saved = sessionStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      const validRows = ITEMS_PER_PAGE_OPTIONS.includes(parsed.rows) ? parsed.rows : 20
      return {
        filter: [],
        search: null,
        match: null,
        rows: validRows,
        first: 0,
        sortField: parsed.sortField || 'trip',
        sortOrder: parsed.sortOrder || -1,
        filters: {},
      }
    } catch (error) {
      console.error('Failed to parse stored params', error)
    }
  }
  return {
    filter: [],
    search: null,
    match: null,
    rows: 20,
    first: 0,
    sortField: 'trip',
    sortOrder: -1,
    filters: {},
  }
}

const loadSavedColumns = () => {
  const saved = sessionStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (error) {
      console.error('Failed to parse column preferences', error)
    }
  }
  return ['trip', 'trip_created', 'work_order', 'client', 'invoice_status', 'payment_status']
}

const getStatusBadge = (status?: string) => {
  if (!status) return <CBadge color="secondary">Unknown</CBadge>
  const normalized = status.toString().toLowerCase()
  let color = 'secondary'
  if (normalized.includes('complete')) color = 'success'
  else if (normalized.includes('pending')) color = 'warning'
  else if (normalized.includes('active') || normalized.includes('in progress')) color = 'primary'
  else if (normalized.includes('hold')) color = 'info'
  else if (normalized.includes('cancel') || normalized.includes('reject')) color = 'danger'
  return <CBadge color={color}>{status}</CBadge>
}

const getAuditorBadge = (status?: string) => {
  if (!status) return <CBadge color="secondary">Unknown</CBadge>
  const normalized = status.toString().toLowerCase()
  let color = 'info'
  if (normalized.includes('approved')) color = 'success'
  else if (normalized.includes('pending')) color = 'warning'
  else if (normalized.includes('rejected')) color = 'danger'
  return <CBadge color={color}>{status}</CBadge>
}

const TripAuditorListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { auditorList, auditorTotal, isAuditorLoading, auditorErrors } = useSelector((state: RootState) => state.trips)

  const [apiParams, setApiParams] = useState<TripAuditorListParams>(loadSavedParams())
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [searchValue, setSearchValue] = useState(apiParams.search || '')
  const [expandedRows, setExpandedRows] = useState<number[]>([])
  const [invoiceStatusOptions, setInvoiceStatusOptions] = useState<SelectOption[]>([])
  const [paymentStatusOptions, setPaymentStatusOptions] = useState<SelectOption[]>([])
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Permission checks
  const canUpdate = permissionService.checkPermission(MODULE_TRIP_AUDITOR, UPDATE)

  useEffect(() => {
    const loadAttributes = async () => {
      const moduleIds = [getModuleIdByName(MODULE_TRIP), getModuleIdByName(MODULE_TRIP_AUDITOR)]
      let invoiceOptions: SelectOption[] = []
      let paymentOptions: SelectOption[] = []

      for (const moduleId of moduleIds) {
        if (invoiceOptions.length && paymentOptions.length) break
        try {
          const attributes = await tripsAPI.getAttributesWithItems(moduleId)
          if (!invoiceOptions.length) {
            const invoice = attributes.find((attr: any) => attr.attribute_id === 85)
            if (invoice?.items?.length) {
              invoiceOptions = invoice.items
                .filter((item: any) => INV_STATUS_ALLOWED.includes(item.attribute_item_id))
                .map((item: any) => ({ value: item.attribute_item_id, label: item.name }))
            }
          }
          if (!paymentOptions.length) {
            const payment = attributes.find((attr: any) => attr.attribute_id === 86)
            if (payment?.items?.length) {
              paymentOptions = payment.items
                .filter((item: any) => PAY_STATUS_ALLOWED.includes(item.attribute_item_id))
                .map((item: any) => ({ value: item.attribute_item_id, label: item.name }))
            }
          }
        } catch (error) {
          console.error('Failed to load attributes', error)
        }
      }

      setInvoiceStatusOptions(invoiceOptions)
      setPaymentStatusOptions(paymentOptions)
    }
    loadAttributes()
  }, [])

  useEffect(() => {
    dispatch(resetAuditorLoading())
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(apiParams))
    dispatch(loadTripAuditorList(apiParams))
  }, [dispatch, apiParams])

  useEffect(() => {
    sessionStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

const columns = [
    { key: 'trip', label: 'Trip', sorter: true, filter: true },
    { key: 'trip_created', label: 'Trip Created', sorter: true, filter: true },
    { key: 'trip_pick_up', label: 'Trip Pick Up', sorter: true, filter: true },
    { key: 'trip_close', label: 'Trip Completed', sorter: true, filter: true },
    { key: 'work_order', label: 'Work Order', sorter: true, filter: true },
    { key: 'work_order_date', label: 'Work Order Date', sorter: true, filter: true },
    { key: 'work_order_date_ref', label: 'Work Order Ref', sorter: true, filter: true },
    { key: 'client', label: 'Client', sorter: true, filter: true },
    { key: 'subdivision', label: 'Subdivision', sorter: true, filter: true },
    { key: 'assigned', label: 'Assigned Inventory', sorter: true, filter: true },
    { key: 'pick_up', label: 'Pick Up', sorter: true, filter: true },
    { key: 'work_order_pick_up_date', label: 'Pick-Up Exp Date', sorter: true, filter: true },
    { key: 'delivery', label: 'Delivery', sorter: true, filter: true },
    { key: 'work_order_deliver_date', label: 'Deliver Exp Date', sorter: true, filter: true },
    { key: 'return', label: 'Return To', sorter: true, filter: true },
    { key: 'chassis', label: 'AE Chassis', sorter: true, filter: true },
    { key: 'km_initial', label: 'KM initial', sorter: true, filter: true },
    { key: 'km_final', label: 'KM final', sorter: true, filter: true },
    { key: 'genset', label: 'AE Genset', sorter: true, filter: true },
    { key: 'hour_initial', label: 'Hour initial', sorter: true, filter: true },
    { key: 'hour_final', label: 'Hour final', sorter: true, filter: true },
    { key: 'container', label: 'Container No.', sorter: true, filter: true },
    { key: 'TPL', label: 'T-PL', sorter: true, filter: true },
    { key: 'TTCL', label: 'T-Transit-CL', sorter: true, filter: true },
    { key: 'TCL', label: 'TCL', sorter: true, filter: true },
    { key: 'TTDL', label: 'T-Transit-DL', sorter: true, filter: true },
    { key: 'TDL', label: 'TDL', sorter: true, filter: true },
    { key: 'TTDOL', label: 'T-Transit-DOL', sorter: true, filter: true },
    { key: 'TDOL', label: 'TDOL', sorter: true, filter: true },
    { key: 'free_time', label: 'Free Time', sorter: true, filter: true },
    { key: 'other_charges_payment', label: 'Invoice Other Charges', sorter: true, filter: true },
    { key: 'other_charges', label: 'Payment Other Charges', sorter: true, filter: true },
    { key: 'total_hours', label: 'Total Hours', sorter: true, filter: true },
    { key: 'customs', label: 'Customs', sorter: true, filter: false },
    { key: 'to_be_assigned', label: 'Time waiting to be assigned', sorter: true, filter: true },
    { key: 't_assigned', label: 'Time waiting to start trip', sorter: true, filter: true },
    { key: 'current_status', label: 'Time current Status', sorter: true, filter: true },
    { key: 'status', label: 'Trip Status', sorter: true, filter: true },
    {
      key: 'invoice_status',
      label: 'Trip Invoice Status',
      sorter: true,
      filter: (values: any[], onChange: (val: any) => void) => {
        return (
          <CMultiSelect
            size="sm"
            placeholder="Filter Status"
            options={invoiceStatusOptions}
            value={invoiceStatusOptions.filter((option) =>
              Array.isArray(values) ? values.includes(option.value) : false
            )}
            onChange={(selected) => {
              const values = selected.map((s) => s.value)
              onChange(values.length > 0 ? values : undefined)
            }}
          />
        )
      },
    },
    {
      key: 'payment_status',
      label: 'Trip Payment Status',
      sorter: true,
      filter: (values: any[], onChange: (val: any) => void) => {
        return (
          <CMultiSelect
            size="sm"
            placeholder="Filter Status"
            options={paymentStatusOptions}
            value={paymentStatusOptions.filter((option) =>
              Array.isArray(values) ? values.includes(option.value) : false
            )}
            onChange={(selected) => {
              const values = selected.map((s) => s.value)
              onChange(values.length > 0 ? values : undefined)
            }}
          />
        )
      },
    },
    { key: 'review_status', label: 'Auditor Status', sorter: true, filter: true },
    { key: 'invoice_price', label: 'Invoice Price', sorter: true, filter: true },
    { key: 'inv_km', label: 'Invoice KM', sorter: true, filter: true },
    { key: 'inv_rate', label: 'Invoice Rate', sorter: true, filter: true },
    { key: 'payment_price', label: 'Payment Price', sorter: true, filter: true },
    { key: 'payment_price_lps', label: 'Payment Price LPS', sorter: true, filter: true },
    { key: 'pay_km', label: 'Payment KM', sorter: true, filter: true },
    { key: 'pay_rate', label: 'Payment Rate', sorter: true, filter: true },
    { key: 'actions', label: 'Actions', sorter: false, filter: false },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key)
  )

  const handleItemsPerPageChange = (value: number) => {
    if (!ITEMS_PER_PAGE_OPTIONS.includes(value)) return
    setApiParams((prev) => ({ ...prev, rows: value, first: 0 }))
  }

  const handlePageChange = (page: number) => {
    const rows = apiParams.rows || 20
    setApiParams((prev) => ({ ...prev, first: (page - 1) * rows }))
  }

  const handleSorterChange = (sorter: { column: string; state: 'asc' | 'desc' | 0 } | null) => {
    if (!sorter || sorter.state === 0) {
      setApiParams((prev) => ({ ...prev, sortField: 'trip', sortOrder: -1, first: 0 }))
    } else {
      setApiParams((prev) => ({
        ...prev,
        sortField: sorter.column,
        sortOrder: sorter.state === 'asc' ? 1 : -1,
        first: 0,
      }))
    }
  }

  const handleTableFilterChange = (value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setApiParams((prev) => ({ ...prev, search: value || null, first: 0 }))
    }, 600)
  }

  const handleColumnFilterChange = useCallback((filters: Record<string, any>) => {
    setColumnFilterValues(filters)
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => {
      const mapped: Record<string, any> = {}
      Object.keys(filters).forEach((key) => {
        const value = filters[key]
        if (Array.isArray(value) && value.length > 0) {
           mapped[key] = value // Pass array directly for multi-select
        } else if (typeof value === 'string' && value.trim()) {
          mapped[key] = value.trim()
        }
      })
      setApiParams((prev) => ({ ...prev, filters: mapped, first: 0 }))
    }, 600)
  }, [])

  const handleClearFilters = () => {
    setSearchValue('')
    setColumnFilterValues({})
    setApiParams((prev) => ({
      ...prev,
      filter: [],
      search: null,
      filters: {},
      first: 0,
    }))
  }

  const toggleDetails = (tripId: number) => {
    setExpandedRows((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    )
  }

  const handleStatusChange = (row: TripAuditorRow, field: 'invoice_status' | 'payment_status', value: string) => {
    if (!value) return
    dispatch(updateTripStatementStatus({ id: row.trip, payload: { [field]: Number(value) } }))
  }

  const renderStatusSelect = (row: TripAuditorRow, field: 'invoice_status' | 'payment_status') => {
    const isInvoice = field === 'invoice_status'
    const allowed = isInvoice ? INV_STATUS_ALLOWED : PAY_STATUS_ALLOWED
    const currentId = row[`${field}_id`]
    const options = isInvoice ? invoiceStatusOptions : paymentStatusOptions
    const disabled = currentId ? !allowed.includes(Number(currentId)) : false

    return (
      <CFormSelect
        size="sm"
        value={currentId || ''}
        onChange={(e) => handleStatusChange(row, field, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled || options.length === 0}
      >
        <option value="">Select status</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </CFormSelect>
    )
  }

  const renderActions = (row: TripAuditorRow) => {
    const isExpanded = expandedRows.includes(row.trip)
    return (
      <div className="d-flex gap-2">
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          onClick={() => toggleDetails(row.trip)}
        >
          {isExpanded ? 'Hide' : 'Show'}
        </CButton>
        <CButton
          size="sm"
          color="info"
          variant="ghost"
          onClick={() => navigate(`/operations/trip-auditor/${row.trip}`, { state: { viewMode: true } })}
          title="View"
        >
          <CIcon icon={cilSearch} />
        </CButton>
        {canUpdate && (
          <CButton
            size="sm"
            color="primary"
            variant="ghost"
            onClick={() => navigate(`/operations/trip-auditor/${row.trip}`)}
            title="Edit"
          >
            <CIcon icon={cilPencil} />
          </CButton>
        )}
        {!canUpdate && (
          <span className="text-muted small">View only</span>
        )}
      </div>
    )
  }

  const handleExport = async (advanced = false) => {
    const params = {
      type: 'auditor',
      format: advanced ? 'xlsx2' : 'xlsx',
      filter: apiParams.filter,
      search: apiParams.search || undefined,
      sortField: apiParams.sortField || undefined,
      sortOrder: apiParams.sortOrder || undefined,
    }
    const blob = await tripsAPI.exportTripAuditor(params, advanced)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', advanced ? 'trip_auditor_adv.xlsx' : 'trip_auditor.xlsx')
    document.body.appendChild(link)
    link.click()
    link.parentNode?.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const scopedColumns = {
    trip_created: (item: TripAuditorRow) => <td>{formatDateTime(item.trip_created)}</td>,
    trip_pick_up: (item: TripAuditorRow) => <td>{formatDateTime(item.trip_pick_up)}</td>,
    trip_close: (item: TripAuditorRow) => <td>{formatDateTime(item.trip_close)}</td>,
    work_order_date: (item: TripAuditorRow) => <td>{formatDateTime(item.work_order_date)}</td>,
    work_order_pick_up_date: (item: TripAuditorRow) => <td>{formatDateTime(item.work_order_pick_up_date)}</td>,
    work_order_deliver_date: (item: TripAuditorRow) => <td>{formatDateTime(item.work_order_deliver_date)}</td>,
    customs: (item: TripAuditorRow) => (
      <td className="text-center">
        {item.customs === 1 || item.customs === true ? (
          <CBadge color="success">Yes</CBadge>
        ) : (
          <CBadge color="secondary">No</CBadge>
        )}
      </td>
    ),
    status: (item: TripAuditorRow) => <td>{getStatusBadge(item.status || item.trip_status_name)}</td>,
    invoice_status: (item: TripAuditorRow) => <td>{renderStatusSelect(item, 'invoice_status')}</td>,
    payment_status: (item: TripAuditorRow) => <td>{renderStatusSelect(item, 'payment_status')}</td>,
    review_status: (item: TripAuditorRow) => <td>{getAuditorBadge(item.review_status)}</td>,
    invoice_price: (item: TripAuditorRow) => <td>{formatCurrency(item.invoice_price)}</td>,
    inv_rate: (item: TripAuditorRow) => <td>{formatCurrency(item.inv_rate)}</td>,
    payment_price: (item: TripAuditorRow) => <td>{formatCurrency(item.payment_price)}</td>,
    payment_price_lps: (item: TripAuditorRow) => <td>{formatLempiras(item.payment_price_lps)}</td>,
    pay_rate: (item: TripAuditorRow) => <td>{formatCurrency(item.pay_rate)}</td>,
    actions: (item: TripAuditorRow) => <td>{renderActions(item)}</td>,
    details: (item: TripAuditorRow) => (
      <CCollapse visible={expandedRows.includes(item.trip)}>
        <CCardBody style={{ backgroundColor: 'var(--cui-body-bg)', color: 'var(--cui-body-color)', borderTop: '1px solid var(--cui-border-color)' }}>
          <CRow className="text-sm">
            <CCol md={4}>
              <strong>Pick Up:</strong> {item.pick_up || '—'}
            </CCol>
            <CCol md={4}>
              <strong>Delivery:</strong> {item.delivery || '—'}
            </CCol>
            <CCol md={4}>
              <strong>Return:</strong> {item.return || '—'}
            </CCol>
          </CRow>
        </CCardBody>
      </CCollapse>
    ),
  }

  const filteredTotal = auditorTotal
  const validRows = apiParams.rows && apiParams.rows > 0 ? apiParams.rows : 20
  const currentPage = Math.floor(apiParams.first / validRows) + 1
  const totalPages = Math.max(1, Math.ceil(filteredTotal / validRows))
  const manualPaginationPages = buildPageList(currentPage, totalPages)

  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter(
    (key) => {
        const val = columnFilterValues[key]
        return Array.isArray(val) ? val.length > 0 : val?.trim()
    }
  ).length
  const hasSearchFilter = searchValue.trim().length > 0
  const hasActiveFilters = activeColumnFiltersCount > 0 || hasSearchFilter
  const totalActiveFilters = activeColumnFiltersCount + (hasSearchFilter ? 1 : 0)

  return (
    <CRow className="g-3">
      <CCol xs={12}>
        <PageHero
          kicker="Operations"
          icon={cilNotes}
          title="Trip Auditor"
          subtitle={`Manage your trip audits • ${filteredTotal} items`}
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
                    {columns
                      .filter((col) => col.key !== 'actions' && col.key !== 'show_details')
                      .map((col) => (
                        <div key={col.key} className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`col-${col.key}`}
                            checked={visibleColumns.includes(col.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setVisibleColumns([...visibleColumns, col.key])
                              } else if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                              }
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
              <CDropdown>
                <CDropdownToggle color="secondary">
                  <CIcon icon={cilCloudDownload} className="me-2" />
                  Export
                </CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem onClick={() => handleExport(false)}>Export Basic (XLSX)</CDropdownItem>
                  <CDropdownItem onClick={() => handleExport(true)}>Export Advanced (XLSX)</CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </div>
          }
        />
        <CCard className="mb-4 shadow-sm trips-card">
          <CCardBody>
            {auditorErrors && (
              <CAlert color="danger" className="mb-3">
                {auditorErrors}
              </CAlert>
            )}
            <CRow className="mb-3 align-items-center">
              <CCol xs={12} md="auto" className="mb-2 mb-md-0">
                <div className="d-flex align-items-center gap-2">
                  <label className="form-label mb-0 me-2">Search:</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Search..."
                    value={searchValue}
                    onChange={(e) => handleTableFilterChange(e.target.value)}
                    style={{ minWidth: '250px' }}
                  />
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm d-flex align-items-center ms-3"
                      onClick={handleClearFilters}
                    >
                      <CIcon icon={cilFilterX} className="me-1" />
                      Clear Filters ({totalActiveFilters})
                    </button>
                  )}
                </div>
              </CCol>
            </CRow>

            <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={auditorList}
                itemsPerPage={validRows}
                loading={isAuditorLoading}
                pagination={false}
                itemsPerPageSelect={false}
                columnFilter={{ external: true }}
                columnFilterValue={columnFilterValues}
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'trips-table align-middle',
                }}
                columnSorter={{ resetable: true }}
                tableFilter={false}
                onSorterChange={(sorter) => {
                  if (Array.isArray(sorter)) return
                  handleSorterChange(sorter as { column: string; state: 'asc' | 'desc' | 0 } | null)
                }}
                onColumnFilterChange={handleColumnFilterChange}
              />
            </div>

            <div className="trips-pagination mt-3">
              <CPagination align="center" size="sm" className="mb-0 trips-pagination__controls">
                <CPaginationItem
                  aria-label="First page"
                  disabled={currentPage <= 1}
                  onClick={() => currentPage > 1 && handlePageChange(1)}
                >
                  {'<<'}
                </CPaginationItem>
                <CPaginationItem
                  aria-label="Previous page"
                  disabled={currentPage <= 1}
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                >
                  {'<'}
                </CPaginationItem>
                {manualPaginationPages.map((pageNumber) => (
                  <CPaginationItem
                    key={pageNumber}
                    active={pageNumber === currentPage}
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </CPaginationItem>
                ))}
                <CPaginationItem
                  aria-label="Next page"
                  disabled={currentPage >= totalPages}
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                >
                  {'>'}
                </CPaginationItem>
                <CPaginationItem
                  aria-label="Last page"
                  disabled={currentPage >= totalPages}
                  onClick={() => currentPage < totalPages && handlePageChange(totalPages)}
                >
                  {'>>'}
                </CPaginationItem>
              </CPagination>

              <div className="trips-pagination__rows ms-auto d-flex align-items-center gap-2">
                <span className="text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
                <CDropdown direction="dropup">
                  <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
                    {validRows}
                  </CDropdownToggle>
                  <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
                    {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                      <CDropdownItem
                        key={n}
                        active={n === validRows}
                        onClick={() => handleItemsPerPageChange(n)}
                        style={{ padding: '0.5rem 1.25rem', cursor: 'pointer' }}
                      >
                        {n}
                      </CDropdownItem>
                    ))}
                  </CDropdownMenu>
                </CDropdown>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default TripAuditorListPage
