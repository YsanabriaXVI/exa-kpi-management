import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave } from '@coreui/icons'
import * as Yup from 'yup'

import SizeChargesTable from '../components/SizeChargesTable'
import SuccesModalWithActions from 'src/components/SuccesModalWithActions'
import ErrorMessageModal from 'src/components/ErrorMessageModal'

import { fetchEquipmentSizes } from '../../../EquipmentSize/store/equipmentSize.slice'
import { RenderOptions } from 'src/helpers/RenderOptionsHelper'
import {
  addJobRates,
  deleteJobRate,
  loadDefaultJob,
  loadGensetTypes,
  loadJobOptions,
  loadJobRatesGroup,
  loadJobRatesList,
} from '../store/jobs.slice'

import { set, type AppDispatch } from 'src/store'

/* =======================
   Validation Schemas
======================= */

const jobsSchema = Yup.object({
  jobId: Yup.number().typeError('Job is required').required('Job is required'),
})

const sizeSchema = Yup.object({
  equipmentSizeId: Yup.number().typeError('Equipment size is required').required('Equipment size is required'),
})

const gensetSchema = Yup.object({
  gensetTypeId: Yup.number().typeError('Genset type is required').required('Genset type is required'),
})

/* =======================
   Types (minimal + safe)
======================= */

type RootStateLike = any

type Params = {
  clientId: string
  setupId: string
  sizeId: string
}

type RowError = Record<string, string>

type JobRow = {
  id?: string | number
  jobRateId?: number
  jobId?: number | string | null
  job?: string
  MHEmpty?: string | null
  MHLoaded?: string | null
  CHEmpty?: string | null
  CHLoaded?: string | null
  PriceOrQty?: string | null
  [key: string]: any
}

type FormData = {
  equipmentSizeId?: number | null
  gensetTypeId?: number | null
  jobs_data?: JobRow[]
  [key: string]: any
}

type EquipmentSizeItem = any

type SelectOption = { value: number | string; label: string }

/* =======================
   Helpers
======================= */

const yupToErrorMap = (err: Yup.ValidationError): Record<string, string> => {
  const out: Record<string, string> = {}

  if (Array.isArray(err.inner) && err.inner.length > 0) {
    err.inner.forEach((e) => {
      if (!e.path) return
      if (!out[e.path]) out[e.path] = e.message
    })
    return out
  }

  if (err.path) out[err.path] = err.message
  return out
}

