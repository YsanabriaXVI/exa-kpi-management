import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CDropdownItem,
  CFormInput,
  CMultiSelect,
  CRow,
  CSmartTable,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilList, cilOptions, cilPencil, cilPlus, cilTrash } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../store'
import { deleteLocation, loadLocations } from '../store/locationsSlice'
import type { Location } from '../types'
import './LocationsList.scss'

import {
  MODULE_LOCATIONS,
} from '../../../constants/modules'
import { permissionService, UPDATE, DELETE, CREATE } from '../../../services/auth/permission.service'
import PageHero from '../../../components/PageHero'

const ACTIVE_STATUS_ID = 1

const LocationsListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { locations, loading, error } = useSelector((state: RootState) => (state as any).locations)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'location_id',
    'name',
    'country',
    'department',
    'city',
    'address',
    'reference',
    'phone',
    'last_update_ts',
    'status',
  ])
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)
  const errorMessage = useMemo(
    () => (error ? extractErrorMessage(error, 'Failed to load locations') : null),
    [error]
  )
  const [deleteLoading, setDeleteLoading] = useState(false)

  const extractErrorMessage = (payload: any, fallback = 'An unexpected error occurred') => {
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

  useEffect(() => {
    dispatch(loadLocations())
  }, [dispatch])

  const filteredLocations = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return locations.filter((loc: Location) => {
      if (!search) return true
      return (
        String(loc.location_id).toLowerCase().includes(search) ||
        loc.name?.toLowerCase().includes(search) ||
        loc.city?.name?.toLowerCase().includes(search) ||
        loc.city?.department?.name?.toLowerCase().includes(search) ||
        loc.city?.department?.country?.name?.toLowerCase().includes(search) ||
        loc.address?.toLowerCase().includes(search) ||
        loc.reference?.toLowerCase().includes(search) ||
        loc.phone?.toLowerCase().includes(search)
      )
    })
  }, [locations, searchTerm])

  const tableItems = useMemo(
    () =>
      filteredLocations.map((loc: any) => ({
        ...loc,
        country: loc.city?.department?.country?.name || '—',
        department: loc.city?.department?.name || '—',
        city: loc.city?.name || '—',
        updated_by: loc.update_user?.full_name || '—',
        last_update_ts: (() => {
          const raw = loc.updated_at || loc.update_date || loc.update_date_format
          if (!raw) return 0

          // If it's a number:
          if (typeof raw === 'number') {
            return raw < 10000000000 ? raw * 1000 : raw
          }

          // If it's a string:
          if (typeof raw === 'string') {
            const cleanRaw = raw.trim()
            // Check if numeric string
            if (/^\d+$/.test(cleanRaw)) {
              const num = Number(cleanRaw)
              return num < 10000000000 ? num * 1000 : num
            }
            // Attempt Date parse
            const parsed = Date.parse(cleanRaw)
            return !isNaN(parsed) ? parsed : 0
          }
          return 0
        })(),
      })),
    [filteredLocations]
  )

  const columns = [
    { key: 'location_id', label: 'ID', filter: true, sorter: true },
    { key: 'name', label: 'Name', filter: true, sorter: true },
    { key: 'country', label: 'Country', filter: true, sorter: true },
    { key: 'department', label: 'Department', filter: true, sorter: true },
    { key: 'city', label: 'City', filter: true, sorter: true },
    { key: 'address', label: 'Address', filter: true, sorter: true },
    { key: 'reference', label: 'Reference', filter: true, sorter: true },
    { key: 'phone', label: 'Phone', filter: true, sorter: true },
    { key: 'updated_by', label: 'Updated By', filter: true, sorter: true },
    { key: 'last_update_ts', label: 'Last Update', filter: true, sorter: true },
    { key: 'status', label: 'Status', filter: true, sorter: true },
    { key: 'actions', label: 'Actions', filter: false, sorter: false },
  ]

  const activeColumns = columns.filter((col) => col.key === 'actions' || visibleColumns.includes(col.key as string))

  const scopedColumns = {
    last_update_ts: (item: any) => {
      const dateVal = item.last_update_ts
      if (!dateVal) return <td>—</td>

      const dateObj = new Date(dateVal)
      const formatted = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(dateObj)

      return <td>{formatted}</td>
    },
    status: (item: any) => {
      const id = typeof item.status === 'object' ? item.status?.id : item.status
      const active = Number(id ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID
      return (
        <td>
          <CBadge color={active ? 'success' : 'secondary'} shape="rounded-pill">
            {active ? 'Active' : 'Disabled'}
          </CBadge>
        </td>
      )
    },
    actions: (item: any) => {
      const canEdit = permissionService.checkPermission(MODULE_LOCATIONS, UPDATE)
      const canDelete = permissionService.checkPermission(MODULE_LOCATIONS, DELETE)

      return (
        <td>
          <div className="action-buttons">
            {canEdit && (
              <CButton
                color="primary"
                variant="ghost"
                size="sm"
                title="Edit"
                onClick={() => navigate(`/modules/locations/edit/${item.location_id}`)}
              >
                <CIcon icon={cilPencil} />
              </CButton>
            )}
            {canDelete && (
              <CButton
                color="danger"
                variant="ghost"
                size="sm"
                title="Delete"
                onClick={() => {
                  setDeleteTarget(item)
                  setDeleteModalVisible(true)
                }}
              >
                <CIcon icon={cilTrash} />
              </CButton>
            )}
          </div>
        </td>
      )
    },
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.location_id) {
      setDeleteModalVisible(false)
      return
    }
    setDeleteLoading(true)
    try {
      await dispatch(deleteLocation(deleteTarget.location_id)).unwrap()
      setToast(
        <CToast autohide delay={4000} color="success" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>Location deleted.</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>
      )
      setDeleteModalVisible(false)
      setDeleteTarget(null)
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete location')
      setToast(
        <CToast autohide delay={5000} color="danger" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>{message}</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCloseDelete = () => {
    if (deleteLoading) return
    setDeleteModalVisible(false)
    setDeleteTarget(null)
  }

  return (
    <CRow className="g-3">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <CCol xs={12}>
        <PageHero
          title="All Locations"
          subtitle={
            searchTerm
              ? `Showing ${filteredLocations.length} of ${locations.length}`
              : `All Locations (${locations.length})`
          }
          kicker="Locations Management"
          icon={cilList}
          actions={
            <div className="d-flex gap-2">
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
                            id={`locations-col-${col.key}`}
                            checked={visibleColumns.includes(col.key as string)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setVisibleColumns([...visibleColumns, col.key as string])
                              } else if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={`locations-col-${col.key}`}>
                            {col.label}
                          </label>
                        </div>
                      ))}
                  </div>
                </CDropdownMenu>
              </CDropdown>
              {permissionService.checkPermission(MODULE_LOCATIONS, CREATE) && (
                <CButton color="primary" className="text-white" onClick={() => navigate('/modules/locations/create')}>
                  <CIcon icon={cilPlus} className="me-2" />
                  Add
                </CButton>
              )}
            </div>
          }
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            {errorMessage && <CAlert color="danger">{errorMessage}</CAlert>}
            <CRow className="mb-3 align-items-center g-2">
              <CCol xs={12} md={6} lg={4}>
                <CFormInput
                  type="text"
                  placeholder="Search by name, city, country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CCol>
            </CRow>

            <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={tableItems}
                itemsPerPage={itemsPerPage}
                pagination
                columnFilter
                sorterValue={{ column: 'location_id', state: 'desc' }}
                columnSorter
                scopedColumns={scopedColumns}
                loading={loading}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'locations-table align-middle',
                }}
              />
            </div>

            {!loading && !locations.length && (
              <div className="text-center py-5 text-body-secondary">
                <h5>No locations found</h5>
                <p>Use the "Add" button to create your first location.</p>
              </div>
            )}
          </CCardBody>
          <div className="d-flex justify-content-end align-items-center pe-3 pb-2">
            <span className="me-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
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
        </CCard>
      </CCol>

      <CModal visible={deleteModalVisible} onClose={handleCloseDelete} alignment="center">
        <CModalHeader closeButton={!deleteLoading}>
          <CModalTitle>Delete Location</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Are you sure you want to delete <strong>{deleteTarget?.name || 'this location'}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={handleCloseDelete} disabled={deleteLoading}>
            Cancel
          </CButton>
          <CButton color="danger" className="text-white" onClick={confirmDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default LocationsListPage
