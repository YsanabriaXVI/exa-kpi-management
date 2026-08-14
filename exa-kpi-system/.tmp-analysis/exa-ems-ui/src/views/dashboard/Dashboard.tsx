import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
  CAlert,
} from '@coreui/react-pro'
import { CChartDoughnut } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import CIcon from '@coreui/icons-react'
import {
  cilTruck,
  cilPeople,
  cilNotes,
  cilSpeedometer,
  cilArrowRight,
} from '@coreui/icons'
import { CListGroup, CListGroupItem, CProgress, CProgressBar } from '@coreui/react-pro'

// Dashboard API
import dashboardAPI, {
  DashboardStats,
  TripStatusDistribution,
  WorkOrdersByClient,
} from '../../services/dashboard.api'

/**
 * Dashboard - Main landing page with real-time statistics
 * Uses optimized backend endpoints for efficient data retrieval
 */
const Dashboard = () => {
  const navigate = useNavigate()

  // State
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [tripStatus, setTripStatus] = useState<TripStatusDistribution[]>([])
  const [workOrdersByClient, setWorkOrdersByClient] = useState<WorkOrdersByClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load all dashboard data in parallel
      const [statsData, tripStatusData, workOrdersData] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getTripStatusDistribution(),
        dashboardAPI.getWorkOrdersByClient(10),
      ])

      setStats(statsData)
      setTripStatus(tripStatusData)
      setWorkOrdersByClient(workOrdersData)
    } catch (err: any) {
      console.error('Error loading dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" size="lg" />
        <div className="mt-3 text-body-secondary">Loading dashboard...</div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <CAlert color="danger">
        <strong>Error:</strong> {error}
        <button className="btn btn-sm btn-link" onClick={loadDashboardData}>
          Retry
        </button>
      </CAlert>
    )
  }

  return (
    <>
      {/* Stats Cards Row */}
      <CRow className="mb-4">
        {/* Trips in Progress */}
        <CCol sm={6} lg={3}>
          <CCard className="mb-4">
            <CCardBody>
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-body-secondary text-uppercase fw-semibold small">
                    Trips in Progress
                  </div>
                  <div className="fs-3 fw-semibold text-primary">
                    {stats?.tripsInProgress || 0}
                  </div>
                  <small className="text-body-secondary">
                    Active trips currently running
                  </small>
                </div>
                <div className="bg-primary bg-opacity-10 text-primary rounded p-3 d-flex align-items-center">
                  <CIcon icon={cilSpeedometer} size="xl" />
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Open Work Orders */}
        <CCol sm={6} lg={3}>
          <CCard className="mb-4">
            <CCardBody>
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-body-secondary text-uppercase fw-semibold small">
                    Open Work Orders
                  </div>
                  <div className="fs-3 fw-semibold text-warning">
                    {stats?.openWorkOrders || 0}
                  </div>
                  <small className="text-body-secondary">
                    Total: {stats?.totalWorkOrders || 0}
                  </small>
                </div>
                <div className="bg-warning bg-opacity-10 text-warning rounded p-3 d-flex align-items-center">
                  <CIcon icon={cilNotes} size="xl" />
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Active Trucks */}
        <CCol sm={6} lg={3}>
          <CCard className="mb-4">
            <CCardBody>
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-body-secondary text-uppercase fw-semibold small">
                    Active Trucks
                  </div>
                  <div className="fs-3 fw-semibold text-success">
                    {stats?.activeTrucks || 0}
                  </div>
                  <small className="text-body-secondary">
                    Total: {stats?.totalTrucks || 0}
                  </small>
                </div>
                <div className="bg-success bg-opacity-10 text-success rounded p-3 d-flex align-items-center">
                  <CIcon icon={cilTruck} size="xl" />
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Active Drivers */}
        <CCol sm={6} lg={3}>
          <CCard className="mb-4">
            <CCardBody>
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-body-secondary text-uppercase fw-semibold small">
                    Active Drivers
                  </div>
                  <div className="fs-3 fw-semibold text-info">
                    {stats?.activeDrivers || 0}
                  </div>
                  <small className="text-body-secondary">
                    Total: {stats?.totalDrivers || 0}
                  </small>
                </div>
                <div className="bg-info bg-opacity-10 text-info rounded p-3 d-flex align-items-center">
                  <CIcon icon={cilPeople} size="xl" />
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Charts and Tables Row */}
      <CRow>
        {/* Work Orders by Client - Table */}
        <CCol lg={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Work Orders by Client</strong>
              <small className="text-body-secondary">Top 10 clients</small>
            </CCardHeader>
            <CCardBody>
              {workOrdersByClient.length === 0 ? (
                <div className="text-center text-body-secondary py-5">
                  No work orders found
                </div>
              ) : (
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">#</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Client Name</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Work Orders</CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {workOrdersByClient.map((client, index) => (
                      <CTableRow key={client.clientId}>
                        <CTableHeaderCell scope="row">{index + 1}</CTableHeaderCell>
                        <CTableDataCell>
                          <div className="fw-semibold">{client.clientName}</div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info" shape="rounded-pill">
                            {client.workOrderCount}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <span
                            className="text-primary cursor-pointer"
                            onClick={() => navigate(`/assets/clients/${client.clientId}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            View <CIcon icon={cilArrowRight} size="sm" />
                          </span>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* Trip Status Distribution - Doughnut Chart */}
        <CCol lg={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Trip Status Distribution</strong>
            </CCardHeader>
            <CCardBody>
              {tripStatus.length === 0 ? (
                <div className="text-center text-body-secondary py-5">
                  No trips found
                </div>
              ) : (
                <>
                  <div style={{ height: '250px' }}>
                    <CChartDoughnut
                      data={{
                        labels: tripStatus.map((item) => item.status),
                        datasets: [
                          {
                            backgroundColor: [
                              getStyle('--cui-primary'),
                              getStyle('--cui-success'),
                              getStyle('--cui-warning'),
                              getStyle('--cui-danger'),
                              getStyle('--cui-info'),
                              getStyle('--cui-secondary'),
                            ],
                            data: tripStatus.map((item) => item.count),
                          },
                        ],
                      }}
                      options={{
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>

                  <CListGroup flush className="mt-3">
                    {tripStatus.map((item, idx) => {
                      const colors = [
                        getStyle('--cui-primary'),
                        getStyle('--cui-success'),
                        getStyle('--cui-warning'),
                        getStyle('--cui-danger'),
                        getStyle('--cui-info'),
                        getStyle('--cui-secondary'),
                      ]
                      const color = colors[idx % colors.length]
                      const total = tripStatus.reduce((sum, s) => sum + (s.count || 0), 0)
                      const pct = total ? Math.round((item.count / total) * 100) : 0
                      return (
                        <CListGroupItem key={`${item.status}-${idx}`} className="d-flex align-items-center justify-content-between gap-3">
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: color,
                              }}
                            />
                            <span className="fw-semibold">{item.status || 'Unknown'}</span>
                          </div>
                          <div className="flex-grow-1 mx-2">
                            <CProgress thin color={color} value={pct} />
                          </div>
                          <div className="text-end" style={{ minWidth: '70px' }}>
                            <div className="fw-semibold">{item.count}</div>
                            <small className="text-body-secondary">{pct}%</small>
                          </div>
                        </CListGroupItem>
                      )
                    })}
                  </CListGroup>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard
