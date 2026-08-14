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
  CFormSelect,
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
import {
  deleteAttribute,
  loadAttributesList,
  loadModules,
} from '../store/attributesSlice'
import { ACTIVE_STATUS_ID } from '../constants'
import type { Attribute } from '../types'
import PageHero from '../../../components/PageHero'
import './AttributesList.scss'

const AttributesListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { attributes, modules, loading, error } = useSelector((state: RootState) => state.attributes)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<Attribute | null>(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
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

  const loadSavedColumns = () => {
    const stored = sessionStorage.getItem('attributes_visible_columns')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to parse saved columns for attributes', error)
      }
    }
    return ['attribute_id', 'name', 'module', 'type', 'integral', 'required', 'order', 'status']
  }

  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [searchTerm, setSearchTerm] = useState('')
  const [moduleFilter, setModuleFilter] = useState<number | 'all'>('all')
  const errorMessage = useMemo(
    () => (error ? extractErrorMessage(error, 'Failed to load attributes') : null),
    [error]
  )

  useEffect(() => {
    dispatch(loadModules())
    dispatch(
      loadAttributesList({
        rows: 1000,
        first: 0,
        sortField: 'attribute_id',
        sortOrder: -1,
      })
    )
  }, [dispatch])

  useEffect(() => {
    sessionStorage.setItem('attributes_visible_columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const filteredAttributes = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return attributes.filter((attr) => {
      const matchesSearch =
        !search ||
        attr.name?.toLowerCase().includes(search) ||
        attr.module?.name?.toLowerCase().includes(search) ||
        attr.type?.name?.toLowerCase().includes(search) ||
        attr.attribute_id?.toString().includes(search)

      const matchesModule =
        moduleFilter === 'all' || attr.module_id === moduleFilter || attr.module?.module_id === moduleFilter

      return matchesSearch && matchesModule
    })
  }, [attributes, moduleFilter, searchTerm])

  const columns = [
    { key: 'attribute_id', label: 'ID', filter: true, sorter: true },
    { key: 'name', label: 'Attribute', filter: true, sorter: true },
    { key: 'module', label: 'Module', filter: true, sorter: true },
    { key: 'type', label: 'Input Type', filter: true, sorter: true },
    {
      key: 'integral',
      label: 'Integral',
      filter: (values: any, onChange: any) => {
        const unique = [...new Set(values.map((val: any) => (Number(val) === 1 ? 'Yes' : 'No')))]
        return (
          <CMultiSelect
            size="sm"
            placeholder="Filter"
            options={unique.map((label) => ({ value: label.toLowerCase(), label }))}
            onChange={(selected) => {
              const chosen = selected.map((opt) => opt.value)
              onChange((value: any) => {
                if (!chosen.length) return true
                const label = Number(value) === 1 ? 'yes' : 'no'
                return chosen.includes(label)
              })
            }}
          />
        )
      },
      sorter: true,
    },
    {
      key: 'required',
      label: 'Required',
      filter: (values: any, onChange: any) => {
        const unique = [...new Set(values.map((val: any) => (Number(val) === 1 ? 'Yes' : 'No')))]
        return (
          <CMultiSelect
            size="sm"
            placeholder="Filter"
            options={unique.map((label) => ({ value: label.toLowerCase(), label }))}
            onChange={(selected) => {
              const chosen = selected.map((opt) => opt.value)
              onChange((value: any) => {
                if (!chosen.length) return true
                const label = Number(value) === 1 ? 'yes' : 'no'
                return chosen.includes(label)
              })
            }}
          />
        )
      },
      sorter: true,
    },
    { key: 'order', label: 'Order', filter: true, sorter: true },
    {
      key: 'status',
      label: 'Status',
      filter: (values: any, onChange: any) => {
        const unique = [...new Set(values.map((val: any) => {
          if (typeof val === 'object' && val?.name) {
            return val.name
          }
          const id = Number(val?.id ?? val)
          return id === ACTIVE_STATUS_ID ? 'Active' : 'Disabled'
        }))]
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

  const activeColumns = columns.filter((col) => {
    if (col.key === 'actions') return true
    return visibleColumns.includes(col.key as string)
  })

  const renderStatus = (attribute: any) => {
    const id = typeof attribute.status === 'object' ? attribute.status?.id : attribute.status
    const isActive = Number(id ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID
    return (
      <CBadge color={isActive ? 'success' : 'secondary'} shape="rounded-pill">
        {isActive ? 'Active' : 'Disabled'}
      </CBadge>
    )
  }

  const renderBoolean = (value: any) => {
    const isTrue = Number(value) === 1
    return <CBadge color={isTrue ? 'primary' : 'secondary'}>{isTrue ? 'Yes' : 'No'}</CBadge>
  }

  const renderActions = (item: Attribute) => (
    <div className="action-buttons">
      <CButton
        color="primary"
        variant="ghost"
        size="sm"
        title="Edit"
        onClick={() => navigate(`/modules/attributes/edit/${item.attribute_id}`)}
      >
        <CIcon icon={cilPencil} />
      </CButton>
      <CButton
        color="danger"
        variant="ghost"
        size="sm"
        title="Delete"
        onClick={() => handleDelete(item.attribute_id)}
      >
        <CIcon icon={cilTrash} />
      </CButton>
    </div>
  )

  const scopedColumns = {
    module: (item: Attribute) => <td>{item.module?.name || '—'}</td>,
    type: (item: Attribute) => <td>{item.type?.name || '—'}</td>,
    integral: (item: Attribute) => <td>{renderBoolean(item.integral)}</td>,
    required: (item: Attribute) => <td>{renderBoolean(item.required)}</td>,
    status: (item: Attribute) => <td>{renderStatus(item)}</td>,
    actions: (item: Attribute) => <td>{renderActions(item)}</td>,
  }

  const handleDelete = (id?: number) => {
    if (!id) return
    const target = attributes.find((attr) => attr.attribute_id === id) || null
    setDeleteTarget(target)
    setDeleteModalVisible(true)
  }

  const handleCloseDelete = () => {
    if (deleteLoading) return
    setDeleteModalVisible(false)
    setDeleteTarget(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.attribute_id) {
      setDeleteModalVisible(false)
      return
    }
    setDeleteLoading(true)
    try {
      await dispatch(deleteAttribute(deleteTarget.attribute_id)).unwrap()
      setToast(
        <CToast autohide={true} delay={4000} color="success" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>Attribute "{deleteTarget.name}" deleted.</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>
      )
      setDeleteModalVisible(false)
      setDeleteTarget(null)
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete attribute')
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
                    id={`attributes-col-${col.key}`}
                    checked={visibleColumns.includes(col.key as string)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setVisibleColumns([...visibleColumns, col.key as string])
                      } else if (visibleColumns.length > 1) {
                        setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                      }
                    }}
                  />
                  <label className="form-check-label" htmlFor={`attributes-col-${col.key}`}>
                    {col.label}
                  </label>
                </div>
              ))}
          </div>
        </CDropdownMenu>
      </CDropdown>
      <CButton color="primary" className="text-white" onClick={() => navigate('/modules/attributes/create')}>
        <CIcon icon={cilPlus} className="me-2" />
        New Attribute
      </CButton>
    </div>
  )

  return (
    <CRow className="g-3">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <CCol xs={12}>
        <PageHero
          kicker="Attributes Management"
          icon={cilList}
          title="All Attributes"
          subtitle={
            searchTerm || moduleFilter !== 'all'
              ? `Showing ${filteredAttributes.length} of ${attributes.length}`
              : `All Attributes (${attributes.length})`
          }
          actions={heroActions}
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            {errorMessage && <CAlert color="danger">{errorMessage}</CAlert>}
            <CRow className="mb-3 align-items-center g-2">
              <CCol xs={12} md={4}>
                <CFormInput
                  type="text"
                  placeholder="Search by name, module, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CCol>
              <CCol xs={12} md={4}>
                <CFormSelect
                  value={moduleFilter === 'all' ? '' : moduleFilter}
                  onChange={(e) =>
                    setModuleFilter(e.target.value ? Number(e.target.value) : 'all')
                  }
                  options={[
                    { value: '', label: 'All Modules' },
                    ...modules.map((module) => ({ value: module.module_id, label: module.name })),
                  ]}
                />
              </CCol>
            </CRow>

            <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={filteredAttributes}
                itemsPerPage={itemsPerPage}
                pagination
                columnFilter
                sorterValue={{ column: 'attribute_id', state: 'desc' }}
                columnSorter
                loading={loading}
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'attributes-table align-middle',
                }}
              />
            </div>

            {!loading && !attributes.length && (
              <div className="text-center py-5 text-body-secondary">
                <h5>No attributes found</h5>
                <p>Use the "New Attribute" button to create your first attribute.</p>
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
          <CModalTitle>Delete Attribute</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Are you sure you want to delete{' '}
            <strong>{deleteTarget?.name || 'this attribute'}</strong>?
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

export default AttributesListPage
