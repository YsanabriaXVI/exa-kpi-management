import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CContainer,
  CNav,
  CNavItem,
  CNavLink,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilCloudDownload,
  cilGrid,
  cilOptions,
  cilPencil,
  cilPlus,
  cilTrash,
  cilWarning,
  cilSearch,
  cilFilterX,
  cilMagnifyingGlass,
} from '@coreui/icons'
import PageHero from '../../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../../store'
import type { EquipmentKind } from '../types'
import { loadEquipments, deleteEquipment, loadEquipmentAttributes } from '../store/equipments.slice'
import { MODULE_CHASSIS, MODULE_GENSET } from '../../../../constants/modules'
import { permissionService, CREATE, UPDATE, DELETE, READ } from '../../../../services/auth/permission.service'
import exportToXlsx from '../../../../utils/exportToXlsx'
import './EquipmentsList.scss'

const tabMeta: { kind: EquipmentKind; label: string }[] = [
  { kind: 'chassis', label: 'Chassis' },
  { kind: 'genset', label: 'Genset' },
]

const badgeColorByKind: Record<EquipmentKind, any> = {
  chassis: 'primary',
  genset: 'warning',
}

const COLUMN_STORAGE_KEY = 'equipments_visible_columns_v1'
const ROWS_PER_PAGE_OPTIONS = [15, 30, 50, 100]

const columnMapByKind: Record<
  EquipmentKind,
  {
    fields: { key: string; label: string; attr: string }[]
  }
> = {
  chassis: {
    fields: [
      { key: 'code', label: 'Code', attr: '109' },
      { key: 'chassis_no', label: 'Chassis No', attr: '30' },
      { key: 'plate', label: 'Plate', attr: '32' },
      { key: 'date_purchased', label: 'Date Purchased', attr: '33' },
      { key: 'vin', label: 'VIN', attr: '34' },
      { key: 'mileage', label: 'Mileage', attr: '35' },
      { key: 'owner', label: 'Owner', attr: '41' },
      { key: 'color', label: 'Color', attr: '37' },
      { key: 'type', label: 'Type', attr: '38' },
      { key: 'year', label: 'Year', attr: '40' },
      { key: 'status', label: 'Status', attr: '43' },
      { key: 'registration', label: 'Registration', attr: '84' },
      { key: 'equipment_size', label: 'Equipment Size', attr: '219' },
    ],
  },
  genset: {
    fields: [
      { key: 'code', label: 'Code', attr: '110' },
      { key: 'number', label: 'Genset No', attr: '31' },
      { key: 'brand', label: 'Brand', attr: '46' },
      { key: 'model', label: 'Model', attr: '47' },
      { key: 'year', label: 'Year', attr: '48' },
      { key: 'color', label: 'Color', attr: '45' },
      { key: 'owner', label: 'Owner', attr: '51' },
      { key: 'status', label: 'Status', attr: '88' },
      { key: 'subdivision', label: 'Subdivision', attr: '234' },
    ],
  },
}

const loadSavedColumns = (kind: EquipmentKind) => {
  const saved = localStorage.getItem(`${COLUMN_STORAGE_KEY}_${kind}`)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch { /* ignore */ }
  }
  return columnMapByKind[kind]?.fields?.map((f) => f.key) || []
}

