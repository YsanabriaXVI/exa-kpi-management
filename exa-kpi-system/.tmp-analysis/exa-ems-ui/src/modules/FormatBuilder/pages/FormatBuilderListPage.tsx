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
  CAlert,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilList, cilOptions, cilPencil, cilPlus, cilTrash } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../store'
import { deleteFormat, loadFormats } from '../store/formatBuilderSlice'
import type { FormatBuilder } from '../types'
import PageHero from '../../../components/PageHero'
import './FormatBuilderList.scss'

const ACTIVE_STATUS_ID = 1

const FormatBuilderListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { formats, loading, error } = useSelector((state: RootState) => (state as any).formatbuilder)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'invoiceformat_id',
    'name',
    'type',
    'updated_by',
    'updated_at',
    'status',
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<FormatBuilder | null>(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const errorMessage = useMemo(
    () => (error ? extractErrorMessage(error, 'Failed to load formats') : null),
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
    dispatch(
      loadFormats({
        rows: 1000,
        first: 0,
        sortField: 'invoiceformat_id',
        sortOrder: -1,
      })
    )
  }, [dispatch])

  const filteredFormats = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return formats.filter((format: FormatBuilder) => {
      if (!search) return true
      return (
        format.name?.toLowerCase().includes(search) ||
        format.type?.toLowerCase().includes(search) ||
        format.invoiceformat_id?.toString().includes(search) ||
        format.create_user?.full_name?.toLowerCase().includes(search) ||
        format.update_user?.full_name?.toLowerCase().includes(search)
      )
    })
  }, [formats, searchTerm])

  const tableItems = useMemo(
    () =>
      filteredFormats.map((fmt: any) => ({
        ...fmt,
        created_by: fmt.create_user?.full_name || '—',
        updated_by: fmt.update_user?.full_name || '—',
        updated_at: fmt.update_date_format || '—',
      })),
    [filteredFormats]
  )

  const columns = [
    { key: 'invoiceformat_id', label: 'ID', filter: true, sorter: true },
    { key: 'name', label: 'Name', filter: true, sorter: true },
    { key: 'type', label: 'Type', filter: true, sorter: true },
    { key: 'updated_by', label: 'Updated By', filter: true, sorter: true },
    { key: 'updated_at', label: 'Last Update', filter: true, sorter: true },
    { key: 'tax_rate', label: 'Tax Rate', filter: true, sorter: true },
    { key: 'currency', label: 'Currency', filter: true, sorter: true },
    { key: 'row', label: 'Rows', filter: true, sorter: true },
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
    updated_by: (item: any) => <td>{item.updated_by}</td>,
    updated_at: (item: any) => <td>{item.updated_at}</td>,
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
            onClick={() => navigate(`/modules/formatbuilder/edit/${item.invoiceformat_id || item.id}`)}
          >
            <CIcon icon={cilPencil} />
          </CButton>
          <CButton
            color="danger"
            variant="ghost"
            size="sm"
            title="Delete"
            onClick={() => handleDelete(item.invoiceformat_id || item.id)}
          >
            <CIcon icon={cilTrash} />
          </CButton>
        </div>
      </td>
    ),
  }

  const handleDelete = (id?: number) => {
    if (!id) return
    const target = formats.find((fmt: FormatBuilder) => (fmt.invoiceformat_id || fmt.id) === id) || null
    setDeleteTarget(target)
    setDeleteModalVisible(true)
  }

  const handleCloseDelete = () => {
    if (deleteLoading) return
    setDeleteModalVisible(false)
    setDeleteTarget(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget || (!deleteTarget.id && !deleteTarget.invoiceformat_id)) {
      setDeleteModalVisible(false)
      return
    }
    const id = deleteTarget.invoiceformat_id || deleteTarget.id!
    setDeleteLoading(true)
    try {
      await dispatch(deleteFormat(id)).unwrap()
      setToast(
        <CToast autohide={true} delay={4000} color="success" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>Format "{deleteTarget.name}" deleted.</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>
      )
      setDeleteModalVisible(false)
      setDeleteTarget(null)
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete format')
      setToast(
        <CToast autohide={true} delay={5000} color="danger" className="text-white align-items-center">
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
                    id={`formatbuilder-col-${col.key}`}
                    checked={visibleColumns.includes(col.key as string)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setVisibleColumns([...visibleColumns, col.key as string])
                      } else if (visibleColumns.length > 1) {
                        setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                      }
                    }}
                  />
                  <label className="form-check-label" htmlFor={`formatbuilder-col-${col.key}`}>
                    {col.label}
                  </label>
                </div>
              ))}
          </div>
        </CDropdownMenu>
      </CDropdown>
      <CButton color="primary" className="text-white" onClick={() => navigate('/modules/formatbuilder/create')}>
        <CIcon icon={cilPlus} className="me-2" />
        New Format
      </CButton>
    </div>
  )

  return (
    <CRow className="g-3">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <CCol xs={12}>
        <PageHero
          kicker="Format Builder"
          icon={cilList}
          title="All Formats"
          subtitle={
            searchTerm
              ? `Showing ${filteredFormats.length} of ${formats.length}`
              : `All Formats (${formats.length})`
          }
          actions={heroActions}
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            {errorMessage && <CAlert color="danger">{errorMessage}</CAlert>}
            <CRow className="mb-3 align-items-center g-2">
              <CCol xs={12} md={6} lg={4}>
                <CFormInput
                  type="text"
                  placeholder="Search by name, type, or user..."
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
                sorterValue={{ column: 'invoiceformat_id', state: 'desc' }}
                columnSorter
                loading={loading}
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'formatbuilder-table align-middle',
                }}
              />
            </div>

            {!loading && !formats.length && (
              <div className="text-center py-5 text-body-secondary">
                <h5>No formats found</h5>
                <p>Use the "New Format" button to create your first format.</p>
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
        onClose={handleCloseDelete}
        alignment="center"
      >
        <CModalHeader closeButton={!deleteLoading}>
          <CModalTitle>Delete Format</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Are you sure you want to delete{' '}
            <strong>{deleteTarget?.name || 'this format'}</strong>?
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

export default FormatBuilderListPage
