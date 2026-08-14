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
  CDropdownItem,
  CDropdownToggle,
  CDropdownMenu,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilDollar,
  cilFilterX,
  cilOptions,
} from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import ErrorBoundary from '../../../../components/ErrorBoundary'
import PageHero from '../../../../components/PageHero'
import ConfirmDialog from '../../../../components/ConfirmationModal'

import {
  deleteFuelPrice,
  fetchFuelPrices,
  resetStatuses,
  selectFuelPriceErrors,
  selectFuelPriceStatuses,
  selectFuelPriceList,
  selectFuelPriceLoadingList,
} from '../store/fuelPrice.slice'

import { permissionService, CREATE, UPDATE, DELETE } from '../../../../services/auth/permission.service'
import { MODULE_FUEL_PRICE } from '../../../../constants/modules'

const COLUMN_STORAGE_KEY = 'fuelPrice_visible_columns'
const DEFAULT_COLUMNS = [
  'weekLabel',
  'cityName',
  'updatedAtFormat',
  'createdAtFormat',
  'createdByName',
  'updatedByName',
]

const loadSavedColumns = () => {
  const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return DEFAULT_COLUMNS
}

const FuelPriceListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectFuelPriceList)
  const errors = useSelector(selectFuelPriceErrors)
  const statuses = useSelector(selectFuelPriceStatuses)
  const loading = useSelector(selectFuelPriceLoadingList)

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [searchValue, setSearchValue] = useState('')
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const canCreate = permissionService.checkPermission(MODULE_FUEL_PRICE, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_FUEL_PRICE, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_FUEL_PRICE, DELETE)

  useEffect(() => { dispatch(fetchFuelPrices()) }, [dispatch])

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    if (!errors) return
    const toast = (window as any).exaToast
    const msg = typeof errors === 'string' ? errors : 'An error occurred loading Fuel Prices'
    toast?.error ? toast.error('Error', msg) : console.error(msg)
  }, [errors])

  useEffect(() => {
    const toast = (window as any).exaToast
    if (statuses.added) toast?.success?.('Success', 'Fuel Price was Added')
    if (statuses.updated) toast?.success?.('Success', 'Fuel Price was Updated')
    if (statuses.deleted) toast?.success?.('Success', 'Fuel Price was Deleted')
    if (statuses.added || statuses.updated || statuses.deleted) {
      dispatch(resetStatuses())
      dispatch(fetchFuelPrices())
    }
  }, [statuses, dispatch])

  const handleOpenNew = () => canCreate && navigate('/fuel/fuel-price/new')
  const handleOpenEdit = (id: number) => canUpdate && navigate(`/fuel/fuel-price/${id}`)

  const handleAskDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await dispatch(deleteFuelPrice(pendingDeleteId))
  }

  const tableItems = useMemo(() => list ?? [], [list])

  const handleTableFilterChange = (value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {}, 600)
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

  const handleClearFilters = () => { setSearchValue(''); setColumnFilterValues({}) }

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return tableItems
    return tableItems.filter((x: any) => {
      const haystack = [x.weekLabel, x.countryName, x.departmentName, x.cityName, x.createdByName, x.updatedByName]
        .map((v) => String(v ?? '').toLowerCase()).join(' ')
      return haystack.includes(q)
    })
  }, [tableItems, searchValue])

  const columns = [
    { key: 'weekLabel', label: 'Week', sorter: true, filter: true },
    { key: 'countryName', label: 'Country', sorter: true, filter: true },
    { key: 'departmentName', label: 'Department', sorter: true, filter: true },
    { key: 'cityName', label: 'City', sorter: true, filter: true },
    { key: 'exchangeRate', label: 'Exchange Rate', sorter: true, filter: true },
    { key: 'updatedAtFormat', label: 'Last Update', sorter: true, filter: true },
    { key: 'createdAtFormat', label: 'Create Date', sorter: true, filter: true },
    { key: 'createdByName', label: 'Created By', sorter: true, filter: true },
    { key: 'updatedByName', label: 'Updated By', sorter: true, filter: true },
    { key: 'actions', label: 'Actions', sorter: false, filter: false },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )

  return (
    <ErrorBoundary>
    <CContainer fluid>
      <PageHero
        kicker="Fuel"
        icon={cilDollar}
        title="Fuel Prices"
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
                        id={`col-fp-${col.key}`}
                        checked={visibleColumns.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) setVisibleColumns([...visibleColumns, col.key])
                          else if (visibleColumns.length > 1) setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                        }}
                      />
                      <label className="form-check-label" htmlFor={`col-fp-${col.key}`}>{col.label}</label>
                    </div>
                  ))}
                </div>
              </CDropdownMenu>
            </CDropdown>
            {canCreate && (
              <CButton color="primary" className="text-white" onClick={handleOpenNew}>
                <CIcon icon={cilPlus} className="me-2" />
                New Fuel Price
              </CButton>
            )}
          </div>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          {errors && (
            <CAlert color="danger" className="mb-3">
              {typeof errors === 'string' ? errors : 'An error occurred loading Fuel Prices'}
            </CAlert>
          )}
          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto" className="mb-2 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
                <input
                  className="form-control w-auto" type="text" placeholder="Search..."
                  value={searchValue} onChange={(e) => handleTableFilterChange(e.target.value)}
                  style={{ minWidth: '250px' }}
                />
                {hasActiveFilters && (
                  <button type="button" className="btn btn-outline-danger btn-sm d-flex align-items-center ms-3" style={{ whiteSpace: 'nowrap' }} onClick={handleClearFilters}>
                    <CIcon icon={cilFilterX} className="me-1" />
                    Clear Filters ({totalActiveFilters})
                  </button>
                )}
              </div>
            </CCol>
          </CRow>
          <div style={{ position: 'relative' }}>
            <CSmartTable
              items={filteredItems}
              columns={activeColumns}
              itemsPerPage={itemsPerPage}
              pagination
              loading={loading}
              columnFilter
              columnSorter
              columnFilterValue={columnFilterValues}
              tableFilter={false}
              onColumnFilterChange={handleColumnFilterChange}
              tableProps={{ hover: true, striped: true, responsive: true, className: 'align-middle' }}
              scopedColumns={{
                actions: (item: any) => (
                  <td>
                    {canUpdate && (
                      <CButton color="primary" variant="ghost" size="sm" onClick={() => handleOpenEdit(item.fuelPriceLocationWeekId)} title="Edit">
                        <CIcon icon={cilPencil} />
                      </CButton>
                    )}
                    {canDelete && (
                      <CButton color="danger" variant="ghost" size="sm" onClick={() => handleAskDelete(item.fuelPriceLocationWeekId)} title="Delete">
                        <CIcon icon={cilTrash} />
                      </CButton>
                    )}
                    {!canUpdate && !canDelete && <span className="text-muted small">View only</span>}
                  </td>
                ),
              }}
            />
            {/* Items per page — aligned with pagination row */}
            <div className="d-flex align-items-center" style={{ position: 'absolute', right: 0, bottom: 0, height: '38px' }}>
              <span className="me-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>
                Items per page:
              </span>
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
          </div>
        </CCardBody>
      </CCard>
      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Confirmation"
        message="Are you sure you want to delete this fuel price?"
        onClose={() => { setConfirmVisible(false); setPendingDeleteId(null) }}
        onConfirm={confirmDelete}
      />
    </CContainer>
    </ErrorBoundary>
  )
}

export default FuelPriceListPage
