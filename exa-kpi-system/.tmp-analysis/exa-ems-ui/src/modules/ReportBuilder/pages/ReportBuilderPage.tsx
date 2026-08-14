/**
 * Custom Report Builder Page
 * Multi-step wizard for creating custom analytics reports
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardFooter,
  CButton,
  CSpinner,
  CRow,
  CCol,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSpreadsheet, cilArrowLeft } from '@coreui/icons'

import type { RootState, AppDispatch } from '../../../store'
import PageHero from '../../../components/PageHero'
import {
  generateCustomReport,
  fetchAvailableEntities,
  clearReport,
} from '../store/reportBuilderSlice'
import { reportBuilderAPI } from '../api/reportBuilder.api'
import ReportBuilderStep1 from '../components/ReportBuilderStep1'
import ReportBuilderStep2 from '../components/ReportBuilderStep2'
import ReportBuilderStep3 from '../components/ReportBuilderStep3'
import ReportResultTable from '../components/ReportResultTable'
import type { ReportBuilderWizardData, ReportSection, SelectOption, ReportEntityLists } from '../types'
import { permissionService, READ, CREATE } from '../../../services/auth/permission.service'
import { MODULE_REPORT_GENERATOR } from '../../../constants/modules'

// Asset Loaders
import { loadDrivers } from '../../Assets/Drivers/store/drivers.slice'
import { loadTrucks } from '../../Assets/Trucks/store/trucks.slice'
import { loadRateRoutes } from '../../Assets/RateRoutes/store/rateRoutes.slice'
import { loadLocations } from '../../Locations/store/locationsSlice'

const SECTIONS: ReportSection[] = [
  { value: 'clients', label: 'Clients' },
  { value: 'subdivisions', label: 'Subdivision' },
  { value: 'drivers', label: 'Drivers' },
  { value: 'trucks', label: 'Trucks' },
  { value: 'routes', label: 'Routes' },
  { value: 'locations', label: 'Locations' },
]

/**
 * Format unix timestamp to MM/DD/YYYY
 */
const formatUnixDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

/**
 * Format current date to YYYY-MM-DD
 */
