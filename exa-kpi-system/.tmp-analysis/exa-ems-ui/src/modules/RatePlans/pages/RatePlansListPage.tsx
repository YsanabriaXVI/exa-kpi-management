import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CDropdownItem,
  CFormInput,
  CMultiSelect,
  CRow,
  CSmartTable,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilList, cilOptions, cilPencil, cilPlus, cilTrash } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../store'
import { deleteRatePlan, loadRatePlans } from '../store/ratePlansSlice'
import type { RatePlan } from '../types'
import PageHero from '../../../components/PageHero'
import './RatePlansList.scss'

const ACTIVE_STATUS_ID = 1

const RatePlansListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { rateplans, loading } = useSelector((state: RootState) => (state as any).rateplans)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['id', 'name', 'created_by', 'updated_by', 'updated_at', 'status'])
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<RatePlan | null>(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)

  useEffect(() => {
    dispatch(
      loadRatePlans({
        rows: 1000,
        first: 0,
        sortField: 'id',
        sortOrder: -1,
      })
    )
  }, [dispatch])

  const filteredPlans = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return rateplans.filter((plan: RatePlan) => {
      if (!search) return true
      return (
        plan.name?.toLowerCase().includes(search) ||
        plan.id?.toString().includes(search) ||
        plan.create_user?.full_name?.toLowerCase().includes(search) ||
        plan.update_user?.full_name?.toLowerCase().includes(search)
      )
    })
  }, [rateplans, searchTerm])

  const columns = [
    { key: 'id', label: 'ID', filter: true, sorter: true },
    { key: 'name', label: 'Rate Plan', filter: true, sorter: true },
    { key: 'created_by', label: 'Created By', filter: true, sorter: true },
    { key: 'updated_by', label: 'Updated By', filter: true, sorter: true },
    { key: 'updated_at', label: 'Last Update', filter: true, sorter: true },
    {
      key: 'status',
      label: 'Status',
      filter: (values: any, onChange: any) => {
        const unique = [...new Set(values.map((val: any) => {
          if (typeof val === 'object' && val?.name) return val.name
          return Number(val?.id ?? val) === ACTIVE_STATUS_ID ? 'Active' : 'Disabled'
        }))].sort()
        return (
          <CMultiSelect
            size="sm"
            placeholder="Filter by status"
            options={unique.map((label) => ({ value: label.toLowerCase(), label }))}
            onChange={(selected) => {
              const chosen = selected.map((option) => option.value)
              onChange((value: any) => {
                if (!chosen.length) return true
                const label =
                  typeof value === 'object' && value?.name
                    ? value.name
                    : Number(value?.id ?? value) === ACTIVE_STATUS_ID
                      ? 'Active'
                      : 'Disabled'
                return chosen.includes(label.toLowerCase())
              })
            }}
          />
        )
      },
      sorter: true,
    },
    { key: 'actions', label: 'Actions', filter: false, sorter: false },
  ]

  const activeColumns = columns.filter((column) => {
    if (column.key === 'actions') return true
    return visibleColumns.includes(column.key as string)
  })

  const scopedColumns = {
    created_by: (item: any) => <td>{item.create_user?.full_name || '—'}</td>,
    updated_by: (item: any) => <td>{item.update_user?.full_name || '—'}</td>,
    updated_at: (item: any) => <td>{item.update_date_format || '—'}</td>,
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
    actions: (item: any) => (
      <td>
        <div className="action-buttons">
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            title="Edit"
            onClick={() => navigate(`/modules/rateplans/edit/${item.id}`)}
          >
            <CIcon icon={cilPencil} />
          </CButton>
          <CButton
            color="danger"
            variant="ghost"
            size="sm"
            title="Delete"
            onClick={() => handleDelete(item.id)}
          >
            <CIcon icon={cilTrash} />
          </CButton>
        </div>
      </td>
    ),
  }

  const handleDelete = (id?: number) => {
    if (!id) return
    const target = rateplans.find((plan: RatePlan) => plan.id === id) || null
    setDeleteTarget(target)
    setDeleteModalVisible(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.id) {
      setDeleteModalVisible(false)
      return
    }
    const result = await dispatch(deleteRatePlan(deleteTarget.id))
    if (result.meta.requestStatus === 'fulfilled') {
      setToast(
        <CToast autohide={true} delay={4000} color="success" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>Rate Plan "{deleteTarget.name}" deleted.</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>
      )
    } else {
      setToast(
        <CToast autohide={true} delay={5000} color="danger" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>Failed to delete rate plan.</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>
      )
    }
    setDeleteModalVisible(false)
    setDeleteTarget(null)
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
                    id={`rateplans-col-${col.key}`}
                    checked={visibleColumns.includes(col.key as string)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setVisibleColumns([...visibleColumns, col.key as string])
                      } else if (visibleColumns.length > 1) {
                        setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                      }
                    }}
                  />
                  <label className="form-check-label" htmlFor={`rateplans-col-${col.key}`}>
                    {col.label}
                  </label>
                </div>
              ))}
          </div>
        </CDropdownMenu>
      </CDropdown>
      <CButton color="primary" className="text-white" onClick={() => navigate('/modules/rateplans/create')}>
        <CIcon icon={cilPlus} className="me-2" />
        New Rate Plan
      </CButton>
    </div>
  )

  return (
    <CRow className="g-3">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <CCol xs={12}>
        <PageHero
          kicker="Rate Plans Management"
          icon={cilList}
          title="All Rate Plans"
          subtitle={
            searchTerm
              ? `Showing ${filteredPlans.length} of ${rateplans.length}`
              : `All Rate Plans (${rateplans.length})`
          }
          actions={heroActions}
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            <CRow className="mb-3 align-items-center g-2">
              <CCol xs={12} md={6} lg={4}>
                <CFormInput
                  type="text"
                  placeholder="Search by name or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CCol>
            </CRow>

            <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={filteredPlans}
                itemsPerPage={itemsPerPage}
                pagination
                columnFilter
                sorterValue={{ column: 'id', state: 'desc' }}
                columnSorter
                loading={loading}
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'rateplans-table align-middle',
                }}
              />
            </div>

            {!loading && !rateplans.length && (
              <div className="text-center py-5 text-body-secondary">
                <h5>No rate plans found</h5>
                <p>Use the "New Rate Plan" button to create your first rate plan.</p>
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
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Delete Rate Plan</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Are you sure you want to delete{' '}
            <strong>{deleteTarget?.name || 'this rate plan'}</strong>?
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

export default RatePlansListPage
