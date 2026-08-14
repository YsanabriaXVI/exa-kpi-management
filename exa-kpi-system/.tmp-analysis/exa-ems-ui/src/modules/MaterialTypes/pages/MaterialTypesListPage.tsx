// src/modules/MaterialTypes/pages/MaterialTypesListPage.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CSmartTable,
  CCardHeader,
  CCol,
  CContainer,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CRow,
} from '@coreui/react-pro'
import type { AppDispatch } from '../../../store'
import ConfirmDialog from '../../../components/ConfirmationModal'
import {
  deleteMaterialType,
  fetchMaterialTypes,
  resetStatuses,
  selectMaterialErrors,
  selectMaterialStatuses,
  selectMaterialTypes,
} from '../store/materialTypes.slice'
import type { MaterialType } from '../types/materialTypes.types'
import CIcon from '@coreui/icons-react'
import PageHero from '../../../components/PageHero'
import {
  cilInbox,
  cilPlus,
  cilPencil,
  cilTrash,
  cilFilterX,
  cilOptions,
} from '@coreui/icons'
import {
  permissionService,
  CREATE,
  UPDATE,
  DELETE,
} from '../../../services/auth/permission.service'
import { MODULE_MATERIAL_TYPES } from '../../../constants/modules'

const COLUMN_STORAGE_KEY = 'material_types_visible_columns'

const MaterialTypesListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  // 🔹 permissions
  const canCreate = permissionService.checkPermission(MODULE_MATERIAL_TYPES, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_MATERIAL_TYPES, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_MATERIAL_TYPES, DELETE)

  // 🔹 redux state
  const list = useSelector(selectMaterialTypes)
  const errors = useSelector(selectMaterialErrors)
  const statuses = useSelector(selectMaterialStatuses)

  // 🔹 UI state
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  // 🔹 Global search
  const [searchValue, setSearchValue] = useState('')
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // 🔹 Column filters
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>(
    {},
  )
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // 🔹 Visible columns
  const loadSavedColumns = () => {
    const saved = sessionStorage.getItem(COLUMN_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        /* ignore */
      }
    }
    return ['name', 'equipmentTypeName', 'description', 'code', 'isoCode']
  }

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns)

  useEffect(() => {
    sessionStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  // 🔹 initial load
  useEffect(() => {
    dispatch(fetchMaterialTypes())
  }, [dispatch])

  // 🔹 errors
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
        : 'An error occurred loading Material Types'

    const toast = (window as any).exaToast
    toast?.error ? toast.error('Error', message) : console.error(message)
  }, [errors])

  // 🔹 statuses
  useEffect(() => {
    if (!statuses) return

    const toast = (window as any).exaToast
    const success = (msg: string) =>
      toast?.success ? toast.success('Success', msg) : console.log(msg)

    if (statuses.deleted) {
      success('Material Type was Deleted')
      setConfirmVisible(false)
      setPendingDeleteId(null)
    } else if (statuses.updated) {
      success('Material Type was Updated')
    } else if (statuses.added) {
      success('Material Type was Added')
    }

    if (statuses.added || statuses.updated || statuses.deleted) {
      dispatch(resetStatuses())
      dispatch(fetchMaterialTypes())
    }
  }, [statuses, dispatch])

  // 🔹 handlers
  const handleOpenNew = () => canCreate && navigate('/depot/material-types/new')
  const handleOpenEdit = (id: number) =>
    canUpdate && navigate(`/depot/material-types/${id}`)

  const handleDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await dispatch(deleteMaterialType(pendingDeleteId))
  }

  // 🔹 table data
  const tableItems = useMemo(() => {
    return (list as (MaterialType & any)[]).map((item) => ({
      ...item,
      equipmentTypeName: item.equipmentTyped?.equipmentName ?? '',
    }))
  }, [list])

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return tableItems

    return tableItems.filter((x: any) =>
      [x.name, x.equipmentTypeName, x.description, x.code, x.isoCode]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
        .includes(q),
    )
  }, [tableItems, searchValue])

  // 🔹 columns
  const columns = [
    { key: 'name', label: 'Material Name' },
    { key: 'equipmentTypeName', label: 'Equipment Type' },
    { key: 'description', label: 'Description' },
    { key: 'code', label: 'Internal Code' },
    { key: 'isoCode', label: 'ISO Code' },
    { key: 'actions', label: 'Actions', filter: false, sorter: false },
  ]

  const activeColumns = useMemo(
    () =>
      columns.filter(
        (col) => col.key === 'actions' || visibleColumns.includes(col.key),
      ),
    [columns, visibleColumns],
  )

  // 🔹 filters
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
  const totalActiveFilters =
    activeColumnFiltersCount + (hasSearchFilter ? 1 : 0)

  const handleClearFilters = () => {
    setSearchValue('')
    setColumnFilterValues({})
  }

  const renderActions = (item: any) => (
    <div className="action-buttons">
      {canUpdate && (
        <CButton
          color="primary"
          variant="ghost"
          size="sm"
          onClick={() => handleOpenEdit(item.materialId)}
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
          onClick={() => handleDelete(item.materialId)}
          title="Delete"
        >
          <CIcon icon={cilTrash} />
        </CButton>
      )}
      {!canUpdate && !canDelete && (
        <span className="text-muted small">View only</span>
      )}
    </div>
  )

    const heroActions = (
    <div className="d-flex gap-2">
      {/* Visible Columns */}
      <CDropdown>
        <CDropdownToggle color="secondary" variant="outline">
          <CIcon icon={cilOptions} className="me-2" />
          Visible Columns ({visibleColumns.length})
        </CDropdownToggle>

        <CDropdownMenu className="column-selector-dropdown p-3">
          {columns
            .filter((col) => col.key !== 'actions')
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
        </CDropdownMenu>
      </CDropdown>

      {/* New Material */}
      {canCreate && (
        <CButton
          color="primary"
          className="text-white"
          onClick={handleOpenNew}
        >
          <CIcon icon={cilPlus} className="me-2" />
          New Material
        </CButton>
      )}
    </div>
  )


  return (
    <CContainer fluid>
      <PageHero
        kicker="Material Types"
        icon={cilInbox}
        title="Material Types"
        actions={heroActions}
      />

      <CCard>

        <CCardBody>
          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
                <input
                  className="form-control"
                  placeholder="Search..."
                  value={searchValue}
                  onChange={(e) => handleTableFilterChange(e.target.value)}
                />
              </div>
            </CCol>

            {totalActiveFilters > 0 && (
              <CCol xs={12} md="auto">
                <CButton
                  color="danger"
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  <CIcon icon={cilFilterX} className="me-1" />
                  Clear Filters ({totalActiveFilters})
                </CButton>
              </CCol>
            )}
          </CRow>

          <div className="table-responsive mt-3">
            <CSmartTable
              items={filteredItems}
              columns={activeColumns}
              itemsPerPage={20}
              pagination
              itemsPerPageSelect={false}
              loading={false}
              columnFilter
              columnSorter
              columnFilterValue={columnFilterValues}
              tableFilter={false}
              onColumnFilterChange={handleColumnFilterChange}
              tableProps={{
                hover: true,
                striped: true,
                responsive: true,
                className: 'trips-table align-middle',
              }}
              scopedColumns={{
                actions: (item: any) => <td>{renderActions(item)}</td>,
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

export default MaterialTypesListPage
