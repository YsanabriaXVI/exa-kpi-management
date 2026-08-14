/**
 * Other Charges List Page
 * Modern functional component using CoreUI Pro SmartTable
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CProgress,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilDollar,
  cilCheckCircle,
  cilWarning,
  cilChartLine,
  cilPencil,
  cilTrash,
  cilFilterX,
  cilOptions,
} from '@coreui/icons'

import type { RootState, AppDispatch } from '../../../store'
import { loadChargesList, deleteCharge, clearErrors } from '../store/otherChargesSlice'
import type { OtherChargeListParams } from '../types'
import './OtherChargesList.scss'

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100]

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

const OtherChargesListPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  // Redux state
  const { charges, loading, total, error } = useSelector((state: RootState) => state.otherCharges)

  // Load saved API params from sessionStorage
  const loadSavedParams = (): OtherChargeListParams => {
    const saved = sessionStorage.getItem('othercharges_api_params')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          filter: [],
          search: null,
          match: null,
          rows: parsed.rows || 20,
          first: 0,
          sortField: parsed.sortField || 'id',
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
      sortField: 'id',
      sortOrder: -1,
      filters: {},
    }
  }

  // Local state for API params
  const [apiParams, setApiParams] = useState<OtherChargeListParams>(loadSavedParams())
  
  // Column filters state
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, string>>({})
  
  // Local search value for immediate UI update
  const [searchValue, setSearchValue] = useState<string>(apiParams.search || '')
  
  // Debounce timer refs
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved column preferences
  const loadSavedColumns = () => {
    const saved = sessionStorage.getItem('othercharges_visible_columns')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved columns:', e)
      }
    }
    return ['id', 'name', 'status']
  }

  const [visibleColumns, setVisibleColumns] = useState(loadSavedColumns())

  // Available columns configuration
  const columns = [
    {
      key: 'id',
      label: 'ID',
      filter: true,
      sorter: true,
    },
    {
      key: 'name',
      label: 'Charge Name',
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
      key: 'actions',
      label: 'Actions',
      filter: false,
      sorter: false,
    },
  ]

  // Filter columns based on visibility
  const activeColumns = columns.filter((col) => {
    if (col.key === 'actions') return true
    return visibleColumns.includes(col.key)
  })

  // Load data on mount
  useEffect(() => {
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
    sessionStorage.setItem('othercharges_api_params', JSON.stringify(cleanParams))
    
    dispatch(loadChargesList(cleanParams))
  }, [])

  // Save visible columns to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('othercharges_visible_columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  // Save API params to sessionStorage
  useEffect(() => {
    const paramsToSave = {
      ...apiParams,
      search: null,
      filters: {},
      first: 0,
    }
    sessionStorage.setItem('othercharges_api_params', JSON.stringify(paramsToSave))
  }, [apiParams])

  // Handle items per page change
  const handleItemsPerPageChange = (itemsPerPage: number) => {
    const newParams = {
      ...apiParams,
      rows: itemsPerPage,
      first: 0,
    }
    setApiParams(newParams)
    dispatch(loadChargesList(newParams))
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    const newParams = {
      ...apiParams,
      first: (page - 1) * apiParams.rows,
    }
    setApiParams(newParams)
    dispatch(loadChargesList(newParams))
  }

  // Handle sort change
  const handleSorterChange = (sorter: { column: string; state: 'asc' | 'desc' | 0 } | null) => {
    if (!sorter || sorter.state === 0) {
      const newParams = {
        ...apiParams,
        sortField: 'id',
        sortOrder: -1,
        first: 0,
      }
      setApiParams(newParams)
      dispatch(loadChargesList(newParams))
    } else {
      const newParams = {
        ...apiParams,
        sortField: sorter.column,
        sortOrder: sorter.state === 'asc' ? 1 : -1,
        first: 0,
      }
      setApiParams(newParams)
      dispatch(loadChargesList(newParams))
    }
  }

  // Handle table filter change (global search with debouncing)
  const handleTableFilterChange = (value: string) => {
    setSearchValue(value)
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    
    searchDebounceRef.current = setTimeout(() => {
      const newParams = {
        ...apiParams,
        search: value || null,
        first: 0,
      }
      setApiParams(newParams)
      dispatch(loadChargesList(newParams))
    }, 800)
  }

  // Handle column filter change with debouncing
  const handleColumnFilterChange = useCallback((filter: Record<string, string>) => {
    setColumnFilterValues(filter)

    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }

    filterDebounceRef.current = setTimeout(() => {
      const newFilters: Record<string, string> = {}
      
      Object.keys(filter).forEach((key) => {
        if (filter[key] && filter[key].trim() !== '') {
          newFilters[key] = filter[key].trim()
        }
      })

      const newParams = {
        ...apiParams,
        filters: newFilters,
        first: 0,
      }
      
      setApiParams(newParams)
      dispatch(loadChargesList(newParams))
    }, 800)
  }, [apiParams, dispatch])

  // Clear all filters
  const handleClearFilters = () => {
    setColumnFilterValues({})
    setSearchValue('')
    
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    
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
    sessionStorage.setItem('othercharges_api_params', JSON.stringify(cleanParams))
    
    const newParams = {
      ...apiParams,
      filter: [],
      search: null,
      filters: {},
      first: 0,
    }
    setApiParams(newParams)
    dispatch(loadChargesList(newParams))
  }

  // Check if any filters are active
  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter(
    key => columnFilterValues[key] && columnFilterValues[key].trim() !== ''
  ).length
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
    if (window.confirm('Are you sure you want to delete this charge?')) {
      await dispatch(deleteCharge(id))
      dispatch(loadChargesList(apiParams))
    }
  }

  // Render status badge
  const renderStatus = (status: string) => {
    const color = status === 'ACTIVE' ? 'success' : 'secondary'
    return (
      <CBadge color={color} shape="rounded-pill">
        {status}
      </CBadge>
    )
  }

  // Render actions column
  const renderActions = (item: any) => {
    return (
      <div className="action-buttons">
        <CButton
          color="primary"
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/modules/other-charges/edit/${item.id}`)}
          title="Edit"
        >
          <CIcon icon={cilPencil} />
        </CButton>
        <CButton
          color="danger"
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(item.id)}
          title="Delete"
        >
          <CIcon icon={cilTrash} />
        </CButton>
      </div>
    )
  }

  // Scope slots for custom rendering
  const scopedColumns = {
    status: (item: any) => <td>{renderStatus(item.status)}</td>,
    actions: (item: any) => <td>{renderActions(item)}</td>,
  }

  // Calculate pagination
  const filteredTotal = charges.length > 0 ? total : 0
  const currentPage = Math.floor(apiParams.first / apiParams.rows) + 1
  const totalPages = Math.max(1, Math.ceil(filteredTotal / apiParams.rows))
  const manualPaginationPages = buildPageList(currentPage, totalPages)
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages
  const showPagination = filteredTotal > apiParams.rows || currentPage > 1

  // Calculate statistics
  const stats = useMemo(() => {
    const activeCharges = charges.filter((c) => c.status === 'ACTIVE').length
    const inactiveCharges = charges.length - activeCharges
    const activePercentage = charges.length > 0 ? (activeCharges / charges.length) * 100 : 0

    return {
      total: total || charges.length,
      active: activeCharges,
      inactive: inactiveCharges,
      activePercentage,
    }
  }, [charges, total])

  return (
    <div className="other-charges-list-page">
      {/* Action Button - Aligned with breadcrumb title */}
      <div className="page-header">
        <CButton
          color="success"
          onClick={() => navigate('/modules/other-charges/create')}
          className="btn-create-charge"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" className="me-2">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
          Create New Charge
        </CButton>
      </div>

      {/* Main Table Card - Statistics removed for cleaner view */}
      <CCard className="mb-4 shadow-sm">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <small className="text-body-secondary">All Charges</small>
          </CCardHeader>
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
                      title="Clear all filters"
                    >
                      <CIcon icon={cilFilterX} className="me-1" />
                      Clear Filters ({totalActiveFilters})
                    </button>
                  )}
                </div>
              </CCol>

              {/* Right side - Visible Columns */}
              <CCol xs={12} md="auto" className="ms-md-auto">
                <CDropdown>
                  <CDropdownToggle color="secondary" variant="outline">
                    <CIcon icon={cilOptions} className="me-2" />
                    Visible Columns ({visibleColumns.length})
                  </CDropdownToggle>
                  <CDropdownMenu className="column-selector-dropdown">
                    <div className="px-3 py-2">
                      <small className="text-body-secondary fw-semibold">SELECT COLUMNS TO DISPLAY</small>
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="column-selector-list">
                      {columns
                        .filter((col) => col.key !== 'actions')
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
                                } else {
                                  if (visibleColumns.length > 1) {
                                    setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                                  }
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
              </CCol>
            </CRow>

            {/* Table wrapper */}
            <div className="table-responsive mt-3">
              <CSmartTable
                key={`table-${Object.keys(columnFilterValues).length}-${searchValue}`}
                activePage={1}
                columns={activeColumns}
                items={charges}
                itemsPerPage={charges.length}
                loading={loading}
                pagination={false}
                itemsPerPageSelect={false}
                columnFilter={{
                  external: true,
                  lazy: false,
                }}
                columnFilterValue={columnFilterValues}
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'other-charges-table align-middle',
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

            {/* Pagination */}
            {showPagination && (
              <div className="other-charges-pagination">
                <CPagination align="center" size="sm" className="mb-0 other-charges-pagination__controls">
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

                <div className="other-charges-pagination__rows ms-auto text-end">
                  <label htmlFor="other-charges-rows" className="form-label mb-1">
                    Rows per page
                  </label>
                  <CFormSelect
                    id="other-charges-rows"
                    size="sm"
                    value={apiParams.rows}
                    onChange={(event) => handleItemsPerPageChange(Number(event.target.value))}
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </div>
            )}

            {/* Results summary */}
            {!showPagination && filteredTotal > 0 && (
              <div className="mt-3 text-center text-body-secondary">
                <small>
                  Showing {filteredTotal} {filteredTotal === 1 ? 'result' : 'results'}
                </small>
              </div>
            )}

            {/* Empty state */}
            {!loading && charges.length === 0 && (
              <div className="text-center py-5">
                <CIcon icon={cilDollar} size="4xl" className="text-body-secondary mb-3" />
                <h5 className="text-body-secondary">No Charges Found</h5>
                <p className="text-body-secondary">
                  {total === 0
                    ? 'No charges match your current filters.'
                    : 'Try adjusting your search criteria.'}
                </p>
              </div>
            )}
          </CCardBody>
        </CCard>
    </div>
  )
}

export default OtherChargesListPage

