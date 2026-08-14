import React, { useEffect, useMemo, useState, useRef } from 'react'
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
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilCheckCircle,
  cilLibrary,
  cilSave,
  cilCloudDownload,
  cilFile,
  cilTrash,
  cilPlus,
  cilWarning,
} from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../store'
import { loadStatement, loadStatementTrips, createStatement, updateStatement, clearCurrentStatement } from '../store/subdivisionStatements.slice'
import { loadFormats } from '../../FormatBuilder/store/formatBuilderSlice'
import { loadWeeks } from '../../Weeks/store/weeksSlice'
import { loadSubdivisions } from '../../Assets/Subdivisions/store/subdivisions.slice'
import { loadClients } from '../../Assets/Clients/store/clients.slice'
import type { SubdivisionStatement, SubdivisionStatementTableData } from '../types'
import { permissionService, UPDATE, CREATE } from '../../../services/auth/permission.service'
import { MODULE_SUBDIVISION } from '../../../constants/modules'
import SubdivisionStatementTable from '../components/SubdivisionStatementTable'
import BrokenTripsModal from '../components/BrokenTripsModal'
import { subdivisionStatementsAPI } from '../api/subdivisionStatements.api'
import './SubdivisionStatementFormPage.scss'

const defaultValues: SubdivisionStatement = {
  weeks: '',
  invoiceformatid: '',
  subdivisionid: '',
  daterange: 'ALL',
  currencyrate: '0',
  invoicenumber: '',
  notes: '',
}

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

const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20

const SubdivisionStatementFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id && id !== 'new')
  const navigate = useNavigate()
  const location = useLocation()
  const viewMode = new URLSearchParams(location.search).get('mode') === 'view'
  const dispatch = useDispatch<AppDispatch>()

  const { current, trips, loading } = useSelector((state: RootState) => (state as any).subdivisionStatements || {})
  const formatsState = useSelector((state: RootState) => (state as any).formatbuilder || {})
  const weeksState = useSelector((state: RootState) => (state as any).weeks || {})
  const subdivisionsState = useSelector((state: RootState) => (state as any).subdivisions || {})
  const clientsState = useSelector((state: RootState) => (state as any).clients || {})

  const [formValues, setFormValues] = useState<SubdivisionStatement>({ ...defaultValues })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [brokenTripsModalVisible, setBrokenTripsModalVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(isEdit ? 2 : 1)
  const [stepLoading, setStepLoading] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [localTrips, setLocalTrips] = useState<SubdivisionStatementTableData | null>(null)
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
  const parseTimestamp = (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    if (!isNaN(num)) {
      return num > 1e12 ? num : num * 1000
    }
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date.getTime()
  }

  // Using MODULE_SUBDIVISION permissions
  const canEdit = !viewMode && permissionService.checkPermission(MODULE_SUBDIVISION, isEdit ? UPDATE : CREATE)

  const toaster = useRef<any>(null)
  const [toast, setToast] = useState<any>(null)

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' | 'info') => {
    setToast(
      <CToast autohide={true} delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  useEffect(() => {
    const loadMetadata = async () => {
      await Promise.all([
        dispatch(loadFormats()),
        dispatch(loadWeeks()),
        dispatch(loadSubdivisions()),
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
          dispatch(loadStatement(id)),
          dispatch(loadStatementTrips(id)),
        ])
      } else {
        dispatch(clearCurrentStatement())
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
    return (list as any[])
      .filter((fmt: any) => fmt.type === 'Statment')
      .map((fmt: any) => ({
        value: String(fmt.invoiceformat_id ?? fmt.id ?? ''),
        label: fmt.name,
      }))
  }, [formatsState])

  const weekOptions = useMemo(() => {
    const base = (weeksState?.weeks || []).map((wk: any) => ({
      value: String(wk.week_id ?? wk.id ?? ''),
      label: wk.week_no ? `Week ${wk.week_no} - ${wk.week_year}` : wk.name || String(wk.week_id ?? wk.id ?? ''),
    }))

    // Include historical weeks that may not be in the active list
    const legacy = Array.isArray(formValues.week_list)
      ? formValues.week_list
          .map((wk: any) => ({
            value: String(wk.week_id ?? wk.id ?? wk.value ?? ''),
            label:
              wk.week_name ||
              wk.name ||
              (wk.week_no ? `Week ${wk.week_no} - ${wk.week_year}` : String(wk.week_id ?? wk.id ?? wk.value ?? '')),
          }))
          .filter((wk: { value: string }) => wk.value)
      : []

    const mergedMap = new Map<string, string>()
    base.concat(legacy).forEach((wk: { value: string; label: string }) => {
      if (!mergedMap.has(wk.value)) {
        mergedMap.set(wk.value, wk.label)
      }
    })

    return Array.from(mergedMap.entries()).map(([value, label]) => ({ value, label }))
  }, [weeksState, formValues.week_list])

  const subdivisionOptions = useMemo(() => {
    return (subdivisionsState?.list || []).map((s: any) => ({
      value: String(s.subdivision_id ?? s.id ?? ''),
      label: s.name,
    }))
  }, [subdivisionsState])

  const clientValueArray = useMemo(() => {
    if (!formValues.clients && Array.isArray(formValues.clients_list)) {
      return formValues.clients_list
        .map((c: any) => String(c.client_id ?? c.id ?? c.value ?? '').trim())
        .filter(Boolean)
    }
    if (!formValues.clients) return []
    return String(formValues.clients)
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
  }, [formValues.clients, formValues.clients_list])

  const filteredClientOptions = useMemo(() => {
    const allClients = clientsState?.list || []
    const baseOptions = allClients.map((c: any) => ({
      value: String(c.clientId ?? c.client_id ?? c.id),
      label: c.name,
    }))

    const legacyOptions = Array.isArray(formValues.clients_list)
      ? formValues.clients_list
          .map((c: any) => ({
            value: String(c.client_id ?? c.id ?? c.value ?? '').trim(),
            label: c.name ?? c.client_name ?? c.label ?? `Client ${c.client_id ?? c.id ?? c.value ?? ''}`,
          }))
          .filter((opt: { value: string }) => opt.value)
      : []

    const merged = new Map<string, string>()
    baseOptions.concat(legacyOptions).forEach((opt: { value: string; label: string }) => {
      if (opt.value && !merged.has(opt.value)) {
        merged.set(opt.value, opt.label || String(opt.value))
      }
    })
    clientValueArray.forEach((val) => {
      if (val && !merged.has(val)) {
        merged.set(val, String(val))
      }
    })

    return Array.from(merged.entries()).map(([value, label]) => ({ value, label }))
  }, [clientsState, formValues.clients_list, clientValueArray])

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

  const clientLabel = useMemo(() => {
    if (!clientValueArray.length) return '—'
    return clientValueArray
      .map((v) => filteredClientOptions.find((o) => String(o.value) === String(v))?.label || String(v))
      .join(', ')
  }, [clientValueArray, filteredClientOptions])

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

  const dueDateMs = useMemo(() => parseTimestamp(formValues.duedays_date ?? formValues.due_date), [formValues.duedays_date, formValues.due_date])
  const pastDueDays = useMemo(() => {
    if (formValues.past_due_days !== undefined && formValues.past_due_days !== null) {
      return formValues.past_due_days
    }
    if (!dueDateMs) return null
    const diff = Date.now() - dueDateMs
    return diff > 0 ? Math.floor(diff / 86_400_000) : 0
  }, [dueDateMs, formValues.past_due_days])

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

  const handleChange = (key: keyof SubdivisionStatement, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
    // Clear error for this field if it exists
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formValues.subdivisionid) newErrors.subdivisionid = 'Subdivision is required'
    if (!formValues.invoiceformatid) newErrors.invoiceformatid = 'Format is required'
    if (!weekValueArray.length) newErrors.weeks = 'At least one week is required'
    if (!clientValueArray.length) newErrors.clients = 'At least one client is required'
    if (!formValues.currencyrate || Number(formValues.currencyrate) <= 0) newErrors.currencyrate = 'Valid currency rate is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return

    if (!validateForm()) {
      showToast('Please correct the validation errors.', 'danger')
      return
    }

    setSaving(true)
    try {
      const targetId = id && id !== 'new' ? id : formValues.paymentId ?? formValues.id
      const currentTrips = localTrips?.trips || (formValues as any).trips || []
      const tripIds = currentTrips.map((t: any) => Number(extractTripId(t))).filter((v: number) => !isNaN(v))
      const payload: any = {
        ...formValues,
        trips: currentTrips,
        trip_ids: tripIds,
      }
      if (targetId) {
        await dispatch(updateStatement({ id: targetId, payload })).unwrap()
      } else {
        const created = await dispatch(createStatement(payload)).unwrap()
        navigate(`/operations/subdivision-statements/${created.paymentId ?? created.id}`)
      }
      setShowSuccess(true)
    } catch (error: any) {
      console.error('Failed to save statement', error)
      showToast(typeof error === 'string' ? error : error.message || 'Failed to save statement', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const handleExportPDF = async () => {
    const exportId = id && id !== 'new' ? id : formValues.paymentId ?? formValues.id
    if (!exportId) return
    try {
      await subdivisionStatementsAPI.downloadStatementPDF(exportId)
    } catch (error) {
      console.error('Failed to export PDF', error)
    }
  }

  const handleExportXLSX = async () => {
    const exportId = id && id !== 'new' ? id : formValues.paymentId ?? formValues.id
    if (!exportId) return
    try {
      await subdivisionStatementsAPI.downloadStatementXLSX(exportId)
    } catch (error) {
      console.error('Failed to export XLSX', error)
    }
  }

  const brokenTrips = trips?.broken || []

  const handleBuilderContinue = async () => {
    if (!canEdit) return

    if (!validateForm()) {
      setStepError('Please correct the highlighted errors before continuing.')
      showToast('Please correct the validation errors.', 'danger')
      return
    }

    setStepError(null)
    setStepLoading(true)
    try {
      const currentTrips = localTrips?.trips || (formValues as any).trips || []
      const tripIds = currentTrips.map((t: any) => Number(extractTripId(t))).filter((v: number) => !isNaN(v))
      const payload = {
        ...formValues,
        weeks: weekValueArray.join(','),
        clients: clientValueArray.join(','),
        daterange: formValues.daterange || 'ALL',
        trips: currentTrips,
        trip_ids: tripIds,
      }
      const created = await dispatch(createStatement(payload)).unwrap()
      const createdId = created.paymentId ?? created.id
      setFormValues({ ...formValues, ...created })
      if (createdId) {
        navigate(`/operations/subdivision-statements/${createdId}`, { replace: true })
        dispatch(loadStatement(createdId))
        dispatch(loadStatementTrips(createdId))
      } else {
        setCurrentStep(2)
      }
    } catch (error: any) {
      console.error('Failed to start statement builder', error)
      const msg = typeof error === 'string' ? error : error.message || 'Unable to continue. Please check the fields and try again.'
      setStepError(msg)
      showToast(msg, 'danger')
    } finally {
      setStepLoading(false)
    }
  }

  const statusId = Number(formValues.statusid) || 0
  const isAssignedOrPaid = statusId >= 3 || !!(formValues.payment_core_id || formValues.payment_module || formValues.pay_module_id)
  const isPaid = statusId === 4 || !!(formValues.payment_core_id || formValues.payment_module || formValues.pay_module_id)

  const handleDeleteSelectedTrips = () => {
    if (!localTrips?.trips || selectedTripRows.length === 0) return
    if (isAssignedOrPaid) {
      showToast('Cannot modify trips on an assigned or paid statement.', 'danger')
      return
    }
    const idsArray = selectedTripRows
      .map((s: { trip: any }) => extractTripId(s.trip))
      .filter((v: any) => v !== undefined && v !== null)
    const idsToRemove = new Set(idsArray)
    const filtered = localTrips.trips.filter((trip: any) => !idsToRemove.has(extractTripId(trip)))

    const finishLocalUpdate = () => {
      setLocalTrips({ ...localTrips, trips: filtered })
      // Assuming formValues should also update trip_ids
      setFormValues((prev) => ({
        ...prev,
        trip_ids: filtered.map((t: any) => extractTripId(t)).filter(Boolean),
      }))
      setSelectedTripRows([])
    }

    if (isEdit) {
      const exportId = id && id !== 'new' ? id : formValues.paymentId ?? formValues.id
      if (!exportId) {
        setStepError('Statement ID not found. Please save first.')
        return
      }
      setSaving(true)
      subdivisionStatementsAPI
        .deleteStatementTrips(exportId, idsArray)
        .then((updatedStatement: SubdivisionStatement | undefined) => {
          if (updatedStatement) {
            setFormValues((prev) => ({ ...prev, ...updatedStatement }))
            dispatch(loadStatementTrips(String(exportId)))
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
    const exportId = id && id !== 'new' ? id : formValues.paymentId ?? formValues.id
    if (!exportId) {
      setStepError('Statement ID not found. Please save first.')
      return
    }

    setStepError(null)
    setShowAvailableTrips(true)
    setAddTripsLoading(true)
    setAvailableError(null)
    subdivisionStatementsAPI
      .getTripTable(exportId, { isFree: true })
      .then((freeTable: SubdivisionStatementTableData) => {
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
    const exportId = id && id !== 'new' ? id : formValues.paymentId ?? formValues.id
    if (!exportId || !selectedAvailableIds.size) return
    setAddTripsLoading(true)
    try {
      await subdivisionStatementsAPI.assignStatementTrips(exportId, Array.from(selectedAvailableIds))
      await dispatch(loadStatementTrips(String(exportId)))
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
      <CToaster ref={toaster} push={toast} placement="top-end" />
      {!contentReady ? (
        <div className="subdivision-statement-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" className="mb-3" />
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
            title={viewMode ? `View Subdivision Statement #${id}` : isEdit ? `Edit Subdivision Statement #${id}` : 'Create Subdivision Statement'}
            subtitle={isEdit ? undefined : 'Compact, numeric-friendly layout with horizontal scroll.'}
            actions={isEdit && statusId > 0 ? (
              <CBadge color={statusId === 4 ? 'success' : statusId === 3 ? 'info' : statusId === 2 ? 'warning' : 'secondary'} className="fs-6">
                {statusId === 4 ? 'Paid' : statusId === 3 ? 'Assigned' : statusId === 2 ? 'Ready' : 'Open'}
              </CBadge>
            ) : undefined}
          />

          <CForm onSubmit={handleSubmit} className="driver-form">
        <CRow className="g-4">
          <CCol xs={12}>
            <CCard className="truck-section-card shadow-sm border-0">
              <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
                <div>
                  <div className="section-kicker text-uppercase fw-semibold">Details</div>
                  <div className="section-title fw-bold">Identification & Ownership</div>
                  <small className="text-body-secondary">Subdivision, format, weeks, and references.</small>
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
                            <CFormLabel>Subdivision</CFormLabel>
                            {viewMode ? (
                              <CFormInput value={formValues.subdivision_name || '—'} readOnly />
                            ) : (
                              <CMultiSelect
                                className="multiselect-teal"
                                options={subdivisionOptions}
                                value={formValues.subdivisionid ? String(formValues.subdivisionid) : ''}
                                onChange={(selected: any) => {
                                  const opt = Array.isArray(selected) ? selected[0] : selected
                                  handleChange('subdivisionid', opt?.value ?? '')
                                  handleChange('subdivision_name', opt?.label ?? '')
                                }}
                                multiple={false}
                                selectionType="tags"
                                placeholder="Select subdivision"
                                clearSearchOnSelect
                                optionsMaxHeight={260}
                                virtualScroller={shouldVirtualScroll(subdivisionOptions)}
                                disabled={!canEdit || isAssignedOrPaid}
                                invalid={!!errors.subdivisionid}
                                feedbackInvalid={errors.subdivisionid}
                              />
                            )}
                          </CCol>
                          <CCol md={12}>
                            <CFormLabel>Statement Format</CFormLabel>
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
                                optionsMaxHeight={260}
                                virtualScroller={shouldVirtualScroll(formatOptions)}
                                disabled={!canEdit || isAssignedOrPaid}
                                invalid={!!errors.invoiceformatid}
                                feedbackInvalid={errors.invoiceformatid}
                              />
                            )}
                          </CCol>
                          <CCol md={12}>
                            <CFormLabel>Clients</CFormLabel>
                            {viewMode ? (
                              <CFormInput value={clientLabel} readOnly />
                            ) : (
                              <>
                                <CMultiSelect
                                  className="multiselect-teal"
                                  options={filteredClientOptions}
                                  value={clientValueArray}
                                  onChange={(selected: any) => {
                                    const opt = Array.isArray(selected) ? selected : [selected]
                                    const values = (opt || []).map((o: any) => (o?.value ?? '')).filter(Boolean)
                                    handleChange('clients', values.join(','))
                                  }}
                                  multiple
                                  selectionType="tags"
                                  clearSearchOnSelect={false}
                                  placeholder="Select clients"
                                  optionsMaxHeight={260}
                                  virtualScroller={shouldVirtualScroll(filteredClientOptions)}
                                  disabled={!canEdit || !formValues.subdivisionid || isAssignedOrPaid}
                                  invalid={!!errors.clients}
                                  feedbackInvalid={errors.clients}
                                />
                                {!formValues.subdivisionid && (
                                  <div className="form-text text-body-secondary small ms-1">
                                    Select a subdivision first to see available clients.
                                  </div>
                                )}
                              </>
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
                                clearSearchOnSelect={false}
                                placeholder="Select weeks"
                                optionsMaxHeight={260}
                                virtualScroller={shouldVirtualScroll(weekOptions)}
                                disabled={!canEdit || isAssignedOrPaid}
                                invalid={!!errors.weeks}
                                feedbackInvalid={errors.weeks}
                              />
                            )}
                          </CCol>
                          <CCol md={6}>
                            <CFormLabel>Date Range</CFormLabel>
                            {viewMode ? (
                              <CFormInput value={dateRangePresets.find(p => p.value === formValues.daterange)?.label || formValues.daterange || '—'} readOnly />
                            ) : (
                              <CMultiSelect
                                className="multiselect-teal"
                                options={dateRangePresets}
                                value={formValues.daterange || 'ALL'}
                                onChange={(selected: any) => {
                                  const opt = Array.isArray(selected) ? selected[0] : selected
                                  handleChange('daterange', opt?.value ?? '')
                                }}
                                multiple={false}
                                selectionType="tags"
                                placeholder="Select date range"
                                clearSearchOnSelect
                                optionsMaxHeight={260}
                                disabled={currentStep === 2 || !canEdit}
                              />
                            )}
                          </CCol>
                          <CCol md={6}>
                            <CFormLabel>Exchange Lps/$</CFormLabel>
                            <CFormInput
                              value={formValues.currencyrate ?? ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('currencyrate', e.target.value)}
                              type="number"
                              step="0.01"
                              disabled={!canEdit || formValues.is_active_week === false}
                              invalid={!!errors.currencyrate}
                              feedbackInvalid={errors.currencyrate}
                            />
                          </CCol>
                          {currentStep === 2 && (
                            <CCol md={6}>
                              <CFormLabel>Reference Number</CFormLabel>
                              <CFormInput
                                value={formValues.invoicenumber ?? ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('invoicenumber', e.target.value)}
                                disabled={!canEdit || formValues.is_active_week === false}
                              />
                            </CCol>
                          )}
                          {isEdit && (
                            <CCol md={6}>
                              <CFormLabel>Statement Date</CFormLabel>
                              <CFormInput
                                type="datetime-local"
                                value={
                                  formValues.create_date
                                    ? new Date(Number(formValues.create_date) * 1000).toISOString().slice(0, 16)
                                    : ''
                                }
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
                                    color={statusId === 4 ? 'success' : statusId === 3 ? 'info' : statusId === 2 ? 'warning' : 'danger'}
                                    shape="rounded-pill"
                                    className="px-3 py-2"
                                  >
                                    {statusId === 4 ? 'Paid' : statusId === 3 ? 'Assigned' : statusId === 2 ? 'Ready' : 'Open'}
                                  </CBadge>
                                </div>
                                <div className="d-flex flex-column gap-3">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-body-secondary">Payment ID</span>
                                    {(() => {
                                      if (formValues.payment_core_id) {
                                        return (
                                          <a
                                            href={`/operations/payments/${formValues.payment_core_id}`}
                                            style={{ textDecoration: 'none' }}
                                          >
                                            <CBadge color="info" shape="rounded-pill" className="px-3" style={{ cursor: 'pointer' }}>
                                              # {formValues.payment_core_number || '-'}
                                            </CBadge>
                                          </a>
                                        )
                                      }
                                      // Legacy fallback: parse closeNotes JSON from payment_module
                                      let paymentRef: { paymentNumber?: number; paymentId?: string } | null = null
                                      try {
                                        if (formValues.payment_module?.closeNotes) {
                                          paymentRef = JSON.parse(formValues.payment_module.closeNotes)
                                        }
                                      } catch {
                                        /* not JSON — legacy closeNotes */
                                      }
                                      if (paymentRef?.paymentId) {
                                        return (
                                          <a
                                            href={`/operations/payments/${paymentRef.paymentId}`}
                                            style={{ textDecoration: 'none' }}
                                          >
                                            <CBadge color="info" shape="rounded-pill" className="px-3" style={{ cursor: 'pointer' }}>
                                              # {paymentRef.paymentNumber || formValues.pay_module_id || '-'}
                                            </CBadge>
                                          </a>
                                        )
                                      }
                                      return (
                                        <CBadge color="info" shape="rounded-pill" className="px-3">
                                          {formValues.pay_module_id ? `# ${formValues.pay_module_id}` : '-'}
                                        </CBadge>
                                      )
                                    })()}
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-body-secondary">Payment Date</span>
                                    <span>
                                      {formValues.payment_date
                                        ? new Date(formValues.payment_date).toLocaleDateString('en-US')
                                        : formValues.payment_module?.paymentdate
                                          ? new Date(Number(formValues.payment_module.paymentdate) * 1000).toLocaleDateString(
                                              'en-US'
                                            )
                                          : '-'}
                                    </span>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-body-secondary">CK / Transfer NO.</span>
                                    <span className="fw-semibold">{formValues.payment_transfer_no || formValues.payment_module?.transferno || '-'}</span>
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
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-body-secondary">Past Due Days</span>
                                    <span>{pastDueDays ?? '—'}</span>
                                  </div>
                                </div>
                              </div>
                            </CCol>
                          )}

                        {!isEdit && currentStep === 1 && (
                          <div className="d-flex justify-content-between align-items-center mt-4">
                            {stepError && <div className="text-danger small">{stepError}</div>}
                            <div className="ms-auto d-flex gap-2">
                              <CButton color="secondary" variant="ghost" type="button" onClick={() => navigate('/operations/subdivision-statements')}>
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
                    <div className="section-title fw-bold">Subdivision Statement Preview</div>
                    <small className="text-body-secondary">Numeric-friendly table with horizontal scroll.</small>
                  </div>
                </CCardHeader>
                <CCardBody>
                  <div className="bg-body border rounded">
                    <SubdivisionStatementTable
                      data={localTrips}
                      loading={loading}
                      notes={formValues.notes}
                      showNotes={!!formValues.format?.note}
                      subdivisionName={formValues.subdivision_name}
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
                                  .replace(/^\\d+_/, '')
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
                    <div className="section-kicker text-uppercase fw-semibold">Notes</div>
                    <div className="section-title fw-bold">Statement Notes</div>
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
                <CButton color="secondary" variant="ghost" type="button" onClick={() => navigate('/operations/subdivision-statements')} disabled={saving}>
                  <CIcon icon={cilArrowLeft} className="me-2" />
                  Back
                </CButton>
                <div className="d-flex gap-2 align-items-center">
                  {isEdit && (
                    <>
                      <CButton
                        color="danger"
                        className="text-white"
                        disabled={!canEdit || currentStep !== 2 || selectedTripRows.length === 0 || formValues.is_active_week === false || isAssignedOrPaid}
                        title={isAssignedOrPaid ? 'Cannot modify trips on an assigned or paid statement' : undefined}
                        onClick={handleDeleteSelectedTrips}
                      >
                        <CIcon icon={cilTrash} className="me-2" />
                        Delete Selected Trips
                      </CButton>
                      <CButton
                        color={showAvailableTrips ? 'secondary' : 'warning'}
                        className="text-dark fw-semibold"
                        disabled={!canEdit || currentStep !== 2 || formValues.is_active_week === false || addTripsLoading || isAssignedOrPaid}
                        onClick={() => {
                          if (showAvailableTrips) {
                            setShowAvailableTrips(false)
                            setAvailableTrips(null)
                            setAvailableColumns([])
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
                      <CButton
                        color="success"
                        onClick={handleExportXLSX}
                        className="me-2 text-white"
                        title="Download XLSX"
                      >
                        <CIcon icon={cilFile} className="me-2" />
                        Export Excel
                      </CButton>
                      <CButton
                        color="danger"
                        onClick={handleExportPDF}
                        className="me-2 text-white"
                        title="Download PDF"
                      >
                        <CIcon icon={cilCloudDownload} className="me-2" />
                        Export PDF
                      </CButton>
                    </>
                  )}
                  {canEdit && (
                    <CButton color="primary" type="submit" disabled={saving || formValues.is_active_week === false}>
                      {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilSave} className="me-2" />}
                      {isEdit ? 'Save Changes' : 'Create Statement'}
                    </CButton>
                  )}
                </div>
              </div>
            </CCol>
          )}
        </CRow>
      </CForm>

      <BrokenTripsModal
        visible={brokenTripsModalVisible}
        onClose={() => setBrokenTripsModalVisible(false)}
        trips={brokenTrips}
      />
      {brokenTrips.length > 0 && !brokenTripsModalVisible && (
        <div className="fixed-bottom p-3">
          <div className="alert alert-warning shadow-lg d-flex justify-content-between align-items-center mb-0">
            <div>
              <strong>Warning:</strong> Some trips in this statement are broken.
            </div>
            <CButton color="warning" size="sm" onClick={() => setBrokenTripsModalVisible(true)}>
              View Details
            </CButton>
          </div>
        </div>
      )}

      <CModal alignment="center" visible={showSuccess} onClose={() => setShowSuccess(false)}>
        <CModalHeader closeButton>
          <CModalTitle>Success</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center p-5">
          <CIcon icon={cilCheckCircle} className="text-success mb-3" size="4xl" />
          <h5>Statement Saved Successfully</h5>
          <p className="text-body-secondary">The subdivision statement has been saved.</p>
        </CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={() => setShowSuccess(false)}>
            OK
          </CButton>
        </CModalFooter>
      </CModal>
        </>
      )}
    </CContainer>
  )
}

export default SubdivisionStatementFormPage
