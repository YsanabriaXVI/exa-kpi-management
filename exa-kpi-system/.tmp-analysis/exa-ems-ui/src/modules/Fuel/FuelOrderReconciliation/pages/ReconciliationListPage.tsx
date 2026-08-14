import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilCloudUpload,
  cilMagnifyingGlass,
  cilTrash,
  cilFilterX,
  cilOptions,
  cilDrop,
} from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ConfirmDialog from '../../../../components/ConfirmationModal'

import {
  fetchReconciliationList,
  deleteUploadSession,
  resetStatuses,
  selectReconciliationList,
  selectReconciliationErrors,
  selectReconciliationStatuses,
  selectReconciliationLoadingList,
} from '../store/fuelOrderReconciliation.slice'

import { permissionService, CREATE, DELETE } from '../../../../services/auth/permission.service'
import { MODULE_FUEL_ORDER_RECONCILIATION } from '../../../../constants/modules'

const COLUMN_STORAGE_KEY = 'reconciliation_list_cols'
const DEFAULT_COLUMNS = [
  'uploadSessionId',
  'gasStationName',
  'fileName',
  'totalTransactions',
  'matchedTransactions',
  'unmatchedTransactions',
  'uploadDate',
  'status',
]

const loadSavedColumns = () => {
  const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return DEFAULT_COLUMNS
}

const ReconciliationListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectReconciliationList)
  const errors = useSelector(selectReconciliationErrors)
  const statuses = useSelector(selectReconciliationStatuses)
  const loading = useSelector(selectReconciliationLoadingList)

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [searchValue, setSearchValue] = useState('')
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const canCreate = permissionService.checkPermission(MODULE_FUEL_ORDER_RECONCILIATION, CREATE)
  const canDelete = permissionService.checkPermission(MODULE_FUEL_ORDER_RECONCILIATION, DELETE)

  useEffect(() => {
    dispatch(fetchReconciliationList())
  }, [dispatch])

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    const toast = (window as any).exaToast
    if (statuses.deleted) toast?.success?.('Success', 'Upload session deleted')
    if (statuses.processed) toast?.success?.('Success', 'Reconciliation processed')
    if (statuses.deleted || statuses.processed) {
      dispatch(resetStatuses())
      dispatch(fetchReconciliationList())
    }
  }, [statuses, dispatch])

  const handleUpload = () => navigate('/fuel/fuelorderreconciliation/upload')
  const handleView = (id: number) =>
    navigate(`/fuel/fuelorderreconciliation/review/${id}`)

  const handleAskDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (pendingDeleteId) {
      await dispatch(deleteUploadSession(pendingDeleteId))
    }
  }

  const handleColumnFilterChange = useCallback((filters: Record<string, any>) => {
    setColumnFilterValues(filters)
  }, [])

  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter((key) => {
    const val = columnFilterValues[key]
    return Array.isArray(val) ? val.length > 0 : String(val ?? '').trim().length > 0
  }).length
  const hasSearchFilter = searchValue.trim().length > 0
  const hasActiveFilters = activeColumnFiltersCount > 0 || hasSearchFilter
  const totalActiveFilters = activeColumnFiltersCount + (hasSearchFilter ? 1 : 0)

  const handleClearFilters = () => {
    setSearchValue('')
    setColumnFilterValues({})
  }

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return list
    return list.filter((x: any) => {
      const haystack = [x.gasStationName, x.fileName, x.uploadDate, x.status]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
      return haystack.includes(q)
    })
  }, [list, searchValue])

  const columns = [
    { key: 'uploadSessionId', label: 'Session #', sorter: true, filter: true, _style: { width: '130px' } },
    { key: 'gasStationName', label: 'Gas Station', sorter: true, filter: true },
    { key: 'fileName', label: 'File Name', sorter: true, filter: true },
    { key: 'totalTransactions', label: 'Total', sorter: true, filter: false },
    { key: 'matchedTransactions', label: 'Matched', sorter: true, filter: false },
    { key: 'unmatchedTransactions', label: 'Unmatched', sorter: true, filter: false },
    { key: 'uploadDate', label: 'Upload Date', sorter: true, filter: true },
    { key: 'status', label: 'Status', sorter: true, filter: true },
    { key: 'actions', label: 'Actions', sorter: false, filter: false, _style: { width: '100px' } },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )

  return (
    <CContainer fluid>
      <PageHero
        kicker="Fuel"
        icon={cilDrop}
        title="Fuel Order Reconciliation"
        actions={
          <div className="d-flex gap-2">
            <CDropdown>
              <CDropdownToggle color="secondary" variant="outline">
                <CIcon icon={cilOptions} className="me-2" />
                Visible Columns ({visibleColumns.length})
              </CDropdownToggle>
              <CDropdownMenu className="column-selector-dropdown">
                <div className="px-3 py-2">
                  <small className="text-body-secondary fw-semibold">SELECT COLUMNS</small>
                </div>
                <div className="dropdown-divider" />
                <div className="column-selector-list">
                  {columns.filter((col) => col.key !== 'actions').map((col) => (
                    <div key={col.key} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`col-${col.key}`}
                        checked={visibleColumns.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) setVisibleColumns([...visibleColumns, col.key])
                          else if (visibleColumns.length > 1)
                            setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
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
              <CButton color="primary" className="text-white" onClick={handleUpload}>
                <CIcon icon={cilCloudUpload} className="me-2" /> Upload Reconciliation
              </CButton>
            )}
          </div>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          {errors && (
            <CAlert color="danger" className="mb-3">
              {typeof errors === 'string' ? errors : 'An error occurred'}
            </CAlert>
          )}
          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
                <input
                  className="form-control w-auto"
                  type="text"
                  placeholder="Search..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  style={{ minWidth: '250px' }}
                />
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm d-flex align-items-center ms-3"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={handleClearFilters}
                  >
                    <CIcon icon={cilFilterX} className="me-1" /> Clear Filters ({totalActiveFilters})
                  </button>
                )}
              </div>
            </CCol>
          </CRow>

          <CSmartTable
            items={filteredItems}
            columns={activeColumns}
            itemsPerPage={itemsPerPage}
            pagination
            loading={loading}
            columnFilter
            columnSorter
            columnFilterValue={columnFilterValues}
            tableFilter={false}
            onColumnFilterChange={handleColumnFilterChange}
            tableProps={{
              hover: true,
              striped: true,
              responsive: true,
              className: 'align-middle',
            }}
            scopedColumns={{
              actions: (item: any) => (
                <td>
                  <div className="d-flex gap-1">
                    <CButton
                      color="info"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(item.uploadSessionId)}
                      title="View"
                    >
                      <CIcon icon={cilMagnifyingGlass} />
                    </CButton>
                    {canDelete && (
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAskDelete(item.uploadSessionId)}
                        title="Delete"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    )}
                  </div>
                </td>
              ),
            }}
          />
        </CCardBody>

        {/* Custom items-per-page selector */}
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

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Confirmation"
        message="Are you sure you want to delete this upload session?"
        onClose={() => {
          setConfirmVisible(false)
          setPendingDeleteId(null)
        }}
        onConfirm={confirmDelete}
      />
    </CContainer>
  )
}

export default ReconciliationListPage
