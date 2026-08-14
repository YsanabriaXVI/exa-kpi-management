import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CFormLabel,
  CMultiSelect,
  CRow,
  CSmartTable,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilOptions, cilStorage } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import type { AppDispatch, RootState } from '../../../../store'
import {
  loadInventoryAssignments,
  updateInventoryAssignment,
} from '../store/inventoryAssignments.slice'
import exportToXlsx from '../../../utils/exportToXlsx'
import { MODULE_INVENTORYASSIGNMENTS } from '../../../constants/modules'
import { permissionService, UPDATE } from '../../../services/auth/permission.service'
import './InventoryAssignmentsList.scss'

const INVENTORY_STATUSES = {
  IN_TRIP: 'In trip',
  AVAILABLE: 'Available',
  ASSIGNED: 'Assigned',
}

const columns = [
  { key: 'asset_id', label: 'ID', filter: true, sorter: true },
  { key: 'truck', label: 'Truck', filter: true, sorter: true },
  { key: 'truck_status_label', label: 'Truck Status', filter: true, sorter: true },
  { key: 'driverName', label: 'Driver', filter: true, sorter: true },
  { key: 'driver_status_label', label: 'Driver Status', filter: true, sorter: true },
  { key: 'availability', label: 'Availability', filter: true, sorter: true },
  { key: 'current_trip', label: 'Current Trip', filter: true, sorter: true },
  { key: 'last_trip', label: 'Last Trip Completed', filter: true, sorter: true },
  { key: 'last_trip_hours', label: 'Last Trip Hours', filter: true, sorter: true },
  { key: 'last_trip_days', label: 'Last Trip Days', filter: true, sorter: true },
  { key: 'subdivision', label: 'Subdivision', filter: true, sorter: true },
  { key: 'internal_supplier', label: 'Internal Supplier', filter: true, sorter: true },
  { key: 'truck_current_status', label: 'Truck Current Status', filter: true, sorter: true },
  { key: 'driver_current_status', label: 'Driver Current Status', filter: true, sorter: true },
]

const InventoryAssignmentsListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const {
    list,
    loading,
    driverOptions,
    driverStatusOptions,
    truckStatusOptions,
    internalSupplierOptions,
    updatingIds,
  } = useSelector((state: RootState) => (state as any).inventoryAssignments ?? {})

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map((col) => col.key as string))
  const [searchTerm, setSearchTerm] = useState('')
  const [tableItems, setTableItems] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)

  const canUpdate = permissionService.checkPermission(MODULE_INVENTORYASSIGNMENTS, UPDATE)

  useEffect(() => {
    dispatch(loadInventoryAssignments())
  }, [dispatch])

  const filteredInventory = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return list.filter((item: any) => {
      if (!search) return true
      const values = [
        item.asset_id,
        item.truck,
        item.truck_status_label,
        item.driverName,
        item.driver_status_label,
        item.availability,
        item.current_trip,
        item.last_trip,
        item.subdivision,
        item.internal_supplier,
        item.truck_current_status,
        item.driver_current_status,
      ]
      return values.filter(Boolean).some((value) => value.toString().toLowerCase().includes(search))
    })
  }, [list, searchTerm])

  const assignedDriverIds = useMemo(() => {
    return new Set(
      list
        .map((item: any) => (item.driver !== undefined && item.driver !== null ? Number(item.driver) : null))
        .filter((id: number | null) => id !== null) as number[],
    )
  }, [list])

  const getDriverOptionsForRow = (row: any) => {
    const subdivisionId =
      row.subdivision_id ?? row.subdivisionId ?? row.subdivision ?? null
    const options = driverOptions.filter((driver: any) => {
      const driverId = driver.asset_id ? Number(driver.asset_id) : null
      if (!driverId) return false
      if (driverId === row.driver) return true
      if (subdivisionId && driver.subdivision && Number(driver.subdivision) !== Number(subdivisionId)) {
        return false
      }
      return !assignedDriverIds.has(driverId)
    })
    const selectOptions = [
      { value: '', label: 'No Driver' },
      ...options.map((driver: any) => ({
        value: String(driver.asset_id),
        label: driver.name || `Driver #${driver.asset_id}`,
      })),
    ]
    return selectOptions
  }

  const getInternalSupplierOptionsForRow = (row: any) => {
    const rowSubdivision = row.subdivision_id != null ? String(row.subdivision_id) : ''
    const supplierOptions = (internalSupplierOptions ?? []) as { value: string; label: string; subdivision_id: number | null }[]
    const mapped = supplierOptions.filter(
      (opt) => opt.subdivision_id != null && String(opt.subdivision_id) === rowSubdivision,
    )
    const unmapped = supplierOptions.filter((opt) => opt.subdivision_id == null)

    const selectOptions: { value: string; label: string; disabled?: boolean }[] = [
      { value: '', label: 'No Supplier' },
      ...mapped.map((opt) => ({ value: opt.value, label: opt.label })),
    ]
    if (unmapped.length) {
      selectOptions.push({ value: '__unassigned__', label: 'Unassigned', disabled: true })
      unmapped.forEach((opt) => selectOptions.push({ value: opt.value, label: opt.label }))
    }

    // Never hide the saved value even if it belongs to another subdivision
    const current = row.internal_supplier_id != null ? String(row.internal_supplier_id) : ''
    if (current && !selectOptions.some((opt) => String(opt.value) === current)) {
      selectOptions.push({ value: current, label: row.internal_supplier || `Supplier #${current}` })
    }
    return selectOptions
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const exportColumns = columns
        .filter((col) => visibleColumns.includes(col.key as string))
        .map((col) => ({ key: col.key as string, label: col.label as string }))
      const rowsToExport = tableItems.length ? tableItems : filteredInventory
      await exportToXlsx({
        columns: exportColumns,
        rows: rowsToExport,
        fileName: `inventory_assignments_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Inventory',
      })
    } catch (error) {
      console.error('Failed to export inventory assignments:', error)
      alert('Unable to export inventory assignments at the moment.')
    } finally {
      setExporting(false)
    }
  }

  const renderTripLink = (value?: string) => {
    if (!value) return '—'
    const match = /^(\d+)(.*)$/i.exec(value)
    if (!match) return value
    const [, tripId, suffix] = match
    return (
      <>
        <a href={`/operations/trips/${tripId}`} className="text-decoration-none">
          #{tripId}
        </a>
        <span className="ms-1">{suffix.trim()}</span>
      </>
    )
  }

  const isRowUpdating = (assetId: number) => updatingIds?.includes(assetId)

  const handleUpdate = (
    type: 'driver' | 'truck_status' | 'driver_status' | 'internal_supplier',
    record: any,
    nextValue: string,
  ) => {
    let currentValue = ''
    if (type === 'driver') {
      currentValue = record.driver ? String(record.driver) : ''
    } else if (type === 'truck_status') {
      currentValue = record.truck_status_id ? String(record.truck_status_id) : ''
    } else if (type === 'internal_supplier') {
      currentValue = record.internal_supplier_id ? String(record.internal_supplier_id) : ''
    } else {
      currentValue = record.driver_status_id ? String(record.driver_status_id) : ''
    }

    // Prevent redundant updates which can cause infinite loops if CMultiSelect fires onChange on mount/render
    if (currentValue === nextValue) return

    dispatch(
      updateInventoryAssignment({
        assetId: record.asset_id,
        type,
        value: nextValue,
      }),
    )
  }

  const renderStatusEditor = (item: any, field: 'truck_status' | 'driver' | 'driver_status') => {
    const disabled =
      !canUpdate ||
      isRowUpdating(item.asset_id) ||
      (field === 'driver' && item.availability === INVENTORY_STATUSES.IN_TRIP) ||
      (field !== 'driver' && item.availability !== INVENTORY_STATUSES.AVAILABLE)

    if (isRowUpdating(item.asset_id)) {
      return (
        <div className="d-flex justify-content-center">
          <CSpinner size="sm" />
        </div>
      )
    }

    if (field === 'driver') {
      const options = getDriverOptionsForRow(item)
      return (
        <CMultiSelect
          options={options}
          value={item.driver ? String(item.driver) : ''}
          onChange={(selected: any) => {
            const option = Array.isArray(selected) ? selected[0] : selected
            handleUpdate('driver', item, option?.value ?? '')
          }}
          multiple={false}
          selectionType="text"
          disabled={disabled}
          placeholder="Select driver"
          clearSearchOnSelect
        />
      )
    }

    const sourceOptions = field === 'truck_status' ? truckStatusOptions : driverStatusOptions
    const valueKey =
      field === 'truck_status' ? (item.truck_status_id ? String(item.truck_status_id) : '') : item.driver_status_id
        ? String(item.driver_status_id)
        : ''
    return (
      <CMultiSelect
        options={sourceOptions}
        value={valueKey}
        onChange={(selected: any) => {
          const option = Array.isArray(selected) ? selected[0] : selected
          handleUpdate(field === 'truck_status' ? 'truck_status' : 'driver_status', item, option?.value ?? '')
        }}
        multiple={false}
        selectionType="text"
        disabled={disabled}
        placeholder="Select status"
        clearSearchOnSelect
      />
    )
  }

  const renderInternalSupplierEditor = (item: any) => {
    if (isRowUpdating(item.asset_id)) {
      return (
        <div className="d-flex justify-content-center">
          <CSpinner size="sm" />
        </div>
      )
    }
    const options = getInternalSupplierOptionsForRow(item)
    const value = item.internal_supplier_id != null ? String(item.internal_supplier_id) : ''
    return (
      <CMultiSelect
        options={options}
        value={value}
        onChange={(selected: any) => {
          const option = Array.isArray(selected) ? selected[0] : selected
          handleUpdate('internal_supplier', item, option?.value ?? '')
        }}
        multiple={false}
        selectionType="text"
        disabled={!canUpdate}
        placeholder="Select supplier"
        clearSearchOnSelect
      />
    )
  }

  const scopedColumns = {
    truck_status_label: (item: any) => (
      <td className="inventory-cell">
        {renderStatusEditor(item, 'truck_status')}
      </td>
    ),
    driverName: (item: any) => (
      <td className="inventory-cell">
        {renderStatusEditor(item, 'driver')}
      </td>
    ),
    driver_status_label: (item: any) => (
      <td className="inventory-cell">
        {renderStatusEditor(item, 'driver_status')}
      </td>
    ),
    internal_supplier: (item: any) => (
      <td className="inventory-cell">
        {renderInternalSupplierEditor(item)}
      </td>
    ),
    availability: (item: any) => (
      <td>
        <CBadge
          color={
            item.availability === INVENTORY_STATUSES.AVAILABLE
              ? 'success'
              : item.availability === INVENTORY_STATUSES.IN_TRIP
              ? 'info'
              : item.availability === INVENTORY_STATUSES.ASSIGNED
              ? 'warning'
              : 'secondary'
          }
          shape="rounded-pill"
        >
          {item.availability || '—'}
        </CBadge>
      </td>
    ),
    current_trip: (item: any) => <td>{renderTripLink(item.current_trip)}</td>,
    last_trip: (item: any) => <td>{renderTripLink(item.last_trip)}</td>,
    driver_current_status: (item: any) => (
      <td>{item.driver_current_status || item['111'] || '—'}</td>
    ),
  }

  return (
    <CRow className="g-3 inventory-assignments-page">
      <CCol xs={12}>
        <PageHero
          kicker="Assets"
          icon={cilStorage}
          title="Inventory Assignments"
          subtitle={
            searchTerm
              ? `Showing ${filteredInventory.length} of ${list.length} assignments`
              : `Manage inventory assignments • ${list.length} items`
          }
          actions={
            <div className="d-flex gap-2 flex-wrap justify-content-end">
              <CButton
                color="success"
                className="text-white"
                onClick={handleExport}
                disabled={exporting || (tableItems.length === 0 && filteredInventory.length === 0)}
              >
                {exporting ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilCloudDownload} className="me-2" />
                    Export XLSX
                  </>
                )}
              </CButton>
              <CDropdown>
                <CDropdownToggle color="secondary" variant="outline">
                  <CIcon icon={cilOptions} className="me-2" />
                  Visible Columns ({visibleColumns.length})
                </CDropdownToggle>
                <CDropdownMenu className="column-selector-dropdown">
                  <div className="px-3 py-2">
                    <small className="text-body-secondary fw-semibold">SELECT COLUMNS TO DISPLAY</small>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="column-selector-list px-3 py-2">
                    {columns.map((col) => (
                      <div key={col.key as string} className="form-check py-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`inventory-col-${col.key}`}
                          checked={visibleColumns.includes(col.key as string)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setVisibleColumns([...visibleColumns, col.key as string])
                            } else if (visibleColumns.length > 1) {
                              setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                            }
                          }}
                        />
                        <label className="form-check-label" htmlFor={`inventory-col-${col.key}`}>
                          {col.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </CDropdownMenu>
              </CDropdown>
            </div>
          }
        />
        <CCard className="mb-4 shadow-sm">
          <CCardHeader>
            <div className="d-flex flex-column gap-2">
              <CFormLabel className="mb-0 text-body-secondary small">Search Inventory</CFormLabel>
              <CFormInput
                type="text"
                placeholder="Search by truck, driver, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search inventory assignments"
              />
            </div>
          </CCardHeader>
          <CCardBody>
            <div className="table-responsive mt-3">
              <CSmartTable
                columns={columns.filter((col) => visibleColumns.includes(col.key as string))}
                items={filteredInventory}
                loading={loading}
                itemsPerPageSelect
                itemsPerPage={20}
                pagination
                columnFilter
                columnSorter
                scopedColumns={scopedColumns}
                onFilteredItemsChange={(items) => setTableItems(Array.isArray(items) ? items : [])}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'inventory-table align-middle',
                }}
                sorterValue={{ column: 'asset_id', state: 'asc' }}
              />
            </div>

            {!loading && list.length === 0 && (
              <div className="text-center py-5 text-body-secondary">
                <h5>No Inventory Records</h5>
                <p>Inventory assignments will appear here once trucks and drivers are configured.</p>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default InventoryAssignmentsListPage
