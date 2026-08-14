import React, { useEffect, useState, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CAlert, CCard, CCardBody, CCardHeader, CButton, CSpinner } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ErrorMessageModal from '../../../../components/ErrorMessageModal'
import FiltersForm from '../components/FiltersForm'
import ReportTable from '../components/ReportTable'
import {
  generateFuelWeekReport,
  loadFuelStatementStatuses,
  loadSupplierStatementStatuses,
  loadAssetTypes,
  loadOrderTypes,
  loadReconciliationStatuses,
  clearSummary,
  clearErrors,
  selectFuelWeekSummary,
  selectFuelWeekSummaryLoading,
  selectFuelWeekSummaryErrors,
  selectFuelStatementStatuses,
  selectSupplierStatementStatuses,
  selectAssetTypes,
  selectOrderTypes,
  selectReconciliationStatuses,
} from '../store/fuelWeekSummary.slice'
import { fetchAllGasStores, selectAllGasStores } from '../../GasSupplier/store/gasSupplier.slice'
import { loadWeeks } from '../../../Weeks/store/weeksSlice'
import { fuelWeekSummaryApi } from '../api/fuelWeekSummary.api'
import type { AttributeOption } from '../types/fuelWeekSummary.types'

const NO_STATUS_OPTION: AttributeOption = { value: 100, label: 'No Status Assigned' }

const FuelWeekSummaryPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const summary = useSelector(selectFuelWeekSummary)
  const loading = useSelector(selectFuelWeekSummaryLoading)
  const errors = useSelector(selectFuelWeekSummaryErrors)

  const fuelStatementStatuses = useSelector(selectFuelStatementStatuses)
  const supplierStatementStatuses = useSelector(selectSupplierStatementStatuses)
  const assetTypes = useSelector(selectAssetTypes)
  const orderTypes = useSelector(selectOrderTypes)
  const reconciliationStatuses = useSelector(selectReconciliationStatuses)

  const subdivisionsList = useSelector((s: RootState) => (s.auth as any)?.details?.details?.subdivisions ?? [])
  const gasStationsList = useSelector(selectAllGasStores)
  const weeksList = useSelector((s: RootState) => (s as any).weeks?.weeks ?? [])
  const clientsList = useSelector((s: RootState) => (s.auth as any)?.details?.details?.clients ?? [])

  const [filters, setFilters] = useState<Record<string, number[]>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    dispatch(fetchAllGasStores())
    dispatch(loadWeeks())
    dispatch(loadFuelStatementStatuses())
    dispatch(loadSupplierStatementStatuses())
    dispatch(loadAssetTypes())
    dispatch(loadOrderTypes())
    dispatch(loadReconciliationStatuses())
    return () => { dispatch(clearSummary()) }
  }, [dispatch])

  useEffect(() => {
    if (errors) {
      const msg = typeof errors === 'object' && 'message' in errors ? errors.message : String(errors)
      setErrorMessage(msg ?? 'An error occurred')
      dispatch(clearErrors())
      setShowResults(false)
    }
  }, [errors, dispatch])

  useEffect(() => {
    if (summary.length > 0) setShowResults(true)
    else if (!loading) setShowResults(false)
  }, [summary, loading])

  const filteredWeeks = weeksList
    .filter((w: any) => Number(w.week_year) >= 2025)
    .map((w: any) => ({
      value: w.week_id ?? w.id,
      label: `${w.week_year} - W ${w.week_no}`,
    }))

  const gasStationOptions = gasStationsList.map((s: any) => ({
    value: s.gasStationsId ?? s.gasSupplierid,
    label: s.name,
  }))

  const subdivisionOptions = subdivisionsList.map((s: any) => ({
    value: s.subdivision_id,
    label: s.name,
  }))

  const clientOptions = clientsList.map((c: any) => ({
    value: c.client_id,
    label: c.name,
  }))

  const fuelStmtStatusOpts = fuelStatementStatuses.length
    ? [...fuelStatementStatuses, NO_STATUS_OPTION]
    : []
  const supplierStmtStatusOpts = supplierStatementStatuses.length
    ? [...supplierStatementStatuses, NO_STATUS_OPTION]
    : []
  const reconStatusOpts = reconciliationStatuses.length
    ? [...reconciliationStatuses, NO_STATUS_OPTION]
    : []

  const handleChange = useCallback((name: string, values: number[]) => {
    setFilters((prev) => ({ ...prev, [name]: values }))
  }, [])

  const handleSelectAll = useCallback((name: string, options: AttributeOption[], checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      [name]: checked ? options.map((o) => o.value) : [],
    }))
  }, [])

  const getCleanFilters = useCallback(() => {
    const allowedKeys = [
      'assetTypeIds', 'fuelStatementStatusIds', 'gasSupplierIds',
      'subdivisionIds', 'supplierStatementStatusIds', 'weekIds',
      'clientIds', 'reconciliationStatusIds', 'orderTypeIds',
    ]
    const clean: Record<string, number[]> = {}
    for (const key of allowedKeys) {
      if (filters[key]?.length) clean[key] = filters[key]
    }
    return Object.keys(clean).length > 0 ? clean : null
  }, [filters])

  const hasFilters = !!getCleanFilters()

  const handleGenerate = useCallback(() => {
    const cleanFilters = getCleanFilters()
    if (!cleanFilters) return
    setHasSearched(true)
    dispatch(generateFuelWeekReport(cleanFilters))
  }, [getCleanFilters, dispatch])

  const handleDownloadXlsx = useCallback(async () => {
    const cleanFilters = getCleanFilters()
    if (!cleanFilters) return
    try {
      const blob = await fuelWeekSummaryApi.downloadXlsx(cleanFilters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'fuel_week_summary.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }, [getCleanFilters])

  return (
    <>
      <PageHero title="Fuel Week Summary" />
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Fuel Week Summary</strong>
          {showResults && (
            <CButton color="success" size="sm" onClick={handleDownloadXlsx}>
              <CIcon icon={cilCloudDownload} size="sm" /> Export XLSX
            </CButton>
          )}
        </CCardHeader>
        <CCardBody>
          <FiltersForm
            filters={filters}
            weekOptions={filteredWeeks}
            gasStationOptions={gasStationOptions}
            subdivisionOptions={subdivisionOptions}
            clientOptions={clientOptions}
            fuelStatementStatusOptions={fuelStmtStatusOpts}
            supplierStatementStatusOptions={supplierStmtStatusOpts}
            assetTypeOptions={assetTypes}
            orderTypeOptions={orderTypes}
            reconciliationStatusOptions={reconStatusOpts}
            onChange={handleChange}
            onSelectAll={handleSelectAll}
            onGenerate={handleGenerate}
            hasFilters={hasFilters}
          />

          {loading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}

          {showResults && !loading && <ReportTable data={summary} />}

          {hasSearched && !loading && !showResults && (
            <CAlert color="info" className="text-center mt-3">
              No results found. Try adjusting your filters and search again.
            </CAlert>
          )}
        </CCardBody>
      </CCard>

      <ErrorMessageModal
        visible={!!errorMessage}
        message={errorMessage ?? ''}
        onClose={() => setErrorMessage(null)}
      />
    </>
  )
}

export default FuelWeekSummaryPage
