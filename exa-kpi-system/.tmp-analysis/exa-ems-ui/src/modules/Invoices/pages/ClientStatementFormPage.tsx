import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CMultiSelect,
  CRow,
  CSpinner,
  CBadge,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCheckCircle, cilLibrary, cilSave, cilCloudDownload, cilFile, cilWarning, cilTrash, cilPlus } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../store'
import { loadInvoice, loadInvoiceTrips, createInvoice, updateInvoice, clearCurrentInvoice } from '../store/invoices.slice'
import { loadFormats } from '../../FormatBuilder/store/formatBuilderSlice'
import { loadWeeks } from '../../Weeks/store/weeksSlice'
import { loadClients } from '../../Assets/Clients/store/clients.slice'
import type { Invoice, InvoiceTableData } from '../types'
import { permissionService, UPDATE, CREATE } from '../../../services/auth/permission.service'
import { MODULE_INVOICE } from '../../../constants/modules'
import ClientStatementTable from '../components/ClientStatementTable'
import BrokenTripsModal from '../components/BrokenTripsModal'
import { invoicesAPI } from '../api/invoices.api'
import './ClientStatementFormPage.scss'

const defaultValues: Invoice = {
  weeks: '',
  invoiceformatid: '',
  clientid: '',
  daterange: 'ALL',
  currencyrate: '0',
  invoicenumber: '',
  notes: '',
}

const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20

const ClientStatementFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id && id !== 'new')
  const navigate = useNavigate()
  const location = useLocation()
  const viewMode = new URLSearchParams(location.search).get('mode') === 'view'
  const dispatch = useDispatch<AppDispatch>()

  const { current, trips, loading } = useSelector((state: RootState) => (state as any).invoices || {})
  const formatsState = useSelector((state: RootState) => (state as any).formatbuilder || {})
  const weeksState = useSelector((state: RootState) => (state as any).weeks || {})
  const clientsState = useSelector((state: RootState) => (state as any).clients || {})

  const [formValues, setFormValues] = useState<Invoice>({ ...defaultValues })
  const [showSuccess, setShowSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [brokenTripsModalVisible, setBrokenTripsModalVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(isEdit ? 2 : 1)
  const [stepLoading, setStepLoading] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [localTrips, setLocalTrips] = useState<InvoiceTableData | null>(null)
  const [selectedTripRows, setSelectedTripRows] = useState<Array<{ index: number; trip: any }>>([])
  const [addTripsLoading, setAddTripsLoading] = useState(false)
  const [availableTrips, setAvailableTrips] = useState<any[] | null>(null)
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<Set<string | number>>(new Set())
  const [availableError, setAvailableError] = useState<string | null>(null)
  const [showAvailableTrips, setShowAvailableTrips] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [availableFilters, setAvailableFilters] = useState<Record<string, string>>({})
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  const extractTripId = (trip: any) => trip?.['Trip_Trip ID'] ?? trip?.trip_id ?? trip?.id

  const canEdit = !viewMode && permissionService.checkPermission(MODULE_INVOICE, isEdit ? UPDATE : CREATE)

  useEffect(() => {
    const loadMetadata = async () => {
      await Promise.all([
        dispatch(loadFormats()),
        dispatch(loadWeeks()),
        dispatch(loadClients()),
      ])
      setMetadataLoaded(true)
    }
    loadMetadata()
  }, [dispatch])

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        await Promise.all([
          dispatch(loadInvoice(id)),
          dispatch(loadInvoiceTrips(id)),
        ])
      } else {
        dispatch(clearCurrentInvoice())
        setFormValues(defaultValues)
        setCurrentStep(1)
      }
      setDataLoaded(true)
    }
    loadData()
  }, [dispatch, id, isEdit])

  useEffect(() => {
    if (current) {
      setFormValues({ ...defaultValues, ...current })
      setCurrentStep(isEdit ? 2 : currentStep)
    }
  }, [current])

  useEffect(() => {
    setLocalTrips(trips || null)
    setSelectedTripRows([])
  }, [trips])

  const formatOptions = useMemo(() => {
    const list = formatsState?.formats || formatsState?.data || []
    return (list as any[]).map((fmt: any) => ({
      value: String(fmt.invoiceformat_id ?? fmt.id ?? ''),
      label: fmt.name,
    }))
  }, [formatsState])

  const weekOptions = useMemo(() => {
    const base = (weeksState?.weeks || []).map((wk: any) => ({
      value: String(wk.week_id ?? wk.id ?? ''),
      label: wk.week_no ? `Week ${wk.week_no} - ${wk.week_year}` : wk.name || String(wk.week_id ?? wk.id ?? ''),
    }))

    // Include historical weeks that may not be in the active list so saved statements still show their values.
    const legacy = Array.isArray(formValues.week_list)
      ? formValues.week_list
          .map((wk: any) => ({
            value: String(wk.week_id ?? wk.id ?? wk.value ?? ''),
            label:
              wk.week_name ||
              wk.name ||
              (wk.week_no ? `Week ${wk.week_no} - ${wk.week_year}` : String(wk.week_id ?? wk.id ?? wk.value ?? '')),
          }))
          .filter((wk) => wk.value)
      : []

    const mergedMap = new Map<string, string>()
    base.concat(legacy).forEach((wk) => {
      if (!mergedMap.has(wk.value)) {
        mergedMap.set(wk.value, wk.label)
      }
    })

    return Array.from(mergedMap.entries()).map(([value, label]) => ({ value, label }))
  }, [weeksState, formValues.week_list])

  const clientOptions = useMemo(() => {
    return (clientsState?.list || []).map((c: any) => ({
      value: String(c.client_id ?? c.id ?? ''),
      label: c.name,
    }))
  }, [clientsState])

  const weekValueArray = useMemo(() => {
    if (!formValues.weeks && Array.isArray(formValues.week_list)) {
      return formValues.week_list
        .map((w: any) => String(w.week_id ?? w.id ?? w.value ?? '').trim())
        .filter(Boolean)
    }
    if (!formValues.weeks) return []
    return String(formValues.weeks)
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean)
  }, [formValues.weeks, formValues.week_list])

  const weekLabel = useMemo(() => {
    if (!weekValueArray.length) return '—'
    const map = new Map(weekOptions.map((opt) => [opt.value, opt.label]))
    return weekValueArray.map((w) => map.get(w) || w).join(', ')
  }, [weekOptions, weekValueArray])

  const availableCellStyle: React.CSSProperties = {
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  }

  const availableColumnWidths: Record<string, number> = {
    'Trip_WO Reference Number': 260,
    'Trip_Route': 170,
    'Trip_Container': 160,
    'Trip_Trip ID': 110,
    'Trip_Trip Date': 140,
    'Trip_WO number': 130,
    '3_Truck Plate': 130,
    Subdivision_Name: 200,
    '9_First Name': 140,
    '9_Last Name': 140,
    Client_Name: 180,
    Trip_KM: 120,
    'Trip_Total Km/Rate Lps': 170,
    'Trip_Sub Total': 140,
    Trip_Total: 140,
    'Trip_Total Km/Rate $': 170,
    'Trip_Pick up': 150,
    'Trip_Delivery': 150,
    'Trip_Return to': 150,
    'Trip_Cargo Type': 150,
    'Trip_Container Type': 170,
    'Trip_Additional Charges': 170,
  }

  const getAvailableColStyle = (col: string): React.CSSProperties => ({
    minWidth: col === '_selector' ? 56 : availableColumnWidths[col] ?? 140,
    whiteSpace: 'normal',
  })

  const visibleAvailableColumns = useMemo(
    () =>
      availableColumns && availableColumns.length
        ? availableColumns
        : [
            'Trip_Trip ID',
            'Trip_WO Reference Number',
            'Trip_WO number',
            'Trip_Trip Date',
            '3_Truck Plate',
            'Subdivision_Name',
            '9_First Name',
            '9_Last Name',
            'Client_Name',
            'Trip_Route',
            'Trip_Container',
            'Trip_KM',
            'Trip_Total Km/Rate Lps',
            'Trip_Sub Total',
            'Trip_Total',
            'Trip_Pick up',
            'Trip_Delivery',
            'Trip_Return to',
            'Trip_Cargo Type',
            'Trip_Container Type',
            'Trip_Total Km/Rate $',
            'Trip_Additional Charges',
          ],
    [availableColumns]
  )

  const filteredAvailableTrips = useMemo(() => {
    if (!availableTrips) return []
    const entries = Object.entries(availableFilters).filter(([, v]) => v && v.trim())
    if (!entries.length) return availableTrips
    return availableTrips.filter((trip) =>
      entries.every(([col, val]) => {
        const haystack = String(trip[col] ?? '').toLowerCase()
        return haystack.includes(val.toLowerCase())
      })
    )
  }, [availableTrips, availableFilters])

  const dateRangePresets = [
    { value: 'ALL', label: 'All' },
    { value: 'NOW', label: 'Today' },
    { value: '-1 week', label: 'Week to Date' },
    { value: '-2 week', label: '2 Week to Date' },
    { value: '-3 week', label: '3 Week to Date' },
    { value: '-1 month', label: 'Month to Date' },
    { value: '-6 month', label: '6 Month to Date' },
    { value: '-1 year', label: 'Year to Date' },
  ]

  const createDateDisplay = useMemo(() => {
    if (formValues.create_date_format) return formValues.create_date_format
    if (!formValues.create_date) return '—'
    const num = Number(formValues.create_date)
    if (!isNaN(num)) {
      const d = new Date(num * 1000)
      return d.toLocaleDateString()
    }
    return formValues.create_date
  }, [formValues.create_date, formValues.create_date_format])

  const handleChange = (key: keyof Invoice, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    setSaving(true)
    try {
      const targetId = id && id !== 'new' ? id : formValues.invoice_id ?? formValues.id
      const currentTrips = localTrips?.trips || formValues.trips || []
      const tripIds = currentTrips.map((t: any) => Number(extractTripId(t))).filter((v) => !isNaN(v))
      const payload: any = {
        ...formValues,
        trips: currentTrips,
        trip_ids: tripIds,
      }
      if (targetId) {
        await dispatch(updateInvoice({ id: targetId, payload })).unwrap()
      } else {
        const created = await dispatch(createInvoice(payload)).unwrap()
        navigate(`/operations/client-statements/${created.invoice_id ?? created.id}`)
      }
      setShowSuccess(true)
    } catch (error) {
      console.error('Failed to save statement', error)
    } finally {
      setSaving(false)
    }
  }

  const handleExportPDF = async () => {
    const exportId = id && id !== 'new' ? id : formValues.invoice_id ?? formValues.id
    if (!exportId) return
    try {
      await invoicesAPI.downloadClientStatementPDF(exportId)
    } catch (error) {
      console.error('Failed to export PDF', error)
    }
  }

  const handleExportXLSX = async () => {
    const exportId = id && id !== 'new' ? id : formValues.invoice_id ?? formValues.id
    if (!exportId) return
    try {
      await invoicesAPI.downloadClientStatementXLSX(exportId)
    } catch (error) {
      console.error('Failed to export XLSX', error)
    }
  }

  const brokenTrips = trips?.broken || []

  const handleBuilderContinue = async () => {
    if (!canEdit) return
    if (!formValues.clientid || !formValues.invoiceformatid || !weekValueArray.length || !formValues.currencyrate) {
      setStepError('Please select client, format, weeks, and a currency rate before continuing.')
      return
    }
    setStepError(null)
    setStepLoading(true)
    try {
      const currentTrips = localTrips?.trips || formValues.trips || []
      const tripIds = currentTrips.map((t: any) => Number(extractTripId(t))).filter((v) => !isNaN(v))
      const payload = {
        ...formValues,
        weeks: weekValueArray.join(','),
        daterange: formValues.daterange || 'ALL',
        trips: currentTrips,
        trip_ids: tripIds,
      }
      const created = await dispatch(createInvoice(payload)).unwrap()
      const createdId = created.invoice_id ?? created.id
      setFormValues({ ...formValues, ...created })
      if (createdId) {
        navigate(`/operations/client-statements/${createdId}`, { replace: true })
        dispatch(loadInvoice(createdId))
        dispatch(loadInvoiceTrips(createdId))
      } else {
        setCurrentStep(2)
      }
    } catch (error) {
      console.error('Failed to start statement builder', error)
      setStepError('Unable to continue. Please check the fields and try again.')
    } finally {
      setStepLoading(false)
    }
  }

  const handleDeleteSelectedTrips = () => {
    if (!localTrips?.trips || selectedTripRows.length === 0) return
    const idsArray = selectedTripRows
      .map((s) => extractTripId(s.trip))
      .filter((v) => v !== undefined && v !== null)
    const idsToRemove = new Set(idsArray)
    const filtered = localTrips.trips.filter((trip: any) => !idsToRemove.has(extractTripId(trip)))

    const finishLocalUpdate = () => {
      setLocalTrips({ ...localTrips, trips: filtered })
      setFormValues((prev) => ({
        ...prev,
        trips: filtered,
        trip_ids: filtered.map((t: any) => extractTripId(t)).filter(Boolean),
      }))
      setSelectedTripRows([])
    }

    // If we are editing an existing statement, delete on the server immediately (legacy behavior)
    if (isEdit) {
      const exportId = id && id !== 'new' ? id : formValues.invoice_id ?? formValues.id
      if (!exportId) {
        setStepError('Statement ID not found. Please save first.')
        return
      }
      setSaving(true)
      invoicesAPI
        .deleteInvoiceTrips(exportId, idsArray)
        .then((updatedInvoice) => {
          if (updatedInvoice) {
            setFormValues((prev) => ({ ...prev, ...updatedInvoice }))
            dispatch(loadInvoiceTrips(String(exportId)))
          }
          finishLocalUpdate()
        })
        .catch(() => setStepError('Unable to delete the selected trips right now.'))
        .finally(() => setSaving(false))
      return
    }

    finishLocalUpdate()
  }

  const handleAddTrips = () => {
    if (!isEdit) {
      setStepError('Create and save the statement before adding trips.')
      return
    }
    const exportId = id && id !== 'new' ? id : formValues.invoice_id ?? formValues.id
    if (!exportId) {
      setStepError('Statement ID not found. Please save first.')
      return
    }

    setStepError(null)
    setShowAvailableTrips(true)
    setAddTripsLoading(true)
    setAvailableError(null)
    invoicesAPI
      .getTripTable(exportId, { isFree: true })
      .then((freeTable) => {
        const freeTrips = freeTable?.trips || []
        setAvailableTrips(freeTrips)
        setAvailableColumns(freeTable?.columns || [])
        setSelectedAvailableIds(new Set())
        if (!freeTrips.length) {
          setAvailableError('No free trips found to add.')
        }
      })
      .catch(() => {
        setAvailableError('Unable to fetch free trips right now.')
      })
      .finally(() => setAddTripsLoading(false))
  }

  const handleAssignSelectedTrips = async () => {
    const exportId = id && id !== 'new' ? id : formValues.invoice_id ?? formValues.id
    if (!exportId || !selectedAvailableIds.size) return
    setAddTripsLoading(true)
    try {
      await invoicesAPI.assignInvoiceTrips(exportId, Array.from(selectedAvailableIds))
      await dispatch(loadInvoiceTrips(String(exportId)))
      setSelectedAvailableIds(new Set())
      setAvailableTrips([])
    } catch (err) {
      setAvailableError('Could not add the selected trips. Please try again.')
    } finally {
      setAddTripsLoading(false)
    }
  }

  const contentReady = metadataLoaded && dataLoaded

  return (
    <CContainer fluid>
      {!contentReady ? (
        <div className="client-statement-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading statement information</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : (
        <>
          <PageHero
            kicker="Operations"
            icon={cilLibrary}
            title={viewMode ? 'View Client Statement' : isEdit ? 'Edit Client Statement' : 'Create Client Statement'}
            subtitle="Compact, numeric-friendly layout with horizontal scroll."
          />

          <CForm onSubmit={handleSubmit} className="driver-form">
        <CRow className="g-4">
          <CCol xs={12}>
            <CCard className="truck-section-card shadow-sm border-0">
              <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
                <div>
                  <div className="section-kicker text-uppercase fw-semibold">Details</div>
                  <div className="section-title fw-bold">Identification & Ownership</div>
                  <small className="text-body-secondary">Client, format, weeks, and references.</small>
                </div>
                {!isEdit && currentStep === 1 && (
                  <CBadge color="secondary" shape="rounded-pill" className="px-3">
                    Step 1 of 2
                  </CBadge>
                )}
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol md={12}>
                    <CCard className="h-100 border-0">
                      <CCardBody className="p-0">
                        <CRow className="g-3">
                          <CCol md={12}>
                            <CFormLabel>Client</CFormLabel>
                            {viewMode ? (
                              <CFormInput value={formValues.client_name || '—'} readOnly />
                            ) : (
                              <CMultiSelect
                                className="multiselect-teal"
                                options={clientOptions}
                                value={formValues.clientid ? String(formValues.clientid) : ''}
                                onChange={(selected: any) => {
                                  const opt = Array.isArray(selected) ? selected[0] : selected
                                  handleChange('clientid', opt?.value ?? '')
                                  handleChange('client_name', opt?.label ?? '')
                                }}
                                multiple={false}
                                selectionType="tags"
                                placeholder="Select client"
                                clearSearchOnSelect
                                dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                                virtualScroller={shouldVirtualScroll(clientOptions)}
                                disabled={!canEdit}
                              />
                            )}
                          </CCol>
                          <CCol md={12}>
                            <CFormLabel>Client Statement Format</CFormLabel>
                            {viewMode ? (
                              <CFormInput value={formValues.format_name || '—'} readOnly />
                            ) : (
                              <CMultiSelect
                                className="multiselect-teal"
                                options={formatOptions}
                                value={formValues.invoiceformatid ? String(formValues.invoiceformatid) : ''}
                                onChange={(selected: any) => {
                                  const opt = Array.isArray(selected) ? selected[0] : selected
                                  handleChange('invoiceformatid', opt?.value ?? '')
                                  handleChange('format_name', opt?.label ?? '')
                                }}
                                multiple={false}
                                selectionType="tags"
                                placeholder="Select format"
                                clearSearchOnSelect
                                dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                                virtualScroller={shouldVirtualScroll(formatOptions)}
                                disabled={!canEdit}
                              />
                            )}
                          </CCol>
                          <CCol md={12}>
                            <CFormLabel>Weeks</CFormLabel>
                            {viewMode ? (
                              <CFormInput value={weekLabel} readOnly />
                            ) : (
                              <CMultiSelect
                                className="multiselect-teal"
                                options={weekOptions}
                                value={weekValueArray}
                                onChange={(selected: any) => {
                                  const opt = Array.isArray(selected) ? selected : [selected]
                                  const values = (opt || []).map((o: any) => (o?.value ?? '')).filter(Boolean)
                                  handleChange('weeks', values.join(','))
                                }}
                                multiple
                                selectionType="tags"
                                closeOnSelect={false}
                                clearSearchOnSelect={false}
                                placeholder="Select weeks"
                                dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                                virtualScroller={shouldVirtualScroll(weekOptions)}
                                disabled={!canEdit}
                              />
                            )}
                          </CCol>
                          <CCol md={6}>
                            <CFormLabel>Date Range</CFormLabel>
                            <CFormSelect
                              value={formValues.daterange || 'ALL'}
                              onChange={(e) => handleChange('daterange', e.target.value)}
                              disabled={currentStep === 2 || !canEdit}
                            >
                              {dateRangePresets.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </CFormSelect>
                          </CCol>
                          <CCol md={6}>
                            <CFormLabel>Exchange Lps/$</CFormLabel>
                            <CFormInput
                              value={formValues.currencyrate ?? ''}
                              onChange={(e) => handleChange('currencyrate', e.target.value)}
                              type="number"
                              step="0.01"
                              disabled={!canEdit || formValues.is_active_week === false}
                            />
                          </CCol>
                          {currentStep === 2 && (
                            <CCol md={6}>
                              <CFormLabel>Reference Number</CFormLabel>
                              <CFormInput
                                value={formValues.invoicenumber ?? ''}
                                onChange={(e) => handleChange('invoicenumber', e.target.value)}
                                disabled={!canEdit || formValues.is_active_week === false}
                              />
                            </CCol>
                          )}
                          {isEdit && (
                            <CCol md={6}>
                              <CFormLabel>Client Statement Date</CFormLabel>
                              <CFormInput
                                type="datetime-local"
                                value={
                                  formValues.create_date
                                    ? new Date(Number(formValues.create_date) * 1000).toISOString().slice(0, 16)
                                    : ''
                                }
                                onChange={(e) => {
                                  const dateStr = e.target.value
                                  if (dateStr) {
                                    const timestamp = Math.floor(new Date(dateStr).getTime() / 1000)
                                    handleChange('create_date', timestamp)
                                  } else {
                                    handleChange('create_date', '')
                                  }
                                }}
                                disabled={!canEdit || formValues.is_active_week === false}
                              />
                            </CCol>
                          )}
                          {currentStep === 2 && (
                            <CCol md={12} className="mt-4">
                              <div className="border rounded p-3 bg-body text-body">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                  <h6 className="fw-bold mb-0">Payment Information</h6>
                                  <CBadge
                                    color={
                                      formValues.statusid === 4 ? 'success'
                                        : formValues.statusid === 3 ? 'info'
                                        : 'danger'
                                    }
                                    shape="rounded-pill"
                                    className="px-3 py-2"
                                  >
                                    {formValues.statusid === 4 ? 'Paid'
                                      : formValues.statusid === 3 ? 'Assigned'
                                      : 'Not Paid'}
                                  </CBadge>
                                </div>
                                <div className="d-flex flex-column gap-3">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-body-secondary">Payment ID</span>
                                    <CBadge color="info" shape="rounded-pill" className="px-3">
                                      {formValues.pay_module_id || '-'}
                                    </CBadge>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-body-secondary">Payment Date</span>
                                    <span>
                                      {formValues.payment_module?.paymentdate
                                        ? new Date(Number(formValues.payment_module.paymentdate) * 1000).toLocaleDateString(
                                            'en-US'
                                          )
                                        : '-'}
                                    </span>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-body-secondary">CK / Transfer NO.</span>
                                    <span className="fw-semibold">{formValues.payment_module?.transferno || '-'}</span>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-body-secondary">Due Date</span>
                                    <span>
                                      {formValues.duedays_date
                                        ? new Date(Number(formValues.duedays_date) * 1000)
                                            .toLocaleString('en-GB', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: false,
                                            })
                                            .replace(',', '')
                                        : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </CCol>
                          )}
                        </CRow>
                        {!isEdit && currentStep === 1 && (
                          <div className="d-flex justify-content-between align-items-center mt-4">
                            {stepError && <div className="text-danger small">{stepError}</div>}
                            <div className="ms-auto d-flex gap-2">
                              <CButton color="secondary" variant="ghost" type="button" onClick={() => navigate('/operations/client-statements')}>
                                <CIcon icon={cilArrowLeft} className="me-2" />
                                Go Back
                              </CButton>
                              <CButton color="primary" type="button" disabled={stepLoading} onClick={handleBuilderContinue}>
                                {stepLoading ? <CSpinner size="sm" className="me-2" /> : null}
                                Continue
                              </CButton>
                            </div>
                          </div>
                        )}
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CCol>

          {currentStep === 2 && (
            <CCol xs={12}>
              <CCard className="truck-section-card shadow-sm border-0">
                <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
                  <div>
                    <div className="section-kicker text-uppercase fw-semibold">Trips</div>
                    <div className="section-title fw-bold">Client Statement Preview</div>
                    <small className="text-body-secondary">Numeric-friendly table with horizontal scroll.</small>
                  </div>
                </CCardHeader>
                <CCardBody>
                  <div className="bg-body border rounded">
                    <ClientStatementTable
                      data={localTrips}
                      loading={loading}
                      notes={formValues.notes}
                      showNotes={!!formValues.format?.note}
                      clientName={formValues.client_name}
                      onSelectionChange={setSelectedTripRows}
                    />
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
        )}

          {currentStep === 2 && showAvailableTrips && (
            <CCol xs={12}>
              <CCard className="truck-section-card shadow-sm border-0">
                <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
                  <div>
                    <div className="section-kicker text-uppercase fw-semibold">Available Trips</div>
                    <div className="section-title fw-bold">Add trips from the free pool</div>
                    <small className="text-body-secondary">Fetched from free trips. Select and add to this statement.</small>
                  </div>
                    <div className="d-flex gap-2">
                      <CButton
                        color="secondary"
                        variant="ghost"
                        disabled={addTripsLoading}
                        onClick={handleAddTrips}
                      >
                        <CIcon icon={cilCloudDownload} className="me-2" />
                        Refresh Free Trips
                      </CButton>
                    <CButton
                      color="primary"
                      className="text-white"
                      disabled={!selectedAvailableIds.size || addTripsLoading}
                      onClick={handleAssignSelectedTrips}
                    >
                      {addTripsLoading ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilPlus} className="me-2" />}
                      Add Selected
                    </CButton>
                  </div>
                </CCardHeader>
                <CCardBody>
                  {availableError && <div className="alert alert-danger py-2 mb-3">{availableError}</div>}
                  {!availableTrips && (
                    <div className="text-body-secondary">Click “Refresh Free Trips” to load available trips.</div>
                  )}
                  {availableTrips && availableTrips.length === 0 && !availableError && (
                    <div className="alert alert-info py-2 mb-3">No free trips found to add.</div>
                  )}
                  {availableTrips && availableTrips.length > 0 && (
                    <div className="table-responsive" style={{ maxHeight: 340, overflowX: 'auto', overflowY: 'auto' }}>
                      <table className="table table-sm align-middle mb-0 table-striped">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: 56, minWidth: 56 }} className="align-middle text-center" />
                            {visibleAvailableColumns.map((col) => (
                              <th
                                key={col}
                                className="small text-uppercase text-body-secondary fw-semibold text-nowrap"
                                style={getAvailableColStyle(col)}
                              >
                                {col
                                  .replace(/^\d+_/, '')
                                  .replace('Trip_', '')
                                  .replace(/_/g, ' ')
                                  .replace('KM', 'Km')
                                  .replace('Lps', 'Lps')
                                  .trim()}
                              </th>
                            ))}
                          </tr>
                          <tr>
                            <th style={{ width: 56, minWidth: 56 }} className="text-center align-middle">
                              <input
                                type="checkbox"
                                className="form-check-input p-0"
                                style={{ width: 16, height: 16, minWidth: 16, minHeight: 16, margin: 0, borderRadius: 3 }}
                                checked={selectedAvailableIds.size === availableTrips.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAvailableIds(
                                      new Set(availableTrips.map((t) => extractTripId(t)).filter(Boolean))
                                    )
                                  } else {
                                    setSelectedAvailableIds(new Set())
                                  }
                                }}
                              />
                            </th>
                            {visibleAvailableColumns.map((col) => (
                              <th key={`${col}-filter`} className="px-2" style={getAvailableColStyle(col)}>
                                <CFormInput
                                  size="sm"
                                  placeholder=""
                                  value={availableFilters[col] ?? ''}
                                  onChange={(e) =>
                                    setAvailableFilters((prev) => ({
                                      ...prev,
                                      [col]: e.target.value,
                                    }))
                                  }
                                />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAvailableTrips.map((trip, idx) => {
                            const tripId = extractTripId(trip)
                            const checked = selectedAvailableIds.has(tripId)
                            const getValue = (col: string) => {
                              const raw = trip[col]
                              if (raw !== undefined && raw !== null && raw !== '') return raw
                              const fallback: Record<string, string[]> = {
                                'Trip_Total Km/Rate $': ['Trip_Total Km/Rate Lps', 'Trip_Total KM/Rate Lps'],
                                'Trip_Trip Date': ['Trip_Date'],
                                'Trip_Sub Total': ['Trip_Subtotal', 'Trip_Subtotal Lps'],
                                'Trip_Total': ['Trip_Total Km/Rate Lps', 'Trip_Total Km/Rate $'],
                              }
                              const candidates = fallback[col] || []
                              for (const key of candidates) {
                                const val = trip[key]
                                if (val !== undefined && val !== null && val !== '') return val
                              }
                              return '—'
                            }
                            return (
                              <tr key={idx} className={checked ? 'table-active' : ''}>
                                <td style={{ width: 56, minWidth: 56 }} className="text-center align-middle">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = new Set(selectedAvailableIds)
                                      if (e.target.checked) next.add(tripId)
                                      else next.delete(tripId)
                                      setSelectedAvailableIds(next)
                                    }}
                                  />
                                </td>
                                {visibleAvailableColumns.map((col) => (
                                  <td key={col} style={getAvailableColStyle(col)}>
                                    <span className="d-inline-block" style={availableCellStyle}>
                                      {getValue(col)}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          )}

          {currentStep === 2 && (
            <CCol xs={12}>
              <CCard className="truck-section-card shadow-sm border-0">
                <CCardHeader className="truck-section-header">
                  <div>
                    <div className="section-kicker">Notes</div>
                    <div className="section-title">Statement Notes</div>
                    <small className="text-body-secondary">Add any comments for this statement.</small>
                  </div>
                </CCardHeader>
                <CCardBody>
                  <CFormTextarea
                    value={formValues.notes ?? ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    disabled={!canEdit || formValues.is_active_week === false}
                    rows={4}
                  />
                </CCardBody>
              </CCard>
            </CCol>
          )}

          {currentStep === 2 && (
            <CCol xs={12}>
              <div className="truck-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2 mb-5">
                <CButton color="secondary" variant="ghost" type="button" onClick={() => navigate('/operations/client-statements')} disabled={saving}>
                  <CIcon icon={cilArrowLeft} className="me-2" />
                  Back
                </CButton>
                <div className="d-flex gap-2 align-items-center">
                  {isEdit && (
                    <>
                      <CButton
                        color="danger"
                        className="text-white"
                        disabled={!canEdit || currentStep !== 2 || selectedTripRows.length === 0 || formValues.is_active_week === false}
                        onClick={handleDeleteSelectedTrips}
                      >
                        <CIcon icon={cilTrash} className="me-2" />
                        Delete Selected Trips
                      </CButton>
                      <CButton
                        color={showAvailableTrips ? 'secondary' : 'warning'}
                        className={showAvailableTrips ? 'text-dark fw-semibold' : 'text-dark fw-semibold'}
                        disabled={!canEdit || currentStep !== 2 || formValues.is_active_week === false || addTripsLoading}
                        onClick={() => {
                          if (showAvailableTrips) {
                            setShowAvailableTrips(false)
                            setAvailableTrips(null)
                            setAvailableColumns([])
                            setAvailableFilters({})
                            setSelectedAvailableIds(new Set())
                            setAvailableError(null)
                          } else {
                            handleAddTrips()
                          }
                        }}
                      >
                        <CIcon icon={cilPlus} className="me-2" />
                        {showAvailableTrips ? 'Hide Available Trips' : addTripsLoading ? 'Loading…' : 'Add Trips'}
                      </CButton>
                    </>
                  )}

                  {brokenTrips.length > 0 && (
                    <CButton color="danger" onClick={() => setBrokenTripsModalVisible(true)} className="me-2 text-white">
                      <CIcon icon={cilWarning} className="me-2" />
                      Broken
                      <CBadge color="light" shape="rounded-pill" className="ms-2 text-danger">
                        {brokenTrips.length}
                      </CBadge>
                    </CButton>
                  )}

                  {isEdit && (
                    <>
                      <CButton color="success" onClick={handleExportXLSX} className="me-2 text-white">
                        <CIcon icon={cilFile} className="me-2" />
                        Export Excel
                      </CButton>
                      <CButton color="danger" onClick={handleExportPDF} className="me-2 text-white">
                        <CIcon icon={cilCloudDownload} className="me-2" />
                        Export PDF
                      </CButton>
                    </>
                  )}

                  {!viewMode && (
                    <CButton color="primary" type="submit" disabled={saving || !canEdit} className="text-white px-4">
                      {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilSave} className="me-2" />}
                      Save Statement
                    </CButton>
                  )}
                </div>
              </div>
            </CCol>
          )}
        </CRow>
      </CForm>

      <CModal alignment="center" visible={showSuccess} onClose={() => setShowSuccess(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilCheckCircle} className="text-success me-2" />
            Statement saved
          </CModalTitle>
        </CModalHeader>
        <CModalBody>Changes have been saved successfully.</CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setShowSuccess(false)}>
            Close
          </CButton>
          <CButton color="primary" onClick={() => navigate('/operations/client-statements')}>
            Back to list
          </CButton>
        </CModalFooter>
      </CModal>

      <BrokenTripsModal
        visible={brokenTripsModalVisible}
        onClose={() => setBrokenTripsModalVisible(false)}
        trips={brokenTrips}
      />
        </>
      )}
    </CContainer>
  )
}

export default ClientStatementFormPage
