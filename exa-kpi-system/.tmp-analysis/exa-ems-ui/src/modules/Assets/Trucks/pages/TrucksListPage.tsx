/**
 * Trucks List Page
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CRow,
  CSmartTable,
  CFormInput,
  CBadge,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CDropdownItem,
  CSpinner,
  CAlert,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilTruck,
  cilPencil,
  cilTrash,
  cilOptions,
  cilCloudDownload,
  cilSearch,
  cilFilterX,
} from '@coreui/icons'

import { permissionService, READ } from '../../../../services/auth/permission.service'
import { MODULE_TRUCKS } from '../../../../constants/modules'

import type { RootState, AppDispatch } from '../../../../store'
import { loadTrucks, deleteTruck } from '../store/trucks.slice'
import PageHero from '../../../../components/PageHero'
import exportToXlsx from '../../../../utils/exportToXlsx'
import './TrucksList.scss'

const COLUMN_STORAGE_KEY = 'trucks_visible_columns_v1'
const DEFAULT_COLUMNS = [
  'asset_id',
  'truck_plate',
  'brand',
  'model',
  'year',
  'color',
  'generic_name1',
  'generic_name2',
  'generic_name3',
  'active',
]

const loadSavedColumns = () => {
  const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return DEFAULT_COLUMNS
}

const TrucksListPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  // Redux state
  // Defensive defaults to avoid runtime errors if slice is not ready
  const trucksState = useSelector((state: RootState) => (state as any).trucks) || {}
  const trucks = Array.isArray(trucksState.list) ? trucksState.list : []
  const loading = Boolean(trucksState.loading)
  const error = trucksState.error

  const [searchTerm, setSearchTerm] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [exporting, setExporting] = useState(false)
  const [tableItems, setTableItems] = useState<any[]>([])
  const [toast, setToast] = useState<any>(null)
  const toasterRef = React.useRef<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const errorMessage = useMemo(
    () => (error ? extractErrorMessage(error, 'Failed to load trucks') : null),
    [error]
  )

  const showToast = (message: string, color: 'success' | 'danger') => {
    if (!message) return
    setToast(
      <CToast autohide delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  // Function declaration (hoisted) so the errorMessage useMemo above can call it
  // during render regardless of textual order — avoids a temporal-dead-zone crash.
  function extractErrorMessage(payload: any, fallback = 'An unexpected error occurred') {
    if (!payload) return fallback
    if (typeof payload === 'string') return payload
    if (payload.message && typeof payload.message === 'string') return payload.message
    const data = payload.data ?? payload.response?.data
    if (typeof data === 'string') return data
    if (data?.message && typeof data.message === 'string') return data.message
    if (data && typeof data === 'object') {
      const firstKey = Object.keys(data)[0]
      const firstValue = firstKey ? data[firstKey] : null
      if (typeof firstValue === 'string') return firstValue
      if (Array.isArray(firstValue) && firstValue.length > 0 && typeof firstValue[0] === 'string') {
        return firstValue[0]
      }
    }
    return fallback
  }

  // Map legacy attribute IDs to friendly keys
  const attributeFieldMap: Record<string, string> = {
    truck_plate: '8',
    brand: '9',
    color: '10',
    model: '12',
    subdivision: '13',
    year: '14',
    initial_miles: '15',
    customs_code: '16',
    chassis: '17',
    name_on_registration: '18',
    engine_no: '19',
    name_on_code: '20',
    driver_assigned: '53',
    rtn: '56',
    truck_status: '65',
    active: '66',
    vuceh_code: '87',
    hiring_date: '104',
    sap_code: '111',
    fuel_type: '125',
    archive_number: '130',
    pech_constancy: '148',
  }

  const columns = [
    { key: 'asset_id', label: 'ID', filter: true, sorter: true },
    { key: 'truck_plate', label: 'Truck Plate', filter: true, sorter: true },
    { key: 'brand', label: 'Brand', filter: true, sorter: true },
    { key: 'model', label: 'Model', filter: true, sorter: true },
    { key: 'year', label: 'Year', filter: true, sorter: true },
    { key: 'color', label: 'Color', filter: true, sorter: true },
    { key: 'generic_name1', label: 'Operational Permit', filter: true, sorter: true },
    { key: 'generic_name2', label: 'Exploitation Permit', filter: true, sorter: true },
    { key: 'generic_name3', label: 'Registration Permit', filter: true, sorter: true },
    { key: 'truck_status', label: 'Status', filter: true, sorter: true },
    { key: 'active', label: 'Active', filter: true, sorter: true },
    { key: 'actions', label: 'Actions', filter: false, sorter: false },
  ]

  // Flatten attribute list into friendly keys for rendering/searching
  const normalizedTrucks = useMemo(() => {
    return trucks.map((truck: any) => {
      const attrs = truck.attributes || {}
      const flattened: Record<string, any> = {}
      Object.entries(attributeFieldMap).forEach(([friendlyKey, attrId]) => {
        flattened[friendlyKey] = attrs?.[attrId] ?? truck[friendlyKey] ?? ''
      })

      return {
        ...truck,
        ...flattened,
      }
    })
  }, [trucks])

  const activeColumns = columns.filter((col) => col.key === 'actions' || visibleColumns.includes(col.key as string))

  // Available columns configuration
  // Filter trucks based on search term
  const filteredTrucks = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return normalizedTrucks.filter((truck: any) => {
      if (!search) return true
      return Object.values({
        asset_id: truck.asset_id,
        truck_plate: truck.truck_plate,
        brand: truck.brand,
        model: truck.model,
        year: truck.year,
        color: truck.color,
        generic_name1: truck.generic_name1,
        generic_name2: truck.generic_name2,
        generic_name3: truck.generic_name3,
        truck_status: truck.truck_status,
        active: truck.active,
      })
        .filter(Boolean)
        .some((value) => value?.toString().toLowerCase().includes(search))
    })
  }, [normalizedTrucks, searchTerm])

  useEffect(() => {
    setTableItems(filteredTrucks)
  }, [filteredTrucks])

  // Load all trucks once on mount
  useEffect(() => {
    dispatch(loadTrucks())
  }, [dispatch])

  // Persist visible columns selection
  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter((key) => {
    const val = columnFilterValues[key]
    return Array.isArray(val) ? val.length > 0 : String(val ?? '').trim().length > 0
  }).length
  const hasSearchFilter = searchTerm.trim().length > 0
  const hasActiveFilters = activeColumnFiltersCount > 0 || hasSearchFilter
  const totalActiveFilters = activeColumnFiltersCount + (hasSearchFilter ? 1 : 0)

  const handleClearFilters = () => {
    setSearchTerm('')
    setColumnFilterValues({})
  }

  // Handle delete
  const handleDelete = (truck: any) => {
    setDeleteTarget(truck)
    setDeleteModalVisible(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.asset_id) {
      setDeleteModalVisible(false)
      return
    }
    setDeleteLoading(true)
    try {
      await dispatch(deleteTruck(deleteTarget.asset_id)).unwrap()
      showToast(`Truck ${deleteTarget.truck_plate || deleteTarget.asset_id} deleted.`, 'success')
      setDeleteModalVisible(false)
      setDeleteTarget(null)
      dispatch(loadTrucks())
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete truck')
      showToast(message, 'danger')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCloseDelete = () => {
    if (deleteLoading) return
    setDeleteModalVisible(false)
    setDeleteTarget(null)
  }

  // Render actions column
  const renderActions = (item: any) => {
    const canRead = permissionService.checkPermission(MODULE_TRUCKS, READ)
    return (
      <div className="action-buttons">
         {canRead && (
          <CButton
            color="info"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/assets/trucks/${item.asset_id}?view=true`)}
            title="View"
          >
            <CIcon icon={cilSearch} />
          </CButton>
        )}
        <CButton
          color="primary"
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/assets/trucks/${item.asset_id}`)}
          title="Edit"
        >
          <CIcon icon={cilPencil} />
        </CButton>
          <CButton
            color="danger"
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item)}
            title="Delete"
          >
            <CIcon icon={cilTrash} />
          </CButton>
      </div>
    )
  }

  // Scope slots for custom rendering
  const scopedColumns = {
    truck_status: (item: any) => (
      <td>
        <CBadge color="info" shape="rounded-pill">
          {item.truck_status || '—'}
        </CBadge>
      </td>
    ),
    active: (item: any) => {
      const isActive = String(item.active || '').toLowerCase() === 'yes' || item.active === '1'
      return (
        <td>
          <CBadge color={isActive ? 'success' : 'secondary'} shape="rounded-pill">
            {isActive ? 'Active' : 'Inactive'}
          </CBadge>
        </td>
      )
    },
    actions: (item: any) => <td>{renderActions(item)}</td>,
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const exportColumns = columns
        .filter((col) => col.key !== 'actions' && visibleColumns.includes(col.key as string))
        .map((col) => ({
          key: col.key as string,
          label: col.label as string,
        }))

      const rowsToExport = tableItems.length ? tableItems : filteredTrucks
      await exportToXlsx({
        columns: exportColumns,
        rows: rowsToExport,
        fileName: `trucks_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Trucks',
      })
    } catch (error) {
      console.error('Failed to export trucks:', error)
      alert('Unable to export trucks. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleFilteredItemsChange = (items?: any[]) => {
    setTableItems(Array.isArray(items) ? items : [])
  }

  const heroActions = (
    <div className="d-flex gap-2 flex-wrap justify-content-end">
      <CButton
        color="success"
        className="text-white"
        onClick={handleExport}
        disabled={exporting || (tableItems.length === 0 && filteredTrucks.length === 0)}
      >
        {exporting ? (
          <>
            <CSpinner size="sm" className="me-2" />
            Preparing...
          </>
        ) : (
          <>
            <CIcon icon={cilCloudDownload} className="me-2" />
            Export XLSX
          </>
        )}
      </CButton>
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
          <div className="column-selector-list px-3 py-2">
            {columns
              .filter((col) => col.key !== 'actions')
              .map((col) => (
                <div key={col.key as string} className="form-check py-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`trucks-col-${col.key}`}
                    checked={visibleColumns.includes(col.key as string)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setVisibleColumns([...visibleColumns, col.key as string])
                      } else if (visibleColumns.length > 1) {
                        setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                      }
                    }}
                  />
                  <label className="form-check-label" htmlFor={`trucks-col-${col.key}`}>
                    {col.label}
                  </label>
                </div>
              ))}
          </div>
        </CDropdownMenu>
      </CDropdown>
      <CButton
        color="primary"
        onClick={() => navigate('/assets/trucks/new')}
        className="text-white"
      >
        <CIcon icon={cilPlus} className="me-1" />
        Add New
      </CButton>
    </div>
  )

  return (
    <CRow className="g-3">
      <CToaster ref={toasterRef} push={toast} placement="top-end" />
      <CCol xs={12}>
        <PageHero
          kicker="Trucks Management"
          icon={cilTruck}
          title="All Trucks"
          subtitle={
            searchTerm
              ? `Showing ${filteredTrucks.length} of ${trucks.length} Trucks`
              : `Total ${trucks.length} trucks in fleet`
          }
          actions={heroActions}
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            {errorMessage && <CAlert color="danger">{errorMessage}</CAlert>}
            {/* Toolbar with search */}
            <CRow className="mb-3 align-items-center">
              <CCol xs={12} md={6} lg={4} className="mb-2 mb-md-0">
                <CFormInput
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search trucks"
                />
              </CCol>
              {hasActiveFilters && (
                <CCol xs={12} md="auto" className="mb-2 mb-md-0">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm d-flex align-items-center"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={handleClearFilters}
                  >
                    <CIcon icon={cilFilterX} className="me-1" /> Clear Filters ({totalActiveFilters})
                  </button>
                </CCol>
              )}
            </CRow>

            {/* Table wrapper for responsive behavior */}
            <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={filteredTrucks}
                loading={loading}
                itemsPerPage={itemsPerPage}
                pagination
                columnFilter
                columnSorter
                columnFilterValue={columnFilterValues}
                onColumnFilterChange={setColumnFilterValues}
                onFilteredItemsChange={handleFilteredItemsChange}
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'trucks-table align-middle',
                }}
                sorterValue={{ column: 'asset_id', state: 'desc' }}
              />
            </div>

            {/* Items per page — custom dropup to avoid browser native-select misposition */}
            <div className="d-flex justify-content-end align-items-center mt-2 pe-1">
              <span className="me-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>
                Items per page:
              </span>
              <CDropdown direction="dropup">
                <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
                  {itemsPerPage}
                </CDropdownToggle>
                <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
                  {[5, 10, 20, 50, 100].map((n) => (
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

            {/* Empty state */}
            {!loading && trucks.length === 0 && (
              <div className="text-center py-5">
                <CIcon icon={cilTruck} size="4xl" className="text-body-secondary mb-3" />
                <h5 className="text-body-secondary">No Trucks Found</h5>
                <p className="text-body-secondary">
                  Start by creating your first truck.
                </p>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={deleteModalVisible} onClose={handleCloseDelete} alignment="center">
        <CModalHeader closeButton={!deleteLoading}>
          <CModalTitle>Delete Truck</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Are you sure you want to delete <strong>{deleteTarget?.truck_plate || deleteTarget?.asset_id || 'this truck'}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={handleCloseDelete} disabled={deleteLoading}>
            Cancel
          </CButton>
          <CButton color="danger" className="text-white" onClick={handleConfirmDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default TrucksListPage