const EquipmentsPage: React.FC = () => {
  const params = useParams<{ kind?: EquipmentKind }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const kind: EquipmentKind = params.kind === 'genset' ? 'genset' : 'chassis'
  const { list = [], loading, formAttributes = [], attributesLoading } = useSelector(
    (state: RootState) => (state as any).equipments?.[kind] || {}
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns(kind))
  const [exporting, setExporting] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})

  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState<React.ReactElement | null>(null)
  const toaster = useRef<HTMLDivElement | null>(null)

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

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' = 'success') => {
    setToast(
      <CToast autohide={true} delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  const canCreate = permissionService.checkPermission(kind === 'chassis' ? MODULE_CHASSIS : MODULE_GENSET, CREATE)
  const canUpdate = permissionService.checkPermission(kind === 'chassis' ? MODULE_CHASSIS : MODULE_GENSET, UPDATE)
  const canDelete = permissionService.checkPermission(kind === 'chassis' ? MODULE_CHASSIS : MODULE_GENSET, DELETE)
  const canRead = permissionService.checkPermission(kind === 'chassis' ? MODULE_CHASSIS : MODULE_GENSET, READ)

  useEffect(() => {
    dispatch(loadEquipments(kind))
    dispatch(loadEquipmentAttributes(kind))
    setVisibleColumns(loadSavedColumns(kind))
    setSearchTerm('')
    setColumnFilterValues({})
  }, [dispatch, kind])

  useEffect(() => {
    localStorage.setItem(`${COLUMN_STORAGE_KEY}_${kind}`, JSON.stringify(visibleColumns))
  }, [visibleColumns, kind])

  const attributeColumnsFromSchema = useMemo(() => {
    return (formAttributes || [])
      .map((attr: any) => ({
        key: `attr_${attr.attribute_id}`,
        label: attr.name || `Attr ${attr.attribute_id}`,
        attrId: String(attr.attribute_id),
        order: attr.order ?? 0,
        items: attr.attribute_items || attr.items || [],
      }))
      .sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0))
  }, [formAttributes])

  const dynamicColumns = columnMapByKind[kind]?.fields || []
  const mergedColumns = [...dynamicColumns, ...attributeColumnsFromSchema.filter((attr: any) =>
    !dynamicColumns.some((dyn) => dyn.key === attr.key)
  )].map((field: any) => ({
    ...field,
    attrId: field.attrId || field.attr || field.key.replace('attr_', ''),
  }))

  useEffect(() => {
    if (!visibleColumns.length && mergedColumns.length) {
      setVisibleColumns(mergedColumns.map((c) => c.key))
    }
  }, [mergedColumns, visibleColumns.length])

  const columns = [
    { key: 'assetsid', label: 'ID', sorter: true, filter: true },
    ...mergedColumns.map((field: any) => ({ key: field.key, label: field.label, sorter: true, filter: true })),
    { key: 'actions', label: 'Actions', sorter: false, filter: false, _style: { width: '140px' } },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || col.key === 'assetsid' || visibleColumns.includes(col.key as string)
  )

  const tableItems = useMemo(() => {
    return (list || []).map((item: any) => {
      const attrs = item.attributes || {}
      const flat: Record<string, any> = {}
      mergedColumns.forEach((field: any) => {
        const attrKey = field.attr || field.attrId
        flat[field.key] = attrs[attrKey] ?? ''
      })
      return { ...item, ...flat }
    })
  }, [mergedColumns, list])

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return tableItems
    return tableItems.filter((item: any) => {
      const values = Object.values(item).filter((val) => typeof val === 'string' || typeof val === 'number')
      return values.some((val) => String(val ?? '').toLowerCase().includes(q))
    })
  }, [tableItems, searchTerm])

  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter((key) => {
    const val = columnFilterValues[key]
    return Array.isArray(val) ? val.length > 0 : String(val ?? '').trim().length > 0
  }).length
  const hasSearchFilter = searchTerm.trim().length > 0
  const hasActiveFilters = activeColumnFiltersCount > 0 || hasSearchFilter
  const totalActiveFilters = activeColumnFiltersCount + (hasSearchFilter ? 1 : 0)

  const handleClearFilters = () => {
    setSearchTerm('')
    setColumnFilterValues({})
  }

  const handleDeleteClick = (item: any) => {
    setItemToDelete(item)
    setDeleteModalVisible(true)
  }

  const confirmDelete = async () => {
    const targetId = itemToDelete?.assetsid ?? itemToDelete?.asset_id
    if (!targetId) return

    setDeleteLoading(true)
    try {
      const result: any = await dispatch(deleteEquipment({ kind, id: targetId }))
      setDeleteModalVisible(false)

      if (result.meta.requestStatus === 'fulfilled') {
        showToast('Equipment deleted successfully', 'success')
      } else {
        const msg = extractErrorMessage(result.payload, 'Failed to delete equipment')
        showToast(msg, 'danger')
      }
    } catch {
      showToast('An unexpected error occurred', 'danger')
    } finally {
      setDeleteLoading(false)
      setItemToDelete(null)
    }
  }

  const handleExportXlsx = async () => {
    try {
      setExporting(true)
      const exportColumns = activeColumns
        .filter((col) => col.key !== 'actions')
        .map((col) => ({ key: col.key as string, label: col.label as string }))
      await exportToXlsx({
        columns: exportColumns,
        rows: filteredItems,
        fileName: `equipments_${kind}_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: kind === 'chassis' ? 'Chassis' : 'Genset',
      })
    } catch {
      showToast('Unable to export. Please try again.', 'danger')
    } finally {
      setExporting(false)
    }
  }

  const scopedColumns = {
    assetsid: (item: any) => (
      <td>
        <CBadge
          color={badgeColorByKind[kind]}
          shape="rounded-pill"
          role="button"
          onClick={() => navigate(`/assets/equipments/${kind}/${item.assetsid ?? item.asset_id}?view=true`)}
          style={{ cursor: 'pointer' }}
        >
          {item.assetsid ?? item.asset_id}
        </CBadge>
      </td>
    ),
    status: (item: any) => {
      const attrs = item.attributes || {}
      const value = item.status ?? attrs['43'] ?? attrs['88']
      const isActive = String(value ?? '').toLowerCase() === 'active'
      return (
        <td>
          <CBadge color={isActive ? 'success' : 'secondary'} shape="rounded-pill">
            {value ?? '—'}
          </CBadge>
        </td>
      )
    },
    actions: (item: any) => (
      <td>
        <div className="equipments-actions">
          {canRead && (
            <CButton
              color="info"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/assets/equipments/${kind}/${item.assetsid ?? item.asset_id}?view=true`)}
              title="View"
            >
              <CIcon icon={cilSearch} />
            </CButton>
          )}
          {canUpdate && (
            <CButton
              color="primary"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/assets/equipments/${kind}/${item.assetsid ?? item.asset_id}`)}
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
              onClick={() => handleDeleteClick(item)}
              title="Delete"
            >
              <CIcon icon={cilTrash} />
            </CButton>
          )}
        </div>
      </td>
    ),
  }

  return (
    <CContainer fluid className="equipments-page">
      <PageHero
        kicker="Equipments"
        icon={cilGrid}
        title="Chassis & Gensets"
        subtitle="Management"
        highlights={[
          { label: 'Total Records', value: tableItems.length.toLocaleString() },
          { label: 'Visible Rows', value: filteredItems.length.toLocaleString() },
          {
            label: 'Active Filters',
            value: totalActiveFilters || 'None',
            color: totalActiveFilters ? 'primary' : 'light',
          },
        ]}
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
                  {mergedColumns.map((col: any) => (
                    <div key={col.key} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`equip-col-${col.key}`}
                        checked={visibleColumns.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) setVisibleColumns([...visibleColumns, col.key])
                          else if (visibleColumns.length > 1)
                            setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                        }}
                      />
                      <label className="form-check-label" htmlFor={`equip-col-${col.key}`}>
                        {col.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CDropdownMenu>
            </CDropdown>
            <CButton
              color="success"
              variant="outline"
              onClick={handleExportXlsx}
              disabled={exporting || filteredItems.length === 0}
            >
              <CIcon icon={cilCloudDownload} className="me-2" />
              {exporting ? 'Exporting...' : 'Export XLSX'}
            </CButton>
            {canCreate && (
              <CButton color="primary" className="text-white" onClick={() => navigate(`/assets/equipments/${kind}/new`)}>
                <CIcon icon={cilPlus} className="me-2" />
                New {kind === 'chassis' ? 'Chassis' : 'Genset'}
              </CButton>
            )}
          </div>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          <CNav variant="underline" className="mb-3">
            {tabMeta.map((tab) => (
              <CNavItem key={tab.kind}>
                <CNavLink active={kind === tab.kind} onClick={() => navigate(`/assets/equipments/${tab.kind}`)}>
                  {tab.label}
                </CNavLink>
              </CNavItem>
            ))}
          </CNav>

          <div className="equipments-toolbar">
            <div className="equipments-toolbar__summary">
              <div className="toolbar-stat toolbar-stat--primary">
                <span className="toolbar-stat__label">Total</span>
                <strong className="toolbar-stat__value">{tableItems.length.toLocaleString()}</strong>
              </div>
              <div className="toolbar-stat">
                <span className="toolbar-stat__label">Filtered</span>
                <strong className="toolbar-stat__value">{filteredItems.length.toLocaleString()}</strong>
              </div>
              <div className="toolbar-context">
                Showing {filteredItems.length} of {tableItems.length} {kind === 'chassis' ? 'chassis' : 'gensets'}
              </div>
              {hasActiveFilters && (
                <CBadge color="info">Filters Active: {totalActiveFilters}</CBadge>
              )}
            </div>

            <div className="equipments-toolbar__controls">
              <div className="equipments-search">
                <CIcon icon={cilMagnifyingGlass} className="equipments-search__icon" />
                <input
                  className="form-control"
                  type="text"
                  placeholder={`Search ${kind}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {hasActiveFilters && (
                <CButton
                  color="danger"
                  variant="outline"
                  size="sm"
                  className="equipments-clear-btn"
                  onClick={handleClearFilters}
                >
                  <CIcon icon={cilFilterX} size="sm" className="me-1" />
                  Clear Filters ({totalActiveFilters})
                </CButton>
              )}
            </div>
          </div>

          <div className="equipments-table-panel">
            {attributesLoading && (
              <div className="d-flex align-items-center gap-2 p-3 text-body-secondary">
                <CSpinner size="sm" /> <span>Loading columns...</span>
              </div>
            )}
            <CSmartTable
              items={filteredItems}
              columns={activeColumns as any}
              itemsPerPage={itemsPerPage}
              pagination
              itemsPerPageSelect={false as any}
              loading={loading}
              scopedColumns={scopedColumns}
              columnFilter
              columnSorter
              columnFilterValue={columnFilterValues}
              onColumnFilterChange={(filters: Record<string, any>) => setColumnFilterValues(filters)}
              tableFilter={false}
              tableProps={{
                hover: true,
                striped: true,
                responsive: true,
                className: 'equipments-table align-middle',
              }}
            />
            <div className="equipments-table-footer">
              <div className="equipments-table-footer__meta">
                Showing {filteredItems.length.toLocaleString()} of {tableItems.length.toLocaleString()} {kind === 'chassis' ? 'chassis' : 'gensets'}
              </div>
              <div />
              <div className="equipments-table-footer__controls">
                <label className="small text-body-secondary me-2 mb-0">Items per page:</label>
                <select
                  className="form-select form-select-sm w-auto"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  {ROWS_PER_PAGE_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <CModal
        alignment="center"
        visible={deleteModalVisible}
        onClose={() => !deleteLoading && setDeleteModalVisible(false)}
        backdrop="static"
      >
        <CModalHeader onClose={() => !deleteLoading && setDeleteModalVisible(false)}>
          <CModalTitle>Confirm Deletion</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="d-flex align-items-center mb-3">
            <CIcon icon={cilWarning} className="text-warning me-3" size="3xl" />
            <div>
              <p className="mb-0">Are you sure you want to delete this equipment?</p>
              <strong>{itemToDelete?.code || (itemToDelete?.assetsid ?? itemToDelete?.asset_id) || 'Unknown Item'}</strong>
              <p className="small text-body-secondary mt-1 mb-0">This action cannot be undone.</p>
            </div>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            onClick={() => setDeleteModalVisible(false)}
            disabled={deleteLoading}
          >
            Cancel
          </CButton>
          <CButton color="danger" className="text-white" onClick={confirmDelete} disabled={deleteLoading}>
            {deleteLoading ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <CIcon icon={cilTrash} className="me-2" />
                Delete Equipment
              </>
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      <CToaster ref={toaster} push={toast} placement="top-end" />
    </CContainer>
  )
}

export default EquipmentsPage
