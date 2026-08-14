// src/modules/RentalPlan/pages/RentalPlanEditPage.tsx

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CContainer,
  CRow,
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'
import { cilSave, cilArrowLeft, cilList } from '@coreui/icons'

import PageHero from '../../../components/PageHero'
import type { AppDispatch, RootState } from '../../../store'

import RentalPlanTopForm from '../components/RentalPlanTopForm'
import JobRatesTable from '../components/JobRatesTable'
import ComboRatesTable from '../components/ComboRatesTable'
import ErrorModal from '../../../components/ErrorMessageModal'

import {
  addRentalPlan,
  saveRentalPlan,
  fetchRentalPlanById,
  loadDefaultRentalPlan,
  clearCurrent,
  selectRentalPlansCurrent,
  selectRentalPlansSaving,
  selectRentalPlansErrors,
  selectRentalPlansStatuses,
  resetStatuses,
} from '../store/rentalPlan.slice'

import { loadClients } from '../../Assets/Clients/store/clients.slice'
import { fetchEquipmentSizes } from '../../EquipmentSize/store/equipmentSize.slice'

import { rentalPlanApi } from '../api/rentalPlan.api'

import type {
  RentalPlanEditModel,
  RentalPlanFormValues,
  ComboRateRow,
  JobRateRow,
} from '../types/rentalPlan.types'

import {
  permissionService,
  CREATE,
  UPDATE,
  DELETE,
} from '../../../services/auth/permission.service'
import { MODULE_RENTAL_PLAN } from '../../../constants/modules'

type Option = { value: number; label: string }

/* ======================================================
 * Pure helpers
 * ====================================================== */

const isEmpty = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

const toMoneyLabel = (n: number | null | undefined) => {
  if (n === null || n === undefined || (n as any) === '') return ''
  return `$ ${n}`
}

const coerceNumber = (raw: any) => {
  const cleaned = String(raw ?? '').replace(/[^0-9.]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

const mapAttributeItemsToOptions = (items: any[]): Option[] => {
  const base = Array.isArray(items) ? items : []
  return base
    .map((x: any) => {
      const id =
        x.attributeItemId ??
        x.attribute_item_id ??
        x.attributeItemid ??
        x.attribute_itemid ??
        x.id ??
        x.itemId
      const name = x.name ?? x.itemName ?? x.label
      if (id == null || name == null || String(name).trim() === '') return null
      const num = Number(id)
      if (!Number.isFinite(num)) return null
      return { value: num, label: String(name) }
    })
    .filter(Boolean) as Option[]
}

// FIX 3: getErrorMessage centralizado y mejorado
const getErrorMessage = (payload: any): string => {
  if (!payload) return 'Something went wrong!'
  if (typeof payload === 'string') return payload
  if (typeof payload?.message === 'string') return payload.message
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors.map((e: any) => e?.message ?? String(e)).join(', ')
  }
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (typeof first?.message === 'string') return first.message
    if (typeof first === 'string') return first
  }
  return 'Something went wrong!'
}

/* ======================================================
 * Component
 * ====================================================== */

const RentalPlanEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isNew = id === 'new' || !id
  const editId = !isNew && Number.isFinite(Number(id)) ? Number(id) : null

  const saving = useSelector(selectRentalPlansSaving)
  const errors = useSelector(selectRentalPlansErrors)
  const statuses = useSelector(selectRentalPlansStatuses)
  const current = useSelector(selectRentalPlansCurrent)

  const clientsList = useSelector((s: RootState) => s.clients.list)
  const equipmentSizesList = useSelector((s: RootState) => s.equipmentSize.list)

  const [billingPeriods, setBillingPeriods] = useState<any[]>([])
  const [gensetTypes, setGensetTypes] = useState<any[]>([])
  const [jobTypes, setJobTypes] = useState<any[]>([])
  const [unavailableClients, setUnavailableClients] = useState<number[]>([])

  const canCreate = permissionService.checkPermission(MODULE_RENTAL_PLAN, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_RENTAL_PLAN, UPDATE)

  const [form, setForm] = useState<RentalPlanEditModel>({
    planName: '',
    clientIds: [],
    status: 1,
    comboRates: [],
    jobRates: [],
  })

  const [topErrors, setTopErrors] = useState<Partial<Record<keyof RentalPlanFormValues, string>>>(
    {},
  )
  const [comboTableError, setComboTableError] = useState<string | null>(null)
  const [jobRowErrors, setJobRowErrors] = useState<Array<Record<string, string>>>([])
  const [comboRowErrors, setComboRowErrors] = useState<Array<Record<string, string>>>([])

  // FIX 3: CAlert inline como fallback cuando no hay exaToast
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  /* =========================
     LOAD GLOBAL DATA
  ========================== */

  useEffect(() => {
    dispatch(loadClients())
    dispatch(fetchEquipmentSizes())
  }, [dispatch])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [bp, gt, jt, un] = await Promise.all([
          rentalPlanApi.loadAttributeItems('billing_period', 'rental_plan'),
          rentalPlanApi.loadAttributeItems('genset_type', 'genset'),
          rentalPlanApi.loadAttributeItems('job_type', 'clients'),
          rentalPlanApi.fetchUnavailableClients(),
        ])
        if (!mounted) return
        setBillingPeriods(Array.isArray(bp) ? bp : [])
        setGensetTypes(Array.isArray(gt) ? gt : [])
        setJobTypes(Array.isArray(jt) ? jt : [])
        setUnavailableClients(Array.isArray(un) ? un : [])
      } catch (e) {
        console.error('Failed loading lookups:', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  /* =========================
     LOAD CURRENT PLAN
  ========================== */

  useEffect(() => {
    if (isNew) {
      dispatch(loadDefaultRentalPlan())
    } else if (editId) {
      dispatch(fetchRentalPlanById(editId))
    }
  }, [dispatch, isNew, editId])

  useEffect(() => {
    if (isNew && !canCreate) {
      navigate('/depot/rental-plan')
      return
    }

    if (!isNew && !canUpdate) {
      navigate('/depot/rental-plan')
      return
    }
  }, [isNew, canCreate, canUpdate, navigate])

  useEffect(() => {
    if (!current) return

    const comboRates =
      isNew && (!current.comboRates || current.comboRates.length === 0)
        ? [
            {
              chassisSizeId: null,
              containerSizeId: null,
              gensetTypeId: null,
              rate: null,
              period: null,
            },
          ]
        : (current.comboRates ?? [])

    const jobRates =
      isNew && (!current.jobRates || current.jobRates.length === 0)
        ? [{ jobId: null, jobRate: null }]
        : (current.jobRates ?? [])

    setForm({
      ...current,
      rentalPlanId: current.rentalPlanId,
      planName: current.planName ?? '',
      clientIds: current.clientIds ?? [],
      status: current.status ?? 1,
      comboRates,
      jobRates,
    })
  }, [current, isNew])

  useEffect(() => {
    return () => {
      dispatch(clearCurrent())
    }
  }, [dispatch])

  /* =========================
     TOAST / ERROR HANDLING
  ========================== */

  // FIX 3: toast primero, CAlert como fallback
  useEffect(() => {
    if (!errors) {
      setInlineError(null)
      return
    }
    const msg = getErrorMessage(errors)
    const toast = (window as any).exaToast
    if (toast?.error) {
      toast.error('Error', msg)
    } else {
      setInlineError(msg)
    }
  }, [errors])

  useEffect(() => {
    if (!statuses) return
    const toast = (window as any).exaToast
    if (statuses.added) toast?.success?.('Success', 'Rental Plan was Added')
    if (statuses.updated) toast?.success?.('Success', 'Rental Plan was Updated')
    if (statuses.added || statuses.updated) {
      dispatch(resetStatuses())
      navigate('/depot/rental-plan')
    }
  }, [statuses, dispatch, navigate])

  /* =========================
     OPTIONS BUILDERS
  ========================== */

  const clientOptions: Option[] = useMemo(() => {
    const base = Array.isArray(clientsList) ? clientsList : []
    const opts = base
      .map((c: any) => {
        const id = c.client_id ?? c.clientId ?? c.id
        const name = c.name ?? c.client_name ?? ''
        if (id == null || String(name).trim() === '') return null
        const num = Number(id)
        if (!Number.isFinite(num)) return null
        return { value: num, label: String(name) }
      })
      .filter(Boolean) as Option[]
    const selected = new Set<number>(form.clientIds ?? [])
    return opts.filter((o) => !unavailableClients.includes(o.value) || selected.has(o.value))
  }, [clientsList, unavailableClients, form.clientIds])

  const chassisSizeOptions: Option[] = useMemo(() => {
    const base = Array.isArray(equipmentSizesList) ? equipmentSizesList : []
    return base
      .filter((x: any) => Number(x.equipmentTypeId) === 1)
      .map((x: any) => ({
        value: Number(x.sizeEquipmentId ?? x.id),
        label: String(x.sizeType ?? x.name ?? ''),
      }))
      .filter((o: any) => Number.isFinite(o.value) && String(o.label).trim() !== '')
  }, [equipmentSizesList])

  const containerSizeOptions: Option[] = useMemo(() => {
    const base = Array.isArray(equipmentSizesList) ? equipmentSizesList : []
    return base
      .filter((x: any) => Number(x.equipmentTypeId) === 2)
      .map((x: any) => ({
        value: Number(x.sizeEquipmentId ?? x.id),
        label: String(x.sizeType ?? x.name ?? ''),
      }))
      .filter((o: any) => Number.isFinite(o.value) && String(o.label).trim() !== '')
  }, [equipmentSizesList])

  const gensetOptions = useMemo(() => mapAttributeItemsToOptions(gensetTypes), [gensetTypes])
  const billingPeriodOptions = useMemo(
    () => mapAttributeItemsToOptions(billingPeriods),
    [billingPeriods],
  )
  const jobOptions = useMemo(() => mapAttributeItemsToOptions(jobTypes), [jobTypes])

  /* =========================
     FIX 4: VALIDACIONES — dentro del componente, funciones puras
  ========================== */

  const validateJobRates = (rows: JobRateRow[]) => {
    const errors: Array<Record<string, string>> = []

    rows.forEach((row) => {
      const e: Record<string, string> = {}

      const hasJob = row.jobId != null
      const hasRate = row.jobRate != null && row.jobRate !== ''

      // solo validar si seleccionó job
      if (hasJob && !hasRate) {
        e.jobRate = 'Rate is required'
      }

      errors.push(e)
    })

    return {
      errors,
      hasAnyError: errors.some((e) => Object.keys(e).length > 0),
    }
  }

  const validateComboRates = (rows: ComboRateRow[]) => {
    const errors: Array<Record<string, string>> = []

    rows.forEach((row) => {
      const e: Record<string, string> = {}

      const hasEquipment =
        row.containerSizeId != null || row.chassisSizeId != null || row.gensetTypeId != null

      // solo uno es requerido
      if (!hasEquipment) {
        e.containerSizeId = 'Select Container, Chassis or Genset'
      }

      // rate requerido
      if (row.rate == null || row.rate === '') {
        e.rate = 'Rate is required'
      }

      // period requerido
      if (!row.period) {
        e.period = 'Period is required'
      }

      errors.push(e)
    })

    const hasAnyError = errors.some((e) => Object.keys(e).length > 0)

    return {
      errors,
      hasAnyError,
      tableError: hasAnyError
        ? 'Please fix the errors in the Rental Rates table before saving.'
        : null,
    }
  }

  /* =========================
     SUBMIT
  ========================== */

  const handleSubmit = async () => {
    // Top form
    const e: Partial<Record<keyof RentalPlanFormValues, string>> = {}
    if (isEmpty(form.planName)) e.planName = 'Plan Name is required'
    if (!Array.isArray(form.clientIds) || form.clientIds.length < 1)
      e.clientIds = 'Applies For is required'
    setTopErrors(e)

    // Tables
    const jobValidation = validateJobRates(form.jobRates ?? [])
    const comboValidation = validateComboRates(form.comboRates ?? [])
    setJobRowErrors(jobValidation.errors)
    setComboRowErrors(comboValidation.errors)
    setComboTableError(comboValidation.tableError ?? null)

    const hasTopErrors = Object.keys(e).length > 0
    const hasTableErrors = jobValidation.hasAnyError || comboValidation.hasAnyError

    if (hasTopErrors || hasTableErrors) {
      const details: string[] = []
      if (hasTopErrors) details.push('check the form fields above')
      if (jobValidation.hasAnyError) details.push('fix errors in the Job Rates table')
      if (comboValidation.hasAnyError) details.push('fix errors in the Rental Rates table')
      const msg = `Please ${details.join(' and ')}.`
      const toast = (window as any).exaToast
      if (toast?.error) {
        toast.error('Validation Error', msg)
      } else {
        setInlineError(msg)
      }
      return
    }

    // Save
    let result: any
    if (isNew) result = await dispatch(addRentalPlan(form as any))
    else result = await dispatch(saveRentalPlan(form as any))

    if (result?.meta?.requestStatus !== 'fulfilled') {
      const msg = getErrorMessage(result?.payload)
      const toast = (window as any).exaToast
      if (toast?.error) {
        toast.error('Error', msg)
      } else {
        setInlineError(msg)
      }
      setErrorMessage(msg)
      setShowErrorModal(true)
    }
  }

  const handleBack = () => navigate('/depot/rental-plan')
  const title = isNew ? 'Add Rental Plan' : 'Edit Rental Plan'

  return (
    <CContainer fluid>
      <PageHero kicker="Rental Plans" icon={cilList} title={title} />

      <CRow>
        <CCol lg={12}>
          <CCard className="mb-4 shadow-sm trips-card">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>{title}</strong>
            </CCardHeader>

            <CCardBody>
              {/* FIX 3: CAlert dismissible como fallback */}
              {inlineError && (
                <CAlert
                  color="danger"
                  className="mb-4"
                  dismissible
                  onClose={() => setInlineError(null)}
                >
                  <strong>Error:</strong> {inlineError}
                </CAlert>
              )}

              {/* ═══════════ TOP FORM ═══════════ */}
              <div className="mb-4">
                <RentalPlanTopForm
                  value={form}
                  clientOptions={clientOptions}
                  disabled={saving}
                  errors={topErrors}
                  onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
                />
              </div>

              {/* ═══════════ JOB RATES ═══════════
                  SIN div.table-responsive — la tabla se expande
                  con la página al agregar filas */}
              <div className="mt-4">
                <JobRatesTable
                  value={form.jobRates || []}
                  jobOptions={jobOptions}
                  disabled={saving}
                  rowErrors={jobRowErrors}
                  onChange={(rows) => setForm((prev) => ({ ...prev, jobRates: rows }))}
                  onCoerceRate={coerceNumber}
                  onMoneyLabel={toMoneyLabel}
                />
              </div>

              {/* ═══════════ COMBO RATES ═══════════
                  SIN div.table-responsive — igual que Job Rates */}
              <div className="mt-5">
                <ComboRatesTable
                  value={form.comboRates || []}
                  disabled={saving}
                  comboTableError={comboTableError}
                  rowErrors={comboRowErrors}
                  chassisSizeOptions={chassisSizeOptions}
                  containerSizeOptions={containerSizeOptions}
                  gensetOptions={gensetOptions}
                  billingPeriodOptions={billingPeriodOptions}
                  onChange={(rows) => setForm((prev) => ({ ...prev, comboRates: rows }))}
                  onCoerceRate={coerceNumber}
                  onMoneyLabel={toMoneyLabel}
                  isEdit={!isNew}
                />
              </div>
            </CCardBody>

            <CCardFooter className="d-flex justify-content-between">
              <CButton color="secondary" variant="outline" onClick={handleBack} disabled={saving}>
                <CIcon icon={cilArrowLeft} className="me-2" />
                Back
              </CButton>
              <CButton
                color="primary"
                className="text-white"
                onClick={handleSubmit}
                disabled={saving || (isNew ? !canCreate : !canUpdate)}
              >
                <CIcon icon={cilSave} className="me-2" />
                {saving ? 'Saving...' : 'Save'}
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>

      <ErrorModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        errorMessage={errorMessage}
      />
    </CContainer>
  )
}

export default RentalPlanEditPage
