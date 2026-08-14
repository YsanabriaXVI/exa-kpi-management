/**
 * Trips List Page
 * Modern functional component using CoreUI Pro SmartTable
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CCollapse,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilNotes,
  cilPencil,
  cilTrash,
  cilFilter,
  cilCloudDownload,
  cilOptions,
  cilTruck,
} from '@coreui/icons'

import type { RootState, AppDispatch } from '../../../store'
import { loadTripsList, deleteTrip, resetLoading } from '../store/tripsSlice'
import type { TripListParams } from '../types'
import PageHero from '../../../components/PageHero'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../services/auth/permission.service'
import { MODULE_TRIP } from '../../../constants/modules'
import './TripsList.scss'

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100]

/**
 * Helper function to reset sessionStorage if data gets corrupted
 */
if (typeof window !== 'undefined') {
  (window as any).resetTripsStorage = () => {
    sessionStorage.removeItem('trips_api_params')
    sessionStorage.removeItem('trips_visible_columns')
    console.log('✅ Trips storage reset! Refresh the page.')
  }
}


// Load saved API params
const loadSavedParams = (): TripListParams => {
  const saved = sessionStorage.getItem('trips_api_params')
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
        sortField: parsed.sortField || 'trip_id',
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
    sortField: 'trip_id',
    sortOrder: -1,
    filters: {},
  }
}

const TripsListPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  // Redux state
  // @ts-ignore - trips slice is added but types might not be updated in IDE context yet
  const { list, isLoading, total } = useSelector((state: RootState) => state.trips)

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_TRIP, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_TRIP, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_TRIP, DELETE)

  const initialParams = useMemo<TripListParams>(() => {
    const saved = loadSavedParams()
    const rows = ITEMS_PER_PAGE_OPTIONS.includes(saved.rows) ? saved.rows : 20
    return {
      filter: [],
      search: null,
      match: null,
      rows,
      first: 0,
      sortField: 'trip_id',
      sortOrder: -1,
      filters: {},
    }
  }, [])

  const [searchValue, setSearchValue] = useState<string>('')
  const [expandedRows, setExpandedRows] = useState<number[]>([])
  const [itemsPerPage, setItemsPerPage] = useState<number>(initialParams.rows)

  // Load saved column preferences
  const loadSavedColumns = () => {
    const saved = sessionStorage.getItem('trips_visible_columns')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved columns:', e)
      }
    }
    return [
      'trip_id',
      'create_date',
      'truck_lvpk_date',
      'close_trip_date',
      'work_order_id',
      'client',
      'trip_status_name',
    ]
  }

  const [visibleColumns, setVisibleColumns] = useState(loadSavedColumns())

  const columns = [
    { key: 'trip_id', label: 'Trip ID', filter: true, sorter: true },
    { key: 'create_date', label: 'Trip Created', filter: true, sorter: true },
    { key: 'truck_lvpk_date', label: 'Trip Pick Up', filter: true, sorter: true },
    { key: 'close_trip_date', label: 'Trip Completed', filter: true, sorter: true },
    { key: 'work_order_id', label: 'Work Order', filter: true, sorter: true },
    { key: 'work_order_date', label: 'Work Order Date', filter: true, sorter: true },
    { key: 'client', label: 'Client', filter: true, sorter: true },
    { key: 'subdivision', label: 'Subdivision', filter: true, sorter: true },
    { key: 'assigned_inventory', label: 'Assigned Inventory', filter: true, sorter: true },
    { key: 'trip_status_name', label: 'Status', filter: true, sorter: true },
    { key: 'show_details', label: '', filter: false, sorter: false },
    { key: 'actions', label: 'Actions', filter: false, sorter: false },
  ]

  const activeColumns = columns.filter((col) => {
    if (col.key === 'actions' || col.key === 'show_details') return true
    return visibleColumns.includes(col.key)
  })

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

  useEffect(() => {
    dispatch(resetLoading())
    sessionStorage.setItem('trips_api_params', JSON.stringify(initialParams))
    dispatch(loadTripsList(initialParams))
  }, [dispatch, initialParams])

  useEffect(() => {
    sessionStorage.setItem('trips_visible_columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const handleDelete = async (id: number) => {
    if (!canDelete) {
      alert('You do not have permission to delete trips.')
      return
    }
    if (window.confirm('Are you sure you want to delete this trip?')) {
      await dispatch(deleteTrip(id))
    }
  }

  const renderDate = (timestamp: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const renderStatus = (status: string) => {
    let color = 'secondary'
    if (status === 'Completed') color = 'success'
    if (status === 'Active') color = 'primary'
    if (status === 'Cancelled') color = 'danger'
    return <CBadge color={color}>{status}</CBadge>
  }

  const renderActions = (item: any) => {
    return (
      <div className="action-buttons">
        <CButton
          color="info"
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/operations/trips/${item.trip_id}?mode=view`)}
          title="View"
        >
          <CIcon icon={cilFilter} />
        </CButton>
        {canUpdate && (
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/operations/trips/${item.trip_id}`)}
            title="Edit"
          >
            <CIcon icon={cilPencil} />
          </CButton>
        )}
        {canCreate && (
          <CButton
            color="warning"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/fuel/fuelorder/${item.trip_id}?create=true`)}
            title="Create Fuel Order"
          >
             <CIcon icon={cilTruck} />
          </CButton>
        )}
        {canDelete && (
          <CButton
            color="danger"
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.trip_id)}
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

  const scopedColumns = {
    create_date: (item: any) => <td>{renderDate(item.create_date)}</td>,
    truck_lvpk_date: (item: any) => <td>{renderDate(item.truck_lvpk_date)}</td>,
    close_trip_date: (item: any) => <td>{renderDate(item.close_trip_date)}</td>,
    work_order_date: (item: any) => <td>{renderDate(item.work_order_date)}</td>,
    trip_status_name: (item: any) => <td>{renderStatus(item.trip_status_name)}</td>,
    show_details: (item: any) => (
      <td className="py-2">
        <CButton
          color="primary"
          variant="outline"
          shape="square"
          size="sm"
          onClick={() => toggleDetails(item.trip_id)}
        >
          {expandedRows.includes(item.trip_id) ? 'Hide' : 'Show'}
        </CButton>
      </td>
    ),
    actions: (item: any) => <td>{renderActions(item)}</td>,
    details: (item: any) => (
      <CCollapse visible={expandedRows.includes(item.trip_id)}>
        <CCardBody className="p-4" style={{ backgroundColor: 'var(--cui-body-bg)', color: 'var(--cui-body-color)', borderTop: '1px solid var(--cui-border-color)' }}>
          <h5>Trip Details</h5>
          <CRow>
             <CCol md={6}><strong>Trip ID:</strong> {item.trip_id}</CCol>
             <CCol md={6}><strong>Client:</strong> {item.client}</CCol>
             <CCol md={6}><strong>Work Order:</strong> {item.work_order_id}</CCol>
             <CCol md={6}><strong>Assigned Inventory:</strong> {item.assigned_inventory}</CCol>
          </CRow>
        </CCardBody>
      </CCollapse>
    ),
  }

  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) return list
    const query = searchValue.toLowerCase()
    return list.filter((item: any) =>
      [
        item.trip_id,
        item.work_order_id,
        item.client,
        item.subdivision,
        item.assigned_inventory,
        item.pick_up,
        item.delivery,
        item.return_to,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [list, searchValue])

  const filteredTotal = filteredItems.length

  return (
    <CRow className="g-3">
      <CCol xs={12}>
        <PageHero
          kicker="Operations"
          icon={cilNotes}
          title="Trips"
          subtitle={`Manage your trips • ${filteredTotal} items`}
          actions={
            <div className="d-flex gap-2 align-items-center">
              <CDropdown>
                <CDropdownToggle color="secondary" variant="outline">
                  <CIcon icon={cilOptions} className="me-2" />
                  Visible Columns ({visibleColumns.length})
                </CDropdownToggle>
                <CDropdownMenu className="column-selector-dropdown">
                  <div className="px-3 py-2">
                    <small className="text-body-secondary fw-semibold">SELECT COLUMNS</small>
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
              <CDropdown>
                <CDropdownToggle color="secondary">
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  Export
                </CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem>Export Basic (XLSX)</CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </div>
          }
        />
        <CCard className="mb-4 shadow-sm trips-card">
          <CCardBody>
            {/* Toolbar */}
            <CRow className="mb-3 align-items-center">
              <CCol xs={12} md="auto" className="mb-2 mb-md-0">
                <div className="d-flex align-items-center gap-2">
                  <label className="form-label mb-0 me-2">Search:</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Type to search all columns..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    style={{ minWidth: '250px' }}
                  />
                </div>
              </CCol>
              <CCol xs="auto" className="ms-auto d-flex align-items-center gap-2">
                <span className="text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
                <CDropdown direction="dropup">
                  <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
                    {itemsPerPage}
                  </CDropdownToggle>
                  <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
                    {ITEMS_PER_PAGE_OPTIONS.map((n) => (
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
              </CCol>
            </CRow>

            <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={filteredItems}
                itemsPerPage={itemsPerPage}
                itemsPerPageSelect={false}
                loading={isLoading}
                pagination
                columnFilter
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'trips-table align-middle',
                }}
                columnSorter={{
                  resetable: true,
                }}
                tableFilter={false}
                scopedColumns={scopedColumns}
              />
            </div>

            {!isLoading && filteredTotal > 0 && (
              <div className="mt-3 text-center text-body-secondary">
                <small>Showing {filteredTotal} {filteredTotal === 1 ? 'result' : 'results'}</small>
              </div>
            )}

            {!isLoading && list.length === 0 && (
              <div className="text-center py-5">
                <CIcon icon={cilNotes} size="4xl" className="text-body-secondary mb-3" />
                <h5 className="text-body-secondary">No Trips Found</h5>
                <p className="text-body-secondary">
                  {total === 0
                    ? 'No trips match your current filters.'
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

export default TripsListPage
