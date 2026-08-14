/**
 * Weekly Analytics Page
 * Main page for generating and viewing weekly analytics reports
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardFooter,
  CButton,
  CSpinner,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilChartPie, cilArrowLeft } from '@coreui/icons'

import type { RootState, AppDispatch } from '../../../store'
import PageHero from '../../../components/PageHero'
import { generateWeeklyReport, clearReport } from '../store/weeklyAnalyticsSlice'
import { weeklyAnalyticsAPI } from '../api/weeklyAnalytics.api'
import apiClient from '../../../services/api/axios.config'
import WeeklySummaryWizard from '../components/WeeklySummaryWizard'
import WeeklySummaryTable from '../components/WeeklySummaryTable'
import WeeklySummaryMatrix from '../components/WeeklySummaryMatrix'
import type { WeeklyAnalyticsFilter } from '../types'
import { permissionService, READ, CREATE } from '../../../services/auth/permission.service'
import { MODULE_REPORT_WEEK_SUMMARY } from '../../../constants/modules'
import { loadClients } from '../../Assets/Clients/store/clients.slice'
import { loadSubdivisions } from '../../Assets/Subdivisions/store/subdivisions.slice'
import '../components/WeeklyAnalytics.scss'

const WeeklyAnalyticsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  
  // Toast notification setup
  const [toast, setToast] = useState<React.ReactElement | null>(null)
  const toaster = useRef<HTMLDivElement | null>(null)
  
  const showToast = useCallback((message: string, color: 'success' | 'danger' | 'warning' = 'info') => {
    setToast(
      <CToast autohide delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }, [])

  // Permission checks
  const canRead = permissionService.checkPermission(MODULE_REPORT_WEEK_SUMMARY, READ)
  const canCreate = permissionService.checkPermission(MODULE_REPORT_WEEK_SUMMARY, CREATE)

  // Redux state
  const { report, isLoading, error } = useSelector((state: RootState) => state.weeklyAnalytics)
  const { details } = useSelector((state: RootState) => state.auth)
  const clientsState = useSelector((state: RootState) => (state as any).clients || {})
  const subdivisionsState = useSelector((state: RootState) => (state as any).subdivisions || {})

  // Local state
  const [currentFilter, setCurrentFilter] = useState<WeeklyAnalyticsFilter | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingXlsx, setExportingXlsx] = useState(false)
  const [weeksLoading, setWeeksLoading] = useState(false)
  const [weeks, setWeeks] = useState<any[] | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [emptyReport, setEmptyReport] = useState(false)

  // Check permissions on mount
  useEffect(() => {
    if (!canRead) {
      showToast('You do not have permission to access this module.', 'danger')
      navigate('/dashboard')
      return
    }
  }, [canRead, navigate, showToast])

  // Load weeks data
  useEffect(() => {
    const loadWeeks = async () => {
      setWeeksLoading(true)
      try {
        const response = await apiClient.get('/weeks', {
          params: { active: true }
        })
        // Handle response structure
        const weeksData = response.data?.data?.weeks || response.data?.weeks || response.data || []
        setWeeks(weeksData)
      } catch (err) {
        console.error('Failed to load weeks:', err)
        setWeeks([])
      } finally {
        setWeeksLoading(false)
      }
    }

    loadWeeks()

    // Load master lists
    dispatch(loadClients())
    dispatch(loadSubdivisions())

    return () => {
      dispatch(clearReport())
    }
  }, [dispatch])

  // Show error toast
  useEffect(() => {
    if (error) {
      showToast(error, 'danger')
    }
  }, [error, showToast])

  const handleGenerateReport = async (filter: WeeklyAnalyticsFilter) => {
    if (!canCreate) {
      showToast('You do not have permission to generate reports.', 'warning')
      return
    }

    setCurrentFilter(filter)
    setEmptyReport(false)
    
    try {
      const result = await dispatch(generateWeeklyReport(filter)).unwrap()
      console.log('[WeeklyAnalytics] Report generated:', result)
      
      // Check if report has data
      const hasData = result && (
        (result.tables && result.tables.length > 0) || 
        (result.matrices && result.matrices.length > 0)
      )
      
      setEmptyReport(!hasData)
      setShowReport(true)
      showToast('Report generated successfully', 'success')
    } catch (err: any) {
      console.error('[WeeklyAnalytics] Error generating report:', err)
      showToast(typeof err === 'string' ? err : 'Failed to generate report', 'danger')
    }
  }

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    if (!currentFilter) return

    const setLoading = format === 'pdf' ? setExportingPdf : setExportingXlsx
    setLoading(true)

    try {
      const blob = await weeklyAnalyticsAPI.exportReport(currentFilter, { format })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Weekly_Analytics_Report.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showToast(`Report exported as ${format.toUpperCase()} successfully`, 'success')
    } catch (err) {
      console.error('Export failed:', err)
      showToast('Failed to export report', 'danger')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToConfig = () => {
    setShowReport(false)
    dispatch(clearReport())
  }

  // Check if report has any data
  const hasReportData = useMemo(() => {
    if (!report) return false
    const hasTables = report.tables && report.tables.length > 0
    const hasMatrices = report.matrices && report.matrices.length > 0
    return hasTables || hasMatrices
  }, [report])

  if (!canRead) {
    return null
  }

  // Prefer master lists, fallback to auth details
  const clientsList = clientsState.list?.length ? clientsState.list : (details?.details?.clients || details?.clients || [])
  const subdivisionsList = subdivisionsState.list?.length ? subdivisionsState.list : (details?.details?.subdivisions || details?.subdivisions || [])

  return (
    <>
      <PageHero
        title="Weekly Analytics"
        subtitle="Generate comprehensive weekly reports with key performance metrics"
        icon={cilChartPie}
      />

      {/* Configuration Section - Show when not viewing report */}
      {!showReport && (
        <WeeklySummaryWizard
          weeks={weeksLoading ? null : weeks}
          clients={clientsList}
          subdivisions={subdivisionsList}
          onSubmit={handleGenerateReport}
          loading={isLoading}
        />
      )}

      {/* Report Section - Show after generating */}
      {showReport && (
        <CCard className="shadow-sm border-0 mb-5">
          {/* Hero-style Header */}
          <CCardHeader 
            className="d-flex justify-content-between align-items-center"
            style={{ 
              backgroundColor: 'var(--cui-card-cap-bg)', 
              borderBottom: '1px solid var(--cui-border-color)',
              padding: '1.25rem 1.5rem'
            }}
          >
            <div>
              <div 
                className="text-uppercase fw-semibold"
                style={{ 
                  letterSpacing: '0.05em', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  color: 'var(--cui-body-color)',
                  opacity: 0.7
                }}
              >
                Analytics Report
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                Weekly Summary Report
              </div>
              {report?.title && (
                <small className="text-body-secondary">
                  {report.title}
                </small>
              )}
            </div>
            <CIcon icon={cilChartPie} size="xl" className="text-body-secondary" />
          </CCardHeader>
          
          <CCardBody>
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-5">
                <CSpinner color="primary" />
                <p className="mt-2 text-muted">Generating report...</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && (emptyReport || !hasReportData) && (
              <div className="alert alert-info text-center mb-0">
                <CIcon icon={cilChartPie} className="me-2" />
                No data available for the selected filters. Please adjust your selection and try again.
              </div>
            )}

            {/* Report Data */}
            {!isLoading && hasReportData && (
              <>
                {/* Tables Section */}
                {report?.tables && report.tables.length > 0 && (
                  <div className="mb-4">
                    <h5 className="mb-3 text-body-secondary">
                      <strong>Detail Tables</strong>
                    </h5>
                    {report.tables.map((tableData, idx) => (
                      <WeeklySummaryTable key={`table-${idx}`} data={tableData} />
                    ))}
                  </div>
                )}

                {/* Matrices Section */}
                {report?.matrices && report.matrices.length > 0 && (
                  <div className="mb-4">
                    <h5 className="mb-3 text-body-secondary">
                      <strong>Summary Matrices</strong>
                    </h5>
                    {report.matrices.map((matrixData, idx) => (
                      <WeeklySummaryMatrix key={`matrix-${idx}`} data={matrixData} />
                    ))}
                  </div>
                )}
              </>
            )}
          </CCardBody>
          
          <CCardFooter className="d-flex justify-content-between align-items-center">
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={handleBackToConfig}
            >
              <CIcon icon={cilArrowLeft} className="me-1" />
              Back to Configuration
            </CButton>
            
            {hasReportData && (
              <div>
                <CButton
                  color="danger"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  disabled={exportingPdf || isLoading}
                  className="me-2 text-white"
                >
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  {exportingPdf ? 'Exporting...' : 'Export PDF'}
                </CButton>
                <CButton
                  color="success"
                  size="sm"
                  onClick={() => handleExport('xlsx')}
                  disabled={exportingXlsx || isLoading}
                  className="text-white"
                >
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  {exportingXlsx ? 'Exporting...' : 'Export Excel'}
                </CButton>
              </div>
            )}
          </CCardFooter>
        </CCard>
      )}
      
      <CToaster ref={toaster} push={toast} placement="top-end" />
    </>
  )
}

export default WeeklyAnalyticsPage

