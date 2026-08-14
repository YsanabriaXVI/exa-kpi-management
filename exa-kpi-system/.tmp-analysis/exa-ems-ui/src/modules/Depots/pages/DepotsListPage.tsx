// src/modules/Depots/pages/DepotsListPage.tsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CSmartTable,
  CCol,
  CRow,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilLocationPin, cilFilterX, cilOptions } from '@coreui/icons'

import PageHero from '../../../components/PageHero'
import ConfirmDialog from '../../../components/ConfirmationModal'
import type { AppDispatch } from '../../../store'
import {
  fetchDepots,
  deleteDepot,
  resetStatuses,
  selectDepotsList,
  selectDepotsErrors,
  selectDepotsStatuses,
  saveDepot,
} from '../store/depots.slice'

import { permissionService, CREATE, UPDATE, DELETE } from '../../../services/auth/permission.service'
import { MODULE_DEPOTS } from '../../../constants/modules'

import { loadLocations } from '../../Locations/store/locationsSlice'
import type { RootState } from '../../../store'

const DepotsListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectDepotsList)
  const errors = useSelector(selectDepotsErrors)
  const statuses = useSelector(selectDepotsStatuses)
  const { locations } = useSelector((state: RootState) => state.locations)

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const [searchValue, setSearchValue] = useState('')
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const canCreate = permissionService.checkPermission(MODULE_DEPOTS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_DEPOTS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_DEPOTS, DELETE)

  const handleOpenNew = () => {
    if (!canCreate) return
    navigate('/depot/depots/new')
  }

  const handleOpenEdit = (id: number) => {
    if (!canUpdate) return
    navigate(`/depot/depots/${id}`)
  }

  const handleTableFilterChange = (value: string) => {
    setSearchValue(value)

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
    }, 600)
  }

  const handleColumnFilterChange = useCallback((filters: Record<string, any>) => {
    setColumnFilterValues(filters)

      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
      filterDebounceRef.current = setTimeout(() => {
        // client-side only
      }, 600)
  }, [])

  const COLUMN_STORAGE_KEY = 'depots_visible_columns'

  const loadSavedColumns = () => {
    const saved = sessionStorage.getItem(COLUMN_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return ['depotName', 'depotCode', 'location', 'activeLabel']
      }
    }
    return ['depotName', 'depotCode', 'location', 'activeLabel']
  }

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())

  useEffect(() => {
    sessionStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
    dispatch(fetchDepots())
    dispatch(loadLocations())
  }, [visibleColumns, dispatch])

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

  // Cargar lista al montar
  useEffect(() => {
    dispatch(fetchDepots())
  }, [dispatch])

  // Manejo de errores
  useEffect(() => {
    if (!errors) return

    let err: unknown = errors
    if (typeof errors === 'object' && (errors as any).message) {
      err = (errors as any).message
    } else if (Array.isArray(errors) && errors.length === 1) {
      err = (errors[0] as any).message ?? errors[0]
    }

    const message = typeof err === 'string' ? err : 'An error occurred loading Depots'

    const toast = (window as any).exaToast
    if (toast?.error) {
      toast.error('Error', message)
    } else {
      console.error('Depots error:', message)
    }
  }, [errors])

  // Manejo de statuses
  useEffect(() => {
    if (!statuses) return

    const toast = (window as any).exaToast
    const showSuccess = (msg: string) => {
      if (toast?.success) {
        toast.success('Success', msg)
      } else {
        console.log('[SUCCESS]', msg)
      }
    }

    if (statuses.deleted) {
      showSuccess('Depot was Deleted')
    } else if (statuses.updated) {
      showSuccess('Depot was Updated')
    } else if (statuses.added) {
      showSuccess('Depot was Added')
    }

    if (statuses.added || statuses.updated || statuses.deleted) {
      dispatch(resetStatuses())
      dispatch(fetchDepots())
    }
  }, [statuses, dispatch])

  const handleDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return

    const depot = list?.find((d: any) => d.depotId === pendingDeleteId)
    if (!depot) return

    const payload = {
      depotId: depot.depotId,
      depotName: depot.depotName,
      depotCode: depot.depotCode,
      locationId: depot.locationId,
      active: 0,
      status: depot.status ?? 1,
    }

    const result = await dispatch(saveDepot(payload as any))
    if (result?.meta?.requestStatus === 'fulfilled') {
      setConfirmVisible(false)
      setPendingDeleteId(null)
      dispatch(fetchDepots())
    } else {
      const toast = (window as any).exaToast
      toast?.error?.('Error', 'Failed to deactivate depot')
    }
  }

  const locationMap = useMemo(() => {
    const map = new Map<number, string>()
    ;(locations ?? []).forEach((l: any) => {
      map.set(l.locationId ?? l.id, l.name)
    })
    return map
  }, [locations])


  const tableItems = useMemo(() => {
    return (list ?? [])
      .filter((item: any) => Number(item.active) === 1) // 👈 SOLO ACTIVOS
      .map((item: any) => {
        const locationName = locationMap.get(item.locationId) ?? ''

        return {
          ...item,
          location: locationName,
          activeLabel: 'Active',
          actions: null,
        }
      })
  }, [list, locationMap])

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return tableItems

    return tableItems.filter((x: any) => {
      const haystack = [
        x.depotName,
        x.depotCode,
        x.location,
        x.activeLabel,
      ]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')

      return haystack.includes(q)
    })
  }, [tableItems, searchValue])

    const columns = [
    { key: 'depotName', label: 'Depot Name', sorter: true, filter: true },
    { key: 'depotCode', label: 'Depot Code', sorter: true, filter: true },
    { key: 'location', label: 'Location', sorter: true, filter: true },
    { key: 'activeLabel', label: 'Active', sorter: true, filter: true },
    { key: 'actions', label: 'Actions', sorter: false, filter: false },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )


  const renderActions = (item: any) => {
    return (
      <div className="action-buttons">
        {canUpdate && (
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(item.depotId)}
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
            onClick={() => handleDelete(item.depotId)}
            title="Delete"
          >
            <CIcon icon={cilTrash} />
          </CButton>
        )}

        {!canUpdate && !canDelete && (
          <span className="text-muted">No actions available</span>
        )}
      </div>
    )
  }

  return (
    <CContainer fluid>
      <PageHero
        kicker="Depots"
        icon={cilLocationPin}
        title="Depots"
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

                  <div className="column-selector-list px-3">
                    {columns
                      .filter((col) => col.key !== 'actions')
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
                                setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
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
              <CButton color="primary" className="text-white" onClick={handleOpenNew}>
                <CIcon icon={cilPlus} className="me-2" />
                New Depot
              </CButton>
            ) : null}
          </div>
        }
      />

      <CCard>
        <CCardBody>
          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto" className="mb-2 mb-md-0">
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

            <CCol xs={12} md="auto" className="ms-md-auto">
              
            </CCol>
          </CRow>

          <CSmartTable
            items={filteredItems}
            columns={activeColumns}
            itemsPerPage={15}
            pagination
            columnSorter
            columnFilter
            tableFilter={false}
            columnFilterValue={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            tableProps={{
              hover: true,
              responsive: true,
            }}
            scopedColumns={{
              activeLabel: (item: any) => (
                <td>
                  <CBadge color={item.activeLabel === 'Active' ? 'success' : 'secondary'}>
                    {item.activeLabel}
                  </CBadge>
                </td>
              ),
              actions: (item: any) => <td>{renderActions(item)}</td>,
            }}
          />

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

export default DepotsListPage
