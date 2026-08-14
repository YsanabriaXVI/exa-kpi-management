/**
 * Users List Page
 * Client-side filtering, sorting, and pagination using CoreUI Pro SmartTable
 */

import React, { useState, useEffect } from 'react'
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
  CFormInput,
  CMultiSelect,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilPeople,
  cilPencil,
  cilTrash,
  cilOptions,
} from '@coreui/icons'

import type { RootState, AppDispatch } from '../../../store'
import { loadUsersList, deleteUser, changeUserStatus } from '../store/usersSlice'
import PageHero from '../../../components/PageHero'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../services/auth/permission.service'
import { MODULE_USERS } from '../../../constants/modules'
import './UsersList.scss'

const ACTIVE_STATUS_ID = 1
const DISABLED_STATUS_ID = 2

const UsersListPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  // Redux state
  const { users, loading, error } = useSelector((state: RootState) => state.users)

  // Load saved column preferences
  const loadSavedColumns = () => {
    const saved = sessionStorage.getItem('users_visible_columns')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved columns:', e)
      }
    }
    return ['user_id', 'email', 'first_name', 'last_name', 'status']
  }

  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [visibleColumns, setVisibleColumns] = useState(loadSavedColumns())
  const [searchTerm, setSearchTerm] = useState('')

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_USERS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_USERS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_USERS, DELETE)

  // Available columns configuration
  const columns = [
    {
      key: 'user_id',
      label: 'ID',
      filter: true,
      sorter: true,
    },
    {
      key: 'email',
      label: 'User Name/Email',
      filter: true,
      sorter: true,
    },
    {
      key: 'first_name',
      label: 'First Name',
      filter: true,
      sorter: true,
    },
    {
      key: 'last_name',
      label: 'Last Name',
      filter: true,
      sorter: true,
    },
    {
      key: 'status',
      label: 'Status',
      filter: (values, onChange) => {
        // Extract unique status labels from the data
        const unique = [...new Set(values.map((val: any) => {
          if (typeof val === 'object' && val?.name) {
            return val.name
          }
          return val === ACTIVE_STATUS_ID || val === 1 ? 'Active' : 'Disabled'
        }))].sort()
        
        return (
          <CMultiSelect
            size="sm"
            placeholder="Filter by status"
            onChange={(selected) => {
              const _selected = selected.map((element) => element.value)
              onChange((value) => {
                if (!Array.isArray(_selected) || _selected.length === 0) {
                  return true
                }
                // Handle object format (with status.name) and numeric format
                const statusLabel = typeof value === 'object' && value?.name 
                  ? value.name 
                  : value === ACTIVE_STATUS_ID || value === 1 
                    ? 'Active' 
                    : 'Disabled'
                return _selected.includes(statusLabel.toLowerCase())
              })
            }}
            options={unique.map((element) => ({
              value: element.toLowerCase(),
              label: element,
            }))}
          />
        )
      },
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

  // Filter users based on search term
  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      user.email?.toLowerCase().includes(search) ||
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      user.user_id?.toString().includes(search)
    )
  })

  // Load all users once on mount (client-side table operations)
  useEffect(() => {
    dispatch(loadUsersList({
      filter: [],
      search: null,
      match: null,
      rows: 1000, // Fetch all users
      first: 0,
      sortField: 'user_id',
      sortOrder: -1,
      filters: {},
    }))
  }, [dispatch])

  // Save visible columns to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('users_visible_columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!canDelete) {
      alert('You do not have permission to delete users.')
      return
    }
    if (window.confirm('Are you sure you want to delete this user?')) {
      const result = await dispatch(deleteUser(id))
      if (result.meta.requestStatus === 'fulfilled') {
        // Optionally reload the list
        dispatch(loadUsersList({
          filter: [],
          search: null,
          match: null,
          rows: 1000,
          first: 0,
          sortField: 'user_id',
          sortOrder: -1,
          filters: {},
        }))
      }
    }
  }

  // Handle status change
  const handleChangeStatus = async (userId: number, currentStatusId: number) => {
    const newStatusId = currentStatusId === ACTIVE_STATUS_ID ? DISABLED_STATUS_ID : ACTIVE_STATUS_ID
    await dispatch(changeUserStatus({ userId, statusId: newStatusId }))
  }

  // Render status badge
  const renderStatus = (user: any) => {
    const statusId = user.status?.id || user.status
    const isActive = statusId === ACTIVE_STATUS_ID
    const color = isActive ? 'success' : 'danger'
    const text = isActive ? 'Active' : 'Disabled'
    
    return (
      <CBadge 
        color={color} 
        shape="rounded-pill"
        style={{ cursor: 'pointer' }}
        onClick={() => handleChangeStatus(user.user_id, statusId)}
        title="Click to toggle status"
      >
        {text}
      </CBadge>
    )
  }

  // Render actions column
  const renderActions = (item: any) => {
    return (
      <div className="action-buttons">
        {canUpdate && (
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/modules/users/edit/${item.user_id}`)}
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
            onClick={() => handleDelete(item.user_id)}
            title="Delete"
          >
            <CIcon icon={cilTrash} />
          </CButton>
        )}
        {!canUpdate && !canDelete && (
          <span className="text-muted">No actions available</span>
        )}
      </div>
    )
  }

  // Scope slots for custom rendering
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
          <div className="dropdown-divider"></div>
          <div className="column-selector-list px-3 py-2">
            {columns
              .filter((col) => col.key !== 'actions')
              .map((col) => (
                <div key={col.key} className="form-check py-1">
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
      {canCreate && (
        <CButton
          color="primary"
          onClick={() => navigate('/modules/users/create')}
          className="text-white"
        >
          <CIcon icon={cilPlus} className="me-1" />
          Add New
        </CButton>
      )}
    </div>
  )

  return (
    <CRow className="g-3">
      <CCol xs={12}>
        <PageHero
          kicker="Users Management"
          icon={cilPeople}
          title="All Users"
          subtitle={
            searchTerm
              ? `Showing ${filteredUsers.length} of ${users.length} Users`
              : `All Users (${users.length})`
          }
          actions={heroActions}
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            {/* Toolbar with search */}
            <CRow className="mb-3 align-items-center">
              {/* Left side - Search */}
              <CCol xs={12} md={6} lg={4} className="mb-2 mb-md-0">
                <CFormInput
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search users"
                />
              </CCol>
            </CRow>

            {/* Table wrapper for responsive behavior */}
            <div className="table-responsive mt-3">
              {/* SmartTable with client-side operations */}
              <CSmartTable
                columns={activeColumns}
                items={filteredUsers}
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
                  className: 'users-table align-middle',
                }}
                sorterValue={{ column: 'user_id', state: 'desc' }}
              />
            </div>

            {/* Empty state */}
            {!loading && users.length === 0 && (
              <div className="text-center py-5">
                <CIcon icon={cilPeople} size="4xl" className="text-body-secondary mb-3" />
                <h5 className="text-body-secondary">No Users Found</h5>
                <p className="text-body-secondary">
                  Start by creating your first user.
                </p>
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
    </CRow>
  )
}

export default UsersListPage