export default function AddSizeChargesPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const { clientId, setupId, sizeId } = useParams<Params>()
  const params = useParams<Params>()

  console.log('params', params)

  // routing mode
  const isEdit = 'sizeId' in params && typeof Number(params.sizeId) === 'number'

  // location
  const location = useLocation()
  const viewMode = Boolean(location.state?.viewMode)
  const isView = viewMode

  const numericClientId = Number(clientId)
  const numericSetupId = Number(setupId)
  const numericSizeId = Number(sizeId)

  // local state
  const [formData, setFormData] = useState<FormData>({})
  const [setupData, setSetupData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [FESizeError, setFESizeError] = useState<any>(false)
  const [FEJobErrors, setFEJobErrors] = useState<RowError[]>([])

  // modal state
  const [saving, setSaving] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [savedData, setSavedData] = useState<any>(null)

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const recordIdKey = 'sizeId'

  // redux
  const sizesList = useSelector((state: RootStateLike) => state.equipmentSize.list) as any[]
  const jobList = useSelector((state: RootStateLike) => state.jobs.jobOptionsList) as any[]
  const gensets = useSelector((state: RootStateLike) => state.jobs.gensetTypesList) as any[]
  const setupJobs = useSelector((state: RootStateLike) => state.jobs.list) as any[]

  const jobGroup = useSelector((s: any) => s.jobs.job) // wherever you store the loaded group

  useEffect(() => {
    if (jobGroup) setFormData(jobGroup)
  }, [jobGroup])

  /* =======================
     Data Loading
  ======================= */

  const loadData = useCallback(async () => {
    if (!Number.isFinite(numericSetupId)) return

    setLoading(true)
    setError(null)

    try {
      await Promise.all([
        dispatch(fetchEquipmentSizes()).unwrap(),
        dispatch(loadJobOptions()).unwrap(),
        dispatch(loadGensetTypes()).unwrap(),
        dispatch(loadJobRatesList(numericSetupId)).unwrap(),
      ])

      if (!isEdit) {
        const defaultJob = await dispatch(loadDefaultJob(numericSetupId)).unwrap()
        setFormData((defaultJob as any) ?? {})
        return
      }

      if (!Number.isFinite(numericSizeId)) return

      const group = await dispatch(
        loadJobRatesGroup({ setupId: numericSetupId, sizeId: numericSizeId }),
      ).unwrap()

      setFormData((group as any) ?? {})
    } catch (err: any) {
      console.error('Failed to load size charges data', err)
      setError(typeof err === 'string' ? err : 'Unable to load size charges data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [dispatch, numericSetupId, numericSizeId, isEdit])

  useEffect(() => {
    let alive = true

    const run = async () => {
      if (!alive) return
      await loadData()
    }

    run()

    return () => {
      alive = false
    }
  }, [loadData])

  /* =======================
     Basic helpers
  ======================= */

  const getData = () => formData

  const handleCancel = () => {
    navigate(`/assets/clients/${clientId}/depot-setup/${setupId}`)
  }

  const setJobs = (newJobs: JobRow[]) => {
    setFormData((prev) => ({
      ...prev,
      jobs_data: newJobs,
    }))
  }

  const isGenset = (value: number) => {
    return (gensets ?? []).some((g: any) => g.attributeItemId === value)
  }

  const getSizeOptions = (sizes: EquipmentSizeItem[], jobsForSetup: any[], data: FormData) => {
    if (!sizes || sizes.length === 0 || !data) return []

    const takenSizeIds = new Set((jobsForSetup ?? []).map((x: any) => x.equipmentSizeId))
    const filtered: EquipmentSizeItem[] = []

    sizes.forEach((elem: any) => {
      const sizePk = elem.sizeEquipmentId ?? elem.equipmentSizeId
      const current = data.equipmentSizeId // keep current selected

      if (!takenSizeIds.has(sizePk) || sizePk === current) {
        filtered.push(elem)
      }
    })

    return filtered
  }

  const clearJobs = (jobs: JobRow[]) => {
    const placeholder = 'Click to Edit...'
    const jobsClone = [...jobs]

    jobs.forEach((job, index) => {
      let isEmpty = true

      Object.keys(job).forEach((key) => {
        const val = job[key]

        if (
          key === 'jobId' &&
          (typeof job.jobId === 'number' || (typeof job.jobId === 'string' && job.jobId !== ''))
        ) {
          isEmpty = false
        } else if (
          key !== 'jobId' &&
          key !== 'job' &&
          typeof val === 'string' &&
          (val.trim() === placeholder || val.trim() === '')
        ) {
          job[key] = null
        } else if (typeof val === 'string' && val.trim() !== placeholder && val.trim() !== '') {
          isEmpty = false
        } else if (typeof val === 'number') {
          isEmpty = false
        }
      })

      if (isEmpty) {
        jobsClone.splice(index, 1)
        setJobs(jobsClone)
      }
    })
  }

  const validateJobs = async (jobs: JobRow[]) => {
    if (!jobs || jobs.length === 0) return true

    setFEJobErrors([])

    let passed = true
    const errorsArr: RowError[] = []

    for (const job of jobs) {
      try {
        await jobsSchema.validate(job, { abortEarly: false })
        errorsArr.push({})
      } catch (err: any) {
        passed = false
        errorsArr.push(yupToErrorMap(err as Yup.ValidationError))
      }
    }

    setFEJobErrors(errorsArr)
    return passed
  }

  const validateSize = async (data: FormData) => {
    setFESizeError(false)

    const selected = Number(data.gensetTypeId ?? data.equipmentSizeId)
    const isGensetSelected = isGenset(selected)
    const schemaToUse = isGensetSelected ? gensetSchema : sizeSchema

    try {
      await schemaToUse.validate(data, { abortEarly: false })
      return true
    } catch (err: any) {
      setFESizeError(yupToErrorMap(err as Yup.ValidationError))
      return false
    }
  }

  const resetValidation = async () => {
    setFESizeError(false)
    setFEJobErrors([])
  }

  /* =======================
     Handlers
  ======================= */

  const handleSizeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const nextValue = value === '' ? null : Number(value)

    const nextIsGenset = nextValue != null ? isGenset(Number(nextValue)) : false

    const field1: 'gensetTypeId' | 'equipmentSizeId' = nextIsGenset ? 'gensetTypeId' : 'equipmentSizeId'
    const field2: 'gensetTypeId' | 'equipmentSizeId' =
      field1 === 'equipmentSizeId' ? 'gensetTypeId' : 'equipmentSizeId'

    setFormData((prev) => {
      const next = { ...prev } as FormData
      next[field1] = nextValue
      next[field2] = null

      // In edit mode, keep row foreign key consistent if your backend expects it.
      // NOTE: If your backend does NOT want equipmentSizeId on genset rows, remove this.
      if (isEdit && Array.isArray(next.jobs_data) && field1 === 'equipmentSizeId' && typeof nextValue === 'number') {
        next.jobs_data = next.jobs_data.map((job) => ({
          ...job,
          equipmentSizeId: nextValue,
        }))
      }

      return next
    })
  }

  const deleteJobRates = async (jobRateId: number) => {
    try {
      if (Number.isNaN(jobRateId)) return
      await dispatch(deleteJobRate({ jobRateId })).unwrap()
    } catch (error: any) {
      setErrorMessage(typeof error === 'string' ? error : error?.message ?? 'Failed to delete job rate.')
      setShowErrorModal(true)
    }
  }

  /* =======================
     Success Modal Navigation
  ======================= */

  const onClickBackToOverview = () => {
    setShowSuccessModal(false)
    navigate(`/assets/clients/${clientId}/depot-setup/${setupId}`)
  }

  const onClickCreateAnother = () => {
    navigate(0)
    setShowSuccessModal(false)
  }

  const onClickContinueEditing = () => {
    const savedId = savedData?.[recordIdKey]

    if (!savedId) {
      setShowSuccessModal(false)
      return
    }

    setShowSuccessModal(false)
    navigate(`/assets/clients/${clientId}/depot-setup/${setupId}/size-charges/${savedId}`)
  }

  /* =======================
     Save
  ======================= */

  const save = async () => {
    try {
      setSaving(true)
      setErrorMessage('')
      await resetValidation()

      const data = getData()
      const jobs = Array.isArray(data.jobs_data) ? data.jobs_data : []

      // clearJobs(jobs)

      const sizeOk = await validateSize(data)
      const jobsOk = sizeOk ? await validateJobs(jobs) : false

      console.log('🔍 [save] sizeOk:', sizeOk, 'jobsOk:', jobsOk)

      if (!sizeOk || !jobsOk) return

      // IMPORTANT: await + unwrap so you only show modal on real success
      const saved = await dispatch(addJobRates({ ...data, setupId: numericSetupId } as any)).unwrap()

      setFormData((saved.job as any) ?? {}) // ✅ now includes jobs_data

      console.log('🔍 [save] Saved:', saved)

      const sizeId =
        formData.equipmentSizeId !== null ? formData.equipmentSizeId : formData.gensetTypeId

      setSavedData({ ...saved, sizeId })
      setSuccessMessage(isEdit ? 'Size charges updated successfully.' : 'Size charges created successfully.')
      setShowSuccessModal(true)
    } catch (e) {
      setShowErrorModal(true)
      setErrorMessage(e as any)
    } finally {
      setSaving(false)
    }
  }

  /* =======================
     Options
  ======================= */

  const sizeOptions = useMemo(() => {
    return getSizeOptions(sizesList, setupJobs, formData) || []
  }, [sizesList, setupJobs, formData])

  const renderSizeTypeOptions = useCallback((options: any[], genset = false): SelectOption[] => {
    if (genset) {
      return (options ?? []).map((elem: any) => ({
        value: elem.attributeItemId,
        label: `Genset, ${elem.name}`,
      }))
    }

    return (options ?? []).map((elem: any) => ({
      value: elem.sizeEquipmentId,
      label: `${elem.equipmentTypedId?.equipmentName ?? ''}, ${elem.sizeType ?? ''} ${
        elem.extendable === 1 ? 'extendable' : ''
      }`.trim(),
    }))
  }, [])

  const jobsOptions = useMemo(() => {
    return RenderOptions(jobList || [], 'attributeItemId', 'name') || []
  }, [jobList])

  const combinedOptions = useMemo(() => {
    const sizeTypeOptions = renderSizeTypeOptions(sizeOptions, false)
    const gensetTypeOptions = renderSizeTypeOptions(gensets || [], true)
    return [...sizeTypeOptions, ...gensetTypeOptions]
  }, [sizeOptions, gensets, renderSizeTypeOptions])

  const selectedSizeTypeValue = useMemo(() => {
    if (formData.gensetTypeId != null) return String(formData.gensetTypeId)
    if (formData.equipmentSizeId != null) return String(formData.equipmentSizeId)
    return ''
  }, [formData])

  const jobsData = formData && Array.isArray(formData.jobs_data) ? formData.jobs_data : []

  console.log('jobsData', jobsData)
  console.log('formData', formData)
  console.log('FEJobErrors', FEJobErrors)

  /* =======================
     Render
  ======================= */

  if (loading) {
    return (
      <CCard className="shadow-sm border-0">
        <CCardHeader>
          <strong>Loading Size Charges…</strong>
        </CCardHeader>
        <CCardBody>
          <div className="text-body-secondary">Please wait.</div>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <>
      <CCard className="client-section-card shadow-sm border-0">
        <CCardHeader>
          <strong>
            <span>{isEdit ? 'Edit Size Charges' : 'Add Size Charges'}</span>
          </strong>
        </CCardHeader>

        <CCardBody>
          {error ? <div className="text-danger mb-3">{error}</div> : null}

          <p>
            <strong>Depot: </strong>
            {setupData == null ? 'Loading...' : setupData?.depot?.location?.name ?? ''}
          </p>

          <br />

          <CRow className="justify-content-center">
            <CCol sm={12} xl={11}>
              <CRow>
                <CCol sm={12} xl={12}>
                  <label className="form-label">Size-Type</label>
                  <CFormSelect
                    id="size-type"
                    name="sizeType"
                    value={selectedSizeTypeValue}
                    onChange={handleSizeTypeChange}
                    invalid={!!FESizeError.equipmentSizeId}
                    feedbackInvalid={FESizeError.equipmentSizeId}
                    disabled={isEdit}
                  >
                    <option value="">Select Equipment Size-Type</option>
                    {combinedOptions.map((opt: any) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>

              <br />

              <SizeChargesTable
                jobs={jobsData as any}
                setJobs={setJobs}
                jobOptions={jobsOptions as any}
                errors={FEJobErrors}
                deleteJobRates={deleteJobRates}
                viewMode={isView}
              />
            </CCol>
          </CRow>

          <div className="client-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4">
            <CButton color="secondary" variant="ghost" type="button" onClick={handleCancel} disabled={saving}>
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back
            </CButton>

            {!isView && (
              <CButton
                color="primary"
                type="submit"
                className="text-white px-4"
                onClick={save}
                disabled={saving}
              >
                <CIcon icon={cilSave} className="me-2" />
                {saving ? 'Saving…' : 'Save Rates'}
              </CButton>
            )}
          </div>
        </CCardBody>
      </CCard>

      <SuccesModalWithActions
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={setShowSuccessModal}
        savedData={savedData}
        recordIdKey={recordIdKey}
        isEdit={isEdit}
        successMessage={successMessage}
        onClickCreateAnother={onClickCreateAnother}
        onClickContinueEditing={onClickContinueEditing}
        onClickBackToOverview={onClickBackToOverview}
      />

      <ErrorMessageModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        errorMessage={errorMessage}
      />
    </>
  )
}
