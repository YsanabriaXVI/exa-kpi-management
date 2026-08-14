import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CMultiSelect,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CDropdownItem,
  CFormInput,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilOptions, cilPencil, cilPlus, cilTrash, cilShieldAlt } from '@coreui/icons'
import type { AppDispatch, RootState } from '../../../store'
import { deleteRole, loadRolesList } from '../store/rolesSlice'
import type { Role } from '../types'
import PageHero from '../../../components/PageHero'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../services/auth/permission.service'
import { MODULE_ROLES } from '../../../constants/modules'
import './RolesList.scss'

const ACTIVE_STATUS_ID = 1

const RolesListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { roles, loading, error } = useSelector((state: RootState) => state.roles)

  const loadSavedColumns = () => {
    const stored = sessionStorage.getItem('roles_visible_columns')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (err) {
        console.error('Failed to parse saved columns for roles', err)
      }
    }
    return ['role_id', 'name', 'created_by', 'updated_by', 'status']
  }

  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const errorMessage = useMemo(() => {
    if (!error) {
      return null
    }
    if (typeof error === 'string') {
      return error
    }
    if (error?.message && typeof error.message === 'string') {
      return error.message
    }
    const data = error?.data ?? error?.response?.data
    if (typeof data === 'string') {
      return data
    }
    if (data?.message && typeof data.message === 'string') {
      return data.message
    }
    return 'Failed to load roles'
  }, [error])

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_ROLES, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_ROLES, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_ROLES, DELETE)

  useEffect(() => {
    dispatch(loadRolesList())
  }, [dispatch])

  useEffect(() => {
    sessionStorage.setItem('roles_visible_columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const formatTimestamp = (value?: string | number | null) => {
    if (!value) {
      return '—'
    }

    if (typeof value === 'string' && value.toLowerCase() === 'invalid date') {
      return '—'
    }

    let timestamp: number
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      const numeric = parseInt(value, 10)
      timestamp = value.length === 10 ? numeric * 1000 : numeric
    } else {
      timestamp = Number(value)
    }

    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
      return '—'
    }
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleString('en-US', { month: 'short' })
    const year = date.getFullYear().toString().slice(-2)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}-${month}-${year} ${hours}:${minutes}`
  }

  const filteredRoles = useMemo(() => {
    if (!searchTerm) {
      return roles
    }
    const search = searchTerm.toLowerCase()
    return roles.filter((role) => {
      const created = role.create_user?.full_name || ''
      const updated = role.update_user?.full_name || ''
      return (
        role.name?.toLowerCase().includes(search) ||
        created.toLowerCase().includes(search) ||
        updated.toLowerCase().includes(search) ||
        role.role_id?.toString().includes(search)
      )
    })
  }, [roles, searchTerm])

  const tableItems = useMemo(
    () =>
      filteredRoles.map((role: Role) => ({
        ...role,
        created_by: role.create_user?.full_name || '—',
        updated_by: role.update_user?.full_name || '—',
        updated_at: role.update_date_format
          ? role.update_date_format
          : formatTimestamp(role.update_date),
      })),
    [filteredRoles]
  )

  const columns = [
    { key: 'role_id', label: 'ID', filter: true, sorter: true },
    { key: 'name', label: 'Role Name', filter: true, sorter: true },
    { key: 'created_by', label: 'Created By', filter: true, sorter: true },
    { key: 'updated_by', label: 'Updated By', filter: true, sorter: true },
    { key: 'updated_at', label: 'Last Update', filter: true, sorter: true },
    {
      key: 'status',
      label: 'Status',
      filter: (values: any, onChange: any) => {
        const unique = [...new Set(values.map((value: any) => {
          if (typeof value === 'object' && value?.name) {
            return value.name
          }
          return Number(value?.id ?? value) === ACTIVE_STATUS_ID ? 'Active' : 'Disabled'
        }))].sort()

        return (
          <CMultiSelect
            size="sm"
            placeholder="Filter by status"
            onChange={(selected) => {
              const selection = selected.map((option) => option.value)
              onChange((value: any) => {
                if (!selection.length) return true
                const label =
                  typeof value === 'object' && value?.name
                    ? value.name
                    : Number(value?.id ?? value) === ACTIVE_STATUS_ID
                      ? 'Active'
                      : 'Disabled'
                return selection.includes(label.toLowerCase())
              })
            }}
            options={unique.map((label) => ({
              value: label.toLowerCase(),
              label,
            }))}
          />
        )
      },
      sorter: true,
    },
    { key: 'actions', label: 'Actions', filter: false, sorter: false },
  ]

  const activeColumns = columns.filter((column) => {
    if (column.key === 'actions') {
      return true
    }
    return visibleColumns.includes(column.key as string)
  })

  const handleRequestDelete = (role: Role) => {
    if (!canDelete) {
      alert('You do not have permission to delete roles.')
      return
    }
    setDeleteTarget(role)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.role_id) {
      return
    }
    setDeleteLoading(true)
    try {
      await dispatch(deleteRole(deleteTarget.role_id)).unwrap()
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCloseDelete = () => {
    if (deleteLoading) return
    setDeleteTarget(null)
  }

  const renderStatus = (item: any) => {
    const currentStatus = item.status
    const isActive = (typeof currentStatus === 'object' ? currentStatus?.id : currentStatus) === ACTIVE_STATUS_ID
    const label = typeof currentStatus === 'object' && currentStatus?.name ? currentStatus.name : isActive ? 'Active' : 'Disabled'
    return (
      <CBadge color={isActive ? 'success' : 'secondary'} shape="rounded-pill">
        {label}
      </CBadge>
    )
  }

  const renderActions = (item: any) => (
    <div className="action-buttons justify-content-end">
      {canUpdate && (
        <CButton
          color="primary"
          variant="ghost"
          size="sm"
          title="Edit"
          onClick={() => navigate(`/modules/roles/edit/${item.role_id}`)}
        >
          <CIcon icon={cilPencil} />
        </CButton>
      )}
      {canDelete && (
        <CButton color="danger" variant="ghost" size="sm" title="Delete" onClick={() => handleRequestDelete(item)}>
          <CIcon icon={cilTrash} />
        </CButton>
      )}
      {!canUpdate && !canDelete && (
        <span className="text-muted">No actions available</span>
      )}
    </div>
  )

  const scopedColumns = {
    status: (item: any) => <td>{renderStatus(item)}</td>,
    actions: (item: any) => <td>{renderActions(item)}</td>,
  }

  const heroActions = (
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
          <div className="dropdown-divider" />
          <div className="column-selector-list px-3 py-2">
            {columns
              .filter((col) => col.key !== 'actions')
              .map((col) => (
                <div key={col.key as string} className="form-check py-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`roles-col-${col.key}`}
                    checked={visibleColumns.includes(col.key as string)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setVisibleColumns([...visibleColumns, col.key as string])
                      } else if (visibleColumns.length > 1) {
                        setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                      }
                    }}
                  />
                  <label className="form-check-label" htmlFor={`roles-col-${col.key}`}>
                    {col.label}
                  </label>
                </div>
              ))}
          </div>
        </CDropdownMenu>
      </CDropdown>
      {canCreate && (
        <CButton color="primary" className="text-white" onClick={() => navigate('/modules/roles/create')}>
          <CIcon icon={cilPlus} className="me-2" />
          New Role
        </CButton>
      )}
    </div>
  )

  return (
    <CRow className="g-3 roles-list-page">
      <CCol xs={12}>
        <PageHero
          kicker="Roles Management"
          icon={cilShieldAlt}
          title="All Roles"
          subtitle={
            searchTerm
              ? `Showing ${filteredRoles.length} of ${roles.length} Roles`
              : `All Roles (${roles.length})`
          }
          actions={heroActions}
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            {loading && <CAlert color="info">Loading roles...</CAlert>}
            {errorMessage && <CAlert color="danger">{errorMessage}</CAlert>}

            <CRow className="mb-3 align-items-center">
              <CCol xs={12} md={6} lg={4} className="mb-2 mb-md-0">
                <CFormInput
                  type="text"
                  placeholder="Type to search roles..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </CCol>
            </CRow>

            <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={tableItems}
                loading={loading}
                itemsPerPage={itemsPerPage}
                pagination
                columnFilter
                columnSorter
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'roles-table align-middle',
                }}
                sorterValue={{ column: 'role_id', state: 'desc' }}
              />
            </div>

            {!loading && !roles.length && (
              <div className="text-center py-5">
                <h5 className="text-body-secondary">No roles found</h5>
                <p className="text-body-secondary">Click "New Role" to create your first role.</p>
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

      <CModal
        alignment="center"
        visible={!!deleteTarget}
        onClose={handleCloseDelete}
        backdrop="static"
      >
        <CModalHeader closeButton={!deleteLoading}>
          <CModalTitle>Delete Role?</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {deleteTarget ? (
            <p className="mb-0">
              Are you sure you want to delete <strong>{deleteTarget.name || 'this role'}</strong>? This action
              cannot be undone.
            </p>
          ) : null}
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <CButton color="secondary" variant="outline" onClick={handleCloseDelete} disabled={deleteLoading}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleConfirmDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default RolesListPage
