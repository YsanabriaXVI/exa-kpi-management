import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilFilterX,
  cilOptions,
} from '@coreui/icons'

import type { AppDispatch } from '../../../store'
import PageHero from '../../../components/PageHero'
import ConfirmDialog from '../../../components/ConfirmationModal'

import {
  fetchRepairStatuses,
  deleteRepairStatus,
  resetStatuses,
  selectRepairStatusErrors,
  selectRepairStatusList,
  selectRepairStatusStatuses,
} from '../store/repairStatus.slice'

import type { RepairStatus } from '../types/repairStatus.types'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../services/auth/permission.service'
import { MODULE_REPAIR_STATUS } from '../../../constants/modules'

const COLUMN_STORAGE_KEY = 'repairStatus_visible_columns'

const loadSavedColumns = (): string[] => {
  const saved = sessionStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      /* noop */
    }
  }
  return ['ISOCode', 'description']
}

const RepairStatusListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectRepairStatusList)
  const errors = useSelector(selectRepairStatusErrors)
  const statuses = useSelector(selectRepairStatusStatuses)

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [searchValue, setSearchValue] = useState('')

  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_REPAIR_STATUS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_REPAIR_STATUS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_REPAIR_STATUS, DELETE)


  useEffect(() => {
    dispatch(fetchRepairStatuses())
  }, [dispatch])

  useEffect(() => {
    sessionStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  // Error handling (toast)
  useEffect(() => {
    if (!errors) return

    let err: unknown = errors
    if (typeof errors === 'object' && (errors as any).message) {
      err = (errors as any).message
    } else if (Array.isArray(errors) && errors.length === 1) {
      err = (errors[0] as any).message ?? errors[0]
    }

    const message =
      typeof err === 'string'
        ? err
        : 'An error occurred loading Repair Statuses'

    const toast = (window as any).exaToast
    toast?.error
      ? toast.error('Error', message)
      : console.error(message)
  }, [errors])

  // Success statuses
  useEffect(() => {
    if (!statuses) return
    const toast = (window as any).exaToast

    if (statuses.added) toast?.success?.('Success', 'Repair Status was Added')
    if (statuses.updated) toast?.success?.('Success', 'Repair Status was Updated')
    if (statuses.deleted) toast?.success?.('Success', 'Repair Status was Deleted')

    if (statuses.added || statuses.updated || statuses.deleted) {
      dispatch(resetStatuses())
      dispatch(fetchRepairStatuses())
    }
  }, [statuses, dispatch])
  
  const handleOpenNew = () => canCreate && navigate('/depot/repair-status/new')

  const handleOpenEdit = (id: number) => canUpdate && navigate(`/depot/repair-status/${id}`)

  const handleAskDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await dispatch(deleteRepairStatus(pendingDeleteId))
  }

  //Filtering logic

  const tableItems = useMemo<RepairStatus[]>(() => list ?? [], [list])

  const handleTableFilterChange = (value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {}, 600)
  }

  const handleColumnFilterChange = useCallback((filters: Record<string, any>) => {
    setColumnFilterValues(filters)
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => {}, 600)
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
      const haystack = [x.ISOCode, x.description]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
      return haystack.includes(q)
    })
  }, [tableItems, searchValue])

  const columns = [
    { key: 'ISOCode', label: 'Status Code', sorter: true, filter: true },
    { key: 'description', label: 'Description', sorter: true, filter: true },
    { key: 'actions', label: 'Actions', sorter: false, filter: false },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )

  return (
    <CContainer fluid>
      <PageHero
        kicker="Repair Status"
        title="Repair Status"
        actions={
          <div className="d-flex gap-2">
            <CDropdown>
              <CDropdownToggle color="secondary" variant="outline">
                <CIcon icon={cilOptions} className="me-2" />
                Visible Columns ({visibleColumns.length})
              </CDropdownToggle>

              <CDropdownMenu className="column-selector-dropdown">
                <div className="px-3 py-2">
                  <small className="text-body-secondary fw-semibold">
                    SELECT COLUMNS
                  </small>
                </div>
                <div className="dropdown-divider" />

                <div className="column-selector-list">
                  {columns
                    .filter((c) => c.key !== 'actions')
                    .map((col) => (
                      <div key={col.key} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`col-${col.key}`}
                          checked={visibleColumns.includes(col.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVisibleColumns([...visibleColumns, col.key])
                            } else if (visibleColumns.length > 1) {
                              setVisibleColumns(
                                visibleColumns.filter((k) => k !== col.key),
                              )
                            }
                          }}
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`col-${col.key}`}
                        >
                          {col.label}
                        </label>
                      </div>
                    ))}
                </div>
              </CDropdownMenu>
            </CDropdown>

            {canCreate ? (
              <CButton
                color="primary"
                className="text-white"
                onClick={handleOpenNew}
              >
                <CIcon icon={cilPlus} className="me-2" />
                New Status
              </CButton>
            ) : null}
          </div>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          {errors && (
            <CAlert color="danger" className="mb-3">
              An error occurred loading Repair Statuses
            </CAlert>
          )}

          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0">Search:</label>
                <input
                  className="form-control"
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
              itemsPerPage={15}
              pagination
              itemsPerPageSelect={false}
              columnFilter
              columnSorter
              columnFilterValue={columnFilterValues}
              onColumnFilterChange={handleColumnFilterChange}
              tableProps={{
                hover: true,
                striped: true,
                responsive: true,
              }}
              scopedColumns={{
                actions: (item: RepairStatus) => (
                  <td>
                    {canUpdate && (
                      <CButton
                        color="primary"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(item.repairStatusId!)}
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
                        onClick={() => handleAskDelete(item.repairStatusId!)}
                        title="Delete"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    )}

                    {!canUpdate && !canDelete && <span className="text-body-secondary">View only</span>}
                  </td>
                ),
              }}

            />
          </div>
        </CCardBody>
      </CCard>

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Confirmation"
        message="Are you sure you want to delete this record?"
        onClose={() => {
          setConfirmVisible(false)
          setPendingDeleteId(null)
        }}
        onConfirm={confirmDelete}
      />
    </CContainer>
  )
}

export default RepairStatusListPage
