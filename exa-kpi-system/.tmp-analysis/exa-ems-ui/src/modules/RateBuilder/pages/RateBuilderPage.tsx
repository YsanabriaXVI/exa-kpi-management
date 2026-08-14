/**
 * Rate Builder Page
 * Main page for managing rate builder matrix
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CCard,
  CCardBody,
  CCol,
  CRow,
  CSpinner,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CPagination,
  CPaginationItem,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilList, cilCloudDownload } from '@coreui/icons'
import { CButton } from '@coreui/react-pro'
import PageHero from '../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../store'
import {
  loadRateBuilderData,
  updateRateBuilderCell,
  createRateBuilderCell,
  clearData,
} from '../store/ratebuilderSlice'
import { rateBuilderAPI } from '../api/ratebuilder.api'
import { loadRatePlans } from '../../RatePlans/store/ratePlansSlice'
import RateBuilderMatrix from '../components/RateBuilderMatrix'
import { RateBuilderCell } from '../types'
import { permissionService, UPDATE } from '../../../services/auth/permission.service'
import { MODULE_RATE_BUILDER } from '../../../constants/modules'

const TYPE_OPTIONS = [
  { value: 1, label: 'Payment' },
  { value: 2, label: 'Invoice' },
]

const CLASS_TYPE_OPTIONS = [
  { value: 1, label: 'Km' },
  { value: 2, label: 'Price' },
]

import RateBuilderFilters from '../components/RateBuilderFilters'
import { clientsAPI } from '../../Assets/Clients/api/clients.api'
import { subdivisionsAPI } from '../../Assets/Subdivisions/api/subdivisions.api'

const RateBuilderPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()

  // Redux state
  const { data, loading, updatingCells } = useSelector((state: RootState) => (state as any).ratebuilder)
  const { rateplans } = useSelector((state: RootState) => (state as any).rateplans || { rateplans: [] })
  const authDetails = useSelector((state: RootState) => (state as any).auth?.details)

  const assignedClients = useMemo(() => authDetails?.details?.clients ?? [], [authDetails])
  const assignedSubdivisions = useMemo(() => authDetails?.details?.subdivisions ?? [], [authDetails])

  // Local state
  const [pType, setPType] = useState(1)
  const [classType, setClassType] = useState(1)
  const [clients, setClients] = useState<any[]>([])
  const [subdivisions, setSubdivisions] = useState<any[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([])
  const [selectedSubdivisionIds, setSelectedSubdivisionIds] = useState<number[]>([])
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  // Check permissions
  const isEditable = permissionService.checkPermission(MODULE_RATE_BUILDER, UPDATE)

  // Load data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setInitialLoading(true)
        const filterSubdivisions = (items: any[]) => items.filter((s: any) => s.status === 1 || s.active === 1)
        // Same active semantics as the Clients admin list (active=NULL counts as inactive)
        const isActiveClient = (c: any) =>
          c.active === 1 || c.active === true || String(c.active ?? '').toLowerCase() === '1'
        const filterClients = (items: any[]) => items.filter(isActiveClient)

        if (assignedClients.length > 0 && assignedSubdivisions.length > 0) {
          console.log('RateBuilderPage: Using assigned clients/subdivisions', {
             assignedClientsCount: assignedClients.length,
             assignedSubdivisionsCount: assignedSubdivisions.length
          })
          setClients(filterClients(assignedClients))
          setSubdivisions(filterSubdivisions(assignedSubdivisions))
        } else {
          console.log('RateBuilderPage: Fetching clients/subdivisions from API')
          const [clientsData, subdivisionsData] = await Promise.all([
            clientsAPI.getClients(),
            subdivisionsAPI.getSubdivisions(),
          ])
          console.log('RateBuilderPage: API Data', {
            clientsCount: clientsData.length,
            subdivisionsCount: subdivisionsData.length,
            sampleClient: clientsData[0]
          })
          setClients(filterClients(clientsData))
          setSubdivisions(filterSubdivisions(subdivisionsData))
        }

        dispatch(loadRatePlans())
      } catch (error) {
        console.error('Failed to load initial data', error)
      } finally {
        setInitialLoading(false)
      }
    }

    fetchData()
    return () => {
      dispatch(clearData())
    }
  }, [dispatch, assignedClients, assignedSubdivisions])

  useEffect(() => {
    setSelectedClientIds((prev) => prev.filter((id) => clients.some((client) => client.client_id === id)))
  }, [clients])

  useEffect(() => {
    setSelectedSubdivisionIds((prev) => prev.filter((id) => subdivisions.some((sub) => sub.subdivision_id === id)))
  }, [subdivisions])

  const visibleClients = useMemo(() => {
    if (selectedClientIds.length === 0) {
      return clients
    }
    return clients.filter((client) => selectedClientIds.includes(client.client_id))
  }, [clients, selectedClientIds])

  const visibleSubdivisions = useMemo(() => {
    if (selectedSubdivisionIds.length === 0) {
      return subdivisions
    }
    return subdivisions.filter((subdivision) => selectedSubdivisionIds.includes(subdivision.subdivision_id))
  }, [subdivisions, selectedSubdivisionIds])

  const typeOptions = TYPE_OPTIONS
  const classOptions = CLASS_TYPE_OPTIONS
  const clientFilterOptions = useMemo(
    () => clients.map((client) => ({ value: client.client_id, label: client.name })),
    [clients]
  )
  const subdivisionFilterOptions = useMemo(
    () => subdivisions.map((subdivision) => ({ value: subdivision.subdivision_id, label: subdivision.name })),
    [subdivisions]
  )

  // Load matrix data when filters or dependencies change
  useEffect(() => {
    console.log('RateBuilderPage: Checking dependencies', {
      clientsLength: visibleClients.length,
      subdivisionsLength: visibleSubdivisions.length,
      pType,
      classType
    })

    if (visibleClients.length > 0 && visibleSubdivisions.length > 0) {
      console.log('RateBuilderPage: Dispatching loadRateBuilderData')
      // Ensure we have data before dispatching
      dispatch(
        loadRateBuilderData({
          pType,
          classType,
          clients: visibleClients,
          subdivisions: visibleSubdivisions,
        })
      )
    } else {
      console.log('RateBuilderPage: Skipping dispatch - missing data')
    }
  }, [dispatch, pType, classType, visibleClients, visibleSubdivisions])

  // Handle cell value change
  const handleCellChange = (cell: RateBuilderCell, ratePlanId: number) => {
    if (!ratePlanId) return

    if (cell.data) {
      // Update existing
      dispatch(
        updateRateBuilderCell({
          cellId: cell.id,
          rateBuilderDataId: cell.data.ratebuilderdata_id!,
          ratePlanId,
        })
      )
    } else {
      // Create new
      const [clientId, subdivisionId] = cell.id.split('-').map(Number)
      dispatch(
        createRateBuilderCell({
          cellId: cell.id,
          clientId,
          subdivisionId,
          pType,
          classType,
          ratePlanId,
        })
      )
    }
  }

  const handleClientFilterChange = (values: number[]) => {
    setSelectedClientIds(values)
    setCurrentPage(1)
  }

  const handleSubdivisionFilterChange = (values: number[]) => {
    setSelectedSubdivisionIds(values)
    setCurrentPage(1)
  }

  // Handle filter change
  const handleFilterChange = (value: number, setter: (v: number) => void) => {
    setter(value)
    setCurrentPage(1)
  }

  // Handle export
  const handleExport = async () => {
    try {
      const blob = await rateBuilderAPI.exportRateBuilderData(pType, classType)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `rate_builder_${pType}_${classType}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export rate builder data', error)
    }
  }

  const totalPages = Math.max(1, Math.ceil((data?.length ?? 0) / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedData = (data ?? []).slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage)

  return (
    <CRow className="g-3">
      <CCol xs={12}>
        <PageHero
          kicker="Assets"
          icon={cilList}
          title="Rate Builder"
          subtitle="Overview and manage rate builder matrix data"
          actions={
            <CButton color="info" className="text-white" onClick={handleExport}>
              <CIcon icon={cilCloudDownload} className="me-2" />
              Export XLS
            </CButton>
          }
        />
        <CCard className="shadow-sm border-top-primary border-top-3">
          <CCardBody>
            {/* Filters */}
            <RateBuilderFilters
              typeValue={pType}
              classValue={classType}
              onTypeChange={(value) => handleFilterChange(value, setPType)}
              onClassChange={(value) => handleFilterChange(value, setClassType)}
              disabled={loading || initialLoading}
              typeOptions={typeOptions}
              classOptions={classOptions}
              clientOptions={clientFilterOptions}
              subdivisionOptions={subdivisionFilterOptions}
              selectedClientIds={selectedClientIds}
              selectedSubdivisionIds={selectedSubdivisionIds}
              onClientsFilterChange={handleClientFilterChange}
              onSubdivisionsFilterChange={handleSubdivisionFilterChange}
            />

            {/* Loading State */}
            {loading || initialLoading ? (
              <div className="text-center py-5">
                <CSpinner color="primary" />
                <p className="mt-3 text-body-secondary">Loading data...</p>
              </div>
            ) : (
              <>
                {/* Matrix Table */}
                {data.length > 0 && rateplans.length > 0 ? (
                  <>
                    <RateBuilderMatrix
                      data={paginatedData}
                      clients={visibleClients}
                      ratePlans={rateplans}
                      updatingCells={updatingCells}
                      isEditable={isEditable}
                      onCellChange={handleCellChange}
                    />

                    {/* Pagination + Items per page */}
                    <div className="d-flex justify-content-between align-items-center mt-3 px-1">
                      <CPagination aria-label="Rate builder pagination">
                        <CPaginationItem
                          disabled={safePage <= 1}
                          onClick={() => setCurrentPage(1)}
                        >
                          «
                        </CPaginationItem>
                        <CPaginationItem
                          disabled={safePage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          ‹
                        </CPaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <CPaginationItem
                            key={page}
                            active={page === safePage}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </CPaginationItem>
                        ))}
                        <CPaginationItem
                          disabled={safePage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                          ›
                        </CPaginationItem>
                        <CPaginationItem
                          disabled={safePage >= totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                        >
                          »
                        </CPaginationItem>
                      </CPagination>

                      <div className="d-flex justify-content-end align-items-center pe-1">
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
                                onClick={() => { setItemsPerPage(n); setCurrentPage(1) }}
                                style={{ padding: '0.5rem 1.25rem', cursor: 'pointer' }}
                              >
                                {n}
                              </CDropdownItem>
                            ))}
                          </CDropdownMenu>
                        </CDropdown>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-5">
                    <p className="text-body-secondary">
                      {clients.length === 0 || subdivisions.length === 0
                        ? 'No clients or subdivisions available.'
                        : rateplans.length === 0
                        ? 'No rate plans available. Please create rate plans first.'
                        : 'No data available.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default RateBuilderPage
