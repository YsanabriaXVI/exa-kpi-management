import React, { useEffect, useMemo, useState, useRef } from 'react'
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
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CRow,
  CSmartTable,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilOptions, cilMap, cilPencil, cilPlus, cilTrash, cilWarning } from '@coreui/icons'
import PageHero from '../../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../../store'
import { deleteRateRoute, loadRateRoutes } from '../store/rateRoutes.slice'
import { loadRatePlans } from '../../../RatePlans/store/ratePlansSlice'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../../services/auth/permission.service'
import { MODULE_RATE_ROUTES } from '../../../../constants/modules'
import './RateRoutesList.scss'

const baseColumns = [
  { key: 'route_id', label: 'ID', filter: true, sorter: true },
  { key: 'route', label: 'Route', filter: true, sorter: true },
  { key: 'city_a', label: 'City A', filter: true, sorter: true },
  { key: 'city_b', label: 'City B', filter: true, sorter: true },
]

const RateRoutesListPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const rateRoutesState = useSelector((state: RootState) => (state as any).rateroutes) || {}
  const rateRoutes = Array.isArray(rateRoutesState.list) ? rateRoutesState.list : []
  const loading = Boolean(rateRoutesState.loading)

  const ratePlansState = useSelector((state: RootState) => (state as any).rateplans) || {}
  const ratePlans = Array.isArray(ratePlansState.rateplans) ? ratePlansState.rateplans : []

  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Scroll synchronization state
  const tableContainerRef = React.useRef<HTMLDivElement>(null)
  const topScrollbarRef = React.useRef<HTMLDivElement>(null)
  const [tableScrollWidth, setTableScrollWidth] = useState(0)
  const [tableClientWidth, setTableClientWidth] = useState(0)

  // Modals & Toasts
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [routeToDelete, setRouteToDelete] = useState<any>(null)
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

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_RATE_ROUTES, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_RATE_ROUTES, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_RATE_ROUTES, DELETE)

  useEffect(() => {
    dispatch(loadRateRoutes())
    if (!ratePlans.length) {
      dispatch(loadRatePlans(undefined))
    }
  }, [dispatch])

  useEffect(() => {
    const checkScroll = () => {
      if (tableContainerRef.current) {
        setTableScrollWidth(tableContainerRef.current.scrollWidth)
        setTableClientWidth(tableContainerRef.current.clientWidth)
      }
    }
    
    checkScroll()
    window.addEventListener('resize', checkScroll)
    // Check after a short delay to allow table render
    const timer = setTimeout(checkScroll, 100)
    
    return () => {
      window.removeEventListener('resize', checkScroll)
      clearTimeout(timer)
    }
  }, [rateRoutes, visibleColumns, loading])

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollbarRef.current) {
      topScrollbarRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  const dynamicColumns = useMemo(() => {
    return ratePlans.flatMap((plan: any) => [
      { key: `km_${plan.id}`, label: `${plan.name} (KM)`, filter: true, sorter: true },
      { key: `price_${plan.id}`, label: `${plan.name} (Price)`, filter: true, sorter: true },
    ])
  }, [ratePlans])

  const allColumns = [...baseColumns, ...dynamicColumns, { key: 'actions', label: 'Actions', filter: false, sorter: false }]

  useEffect(() => {
    if (!visibleColumns.length) {
      setVisibleColumns(allColumns.map((c) => c.key as string).filter((k) => k !== 'actions'))
    }
  }, [allColumns])

  const normalizedRoutes = useMemo(() => {
    return rateRoutes.map((route: any) => ({
      ...route,
      city_a: route.city_a?.name || route.city_a?.code || '—',
      city_b: route.city_b?.name || route.city_b?.code || '—',
    }))
  }, [rateRoutes])

  const filteredRoutes = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return normalizedRoutes.filter((route: any) => {
      if (!search) return true
      return Object.values({
        route_id: route.route_id,
        route: route.route,
        city_a: route.city_a,
        city_b: route.city_b,
      })
        .filter(Boolean)
        .some((v) => v.toString().toLowerCase().includes(search))
    })
  }, [normalizedRoutes, searchTerm])

  const activeColumns = allColumns.filter((col) => col.key === 'actions' || visibleColumns.includes(col.key as string))

  const handleDelete = (item: any) => {
    if (!canDelete) return
    setRouteToDelete(item)
    setDeleteModalVisible(true)
  }

  const confirmDelete = async () => {
    if (!routeToDelete) return
    setDeleteLoading(true)
    try {
      const result: any = await dispatch(deleteRateRoute(routeToDelete.route_id))
      setDeleteModalVisible(false)
      if (result.meta.requestStatus === 'fulfilled') {
        showToast('Rate route deleted successfully', 'success')
        dispatch(loadRateRoutes())
      } else {
        const msg = extractErrorMessage(result.payload, 'Failed to delete route')
        showToast(msg, 'danger')
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'danger')
    } finally {
      setDeleteLoading(false)
      setRouteToDelete(null)
    }
  }

  const scopedColumns = {
    actions: (item: any) => (
      <td>
        <div className="action-buttons">
          {canUpdate && (
            <CButton
              color="primary"
              variant="ghost"
              size="sm"
              title="Edit"
              onClick={() => navigate(`/assets/rate-routes/${item.route_id}`)}
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
              onClick={() => handleDelete(item)}
            >
              <CIcon icon={cilTrash} />
            </CButton>
          )}
          {!canUpdate && !canDelete && (
            <span className="text-muted">No actions available</span>
          )}
        </div>
      </td>
    ),
  }

  return (
    <>
    <CRow className="g-3 rate-routes-list-page">
      <CCol xs={12}>
        <PageHero
          kicker="Assets"
          icon={cilMap}
          title="Rate Routes"
          subtitle={
            searchTerm
              ? `Showing ${filteredRoutes.length} of ${rateRoutes.length} routes`
              : `Manage your rate routes • ${rateRoutes.length} items`
          }
          actions={
            <div className="d-flex gap-2">
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
                    {allColumns
                      .filter((col) => col.key !== 'actions')
                      .map((col) => (
                        <div key={col.key as string} className="form-check py-1">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`rateRoutes-col-${col.key}`}
                            checked={visibleColumns.includes(col.key as string)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setVisibleColumns([...visibleColumns, col.key as string])
                              } else if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={`rateRoutes-col-${col.key}`}>
                            {col.label}
                          </label>
                        </div>
                      ))}
                  </div>
                </CDropdownMenu>
              </CDropdown>
              {canCreate && (
                <CButton color="primary" onClick={() => navigate('/assets/rate-routes/new')} className="text-white">
                  <CIcon icon={cilPlus} className="me-1" />
                  Add Route
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
                  placeholder="Search by ID or cities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search routes"
                />
              </CCol>
            </CRow>

            {/* Top Scrollbar */}
            {tableScrollWidth > tableClientWidth && (
              <div
                ref={topScrollbarRef}
                onScroll={handleTopScroll}
                className="rate-routes-top-scrollbar mb-2"
              >
                <div style={{ width: tableScrollWidth, height: '1px' }} />
              </div>
            )}

            <div 
              className="table-responsive" 
              ref={tableContainerRef}
              onScroll={handleTableScroll}
            >
              <CSmartTable
                columns={activeColumns}
                items={filteredRoutes}
                loading={loading}
                itemsPerPageSelect
                itemsPerPage={20}
                pagination
                columnFilter
                columnSorter
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: false, // Disable internal responsive wrapper
                  className: 'rate-routes-table align-middle',
                }}
                sorterValue={{ column: 'route_id', state: 'desc' }}
              />
            </div>

            {!loading && rateRoutes.length === 0 && (
              <div className="text-center py-5 text-body-secondary">
                <h5>No Rate Routes Found</h5>
                <p>Use the "Add Route" button to create your first rate route.</p>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

    </CRow>
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
              <p className="mb-0">Are you sure you want to delete the route for</p>
              <strong>{routeToDelete?.route || 'this item'}</strong>?
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
                Delete Route
              </>
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      <CToaster ref={toaster} push={toast} placement="top-end" />
    </>
  )
}

export default RateRoutesListPage
