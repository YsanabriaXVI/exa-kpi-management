import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CAlert,
  CBadge,
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
  cilPencil,
  cilDrop,
  cilFilterX,
  cilOptions,
} from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'

import {
  fetchSignaturesList,
  resetStatuses,
  selectSignatureErrors,
  selectSignatureStatuses,
  selectSignatureList,
  selectSignatureLoadingList,
} from '../store/fuelOrderSignature.slice'

import { permissionService, UPDATE } from '../../../../services/auth/permission.service'
import { MODULE_FUEL_ORDER_SIGNATURE } from '../../../../constants/modules'

import SignatureUploadModal from '../components/SignatureUploadModal'

const COLUMN_STORAGE_KEY = 'fuelOrderSignature_visible_columns'

const DEFAULT_COLUMNS = ['userid', 'username', 'email', 'signature']

const loadSavedColumns = () => {
  const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_COLUMNS
}

const FuelOrderSignatureListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()

  const list = useSelector(selectSignatureList)
  const errors = useSelector(selectSignatureErrors)
  const statuses = useSelector(selectSignatureStatuses)
  const loading = useSelector(selectSignatureLoadingList)

  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [searchValue, setSearchValue] = useState('')

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const canUpdate = permissionService.checkPermission(MODULE_FUEL_ORDER_SIGNATURE, UPDATE)

  useEffect(() => {
    dispatch(fetchSignaturesList())
  }, [dispatch])

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    if (!errors) return
    const toast = (window as any).exaToast
    const msg = typeof errors === 'string' ? errors : 'An error occurred loading signatures'
    toast?.error ? toast.error('Error', msg) : console.error(msg)
  }, [errors])

  useEffect(() => {
    const toast = (window as any).exaToast
    if (statuses.added) {
      toast?.success?.('Success', 'Signature was Added')
      dispatch(resetStatuses())
      dispatch(fetchSignaturesList())
    }
  }, [statuses, dispatch])

  const handleOpenModal = (userId: number) => {
    setSelectedUserId(userId)
    setModalVisible(true)
  }

  const handleCloseModal = () => {
    setModalVisible(false)
    setSelectedUserId(null)
  }

  const tableItems = useMemo(() => {
    return (list ?? []).filter((u) => !u.status || u.status.id === 1)
  }, [list])

  const handleTableFilterChange = (value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {}, 600)
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
    if (!q) return tableItems
    return tableItems.filter((x) => {
      const haystack = [x.userid, x.username, x.email]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
      return haystack.includes(q)
    })
  }, [tableItems, searchValue])

  const columns = [
    { key: 'userid', label: 'User ID', sorter: true, filter: true },
    { key: 'username', label: 'User Name', sorter: true, filter: true },
    { key: 'email', label: 'Email', sorter: true, filter: true },
    { key: 'signature', label: 'Signature', sorter: true, filter: false },
    { key: 'actions', label: 'Actions', sorter: false, filter: false },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )

  return (
    <CContainer fluid>
      <PageHero
        kicker="Fuel Settings"
        icon={cilDrop}
        title="User Signatures"
        actions={
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
                {columns
                  .filter((col) => col.key !== 'actions')
                  .map((col) => (
                    <div key={col.key} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`col-sig-${col.key}`}
                        checked={visibleColumns.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVisibleColumns([...visibleColumns, col.key])
                          } else if (visibleColumns.length > 1) {
                            setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                          }
                        }}
                      />
                      <label className="form-check-label" htmlFor={`col-sig-${col.key}`}>
                        {col.label}
                      </label>
                    </div>
                  ))}
              </div>
            </CDropdownMenu>
          </CDropdown>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          {errors && (
            <CAlert color="danger" className="mb-3">
              {typeof errors === 'string' ? errors : 'An error occurred loading signatures'}
            </CAlert>
          )}

          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto" className="mb-2 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
                <input
                  className="form-control w-auto"
                  type="text"
                  placeholder="Search..."
                  value={searchValue}
                  onChange={(e) => handleTableFilterChange(e.target.value)}
                  style={{ minWidth: '250px' }}
                />
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm d-flex align-items-center ms-3"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={handleClearFilters}
                  >
                    <CIcon icon={cilFilterX} className="me-1" />
                    Clear Filters ({totalActiveFilters})
                  </button>
                )}
              </div>
            </CCol>
          </CRow>

          <div className="table-responsive mt-3">
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
                signature: (item: any) => (
                  <td className="text-center">
                    <CBadge color={item.signature ? 'success' : 'danger'}>
                      {item.signature ? 'Yes' : 'No'}
                    </CBadge>
                  </td>
                ),
                actions: (item: any) => (
                  <td>
                    {canUpdate ? (
                      <CButton
                        color="primary"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(item.userid)}
                        title="View / Edit Signature"
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                    ) : (
                      <span className="text-muted small">View only</span>
                    )}
                  </td>
                ),
              }}
            />
          </div>
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

      <SignatureUploadModal
        visible={modalVisible}
        userId={selectedUserId}
        onClose={handleCloseModal}
      />
    </CContainer>
  )
}

export default FuelOrderSignatureListPage
