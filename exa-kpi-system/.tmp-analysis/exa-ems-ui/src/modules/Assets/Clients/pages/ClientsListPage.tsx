import React, { useEffect, useMemo, useState } from 'react'
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
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CRow,
  CSmartTable,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilOptions, cilPeople, cilPencil, cilPlus, cilTrash, cilSearch } from '@coreui/icons'
import PageHero from '../../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../../store'
import { deleteClient, loadClients } from '../store/clients.slice'
import { permissionService, CREATE, UPDATE, DELETE, READ } from '../../../../services/auth/permission.service'
import { MODULE_CLIENTS } from '../../../../constants/modules'
import exportToXlsx from '../../../../utils/exportToXlsx'
import '../styles/ClientsList.scss'

const columns = [
  { key: 'client_id', label: 'ID', filter: true, sorter: true },
  { key: 'name', label: 'Client', filter: true, sorter: true },
  { key: 'reference', label: 'Contact', filter: true, sorter: true },
  { key: 'email', label: 'Email', filter: true, sorter: true },
  { key: 'phone', label: 'Phone', filter: true, sorter: true },
  { key: 'update_date_format', label: 'Date', filter: true, sorter: true },
  { key: 'active', label: 'Active', filter: true, sorter: true },
  { key: 'actions', label: 'Actions', filter: false, sorter: false },
]

const ClientsListPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const clientsState = useSelector((state: RootState) => (state as any).clients) || {}
  const clients = Array.isArray(clientsState.list) ? clientsState.list : []
  const loading = Boolean(clientsState.loading)

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'client_id',
    'name',
    'reference',
    'email',
    'phone',
    'update_date_format',
    'active',
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [exporting, setExporting] = useState(false)
  const [tableItems, setTableItems] = useState<any[]>([])
  
  // Delete Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Toaster
  const [toast, setToast] = useState<any>(null)
  const toaster = React.useRef<any>()

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

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' = 'success') => {
    setToast(
      <CToast autohide={true} delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_CLIENTS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_CLIENTS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_CLIENTS, DELETE)
  const canRead = permissionService.checkPermission(MODULE_CLIENTS, READ)

  useEffect(() => {
    dispatch(loadClients())
  }, [dispatch])

  const filteredClients = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return clients.filter((client: any) => {
      if (!search) return true
      const values = [
        client.client_id,
        client.name,
        client.reference,
        client.email,
        client.phone,
        client.update_date_format,
      ]
      return values.filter(Boolean).some((v) => v.toString().toLowerCase().includes(search))
    })
  }, [clients, searchTerm])

  const activeColumns = columns.filter((col) => col.key === 'actions' || visibleColumns.includes(col.key as string))

  const handleDeleteClick = (client: any) => {
    if (!canDelete) {
      showToast('You do not have permission to delete clients.', 'danger')
      return
    }
    setClientToDelete(client)
    setDeleteModalVisible(true)
  }

  const confirmDelete = async () => {
    if (!clientToDelete) return

    setDeleteLoading(true)
    try {
      const result: any = await dispatch(deleteClient(clientToDelete.client_id))
      if (result.meta.requestStatus === 'fulfilled') {
        showToast('Client deleted successfully', 'success')
        setDeleteModalVisible(false)
        setClientToDelete(null)
        dispatch(loadClients())
      } else {
        const errorMsg = extractErrorMessage(result.payload, 'Failed to delete client')
        showToast(errorMsg, 'danger')
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'danger')
    } finally {
      setDeleteLoading(false)
    }
  }

  const scopedColumns = {
    active: (item: any) => {
      const isActive = String(item.active ?? '').toLowerCase() === '1' || item.active === true || item.active === 1
      return (
        <td>
          <CBadge color={isActive ? 'success' : 'secondary'} shape="rounded-pill">
            {isActive ? 'Active' : 'Inactive'}
          </CBadge>
        </td>
      )
    },
    actions: (item: any) => (
      <td>
        <div className="action-buttons">
          {canUpdate && (
            <CButton
              color="primary"
              variant="ghost"
              size="sm"
              title="Edit"
              onClick={() => navigate(`/assets/clients/${item.client_id}`)}
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
              onClick={() => handleDeleteClick(item)}
            >
              <CIcon icon={cilTrash} />
            </CButton>
          )}
          {canRead && (
            <CButton
              color="info"
              variant="ghost"
              size="sm"
              title="View"
              onClick={() => navigate(`/assets/clients/${item.client_id}?view=true`)}
            >
              <CIcon icon={cilSearch} />
            </CButton>
          )}
          {!canUpdate && !canDelete && !canRead && (
            <span className="text-muted">No actions available</span>
          )}
        </div>
      </td>
    ),
  }

  const handleFilteredItemsChange = (items?: any[]) => {
    setTableItems(Array.isArray(items) ? items : [])
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
      const rowsToExport = tableItems.length ? tableItems : filteredClients
      await exportToXlsx({
        columns: exportColumns,
        rows: rowsToExport,
        fileName: `clients_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Clients',
      })
    } catch (error) {
      console.error('Failed to export clients:', error)
      alert('Unable to export clients at the moment.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
    <CRow className="g-3 clients-list-page">
      <CCol xs={12}>
        <PageHero
          kicker="Assets"
          icon={cilPeople}
          title="Clients"
          subtitle={
            searchTerm
              ? `Showing ${filteredClients.length} of ${clients.length} clients`
              : `Manage your clients • ${clients.length} items`
          }
          actions={
            <div className="d-flex gap-2 flex-wrap justify-content-end">
              <CButton
                color="success"
                className="text-white"
                onClick={handleExport}
                disabled={
                  exporting || (tableItems.length === 0 && filteredClients.length === 0)
                }
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
                            id={`clients-col-${col.key}`}
                            checked={visibleColumns.includes(col.key as string)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setVisibleColumns([...visibleColumns, col.key as string])
                              } else if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={`clients-col-${col.key}`}>
                            {col.label}
                          </label>
                        </div>
                      ))}
                  </div>
                </CDropdownMenu>
              </CDropdown>
              {canCreate && (
                <CButton color="primary" onClick={() => navigate('/assets/clients/new')} className="text-white">
                  <CIcon icon={cilPlus} className="me-1" />
                  Add Client
                </CButton>
              )}
            </div>
          }
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            <CRow className="mb-3 align-items-center">
              <CCol xs={12} md={6} lg={4}>
                <CFormInput
                  type="text"
                  placeholder="Search by name, contact, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search clients"
                />
              </CCol>
            </CRow>

            <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={filteredClients}
                loading={loading}
                itemsPerPage={itemsPerPage}
                pagination
                columnFilter
                columnSorter
                scopedColumns={scopedColumns}
                onFilteredItemsChange={handleFilteredItemsChange}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'clients-table align-middle',
                }}
                sorterValue={{ column: 'client_id', state: 'desc' }}
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

            {!loading && clients.length === 0 && (
              <div className="text-center py-5 text-body-secondary">
                <h5>No Clients Found</h5>
                <p>Use the "Add Client" button to create your first client.</p>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
      <CModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader onClose={() => setDeleteModalVisible(false)}>
          <CModalTitle>Confirm Deletion</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete this client?
          {clientToDelete && (
            <div className="fw-bold mt-2">
              {clientToDelete.name}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModalVisible(false)} disabled={deleteLoading}>
            Cancel
          </CButton>
          <CButton color="danger" className="text-white" onClick={confirmDelete} disabled={deleteLoading}>
            {deleteLoading ? <CSpinner size="sm" /> : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CToaster ref={toaster} push={toast} placement="top-end" />
    </>
  )
}

export default ClientsListPage
