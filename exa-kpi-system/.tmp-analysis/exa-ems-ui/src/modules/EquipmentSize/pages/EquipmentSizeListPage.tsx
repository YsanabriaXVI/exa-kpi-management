// src/modules/EquipmentSize/pages/EquipmentSizeListPage.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { permissionService, UPDATE, CREATE, DELETE, READ } from '../../../services/auth/permission.service'

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
  cilTruck,
  cilFilterX,
  cilOptions,
  cilSearch
} from '@coreui/icons'

import type { AppDispatch } from '../../../store'
import PageHero from '../../../components/PageHero'
import ConfirmDialog from '../../../components/ConfirmationModal'
import { MODULE_EQUIPMENT_SIZE } from 'src/constants/modules'
import '../styles/equipmentSizeTable.scss'

import {
  fetchEquipmentSizes,
  deleteEquipmentSize,
  resetStatuses,
  selectEquipmentSizesList,
  selectEquipmentSizeErrors,
  selectEquipmentSizeStatuses,
} from '../store/equipmentSize.slice'

/* ---------- visible columns ---------- */

const COLUMN_STORAGE_KEY = 'equipmentSize_visible_columns'
// Permission checks
  const canCreate = permissionService.checkPermission(MODULE_EQUIPMENT_SIZE, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_EQUIPMENT_SIZE, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_EQUIPMENT_SIZE, DELETE)
  const canRead = permissionService.checkPermission(MODULE_EQUIPMENT_SIZE, READ)

const loadSavedColumns = (): string[] => {
  const saved = sessionStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  }
  return [
    'equipmentTypeName',
    'sizeType',
    'description',
    'isoCode1',
  ]
}

/* ---------- component ---------- */

const EquipmentSizeListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectEquipmentSizesList)
  const errors = useSelector(selectEquipmentSizeErrors)
  const statuses = useSelector(selectEquipmentSizeStatuses)

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [searchValue, setSearchValue] = useState('')

  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  /* ---------- effects ---------- */

  useEffect(() => {
    dispatch(fetchEquipmentSizes())
  }, [dispatch])

  useEffect(() => {
    sessionStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    if (!errors) return
    const toast = (window as any).exaToast
    const msg = typeof errors === 'string'
      ? errors
      : 'An error occurred loading Equipment Sizes'

    toast?.error ? toast.error('Error', msg) : console.error(msg)
  }, [errors])

  useEffect(() => {
    const toast = (window as any).exaToast

    if (statuses.added) toast?.success?.('Success', 'Equipment Size was Added')
    if (statuses.updated) toast?.success?.('Success', 'Equipment Size was Updated')
    if (statuses.deleted) toast?.success?.('Success', 'Equipment Size was Deleted')

    if (statuses.added || statuses.updated || statuses.deleted) {
      dispatch(resetStatuses())
      dispatch(fetchEquipmentSizes())
    }
  }, [statuses, dispatch])

  /* ---------- handlers ---------- */

  const handleOpenNew = () => navigate('/depot/equipment-size/new')
  const handleOpenEdit = (id: number) =>
    navigate(`/depot/equipment-size/${id}`)

  const handleAskDelete = (id: number) => {
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await dispatch(deleteEquipmentSize(pendingDeleteId))
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

  const handleClearFilters = () => {
    setSearchValue('')
    setColumnFilterValues({})
  }

  /* ---------- data ---------- */

  const tableItems = useMemo(() => {
    return (list ?? []).map((x: any) => ({
      ...x,
      equipmentTypeName: x?.equipmentTypedId?.equipmentName ?? '',
    }))
  }, [list])

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return tableItems

    return tableItems.filter((x: any) => {
      const haystack = [
        x.equipmentTypeName,
        x.sizeType,
        x.description,
        x.isoCode1,
        x.isoCode2,
        x.isoCode3,
        x.isoCode4,
        x.isoCode5,
        x.isoCode6,
        x.isoCode7,
        x.isoCode8,
        x.isoCode9,
        x.isoCode10,
      ]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')

      return haystack.includes(q)
    })
  }, [tableItems, searchValue])

  const columns = [
    { key: 'sizeEquipmentId', label: 'Size ID', sorter: true, filter: true },
    { key: 'equipmentTypeName', label: 'Equipment Type', sorter: true, filter: true },
    { key: 'sizeType', label: 'Size', sorter: true, filter: true },
    { key: 'description', label: 'Description', sorter: true, filter: true },

    { key: 'isoCode1', label: 'ISO Code 1', sorter: true, filter: true },
    { key: 'isoCode2', label: 'ISO Code 2', sorter: true, filter: true },
    { key: 'isoCode3', label: 'ISO Code 3', sorter: true, filter: true },
    { key: 'isoCode4', label: 'ISO Code 4', sorter: true, filter: true },
    { key: 'isoCode5', label: 'ISO Code 5', sorter: true, filter: true },
    { key: 'isoCode6', label: 'ISO Code 6', sorter: true, filter: true },
    { key: 'isoCode7', label: 'ISO Code 7', sorter: true, filter: true },
    { key: 'isoCode8', label: 'ISO Code 8', sorter: true, filter: true },
    { key: 'isoCode9', label: 'ISO Code 9', sorter: true, filter: true },
    { key: 'isoCode10', label: 'ISO Code 10', sorter: true, filter: true },

    { key: 'actions', label: 'Actions', sorter: false, filter: false },
    ]


  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )

  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter((key) => {
    const val = columnFilterValues[key]
    return Array.isArray(val)
      ? val.length > 0
      : String(val ?? '').trim().length > 0
  }).length

  const hasSearchFilter = searchValue.trim().length > 0
  const hasActiveFilters = activeColumnFiltersCount > 0 || hasSearchFilter
  const totalActiveFilters =
    activeColumnFiltersCount + (hasSearchFilter ? 1 : 0)

  /* ---------- render ---------- */

  return (
    <CContainer fluid>
      <PageHero
        kicker="Equipment Size"
        icon={cilTruck}
        title="Equipment Size"
        actions={
          <div className="d-flex gap-2">
            <CDropdown>
              <CDropdownToggle color="secondary" variant="outline">
                <CIcon icon={cilOptions} className="me-2" />
                Visible Columns ({visibleColumns.length})
              </CDropdownToggle>

              <CDropdownMenu className="column-selector-dropdown">
                <div className="px-3 py-2">
                  <small className="fw-semibold text-body-secondary">
                    SELECT COLUMNS
                  </small>
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
                        <label className="form-check-label">
                          {col.label}
                        </label>
                      </div>
                    ))}
                </div>
              </CDropdownMenu>
            </CDropdown>

            {canCreate && <CButton color="primary" className="text-white" onClick={handleOpenNew}>
              <CIcon icon={cilPlus} className="me-2" />
              New Size
            </CButton>}
            
          </div>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          {errors && (
            <CAlert color="danger" className="mb-3">
              {typeof errors === 'string'
                ? errors
                : 'An error occurred loading Equipment Sizes'}
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
              columnSorter
              columnFilter
              columnFilterValue={columnFilterValues}
              onColumnFilterChange={handleColumnFilterChange}
              tableFilter={false}
              tableProps={{
                hover: true,
                striped: true,
                responsive: true,
                className: 'smart-table-nowrap',
                style: {
                    tableLayout: 'fixed',
                    width: '100%',
                },
              }}
              scopedColumns={{
                actions: (item: any) => (
                  <td>
                    {canUpdate && <CButton
                      color="primary"
                      variant="ghost"
                      size="sm"
                      title="Edit"
                      onClick={() => handleOpenEdit(item.sizeEquipmentId)}
                    >
                      <CIcon icon={cilPencil} />
                    </CButton>}

                    {canRead && 
                    <CButton
                        size="sm"
                        color="info"
                        variant="ghost"
                        onClick={() => navigate(`/depot/equipment-size/${item.sizeEquipmentId}`, { state: { viewMode: true } })}
                        title="View"
                      >
                      <CIcon icon={cilSearch} />
                    </CButton>}

                    {canDelete && <CButton
                      color="danger"
                      variant="ghost"
                      size="sm"
                      title="Delete"
                      onClick={() => handleAskDelete(item.sizeEquipmentId)}
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>}
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

export default EquipmentSizeListPage
