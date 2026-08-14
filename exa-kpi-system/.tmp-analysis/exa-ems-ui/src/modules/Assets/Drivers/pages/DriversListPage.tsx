import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CRow,
  CSmartTable,
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
import { cilCloudDownload, cilOptions, cilPeople, cilPencil, cilPlus, cilTrash, cilSearch } from '@coreui/icons'
import PageHero from '../../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../../store'
import { deleteDriver, loadDrivers } from '../store/drivers.slice'
import { permissionService, CREATE, UPDATE, DELETE, READ } from '../../../../services/auth/permission.service'
import { MODULE_DRIVERS } from '../../../../constants/modules'
import './DriversList.scss'
import { trucksAPI } from '../../Trucks/api/trucks.api'
import exportToXlsx from '../../../../utils/exportToXlsx'

const attributeFieldMap: Record<string, string[]> = {
  first_name: ['21'],
  last_name: ['22'],
  years_of_experience: ['23'],
  hiring_date: ['24'],
  subdivision: ['25'],
  telephone_1_honduras: ['4', '60'],
  telephone_2_nicaragua: ['26', '61'],
  telephone_3_el_salvador: ['58'],
  telephone_4_guatemala: ['59'],
  truck_assigned: ['27'],
  driver_status: ['75'],
  rtn: ['95'],
  vuceh_coments: ['101'],
  vuceh_code: ['103'],
  address: ['107'],
  internal_identification: ['108'],
}

const columns = [
  { key: 'asset_id', label: 'ID', filter: true, sorter: true },
  { key: 'first_name', label: 'First Name', filter: true, sorter: true },
  { key: 'last_name', label: 'Last Name', filter: true, sorter: true },
  { key: 'subdivision', label: 'Subdivision', filter: true, sorter: true },
  { key: 'driver_status', label: 'Status', filter: true, sorter: true },
  { key: 'hiring_date', label: 'Hiring Date', filter: true, sorter: true },
  { key: 'telephone_1_honduras', label: 'Phone 1', filter: true, sorter: true },
  { key: 'telephone_2_nicaragua', label: 'Phone 2', filter: true, sorter: true },
  { key: 'truck_assigned', label: 'Truck Assigned', filter: true, sorter: true },
  { key: 'actions', label: 'Actions', filter: false, sorter: false },
]

const DriversListPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const driversState = useSelector((state: RootState) => (state as any).drivers) || {}
  const drivers = Array.isArray(driversState.list) ? driversState.list : []
  const loading = Boolean(driversState.loading)

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'asset_id',
    'first_name',
    'last_name',
    'subdivision',
    'driver_status',
    'hiring_date',
    'telephone_1_honduras',
    'truck_assigned',
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [truckLabels, setTruckLabels] = useState<Record<string | number, string>>({})
  const [tableItems, setTableItems] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)

  // Delete Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [driverToDelete, setDriverToDelete] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Toaster
  const [toast, setToast] = useState<any>(null)
  const toaster = React.useRef<any>()

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

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_DRIVERS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_DRIVERS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_DRIVERS, DELETE)
  const canRead = permissionService.checkPermission(MODULE_DRIVERS, READ)

  useEffect(() => {
    dispatch(loadDrivers())
  }, [dispatch])

  useEffect(() => {
    const loadTruckNames = async () => {
      try {
        const trucks = await trucksAPI.getTruckNames()
        const map: Record<string | number, string> = {}
        ;(trucks || []).forEach((truck: any) => {
          const id =
            truck.asset_id ??
            truck.id ??
            truck.assetId ??
            truck.value ??
            null
          if (id === undefined || id === null) return
          const label = truck.name || truck.truck_plate || truck.plate || `Truck ${id}`
          map[String(id)] = label
        })
        setTruckLabels(map)
      } catch (error) {
        console.error('Failed to load truck names', error)
      }
    }
    loadTruckNames()
  }, [])

  const normalizedDrivers = useMemo(() => {
    return drivers.map((driver: any) => {
      const attrs = driver.attributes || {}
      const flattened: Record<string, any> = {}

      Object.entries(attributeFieldMap).forEach(([key, attrIds]) => {
        const existing = driver[key]
        if (existing !== undefined && existing !== null && existing !== '') {
          flattened[key] = existing
          return
        }
        
        let found = false
        for (const attrId of attrIds) {
          if (attrs[attrId] !== undefined && attrs[attrId] !== null && attrs[attrId] !== '') {
            flattened[key] = attrs[attrId]
            found = true
            break
          }
        }
        
        if (!found) {
            flattened[key] = '-'
        }
      })

      if (flattened.truck_assigned) {
        const label = truckLabels[String(flattened.truck_assigned)] || flattened.truck_assigned
        flattened.truck_assigned = label
      }

      return {
        ...driver,
        ...flattened,
        full_name: `${flattened.first_name || ''} ${flattened.last_name || ''}`.trim(),
      }
    })
  }, [drivers, truckLabels])

  const filteredDrivers = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return normalizedDrivers.filter((driver: any) => {
      if (!search) return true
      const valuesToSearch = [
        driver.asset_id,
        driver.first_name,
        driver.last_name,
        driver.full_name,
        driver.subdivision,
        driver.driver_status,
        driver.telephone_1_honduras,
        driver.telephone_2_nicaragua,
        driver.telephone_3_el_salvador,
        driver.telephone_4_guatemala,
        driver.truck_assigned,
        driver.internal_identification,
      ]
      return valuesToSearch
        .filter(Boolean)
        .some((value) => value?.toString().toLowerCase().includes(search))
    })
  }, [normalizedDrivers, searchTerm])

  useEffect(() => {
    setTableItems(filteredDrivers)
  }, [filteredDrivers])

  const activeColumns = columns.filter((col) => col.key === 'actions' || visibleColumns.includes(col.key as string))

  const handleDeleteClick = (driver: any) => {
    if (!canDelete) {
      showToast('You do not have permission to delete drivers.', 'danger')
      return
    }
    setDriverToDelete(driver)
    setDeleteModalVisible(true)
  }

  const confirmDelete = async () => {
    if (!driverToDelete) return

    setDeleteLoading(true)
    try {
      const result: any = await dispatch(deleteDriver(driverToDelete.asset_id))
      if (result.meta.requestStatus === 'fulfilled') {
        showToast('Driver deleted successfully', 'success')
        setDeleteModalVisible(false)
        setDriverToDelete(null)
        dispatch(loadDrivers())
      } else {
        const errorMsg = extractErrorMessage(result.payload, 'Failed to delete driver')
        showToast(errorMsg, 'danger')
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'danger')
    } finally {
      setDeleteLoading(false)
    }
  }

  const scopedColumns = {
    driver_status: (item: any) => (
      <td>
        <CBadge color="info" shape="rounded-pill">
          {item.driver_status || '—'}
        </CBadge>
      </td>
    ),
    actions: (item: any) => (
      <td>
        <div className="action-buttons">
          {canUpdate && (
            <CButton
              color="primary"
              variant="ghost"
              size="sm"
              title="Edit"
              onClick={() => navigate(`/assets/drivers/${item.asset_id}`)}
            >
              <CIcon icon={cilPencil} />
            </CButton>
          )}
          {canDelete && (
            <CButton
              color="danger"
              variant="ghost"
              size="sm"
              title="Delete"
              onClick={() => handleDeleteClick(item)}
            >
              <CIcon icon={cilTrash} />
            </CButton>
          )}
          {canRead && (
            <CButton
              color="info"
              variant="ghost"
              size="sm"
              title="View"
              onClick={() => navigate(`/assets/drivers/${item.asset_id}?view=true`)}
            >
              <CIcon icon={cilSearch} />
            </CButton>
          )}
          {!canUpdate && !canDelete && !canRead && (
            <span className="text-muted">No actions available</span>
          )}
        </div>
      </td>
    ),
  }

  const handleFilteredItemsChange = (items?: any[]) => {
    setTableItems(Array.isArray(items) ? items : [])
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const exportColumns = columns
        .filter((col) => col.key !== 'actions' && visibleColumns.includes(col.key as string))
        .map((col) => ({
          key: col.key as string,
          label: col.label as string,
        }))
      const rowsToExport = tableItems.length ? tableItems : filteredDrivers
      await exportToXlsx({
        columns: exportColumns,
        rows: rowsToExport,
        fileName: `drivers_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Drivers',
      })
    } catch (error) {
      console.error('Failed to export drivers:', error)
      alert('Unable to export drivers. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
    <CRow className="g-3 drivers-list-page">
      <CCol xs={12}>
        <PageHero
          kicker="Assets"
          icon={cilPeople}
          title="Drivers"
          subtitle={
            searchTerm
              ? `Showing ${filteredDrivers.length} of ${drivers.length} drivers`
              : `Manage your drivers • ${drivers.length} items`
          }
          actions={
            <div className="d-flex gap-2 flex-wrap justify-content-end">
              <CButton
                color="success"
                className="text-white"
                onClick={handleExport}
                disabled={exporting || (tableItems.length === 0 && filteredDrivers.length === 0)}
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
                    {columns
                      .filter((col) => col.key !== 'actions')
                      .map((col) => (
                        <div key={col.key as string} className="form-check py-1">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`drivers-col-${col.key}`}
                            checked={visibleColumns.includes(col.key as string)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setVisibleColumns([...visibleColumns, col.key as string])
                              } else if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={`drivers-col-${col.key}`}>
                            {col.label}
                          </label>
                        </div>
                      ))}
                  </div>
                </CDropdownMenu>
              </CDropdown>
              {canCreate && (
                <CButton color="primary" onClick={() => navigate('/assets/drivers/new')} className="text-white">
                  <CIcon icon={cilPlus} className="me-1" />
                  Add Driver
                </CButton>
              )}
            </div>
          }
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            <CRow className="mb-3 align-items-center">
              <CCol xs={12} md={6} lg={4}>
                <CFormInput
                  type="text"
                  placeholder="Search by name, status, truck..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search drivers"
                />
              </CCol>
            </CRow>

            <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={filteredDrivers}
                loading={loading}
                itemsPerPage={itemsPerPage}
                pagination
                columnFilter
                columnSorter
                onFilteredItemsChange={handleFilteredItemsChange}
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'drivers-table align-middle',
                }}
                sorterValue={{ column: 'asset_id', state: 'desc' }}
              />
            </div>

            {/* Items per page — custom dropup to avoid browser native-select misposition */}
            <div className="d-flex justify-content-end align-items-center mt-2 pe-1">
              <span className="me-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>
                Items per page:
              </span>
              <CDropdown direction="dropup">
                <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
                  {itemsPerPage}
                </CDropdownToggle>
                <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
                  {[5, 10, 20, 50, 100].map((n) => (
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

            {!loading && drivers.length === 0 && (
              <div className="text-center py-5 text-body-secondary">
                <h5>No Drivers Found</h5>
                <p>Use the "Add Driver" button to create your first driver.</p>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
      <CModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader onClose={() => setDeleteModalVisible(false)}>
          <CModalTitle>Confirm Deletion</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete this driver?
          {driverToDelete && (
            <div className="fw-bold mt-2">
              {driverToDelete.full_name}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModalVisible(false)} disabled={deleteLoading}>
            Cancel
          </CButton>
          <CButton color="danger" className="text-white" onClick={confirmDelete} disabled={deleteLoading}>
            {deleteLoading ? <CSpinner size="sm" /> : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CToaster ref={toaster} push={toast} placement="top-end" />
    </>
  )
}

export default DriversListPage
