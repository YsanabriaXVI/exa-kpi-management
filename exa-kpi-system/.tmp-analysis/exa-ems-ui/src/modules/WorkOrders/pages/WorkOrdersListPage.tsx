/**
 * Work Orders List Page
 * Modern functional component using CoreUI Pro SmartTable
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CPagination,
  CPaginationItem,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CCollapse,
  CMultiSelect,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilNotes,
  cilPlus,
  cilPencil,
  cilTrash,
  cilFilter,
  cilCloudDownload,
  cilFilterX,
  cilOptions,
} from '@coreui/icons'

import type { RootState, AppDispatch } from '../../../store'
import { loadWorkOrdersList, deleteWorkOrder, resetLoading } from '../store/workordersSlice'
import { loadClients } from '../../Users/store/usersSlice'
import type { WorkOrderListParams, ExportParams } from '../types'
import { workOrdersAPI } from '../api/workorders.api'
import PageHero from '../../../components/PageHero'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../services/auth/permission.service'
import { MODULE_WORK_ORDERS } from '../../../constants/modules'
import './WorkOrdersList.scss'

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100]

/**
 * Helper function to reset sessionStorage if data gets corrupted
 * You can call this from browser console: window.resetWorkOrdersStorage()
 */
if (typeof window !== 'undefined') {
  (window as any).resetWorkOrdersStorage = () => {
    sessionStorage.removeItem('workorders_api_params')
    sessionStorage.removeItem('workorders_visible_columns')
    console.log('✅ Work Orders storage reset! Refresh the page.')
  }
}

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

const WorkOrdersListPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  // Redux state
  const { list, isLoading, total } = useSelector((state: RootState) => state.workorders)
  const { clients } = useSelector((state: RootState) => state.users)

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_WORK_ORDERS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_WORK_ORDERS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_WORK_ORDERS, DELETE)

  // Load saved API params from sessionStorage (but NOT filters - always start fresh)
  const loadSavedParams = (): WorkOrderListParams => {
    const saved = sessionStorage.getItem('workorders_api_params')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Validate rows value - must be valid and in our options
        const validRows = ITEMS_PER_PAGE_OPTIONS.includes(parsed.rows) ? parsed.rows : 20
        
        // Return saved params but ALWAYS reset filters and search on page load
        return {
          filter: [],
          search: null,
          match: null,
          rows: validRows,
          first: 0,
          sortField: parsed.sortField || 'work_order_id',
          sortOrder: parsed.sortOrder || -1,
          filters: {},
        }
      } catch (e) {
        console.error('Failed to parse saved params:', e)
      }
    }
    return {
      filter: [],
      search: null,
      match: null,
      rows: 20,
      first: 0,
      sortField: 'work_order_id',
      sortOrder: -1,
      filters: {},
    }
  }

  // Local state for API params (NOT for controlling CSmartTable)
  const [apiParams, setApiParams] = useState<WorkOrderListParams>(loadSavedParams())
  
  // Column filters state
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  
  // Local search value for immediate UI update
  const [searchValue, setSearchValue] = useState<string>(apiParams.search || '')
  
  // Debounce timer refs
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Details collapse state (tracks which rows are expanded)
  const [expandedRows, setExpandedRows] = useState<number[]>([])

  // Load saved column preferences from sessionStorage
  const loadSavedColumns = () => {
    const saved = sessionStorage.getItem('workorders_visible_columns')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved columns:', e)
      }
    }
    return [
      'work_order_id',
      'ref_number',
      'trip_number',
      'client_name',
      'pick_up_city',
      'pick_up_date_time',
    ]
  }

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [toast, setToast] = useState<React.ReactElement | null>(null)
  const toaster = useRef<HTMLDivElement | null>(null)

  // Available columns configuration - let CSS handle all styling
  const columns = [
    {
      key: 'work_order_id',
      label: 'ID',
      filter: true,
      sorter: true,
    },
    {
      key: 'ref_number',
      label: 'Reference Number',
      filter: true,
      sorter: true,
    },
    {
      key: 'trip_number',
      label: 'Trips',
      filter: true,
      sorter: true,
    },
    {
      key: 'client_name',
      label: 'Client',
      filter: (_values: any[], onChange: (val: any) => void) => {
        return (
          <CMultiSelect
            size="sm"
            placeholder="Filter Client"
            options={clients.map((client: any) => ({
              value: client.name,
              label: client.name,
            }))}
            onChange={(selected: any[]) => {
              const values = selected.map((s: any) => s.value)
              onChange(values.length > 0 ? values : undefined)
            }}
          />
        )
      },
      sorter: true,
    },
    {
      key: 'pick_up_city',
      label: 'Pick-Up City',
      filter: true,
      sorter: true,
    },
    {
      key: 'pick_up_date_time',
      label: 'Pick-Up Date',
      filter: true,
      sorter: true,
    },
    {
      key: 'delivered_city',
      label: 'Delivered City',
      filter: true,
      sorter: true,
    },
    {
      key: 'deliver_date_time',
      label: 'Delivered Date',
      filter: true,
      sorter: true,
    },
    {
      key: 'return_city',
      label: 'Return To',
      filter: true,
      sorter: true,
    },
    {
      key: 'cargo_type',
      label: 'Cargo Type',
      filter: true,
      sorter: true,
    },
    {
      key: 'status',
      label: 'Status',
      filter: true,
      sorter: true,
    },
    {
      key: 'invoice_price',
      label: 'Total Invoice Price',
      filter: true,
      sorter: true,
    },
    {
      key: 'inv_km',
      label: 'Total Invoice Km',
      filter: true,
      sorter: true,
    },
    {
      key: 'invoice_other_charges',
      label: 'Total Other',
      filter: true,
      sorter: true,
    },
    {
      key: 'show_details',
      label: '',
      filter: false,
      sorter: false,
    },
    {
      key: 'actions',
      label: 'Actions',
      filter: false,
      sorter: false,
    },
  ]

  // Filter columns based on visibility
  const activeColumns = columns.filter((col) => {
    if (col.key === 'actions' || col.key === 'show_details') return true // Always show actions and show_details
    return visibleColumns.includes(col.key)
  })

  // Toggle details collapse
  const toggleDetails = (id: number) => {
    const position = expandedRows.indexOf(id)
    let newExpandedRows = [...expandedRows]
    if (position === -1) {
      newExpandedRows = [...expandedRows, id]
    } else {
      newExpandedRows.splice(position, 1)
    }
    setExpandedRows(newExpandedRows)
  }

  // Clear any stuck filters on mount and load data ONCE
  useEffect(() => {
    // Validate and clean up any invalid sessionStorage data
    const validRows = ITEMS_PER_PAGE_OPTIONS.includes(apiParams.rows) ? apiParams.rows : 20
    
    // Force clear sessionStorage filters on mount and ensure valid params
    const cleanParams: WorkOrderListParams = {
      filter: [],
      search: null,
      match: null,
      rows: validRows,
      first: 0,
      sortField: 'work_order_id', // Default to work_order_id (newest first)
      sortOrder: -1, // -1 = DESC (newest records first)
      filters: {},
    }
    sessionStorage.setItem('workorders_api_params', JSON.stringify(cleanParams))
    
    // Update local state if rows was invalid
    if (apiParams.rows !== validRows) {
      setApiParams(cleanParams)
    }
    
    // Reset any stale loading state from other pages before fetching
    dispatch(resetLoading())

    // Load data with clean params (newest records first by default)
    dispatch(loadWorkOrdersList(cleanParams))
    
    // Debug helper: uncomment to reset sessionStorage if you get stuck
    // sessionStorage.removeItem('workorders_api_params')
    // sessionStorage.removeItem('workorders_visible_columns')
    // Debug helper: uncomment to reset sessionStorage if you get stuck
    // sessionStorage.removeItem('workorders_api_params')
    // sessionStorage.removeItem('workorders_visible_columns')

    // Load clients for filter
    dispatch(loadClients())
  }, []) // Empty dependency array - only run once!

  // Save visible columns to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('workorders_visible_columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  // Save API params to sessionStorage (but NOT filters - don't persist filters between sessions)
  useEffect(() => {
    // Validate rows before saving
    const validRows = ITEMS_PER_PAGE_OPTIONS.includes(apiParams.rows) ? apiParams.rows : 20
    
    // Auto-correct invalid rows value if detected
    if (apiParams.rows !== validRows) {
      console.warn(`Auto-correcting invalid rows value: ${apiParams.rows} -> ${validRows}`)
      setApiParams((prev: WorkOrderListParams) => ({
        ...prev,
        rows: validRows
      }))
      return // Exit early, this will re-trigger the effect with corrected value
    }
    
    const paramsToSave = {
      ...apiParams,
      rows: validRows, // Ensure we only save valid rows values
      search: null, // Don't save search
      filters: {}, // Don't save filters
      first: 0, // Always start from first page
    }
    sessionStorage.setItem('workorders_api_params', JSON.stringify(paramsToSave))
  }, [apiParams])

  // Handle items per page change (fired by CSmartTable or user selection)
  const handleItemsPerPageChange = (itemsPerPage: number) => {
    // CRITICAL: Only allow valid values from our options
    // This prevents SmartTable from setting invalid values (like 1 or 2 from last page)
    if (!ITEMS_PER_PAGE_OPTIONS.includes(itemsPerPage)) {
      console.warn(`Ignoring invalid itemsPerPage value: ${itemsPerPage}`)
      return // Ignore invalid values
    }
    
    const newParams = {
      ...apiParams,
      rows: itemsPerPage,
      first: 0, // Reset to first page
    }
    setApiParams(newParams)
    dispatch(loadWorkOrdersList(newParams))
  }

  // Handle page change (manual pagination)
  const handlePageChange = (page: number) => {
    // Ensure rows is valid before calculating offset
    const validRows = apiParams.rows && apiParams.rows > 0 ? apiParams.rows : 20
    
    const newParams = {
      ...apiParams,
      rows: validRows, // Ensure rows is always set correctly
      first: (page - 1) * validRows,
    }
    setApiParams(newParams)
    dispatch(loadWorkOrdersList(newParams))
  }

  // Handle sort change (fired by CSmartTable)
  const handleSorterChange = (sorter: { column: string; state: 'asc' | 'desc' | 0 } | null) => {
    if (!sorter || sorter.state === 0) {
      // Reset sort
      const newParams = {
        ...apiParams,
        sortField: 'work_order_id',
        sortOrder: -1,
        first: 0,
      }
      setApiParams(newParams)
      dispatch(loadWorkOrdersList(newParams))
    } else {
      const newParams = {
        ...apiParams,
        sortField: sorter.column,
        sortOrder: sorter.state === 'asc' ? 1 : -1,
        first: 0,
      }
      setApiParams(newParams)
      dispatch(loadWorkOrdersList(newParams))
    }
  }

  // Handle table filter change (global search with debouncing)
  const handleTableFilterChange = (value: string) => {
    // Update local state immediately for UI responsiveness
    setSearchValue(value)
    
    // Clear existing debounce timer
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    
    // Debounce API call by 800ms
    searchDebounceRef.current = setTimeout(() => {
    const newParams = {
      ...apiParams,
      search: value || null,
      first: 0,
    }
    setApiParams(newParams)
    dispatch(loadWorkOrdersList(newParams))
    }, 800)
  }

  // Handle column filter change with debouncing (fired by CSmartTable - column-specific filters)
  const handleColumnFilterChange = useCallback((filter: Record<string, any>) => {
    // Update local state for UI immediately
    setColumnFilterValues(filter)

    // Clear existing debounce timer
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }

    // Debounce API call by 800ms to allow user to finish typing
    filterDebounceRef.current = setTimeout(() => {
      // Build filters object for API
      const newFilters: Record<string, any> = {}
      
      // Only include non-empty filters
      Object.keys(filter).forEach((key) => {
        const value = filter[key]
        if (Array.isArray(value) && value.length > 0) {
          newFilters[key] = value
        } else if (typeof value === 'string' && value.trim() !== '') {
          newFilters[key] = value.trim()
        }
      })

      const newParams = {
        ...apiParams,
        filters: newFilters,
        first: 0, // Reset to first page when filtering
      }
      
      setApiParams(newParams)
      dispatch(loadWorkOrdersList(newParams))
    }, 800)
  }, [apiParams, dispatch])

  // Clear all filters
  const handleClearFilters = () => {
    // Clear all filter states
    setColumnFilterValues({})
    setSearchValue('')
    
    // Clear any pending debounce timers
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    
    // Clear sessionStorage
    const cleanParams = {
      filter: [],
      search: null,
      match: null,
      rows: apiParams.rows,
      first: 0,
      sortField: apiParams.sortField,
      sortOrder: apiParams.sortOrder,
      filters: {},
    }
    sessionStorage.setItem('workorders_api_params', JSON.stringify(cleanParams))
    
    // Reset API params and reload - MUST clear BOTH filter and filters
    const newParams = {
      ...apiParams,
      filter: [],
      search: null,
      filters: {},
      first: 0,
    }
    setApiParams(newParams)
    dispatch(loadWorkOrdersList(newParams))
  }

  // Check if any filters are active and count them
  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter((key) => {
    const value = columnFilterValues[key]
    if (Array.isArray(value)) {
      return value.length > 0
    }
    return value && typeof value === 'string' && value.trim() !== ''
  }).length
  const hasSearchFilter = searchValue && searchValue.trim() !== ''
  const hasActiveFilters = activeColumnFiltersCount > 0 || hasSearchFilter
  const totalActiveFilters = activeColumnFiltersCount + (hasSearchFilter ? 1 : 0)

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current)
      }
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!canDelete) {
      alert('You do not have permission to delete work orders.')
      return
    }
    if (window.confirm('Are you sure you want to delete this work order?')) {
      await dispatch(deleteWorkOrder(id))
      // Reload current page
      dispatch(loadWorkOrdersList(apiParams))
    }
  }

  // Render date column
  const renderDate = (timestamp: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000) // Convert Unix timestamp to milliseconds
    
    const day = String(date.getDate()).padStart(2, '0')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames[date.getMonth()]
    const year = String(date.getFullYear()).slice(-2)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${day}-${month}-${year} ${hours}:${minutes}`
  }

  // Render status badge
  const renderStatus = (status: any) => {
    // Handle both numeric and string status values
    let statusText = ''
    let statusColor = 'secondary'
    
    if (typeof status === 'number') {
      // Convert numeric status to text
      switch (status) {
        case 1:
          statusText = 'Active'
          statusColor = 'success'
          break
        case 0:
          statusText = 'Inactive'
          statusColor = 'secondary'
          break
        case 2:
          statusText = 'Pending'
          statusColor = 'warning'
          break
        case 3:
          statusText = 'Completed'
          statusColor = 'info'
          break
        case 4:
          statusText = 'Cancelled'
          statusColor = 'danger'
          break
        default:
          statusText = 'Unknown'
          statusColor = 'secondary'
      }
    } else if (typeof status === 'string') {
      // Handle string status values
      const statusColors: Record<string, string> = {
        active: 'success',
        pending: 'warning',
        completed: 'info',
        cancelled: 'danger',
        inactive: 'secondary',
      }
      statusText = status
      statusColor = statusColors[status.toLowerCase()] || 'secondary'
    } else {
      statusText = status || 'Unknown'
    }
    
    return (
      <CBadge color={statusColor}>
        {statusText}
      </CBadge>
    )
  }

  const handleExport = async (type: 'basic' | 'advanced') => {
    try {
      setToast(
        <CToast autohide={false} color="info" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>Exporting work orders...</CToastBody>
          </div>
        </CToast>
      )

      const exportColumns = columns
        .filter((col) => visibleColumns.includes(col.key as string) && col.key !== 'actions' && col.key !== 'show_details')
        .map((col) => ({
          header: col.label,
          field: col.key as string,
        }))

      const params: ExportParams = {
        ...apiParams,
        columns: exportColumns,
        rows: 0, // Export all
      }

      let blob: Blob
      if (type === 'basic') {
        blob = await workOrdersAPI.exportWorkOrders(params)
      } else {
        blob = await workOrdersAPI.exportWorkOrdersAdvanced(params)
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `work_orders_${type}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Clear previous toast before showing success
      setToast(null)
      setTimeout(() => {
        setToast(
          <CToast autohide={true} delay={3000} color="success" className="text-white align-items-center">
            <div className="d-flex">
              <CToastBody>Export completed successfully.</CToastBody>
              <CToastClose className="me-2 m-auto" white />
            </div>
          </CToast>
        )
      }, 100)
      
    } catch (error) {
      console.error('Export failed:', error)
      // Clear previous toast before showing error
      setToast(null)
      setTimeout(() => {
        setToast(
          <CToast autohide={true} delay={5000} color="danger" className="text-white align-items-center">
            <div className="d-flex">
              <CToastBody>Export failed. Please try again.</CToastBody>
              <CToastClose className="me-2 m-auto" white />
            </div>
          </CToast>
        )
      }, 100)
    }
  }

  // Render actions column
  const renderActions = (item: any) => {
    return (
      <div className="action-buttons">
        <CButton
          color="info"
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/operations/workorders/order/${item.work_order_id}?mode=view`)}
          title="View"
        >
          <CIcon icon={cilFilter} />
        </CButton>
        {canUpdate && (
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/operations/workorders/order/${item.work_order_id}`)}
            title="Edit"
          >
            <CIcon icon={cilPencil} />
          </CButton>
        )}
        {canDelete && (
          <CButton
            color="danger"
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.work_order_id)}
            title="Delete"
          >
            <CIcon icon={cilTrash} />
          </CButton>
        )}
        {!canUpdate && !canDelete && (
          <span className="text-muted">View only</span>
        )}
      </div>
    )
  }

  // Scope slots for custom rendering
  const scopedColumns = {
    pick_up_date_time: (item: any) => <td>{renderDate(item.pick_up_date_time)}</td>,
    deliver_date_time: (item: any) => <td>{renderDate(item.deliver_date_time)}</td>,
    status: (item: any) => <td>{renderStatus(item.status)}</td>,
    show_details: (item: any) => {
      return (
        <td className="py-2">
          <CButton
            color="primary"
            variant="outline"
            shape="square"
            size="sm"
            onClick={() => {
              toggleDetails(item.work_order_id)
            }}
          >
            {expandedRows.includes(item.work_order_id) ? 'Hide' : 'Show'}
          </CButton>
        </td>
      )
    },
    actions: (item: any) => <td>{renderActions(item)}</td>,
    details: (item: any) => {
      return (
        <CCollapse visible={expandedRows.includes(item.work_order_id)}>
          <CCardBody className="p-4" style={{ backgroundColor: 'var(--cui-body-bg)', color: 'var(--cui-body-color)', borderTop: '1px solid var(--cui-border-color)' }}>
            <h5 className="mb-3">Work Order Details</h5>
            <CRow className="g-3">
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Work Order ID</strong>
                  <span>{item.work_order_id}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Reference Number</strong>
                  <span>{item.ref_number}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Trip Number</strong>
                  <span>{item.trip_number}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Client Name</strong>
                  <span>{item.client_name}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Pick-Up City</strong>
                  <span>{item.pick_up_city}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Pick-Up Date</strong>
                  <span>{renderDate(item.pick_up_date_time)}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Delivered City</strong>
                  <span>{item.delivered_city}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Delivered Date</strong>
                  <span>{renderDate(item.deliver_date_time)}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Return City</strong>
                  <span>{item.return_city || 'N/A'}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Cargo Type</strong>
                  <span>{item.cargo_type}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Invoice KM</strong>
                  <span>{item.inv_km} km</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Invoice Price</strong>
                  <span>{item.invoice_price}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Other Charges</strong>
                  <span>{item.invoice_other_charges}</span>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <strong className="d-block text-body-secondary mb-1">Status</strong>
                  <div>{renderStatus(item.status)}</div>
                </div>
              </CCol>
            </CRow>
            <div className="mt-3 d-flex gap-2">
              <CButton
                size="sm"
                color="primary"
                onClick={() => navigate(`/operations/workorders/order/${item.work_order_id}`)}
              >
                <CIcon icon={cilPencil} className="me-1" />
                Edit Work Order
              </CButton>
              <CButton
                size="sm"
                color="danger"
                variant="outline"
                onClick={() => handleDelete(item.work_order_id)}
              >
                <CIcon icon={cilTrash} className="me-1" />
                Delete
              </CButton>
            </div>
          </CCardBody>
        </CCollapse>
      )
    },
  }

  // Calculate pagination based on ACTUAL filtered results
  const filteredTotal = list.length > 0 ? total : 0
  const validRows = apiParams.rows && apiParams.rows > 0 ? apiParams.rows : 20
  const currentPage = Math.floor(apiParams.first / validRows) + 1
  const totalPages = Math.max(1, Math.ceil(filteredTotal / validRows))
  const manualPaginationPages = buildPageList(currentPage, totalPages)
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages
  const showPagination = filteredTotal > validRows || currentPage > 1

  return (
    <CRow className="g-3">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <CCol xs={12}>
        <PageHero
          kicker="Operations"
          icon={cilNotes}
          title="Work Orders"
          subtitle={`Manage your work orders • ${filteredTotal} items`}
          actions={
            <div className="d-flex gap-2">
              {canCreate && (
                <CButton
                  color="primary"
                  onClick={() => navigate('/operations/workorders/order/new')}
                  className="text-white"
                >
                  <CIcon icon={cilPlus} className="me-1" />
                  Add New
                </CButton>
              )}
              <CDropdown>
                <CDropdownToggle color="secondary" variant="outline">
                  <CIcon icon={cilOptions} className="me-1" />
                  Visible Columns
                </CDropdownToggle>
                <CDropdownMenu className="p-3" style={{ minWidth: '250px', maxHeight: '400px', overflowY: 'auto' }}>
                  <h6 className="dropdown-header mb-2">Toggle Columns</h6>
                  {columns
                    .filter((col) => col.key !== 'actions' && col.key !== 'show_details')
                    .map((col) => (
                      <div key={col.key} className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`col-${col.key}`}
                          checked={visibleColumns.includes(col.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVisibleColumns([...visibleColumns, col.key])
                            } else {
                              setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                            }
                          }}
                        />
                        <label className="form-check-label" htmlFor={`col-${col.key}`}>
                          {col.label}
                        </label>
                      </div>
                    ))}
                </CDropdownMenu>
              </CDropdown>
              <CDropdown>
                <CDropdownToggle color="secondary">
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  Export
                </CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem onClick={() => handleExport('basic')}>Export Basic (XLSX)</CDropdownItem>
                  <CDropdownItem onClick={() => handleExport('advanced')}>Export Advanced (XLSX)</CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </div>
          }
        />
        <CCard className="mb-4 shadow-sm work-orders-card">
          <CCardBody>
            {/* Toolbar with search and column selector */}
            <CRow className="mb-3 align-items-center">
              {/* Left side - Search and Clear Filter */}
              <CCol xs={12} md="auto" className="mb-2 mb-md-0">
                <div className="d-flex align-items-center gap-2">
                  <label className="form-label mb-0 me-2">Search:</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Type to search all columns..."
                    value={searchValue}
                    onChange={(e) => handleTableFilterChange(e.target.value)}
                    style={{ minWidth: '250px' }}
                  />
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm d-flex align-items-center ms-3"
                      onClick={handleClearFilters}
                      title="Clear all filters (search and column filters)"
                    >
                      <CIcon icon={cilFilterX} className="me-1" />
                      Clear Filters ({totalActiveFilters})
                    </button>
                  )}
                </div>
              </CCol>
            </CRow>

            {/* Table wrapper for responsive behavior */}
            <div className="table-responsive mt-3">
            <CSmartTable
                key={`table-${Object.keys(columnFilterValues).length}-${searchValue}`}
                activePage={1}
              columns={activeColumns}
              items={list}
                itemsPerPage={validRows}
              loading={isLoading}
              pagination={false}
              itemsPerPageSelect={false}
                columnFilter={{
                  external: true, // Handle filtering via API, not client-side
                  lazy: false, // Trigger on every input change for better UX
                }}
                columnFilterValue={columnFilterValues}
              scopedColumns={scopedColumns}
              tableProps={{
                hover: true,
                striped: true,
                  responsive: true,
                  className: 'work-orders-table align-middle',
              }}
                columnSorter={{
                  resetable: true,
                }}
                tableFilter={false}
              onActivePageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              onSorterChange={handleSorterChange}
                onColumnFilterChange={handleColumnFilterChange}
            />
            </div>

            {/* Only show pagination if there are more items than page size OR not on first page */}
            {showPagination && (
            <div className="work-orders-pagination">
              <CPagination align="center" size="sm" className="mb-0 work-orders-pagination__controls">
                <CPaginationItem
                  aria-label="First page"
                  disabled={!canGoPrev}
                  onClick={() => canGoPrev && handlePageChange(1)}
                >
                  {'<<'}
                </CPaginationItem>
                <CPaginationItem
                  aria-label="Previous page"
                  disabled={!canGoPrev}
                  onClick={() => canGoPrev && handlePageChange(currentPage - 1)}
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
                  disabled={!canGoNext}
                  onClick={() => canGoNext && handlePageChange(currentPage + 1)}
                >
                  {'>'}
                </CPaginationItem>
                <CPaginationItem
                  aria-label="Last page"
                  disabled={!canGoNext}
                  onClick={() => canGoNext && handlePageChange(totalPages)}
                >
                  {'>>'}
                </CPaginationItem>
              </CPagination>

              <div className="work-orders-pagination__rows ms-auto d-flex align-items-center gap-2">
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
            )}

            {/* Results summary when pagination is hidden */}
            {!showPagination && filteredTotal > 0 && (
              <div className="mt-3 text-center text-body-secondary">
                <small>Showing {filteredTotal} {filteredTotal === 1 ? 'result' : 'results'}</small>
              </div>
            )}
            
            {/* Empty state */}
            {!isLoading && list.length === 0 && (
              <div className="text-center py-5">
                <CIcon icon={cilNotes} size="4xl" className="text-body-secondary mb-3" />
                <h5 className="text-body-secondary">No Work Orders Found</h5>
                <p className="text-body-secondary">
                  {total === 0
                    ? 'No work orders match your current filters.'
                    : 'Try adjusting your search criteria.'}
                </p>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default WorkOrdersListPage
