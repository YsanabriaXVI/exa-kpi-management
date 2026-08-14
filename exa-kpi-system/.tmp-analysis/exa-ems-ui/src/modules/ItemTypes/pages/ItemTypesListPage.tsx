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
  cilList,
  cilFilterX,
  cilOptions,
} from '@coreui/icons'

import type { AppDispatch } from '../../../store'
import PageHero from '../../../components/PageHero'
import ConfirmDialog from '../../../components/ConfirmationModal'

import {
  fetchItemTypes,
  deleteItemType,
  resetStatuses,
  selectItemTypesList,
  selectItemTypesErrors,
  selectItemTypesStatuses,
} from '../store/itemTypes.slice'

import type { ItemType } from '../types/itemTypes.types'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../services/auth/permission.service'
import { MODULE_ITEM_TYPES } from '../../../constants/modules'

const COLUMN_STORAGE_KEY = 'itemTypes_visible_columns'

const loadSavedColumns = () => {
  const saved = sessionStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return ['ISOCode', 'description']
    }
  }
  return ['ISOCode', 'description']
}

const ItemTypesListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectItemTypesList)
  const errors = useSelector(selectItemTypesErrors)
  const statuses = useSelector(selectItemTypesStatuses)

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [searchValue, setSearchValue] = useState('')

  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // permissions
  const canCreate = permissionService.checkPermission(MODULE_ITEM_TYPES, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_ITEM_TYPES, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_ITEM_TYPES, DELETE)

  // initial load
  useEffect(() => {
    dispatch(fetchItemTypes())
  }, [dispatch])

  // persist visible columns
  useEffect(() => {
    sessionStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  // errors
  useEffect(() => {
    if (!errors) return
    const toast = (window as any).exaToast
    const msg = typeof errors === 'string' ? errors : 'An error occurred loading Item Types'
    toast?.error ? toast.error('Error', msg) : console.error(msg)
  }, [errors])

  // statuses
  useEffect(() => {
    const toast = (window as any).exaToast

    if (statuses.added) toast?.success?.('Success', 'Item Type was Added')
    if (statuses.updated) toast?.success?.('Success', 'Item Type was Updated')
    if (statuses.deleted) toast?.success?.('Success', 'Item Type was Deleted')

    if (statuses.added || statuses.updated || statuses.deleted) {
      dispatch(resetStatuses())
      dispatch(fetchItemTypes())
    }
  }, [statuses, dispatch])

  const handleOpenNew = () => canCreate && navigate('/depot/item-types/new')

  const handleOpenEdit = (id: number) => canUpdate && navigate(`/depot/item-types/${id}`)

  const handleAskDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await dispatch(deleteItemType(pendingDeleteId))
  }

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
    if (!q) return list

    return list.filter((x: any) => {
      const haystack = [x.ISOCode, x.description]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
      return haystack.includes(q)
    })
  }, [list, searchValue])

  const columns = [
    { key: 'ISOCode', label: 'ISO Code', sorter: true, filter: true },
    { key: 'description', label: 'Description', sorter: true, filter: true },
    { key: 'actions', label: 'Actions', sorter: false, filter: false },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )

  return (
    <CContainer fluid>
      <PageHero
        kicker="Item Types"
        icon={cilList}
        title="Item Types"
        actions={
          <div className="d-flex gap-2">
            <CDropdown>
              <CDropdownToggle color="secondary" variant="outline">
                <CIcon icon={cilOptions} className="me-2" />
                Visible Columns ({visibleColumns.length})
              </CDropdownToggle>

              <CDropdownMenu className="column-selector-dropdown">
                <div className="px-3 py-2">
                  <small className="fw-semibold">SELECT COLUMNS</small>
                </div>
                <div className="dropdown-divider" />
                <div className="column-selector-list px-3">
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
                        <label className="form-check-label" htmlFor={`col-${col.key}`}>
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
              {typeof errors === 'string'
                ? errors
                : 'An error occurred loading Item Types'}
            </CAlert>
          )}

          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
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
              tableFilter={false}
              onColumnFilterChange={handleColumnFilterChange}
              tableProps={{
                hover: true,
                striped: true,
                responsive: true,
                className: 'align-middle',
              }}
              scopedColumns={{
                actions: (item: ItemType) => (
                  <td>
                    {canUpdate && (
                      <CButton
                        color="primary"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(item.itemTypeId!)}
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
                        onClick={() => handleAskDelete(item.itemTypeId!)}
                        title="Delete"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    )}

                    {!canUpdate && !canDelete && (
                      <span className="text-muted small">View only</span>
                    )}
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

export default ItemTypesListPage