const formatDateISO = (): string => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const ReportBuilderPage: React.FC = () => {
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
  const canRead = permissionService.checkPermission(MODULE_REPORT_GENERATOR, READ)
  const canCreate = permissionService.checkPermission(MODULE_REPORT_GENERATOR, CREATE)

  // Redux state
  const { report, isLoading, error, availableEntities } = useSelector(
    (state: RootState) => state.reportBuilder,
  )
  const { details } = useSelector((state: RootState) => state.auth)
  
  // Asset state - using same pattern as IncidentFormPage
  const driversState = useSelector((state: RootState) => (state as any).drivers || {})
  const trucksState = useSelector((state: RootState) => (state as any).trucks || {})
  const rateroutesState = useSelector((state: RootState) => (state as any).rateroutes || {})
  const locationsState = useSelector((state: RootState) => (state as any).locations || {})
  
  // Extract lists from state
  const driversList = driversState.list || []
  const trucksList = trucksState.list || []
  const routesList = rateroutesState.list || []
  const locationsList = locationsState.locations || []

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardData, setWizardData] = useState<ReportBuilderWizardData>({
    period: 'daily',
    axis: 'y',
    multi: true,
    data_types: undefined,
    start_date: undefined,
    end_date: undefined,
    sections: undefined,
    clients: undefined,
    subdivisions: undefined,
    drivers: undefined,
    trucks: undefined,
    routes: undefined,
    locations: undefined,
    clients_all: false,
    subdivisions_all: false,
    drivers_all: false,
    trucks_all: false,
    routes_all: false,
    locations_all: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [exporting, setExporting] = useState(false)
  const [emptyReport, setEmptyReport] = useState(false)

  // Check permissions on mount and load master data
  useEffect(() => {
    if (!canRead) {
      showToast('You do not have permission to access this module.', 'danger')
      navigate('/dashboard')
      return
    }

    console.log('=== ReportBuilderPage MOUNT - Loading master lists ===')
    
    // Load master lists (same as IncidentFormPage)
    dispatch(loadDrivers())
    dispatch(loadTrucks())
    dispatch(loadRateRoutes())
    dispatch(loadLocations())

    return () => {
      dispatch(clearReport())
    }
  }, [canRead, navigate, dispatch])

  // Memoized entity lists to prevent infinite re-renders
  const hydratedEntityLists = useMemo((): ReportEntityLists => {
    // Get clients and subdivisions from auth details
    const clientsList = details?.details?.clients || []
    const subdivisionsList = details?.details?.subdivisions || []

    // Helper to convert list to SelectOption format
    const toOptions = (
      list: any[],
      idKey: string,
      labelKey: string | ((item: any) => string),
    ) => {
      if (!list || list.length === 0) return []
      
      return list
        .filter((item) => item && (item[idKey] !== undefined && item[idKey] !== null))
        .map((item) => ({
          value: String(item[idKey]),
          label: typeof labelKey === 'function' ? labelKey(item) : item[labelKey] || item.name || `Item ${item[idKey]}`,
        }))
    }

    // Helper to filter by IDs
    const filterByIds = (options: any[], ids: (number | string)[] | undefined) => {
      if (!ids || ids.length === 0) return options
      const stringIds = ids.map(id => String(id))
      return options.filter(opt => stringIds.includes(opt.value))
    }

    // Convert raw lists to options format
    const allClients = toOptions(
      clientsList.filter((c: any) => c.status === 1), 
      'client_id', 
      'name'
    )
    const allSubdivisions = toOptions(
      subdivisionsList.filter((s: any) => s.status === 1), 
      'subdivision_id', 
      'name'
    )
    const allDrivers = toOptions(
      driversList || [], 
      'asset_id', 
      (d: any) => {
        const name = [d.first_name ?? d.attributes?.['21'], d.last_name ?? d.attributes?.['22']]
          .filter(Boolean)
          .join(' ')
        return name || d.generic_name1 || d.internal_identification || d.name || `Driver ${d.asset_id}`
      }
    )
    const allTrucks = toOptions(
      trucksList || [], 
      'asset_id', 
      (t: any) => {
        const brand = t.attributes?.['9'] || ''
        const model = t.attributes?.['12'] || ''
        const combinedLabel = [brand, model].filter(Boolean).join(' ')
        return combinedLabel || t.truck_plate || t.plate || t.name || `Truck ${t.asset_id}`
      }
    )
    const allRoutes = toOptions(
      routesList || [], 
      'route_id', 
      (r: any) => r.full_name || r.name || r.route || `Route ${r.route_id}`
    )
    const allLocations = toOptions(
      (locationsList || []).filter((l: any) => l.name && l.status), 
      'location_id', 
      (l: any) => `${l.name || 'Location'} (${l.city?.name || ''})`
    )

    // Apply API filtering if available, otherwise return all
    return {
      clients: availableEntities?.clients ? filterByIds(allClients, availableEntities.clients) : allClients,
      subdivisions: availableEntities?.subdivisions ? filterByIds(allSubdivisions, availableEntities.subdivisions) : allSubdivisions,
      drivers: availableEntities?.drivers ? filterByIds(allDrivers, availableEntities.drivers) : allDrivers,
      trucks: availableEntities?.trucks ? filterByIds(allTrucks, availableEntities.trucks) : allTrucks,
      routes: availableEntities?.routes ? filterByIds(allRoutes, availableEntities.routes) : allRoutes,
      locations: availableEntities?.locations ? filterByIds(allLocations, availableEntities.locations) : allLocations,
    }
  }, [details, driversList, trucksList, routesList, locationsList, availableEntities])

  // Show error toast
  useEffect(() => {
    if (error) {
      showToast(error, 'danger')
    }
  }, [error, showToast])

  const handleWizardChange = (e: any) => {
    const { name, value, checked } = e.target

    setWizardData((prevData) => {
      const newData = { ...prevData }

      if (name.endsWith('_all')) {
        newData[name as keyof ReportBuilderWizardData] = checked as any
        if (checked) {
          const fieldName = name.replace('_all', '')
          newData[fieldName as keyof ReportBuilderWizardData] = null as any
        }
      } else {
        newData[name as keyof ReportBuilderWizardData] = value as any
      }
      return newData
    })

    // Clear error for this field
    if (errors[name]) {
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!wizardData.start_date) {
      newErrors.start_date = 'Start date is required'
    }
    if (!wizardData.end_date) {
      newErrors.end_date = 'End date is required'
    }
    if (wizardData.start_date && wizardData.end_date && wizardData.start_date >= wizardData.end_date) {
      newErrors.end_date = 'End date must be after start date'
    }
    if (!wizardData.data_types || wizardData.data_types.length === 0) {
      newErrors.data_types = 'Please select at least one data type'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!wizardData.sections || wizardData.sections.length === 0) {
      newErrors.sections = 'Please select at least one section'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {}
    const sections = wizardData.sections || []

    sections.forEach((section) => {
      const allFieldName = `${section}_all`
      const isSelectAll = (wizardData as any)[allFieldName]
      const values = (wizardData as any)[section]

      if (!isSelectAll && (!values || values.length === 0)) {
        newErrors[section] = `Please select at least one ${section} or enable "Select All"`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const goToNextStep = async () => {
    let isValid = false

    switch (wizardStep) {
      case 1:
        isValid = validateStep1()
        break
      case 2:
        isValid = validateStep2()
        if (isValid) {
          // Fetch available entities
          await dispatch(fetchAvailableEntities(wizardData))
        }
        break
      case 3:
        isValid = validateStep3()
        break
    }

    if (isValid) {
      setWizardStep(wizardStep + 1)
      setErrors({})
    }
  }

  const goToPrevStep = () => {
    setWizardStep(wizardStep - 1)
    setErrors({})
  }

  const hasRows = (data: any): boolean => {
    if (!Array.isArray(data)) return false
    return data.some((item) => {
      const table = item.table || {}
      const rows = table.columns || table.rows || item.rows || []
      return Array.isArray(rows) && rows.length > 0
    })
  }

  const handleGenerateReport = async () => {
    if (!canCreate) {
      showToast('You do not have permission to generate reports.', 'warning')
      return
    }

    if (validateStep3()) {
      try {
        const result = await dispatch(generateCustomReport(wizardData)).unwrap()
        setEmptyReport(!hasRows(result))
        setWizardStep(4)
      } catch (err: any) {
        showToast(typeof err === 'string' ? err : 'Failed to generate report', 'danger')
      }
    }
  }

  const handleExport = async () => {
    if (!validateStep3()) return

    setExporting(true)
    try {
      const blob = await reportBuilderAPI.exportReport(wizardData, { format: 'xlsx' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Custom_Report_${formatDateISO()}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showToast('Report exported successfully', 'success')
    } catch (err) {
      console.error('Export failed:', err)
      showToast('Failed to export report', 'danger')
    } finally {
      setExporting(false)
    }
  }

  if (!canRead) {
    return null
  }

  // Calculate container offset based on step
  const containerSize = wizardStep < 4 ? 8 : 12
  const containerOffset = wizardStep < 4 ? 2 : 0

  const normalizedReport = useMemo(() => {
    if (!report || !Array.isArray(report)) return []
    return report.map((item: any) => {
      const table = item.table || item
      const header = table.header || table.columns?.[0]?.map?.(() => '') || table.headers || []
      const rows = table.columns || table.rows || []
      const totals = table.footer || table.total || table.totals || null
      return {
        title: item.title || 'Report',
        columns: Array.isArray(header) ? header.map((h: any) => h ?? '') : [],
        rows: Array.isArray(rows) ? rows : [],
        totals: Array.isArray(totals) ? totals : undefined,
      }
    })
  }, [report])

  return (
    <>
      <PageHero
        title="Custom Report Builder"
        subtitle="Create custom analytics reports with flexible filtering and grouping"
        icon={cilSpreadsheet}
      />

      <CRow>
        <CCol md={{ span: containerSize, offset: containerOffset }}>
          {wizardStep === 1 && (
            <ReportBuilderStep1
              data={wizardData}
              errors={errors}
              onChange={handleWizardChange}
              onNext={goToNextStep}
              loading={isLoading}
            />
          )}

          {wizardStep === 2 && (
            <ReportBuilderStep2
              data={wizardData}
              errors={errors}
              sections={SECTIONS}
              onChange={handleWizardChange}
              onNext={goToNextStep}
              onPrev={goToPrevStep}
              loading={isLoading}
            />
          )}

          {wizardStep === 3 && (
            <ReportBuilderStep3
              data={wizardData}
              errors={errors}
              entityLists={hydratedEntityLists}
              onChange={handleWizardChange}
              onGenerate={handleGenerateReport}
              onPrev={goToPrevStep}
              onExport={handleExport}
              loading={isLoading}
              exporting={exporting}
            />
          )}

          {wizardStep === 4 && (
            <CCard className="shadow-sm border-0 mb-5">
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
                    Analytics
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    Report Summary
                  </div>
                  <small className="text-body-secondary">
                    {wizardData.start_date && formatUnixDate(wizardData.start_date)} —{' '}
                    {wizardData.end_date && formatUnixDate(wizardData.end_date)} •{' '}
                    {wizardData.period.charAt(0).toUpperCase() + wizardData.period.slice(1)}
                  </small>
                </div>
                <CIcon icon={cilSpreadsheet} size="xl" className="text-body-secondary" />
              </CCardHeader>
              <CCardBody>
                {isLoading && (
                  <div className="text-center py-5">
                    <CSpinner color="primary" />
                    <p className="mt-2 text-muted">Generating report...</p>
                  </div>
                )}

                {!isLoading && normalizedReport.length > 0 && !emptyReport ? (
                  normalizedReport.map((table, idx) => <ReportResultTable key={idx} {...table} />)
                ) : null}

                {!isLoading && (emptyReport || normalizedReport.length === 0) && (
                  <div className="alert alert-info text-center mb-0">
                    No data available for the selected filters.
                  </div>
                )}
              </CCardBody>
              <CCardFooter>
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => setWizardStep(3)}
                >
                  <CIcon icon={cilArrowLeft} className="me-1" />
                  Back to Configuration
                </CButton>
              </CCardFooter>
            </CCard>
          )}
        </CCol>
      </CRow>
      
      <CToaster ref={toaster} push={toast} placement="top-end" />
    </>
  )
}

export default ReportBuilderPage
