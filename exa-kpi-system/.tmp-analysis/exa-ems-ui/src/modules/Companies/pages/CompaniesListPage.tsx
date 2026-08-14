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
  CFormInput,
  CNav,
  CNavItem,
  CNavLink,
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
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilBuilding, cilOptions, cilPencil, cilPlus, cilTrash } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../store'
import { deleteCompany, loadCompanies, setActiveTab } from '../store/companiesSlice'
import type { Company } from '../types'
import { ACTIVE_STATUS_ID } from '../constants'
import './CompaniesList.scss'

import PageHero from '../../../components/PageHero'

const CompaniesListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { companies, loading, activeTab } = useSelector((state: RootState) => (state as any).companies)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'company_id',
    'name',
    'description',
    'address',
    'phone',
    'updated_by',
    'updated_at',
    'status',
  ])
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)

  useEffect(() => {
    dispatch(loadCompanies())
  }, [dispatch])

  const filteredByTab = useMemo(() => {
    if (activeTab === 'active') {
      return companies.filter((c: Company) => Number(c.status ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID)
    }
    if (activeTab === 'inactive') {
      return companies.filter((c: Company) => Number(c.status ?? ACTIVE_STATUS_ID) !== ACTIVE_STATUS_ID)
    }
    return companies
  }, [companies, activeTab])

  const filteredCompanies = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return filteredByTab.filter((company: Company) => {
      if (!search) return true
      return (
        company.name?.toLowerCase().includes(search) ||
        (company.description || '').toLowerCase().includes(search) ||
        (company.address || '').toLowerCase().includes(search) ||
        (company.phone || '').toLowerCase().includes(search) ||
        (company.update_user?.full_name || '').toLowerCase().includes(search)
      )
    })
  }, [filteredByTab, searchTerm])

  const stripHtml = (html: string) =>
    (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  const tableItems = useMemo(
    () =>
      filteredCompanies.map((c: any) => ({
        ...c,
        description: stripHtml(c.description),
        updated_by: c.update_user?.full_name || '—',
        updated_at: c.update_date_format || '—',
      })),
    [filteredCompanies]
  )

  const columns = [
    { key: 'company_id', label: 'ID', filter: true, sorter: true },
    { key: 'name', label: 'Name', filter: true, sorter: true },
    { key: 'description', label: 'Description', filter: true, sorter: true },
    { key: 'address', label: 'Address', filter: true, sorter: true },
    { key: 'phone', label: 'Phone', filter: true, sorter: true },
    { key: 'updated_by', label: 'Updated By', filter: true, sorter: true },
    { key: 'updated_at', label: 'Last Update', filter: true, sorter: true },
    { key: 'status', label: 'Status', filter: true, sorter: true },
    { key: 'actions', label: 'Actions', filter: false, sorter: false },
  ]

  const activeColumns = columns.filter((col) => col.key === 'actions' || visibleColumns.includes(col.key as string))

  const scopedColumns = {
    status: (item: any) => {
      const active = Number(item.status ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID
      return (
        <td>
          <CBadge color={active ? 'success' : 'secondary'} shape="rounded-pill">
            {active ? 'Active' : 'Inactive'}
          </CBadge>
        </td>
      )
    },
    actions: (item: any) => (
      <td>
        <div className="action-buttons">
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            title="Edit"
            onClick={() =>
              navigate(`/modules/companies/edit/${item.company_id}`, {
                state: { activeTab },
              })
            }
          >
            <CIcon icon={cilPencil} />
          </CButton>
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
        </div>
      </td>
    ),
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.company_id) {
      setDeleteModalVisible(false)
      return
    }
    const result: any = await dispatch(deleteCompany(deleteTarget.company_id))
    if (result.meta.requestStatus === 'fulfilled') {
      setToast(
        <CToast autohide delay={4000} color="success" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>Company deleted.</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>
      )
    } else {
      setToast(
        <CToast autohide delay={5000} color="danger" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>Failed to delete company.</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>
      )
    }
    setDeleteModalVisible(false)
    setDeleteTarget(null)
  }

  return (
    <CRow className="g-3">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <CCol xs={12}>
        <PageHero
          title="All Companies"
          subtitle={
            searchTerm
              ? `Showing ${filteredCompanies.length} of ${companies.length}`
              : `All Companies (${companies.length})`
          }
          kicker="Companies Management"
          icon={cilBuilding}
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
                            id={`companies-col-${col.key}`}
                            checked={visibleColumns.includes(col.key as string)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setVisibleColumns([...visibleColumns, col.key as string])
                              } else if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={`companies-col-${col.key}`}>
                            {col.label}
                          </label>
                        </div>
                      ))}
                  </div>
                </CDropdownMenu>
              </CDropdown>
              <CButton color="primary" className="text-white" onClick={() => navigate('/modules/companies/create', { state: { activeTab } })}>
                <CIcon icon={cilPlus} className="me-2" />
                Add
              </CButton>
            </div>
          }
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            <CNav variant="pills" className="mb-3">
              <CNavItem>
                <CNavLink active={activeTab === 'all'} onClick={() => dispatch(setActiveTab('all'))}>
                  All
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink active={activeTab === 'active'} onClick={() => dispatch(setActiveTab('active'))}>
                  Active
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink active={activeTab === 'inactive'} onClick={() => dispatch(setActiveTab('inactive'))}>
                  Inactive
                </CNavLink>
              </CNavItem>
            </CNav>

            <CRow className="mb-3 align-items-center g-2">
              <CCol xs={12} md={6} lg={4}>
                <CFormInput
                  type="text"
                  placeholder="Search by name, description, phone..."
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
                sorterValue={{ column: 'company_id', state: 'desc' }}
                columnSorter
                scopedColumns={scopedColumns}
                loading={loading}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'companies-table align-middle',
                }}
              />
            </div>

            {!loading && !companies.length && (
              <div className="text-center py-5 text-body-secondary">
                <h5>No companies found</h5>
                <p>Use the "Add" button to create your first company.</p>
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

      <CModal visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)} alignment="center">
        <CModalHeader>
          <CModalTitle>Delete Company</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Are you sure you want to delete <strong>{deleteTarget?.name || 'this company'}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setDeleteModalVisible(false)}>
            Cancel
          </CButton>
          <CButton color="danger" className="text-white" onClick={confirmDelete}>
            Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default CompaniesListPage
