/**
 * Location Items Page
 * Styled to match PaymentsListPage with toolbar, chip filters, and polished table panel
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
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
import { cilPencil, cilTrash, cilPlus, cilWarning, cilList, cilSearch, cilFilterX } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../store'
import {
  loadAllLocationItems,
  deleteLocationItem,
  setActiveType,
} from '../store/locationItemsSlice'
import PageHero from '../../../components/PageHero'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../services/auth/permission.service'
import { MODULE_LOCATIONS } from '../../../constants/modules'
import { LOCATION_TYPES, ACTIVE_STATUS_ID } from '../constants'
import type { LocationTypeKey } from '../types'
import './LocationItems.scss'

const TAB_LABELS: Record<LocationTypeKey, string> = {
  countries: 'Countries',
  departments: 'Departments',
  cities: 'Cities',
  variants: 'Variants',
}

const ADD_TYPE_LABELS: Record<LocationTypeKey, string> = {
  countries: 'Country',
  departments: 'Department',
  cities: 'City',
  variants: 'Variant',
}

const LocationItemsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { data, activeType: rawActiveType, loading } = useSelector((state: RootState) => (state as any).locationitems)
  const activeType: LocationTypeKey = rawActiveType as LocationTypeKey

  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [toast, setToast] = useState<any>(null)
  const toaster = React.useRef<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [perPage, setPerPage] = useState(15)

  useEffect(() => {
    dispatch(loadAllLocationItems())
  }, [dispatch])

  const handleTabClick = (type: LocationTypeKey) => {
    dispatch(setActiveType(type))
    setSearchTerm('')
  }

  const handleDelete = async () => {
    if (deleteTarget) {
      try {
        const result = await dispatch(
          deleteLocationItem({
            type: activeType,
            id:
              deleteTarget.id ||
              deleteTarget.country_id ||
              deleteTarget.department_id ||
              deleteTarget.city_id ||
              deleteTarget.variant_id,
          })
        )
        if (result.meta.requestStatus === 'fulfilled') {
          setToast(
            <CToast autohide={true} delay={5000} color="success" className="text-white align-items-center">
              <div className="d-flex">
                <CToastBody>Item deleted successfully</CToastBody>
                <CToastClose className="me-2 m-auto" white />
              </div>
            </CToast>
          )
          setDeleteModalVisible(false)
          setDeleteTarget(null)
        } else {
          setToast(
            <CToast autohide={true} delay={5000} color="danger" className="text-white align-items-center">
              <div className="d-flex">
                <CToastBody>{(result as any).error?.message || 'Failed to delete item'}</CToastBody>
                <CToastClose className="me-2 m-auto" white />
              </div>
            </CToast>
          )
        }
      } catch (err: any) {
        setToast(
          <CToast autohide={true} delay={5000} color="danger" className="text-white align-items-center">
            <div className="d-flex">
              <CToastBody>{err.message || 'An error occurred'}</CToastBody>
              <CToastClose className="me-2 m-auto" white />
            </div>
          </CToast>
        )
      }
    }
  }

  // Permissions
  const canCreate = permissionService.checkPermission(MODULE_LOCATIONS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_LOCATIONS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_LOCATIONS, DELETE)

  const items = data[activeType] || []

  // Flatten properties for filtering
  const tableItems = useMemo(() => {
    return items.map((item: any) => ({
      ...item,
      country: item.country?.name || '',
      department: item.department?.name || '',
      variant: item.variant?.name || '',
      created_by: item.create_user?.full_name || '—',
      updated_by: item.update_user?.full_name || '—',
      updated_at: (() => {
        const raw = item.updated_at || item.update_date
        if (!raw) return 0
        if (typeof raw === 'number') {
          return raw < 10000000000 ? raw * 1000 : raw
        }
        if (typeof raw === 'string') {
          if (/^\d+$/.test(raw)) {
            const num = Number(raw)
            return num < 10000000000 ? num * 1000 : num
          }
          const parsed = Date.parse(raw)
          return !isNaN(parsed) ? parsed : 0
        }
        return 0
      })(),
    }))
  }, [items])

  // Client-side search filter
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return tableItems
    const term = searchTerm.toLowerCase()
    return tableItems.filter((item: any) => {
      if (item.name?.toLowerCase().includes(term)) return true
      if (item.code && String(item.code).toLowerCase().includes(term)) return true
      if (item.country?.toLowerCase().includes(term)) return true
      if (item.department?.toLowerCase().includes(term)) return true
      if (item.variant?.toLowerCase().includes(term)) return true
      if (item.created_by?.toLowerCase().includes(term)) return true
      if (item.updated_by?.toLowerCase().includes(term)) return true
      return false
    })
  }, [tableItems, searchTerm])

  const clearSearch = useCallback(() => {
    setSearchTerm('')
  }, [])

  const scopedColumns = {
    name: (item: any) => (
      <td>
        <span className="fw-semibold">{item.name || '—'}</span>
      </td>
    ),
    country: (item: any) => <td>{item.country || '—'}</td>,
    department: (item: any) => <td>{item.department || '—'}</td>,
    variant: (item: any) => <td>{item.variant || '—'}</td>,
    updated_at: (item: any) => {
      const dateVal = item.updated_at
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
      return (
        <td className="text-nowrap">
          <div className="action-buttons">
            {canUpdate && (
              <CButton
                color="primary"
                variant="ghost"
                size="sm"
                title="Edit"
                onClick={() => {
                  const itemId =
                    item.id ||
                    item.country_id ||
                    item.department_id ||
                    item.city_id ||
                    item.variant_id
                  navigate(`/modules/locationitems/${activeType}/edit/${itemId}`)
                }}
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

  const columnsBase = [
    { key: 'name', label: 'Name', filter: true, sorter: true },
  ]

  const getColumns = (type: LocationTypeKey) => {
    const base = [...columnsBase]
    if (type === 'cities') {
      base.push({ key: 'code', label: 'Code', filter: true, sorter: true })
      base.push(
        { key: 'department', label: 'Department', filter: true, sorter: true },
        { key: 'country', label: 'Country', filter: true, sorter: true },
        { key: 'variant', label: 'Variant', filter: true, sorter: true }
      )
    } else if (type === 'departments') {
      base.push({ key: 'country', label: 'Country', filter: true, sorter: true })
    }

    base.push({ key: 'updated_by', label: 'Updated By', filter: true, sorter: true })
    base.push({ key: 'updated_at', label: 'Last Update', filter: true, sorter: true })
    base.push({ key: 'status', label: 'Status', filter: true, sorter: true })
    base.push({ key: 'actions', label: 'Actions', filter: false, sorter: false })
    return base
  }

  const columns = useMemo(() => getColumns(activeType), [activeType])

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
    <div className="locationitems-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <PageHero
        kicker="System Configuration"
        title="Location Items"
        icon={cilList}
        highlights={[
          { label: 'Total', value: filteredItems.length, color: 'primary' },
        ]}
        actions={
          canCreate ? (
            <CButton
              color="primary"
              className="text-white"
              onClick={() => navigate(`/modules/locationitems/${activeType}/create`)}
            >
              <CIcon icon={cilPlus} className="me-2" />
              Add {ADD_TYPE_LABELS[activeType]}
            </CButton>
          ) : undefined
        }
      />

      <CRow>
        <CCol xs={12}>
          <CCard className="shadow-sm border-0">
            <CCardBody>
              {/* ─── Toolbar: Stats + Search ─── */}
              <div className="locationitems-toolbar">
                <div className="locationitems-toolbar__summary">
                  <div className="locationitems-toolbar-stat">
                    <span className="locationitems-toolbar-stat__label">Records</span>
                    <span className="locationitems-toolbar-stat__value">{filteredItems.length}</span>
                  </div>
                  {loading && <CSpinner size="sm" className="text-primary" />}
                </div>
                <div className="locationitems-toolbar__controls">
                  <div className="locationitems-search">
                    <span className="locationitems-search__icon">
                      <CIcon icon={cilSearch} size="sm" />
                    </span>
                    <CFormInput
                      placeholder="Search location items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {searchTerm && (
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      className="d-flex align-items-center gap-1"
                      onClick={clearSearch}
                    >
                      <CIcon icon={cilFilterX} size="sm" />
                      Clear
                    </CButton>
                  )}
                </div>
              </div>

              {/* ─── Type Filter Panel ─── */}
              <div className="locationitems-filter-panel">
                <div className="locationitems-filter-panel__header">
                  <span className="locationitems-filter-label">Category</span>
                </div>
                <div className="locationitems-filter-chip-list">
                  {LOCATION_TYPES.map((type) => (
                    <CBadge
                      key={type}
                      color={activeType === type ? 'primary' : 'light'}
                      className="locationitems-filter-badge"
                      role="button"
                      onClick={() => handleTabClick(type)}
                    >
                      {TAB_LABELS[type]}
                      <CBadge
                        color={activeType === type ? 'light' : 'secondary'}
                        className="ms-2"
                        shape="rounded-pill"
                        style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                      >
                        {(data[type] || []).length}
                      </CBadge>
                    </CBadge>
                  ))}
                </div>
              </div>

              {/* ─── Table ─── */}
              <div className="locationitems-table-panel">
                {loading ? skeletonRows : (
                  <div className="table-responsive">
                    <CSmartTable
                      items={filteredItems}
                      columns={columns}
                      columnFilter
                      columnSorter
                      pagination
                      itemsPerPage={perPage}
                      scopedColumns={scopedColumns}
                      loading={loading}
                      noItemsLabel="No items found"
                      tableProps={{
                        hover: true,
                        responsive: true,
                        striped: true,
                        className: 'align-middle locationitems-table',
                      }}
                    />
                  </div>
                )}

                {/* Footer */}
                <div className="locationitems-table-footer">
                  <div className="locationitems-table-footer__meta">
                    Showing {filteredItems.length.toLocaleString()} of {tableItems.length.toLocaleString()} {TAB_LABELS[activeType].toLowerCase()}
                  </div>
                  <div className="locationitems-table-footer__controls">
                    <label className="small text-body-secondary me-2 mb-0">Items per page:</label>
                    <select
                      className="form-select form-select-sm w-auto"
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                    >
                      {[10, 15, 20, 30, 50, 100].map((v) => (
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

      {/* Delete Confirmation Modal */}
      <CModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Confirm Delete</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center py-4">
          <CIcon icon={cilWarning} size="4xl" className="text-danger mb-3" />
          <p>Are you sure you want to delete this {ADD_TYPE_LABELS[activeType].toLowerCase()}?</p>
          <p className="text-muted small">This action cannot be undone.</p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModalVisible(false)}>
            Cancel
          </CButton>
          <CButton color="danger" className="text-white" onClick={handleDelete}>
            Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default LocationItemsPage
