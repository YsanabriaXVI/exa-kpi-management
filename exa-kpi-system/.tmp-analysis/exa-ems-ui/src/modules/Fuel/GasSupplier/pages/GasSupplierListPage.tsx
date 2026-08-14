import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
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
  cilPlus,
  cilPencil,
  cilTrash,
  cilHome,
  cilFilterX,
  cilOptions,
  cilCloudDownload,
  cilMagnifyingGlass,
} from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ConfirmDialog from '../../../../components/ConfirmationModal'
import exportToXlsx from '../../../../utils/exportToXlsx'

import {
  deleteSupplier,
  fetchSuppliers,
  resetStatuses,
  selectGasSupplierErrors,
  selectGasSupplierStatuses,
  selectSupplierList,
  selectSupplierLoadingList,
} from '../store/gasSupplier.slice'

import { permissionService, CREATE, UPDATE, DELETE } from '../../../../services/auth/permission.service'
import { MODULE_GASSUPPLIER } from '../../../../constants/modules'

const COLUMN_STORAGE_KEY = 'gasSupplier_visible_columns'
const DEFAULT_COLUMNS = [
  'gasStationsParentId', 'name', 'company_format', 'country_format', 'department_format',
  'city_format', 'address', 'phone', 'email', 'creditDays', 'updatedAtFormat', 'createdAtFormat', 'active',
]

const loadSavedColumns = () => {
  const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return DEFAULT_COLUMNS
}

const GasSupplierListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectSupplierList)
  const errors = useSelector(selectGasSupplierErrors)
  const statuses = useSelector(selectGasSupplierStatuses)
  const loading = useSelector(selectSupplierLoadingList)

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [searchValue, setSearchValue] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const canCreate = permissionService.checkPermission(MODULE_GASSUPPLIER, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_GASSUPPLIER, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_GASSUPPLIER, DELETE)

  useEffect(() => { dispatch(fetchSuppliers()) }, [dispatch])

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    if (!errors) return
    const toast = (window as any).exaToast
    const msg = typeof errors === 'string' ? errors : 'An error occurred loading Gas Suppliers'
    toast?.error ? toast.error('Error', msg) : console.error(msg)
  }, [errors])

  useEffect(() => {
    const toast = (window as any).exaToast
    if (statuses.added) toast?.success?.('Success', 'Gas Supplier was Added')
    if (statuses.updated) toast?.success?.('Success', 'Gas Supplier was Updated')
    if (statuses.deleted) toast?.success?.('Success', 'Gas Supplier was Deleted')
    if (statuses.added || statuses.updated || statuses.deleted) {
      dispatch(resetStatuses())
      dispatch(fetchSuppliers())
    }
  }, [statuses, dispatch])

  const handleOpenNew = () => canCreate && navigate('/fuel/gas-supplier/new')
  const handleView = (id: number) => navigate(`/fuel/gas-supplier/${id}`, { state: { viewMode: true } })
  const handleOpenEdit = (id: number) => canUpdate && navigate(`/fuel/gas-supplier/${id}`)

  const handleAskDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await dispatch(deleteSupplier(pendingDeleteId))
  }

  const tableItems = useMemo(() => list ?? [], [list])

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

  const handleClearFilters = () => { setSearchValue(''); setColumnFilterValues({}) }

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return tableItems
    return tableItems.filter((x: any) => {
      const haystack = [
        x.gasStationsParentId, x.name, x.phone, x.email, x.address,
        x.company_format, x.country_format, x.department_format, x.city_format,
      ].map((v) => String(v ?? '').toLowerCase()).join(' ')
      return haystack.includes(q)
    })
  }, [tableItems, searchValue])

  const handleExportXlsx = async () => {
    const exportColumns = activeColumns
      .filter((col) => col.key !== 'actions')
      .map((col) => ({ key: col.key as string, label: col.label as string }))
    await exportToXlsx({
      columns: exportColumns,
      rows: filteredItems,
      fileName: `gas_suppliers_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Gas Suppliers',
    })
  }

  const columns = [
    { key: 'gasStationsParentId', label: 'ID', sorter: true, filter: true, _style: { width: '65px' } },
    { key: 'name', label: 'Name', sorter: true, filter: true },
    { key: 'company_format', label: 'Company', sorter: true, filter: true, _style: { width: '115px' } },
    { key: 'country_format', label: 'Country', sorter: true, filter: true, _style: { width: '115px' } },
    { key: 'department_format', label: 'Department', sorter: true, filter: true },
    { key: 'city_format', label: 'City', sorter: true, filter: true },
    { key: 'address', label: 'Address', sorter: true, filter: true },
    { key: 'phone', label: 'Phone', sorter: true, filter: true },
    { key: 'email', label: 'Email', sorter: true, filter: true },
    { key: 'creditDays', label: 'Credit Days', sorter: true, filter: true, _style: { width: '135px' } },
    { key: 'createdAtFormat', label: 'Created', sorter: true, filter: true },
    { key: 'updatedAtFormat', label: 'Updated', sorter: true, filter: true },
    { key: 'active', label: 'Active', sorter: true, filter: false, _style: { width: '95px' } },
    { key: 'actions', label: 'Actions', sorter: false, filter: false, _style: { width: '140px' } },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )

  return (
    <CContainer fluid>
      <PageHero
        kicker="Fuel"
        icon={cilHome}
        title="Gas Suppliers"
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
                        id={`col-gs-${col.key}`}
                        checked={visibleColumns.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) setVisibleColumns([...visibleColumns, col.key])
                          else if (visibleColumns.length > 1) setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                        }}
                      />
                      <label className="form-check-label" htmlFor={`col-gs-${col.key}`}>{col.label}</label>
                    </div>
                  ))}
                </div>
              </CDropdownMenu>
            </CDropdown>
            <CButton color="success" variant="outline" onClick={handleExportXlsx} disabled={!filteredItems.length}>
              <CIcon icon={cilCloudDownload} className="me-2" />
              Export XLSX
            </CButton>
            {canCreate && (
              <CButton color="primary" className="text-white" onClick={handleOpenNew}>
                <CIcon icon={cilPlus} className="me-2" />
                New Gas Supplier
              </CButton>
            )}
          </div>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          {errors && (
            <CAlert color="danger" className="mb-3">
              {typeof errors === 'string' ? errors : 'An error occurred loading Gas Suppliers'}
            </CAlert>
          )}
          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto" className="mb-2 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
                <input
                  className="form-control w-auto" type="text" placeholder="Search..."
                  value={searchValue} onChange={(e) => handleTableFilterChange(e.target.value)}
                  style={{ minWidth: '250px' }}
                />
                {hasActiveFilters && (
                  <button type="button" className="btn btn-outline-danger btn-sm d-flex align-items-center ms-3" style={{ whiteSpace: 'nowrap' }} onClick={handleClearFilters}>
                    <CIcon icon={cilFilterX} className="me-1" />
                    Clear Filters ({totalActiveFilters})
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
            tableProps={{ hover: true, striped: true, responsive: true, className: 'align-middle' }}
            scopedColumns={{
              active: (item: any) => (
                <td className="text-center">
                  <CBadge color={item.active ? 'success' : 'danger'}>
                    {item.active ? 'Active' : 'Inactive'}
                  </CBadge>
                </td>
              ),
              actions: (item: any) => (
                <td>
                  <div className="d-flex gap-1">
                    <CButton color="success" variant="ghost" size="sm" onClick={() => handleView(item.gasStationsParentId)} title="View">
                      <CIcon icon={cilMagnifyingGlass} />
                    </CButton>
                    {canUpdate && (
                      <CButton color="warning" variant="ghost" size="sm" onClick={() => handleOpenEdit(item.gasStationsParentId)} title="Edit">
                        <CIcon icon={cilPencil} />
                      </CButton>
                    )}
                    {canDelete && (
                      <CButton color="danger" variant="ghost" size="sm" onClick={() => handleAskDelete(item.gasStationsParentId)} title="Delete">
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
        message="Are you sure you want to delete this gas supplier?"
        onClose={() => { setConfirmVisible(false); setPendingDeleteId(null) }}
        onConfirm={confirmDelete}
      />
    </CContainer>
  )
}

export default GasSupplierListPage
