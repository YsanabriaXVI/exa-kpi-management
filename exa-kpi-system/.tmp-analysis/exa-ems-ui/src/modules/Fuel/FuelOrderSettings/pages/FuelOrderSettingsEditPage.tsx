import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import * as Yup from 'yup'

import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CContainer,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilCog } from '@coreui/icons'

import type { AppDispatch, RootState } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ErrorMessageModal from 'src/components/ErrorMessageModal'

import FuelOrderSettingsForm, { type SettingsFormValue } from '../components/FuelOrderSettingsForm'

import {
  addFuelOrderSettings,
  fetchFuelOrderSettings,
  loadDefaultSettings,
  saveFuelOrderSettings,
  selectFuelOrderSettingsCurrent,
  selectFuelOrderSettingsLoadingCurrent,
  selectFuelOrderSettingsSaving,
  selectWorkTypes,
  selectAssetTypes,
  selectFuelOrderTypes,
} from '../store/fuelOrderSettings.slice'

const fuelLimitRuleSchema = Yup.object({
  period: Yup.number().typeError('* period is required').required('* period is required'),
  assetIds: Yup.array().of(Yup.number()).min(1, '* at least one plate is required').required(),
  fuelLimitLtrs: Yup.number().typeError('* fuel limit is required').required('* fuel limit is required'),
})

const buildSchema = (maxFuelFeature: number, approvalRequired: number) =>
  Yup.object({
    name: Yup.string()
      .trim()
      .min(1, '* name is required')
      .max(255, '* name must be at most 255 characters')
      .required('* name is required'),
    company_id: Yup.number()
      .typeError('* company is required')
      .required('* company is required'),
    subdivisions: Yup.array()
      .of(Yup.number())
      .min(1, '* at least one subdivision is required')
      .required('* subdivisions are required'),
    workTypes: Yup.array()
      .of(Yup.number())
      .min(1, '* at least one work type is required')
      .required('* work types are required'),
    assetTypes: Yup.array()
      .of(Yup.number())
      .min(1, '* at least one asset type is required')
      .required('* asset types are required'),
    fuelOrderTypeId: Yup.number()
      .typeError('* fuel order type is required')
      .required('* fuel order type is required'),
    maximumApprove: Yup.number()
      .typeError('* maximum approve is required')
      .required('* maximum approve is required'),
    approvalRequired: Yup.number().oneOf([0, 1]).required(),
    tripRequired: Yup.number().oneOf([0, 1]).required(),
    clients: Yup.array().of(Yup.number()).optional(),
    fuelVariationMin: Yup.number()
      .min(0, '* must be 0-99')
      .max(99, '* must be 0-99')
      .nullable()
      .transform((v) => (v === '' || Number.isNaN(v) ? null : v))
      .optional(),
    fuelVariationMax: Yup.number()
      .min(0, '* must be 0-99')
      .max(99, '* must be 0-99')
      .nullable()
      .transform((v) => (v === '' || Number.isNaN(v) ? null : v))
      .optional(),
    approvers: approvalRequired === 1
      ? Yup.array().of(Yup.string()).min(1, '* at least one approver is required').required()
      : Yup.array().of(Yup.string()).optional(),
    fuelLimitRules: maxFuelFeature === 1
      ? Yup.array().of(fuelLimitRuleSchema).min(1, '* at least one fuel limit rule is required').required()
      : Yup.array().optional(),
  })

const getErrorMessage = (payload: any): string => {
  if (!payload) return 'Something went wrong!'
  if (typeof payload === 'string') return payload
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (typeof first?.message === 'string') return first.message
  }
  if (typeof payload?.message === 'string') return payload.message
  return 'Something went wrong!'
}

const FuelOrderSettingsEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null

  const saving = useSelector(selectFuelOrderSettingsSaving)
  const loadingCurrent = useSelector(selectFuelOrderSettingsLoadingCurrent)
  const current = useSelector(selectFuelOrderSettingsCurrent)

  const companiesList = useSelector((s: RootState) => (s.auth as any)?.details?.details?.companies ?? [])
  const subdivisionsList = useSelector((s: RootState) => (s.auth as any)?.details?.details?.subdivisions ?? [])
  const workTypesList = useSelector(selectWorkTypes)
  const assetTypesList = useSelector(selectAssetTypes)
  const fuelOrderTypesList = useSelector(selectFuelOrderTypes)

  const refDataLoaded = useMemo(
    () =>
      companiesList.length > 0 &&
      subdivisionsList.length > 0 &&
      workTypesList.length > 0 &&
      assetTypesList.length > 0 &&
      fuelOrderTypesList.length > 0,
    [companiesList, subdivisionsList, workTypesList, assetTypesList, fuelOrderTypesList],
  )

  const [value, setValue] = useState<SettingsFormValue>({
    name: '',
    company_id: null,
    subdivisions: [],
    workTypes: [],
    assetTypes: [],
    clients: [],
    fuelOrderTypeId: null,
    ratebuilderId: null,
    approvers: [],
    maxFuelFeature: 0,
    tripRequired: 0,
    approvalRequired: 0,
    suggestedAmountRequired: 0,
    expTimeBefore: 0,
    expTimeAfter: 0,
    maximumApprove: 0,
    fuelVariationMin: 0,
    fuelVariationMax: 0,
    fuelSupplyVariationMin: 0,
    fuelSupplyVariationMax: 0,
    fuelStatementRequired: 1,
    supplierStatementRequired: 1,
    fuelLimitRules: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isEdit && editId) {
      dispatch(fetchFuelOrderSettings(editId))
    } else {
      dispatch(loadDefaultSettings(undefined))
    }
  }, [dispatch, isEdit, editId])

  useEffect(() => {
    if (!current) return
    setValue({
      name: current.name ?? '',
      company_id: current.company_id ?? null,
      subdivisions: current.subdivisions ?? [],
      workTypes: current.workTypes ?? [],
      assetTypes: current.assetTypes ?? [],
      clients: current.clients ?? [],
      fuelOrderTypeId: current.fuelOrderTypeId ?? null,
      ratebuilderId: current.ratebuilderId ?? null,
      approvers: current.approvers ?? [],
      maxFuelFeature: current.maxFuelFeature ?? 0,
      tripRequired: current.tripRequired ?? 0,
      approvalRequired: current.approvalRequired ?? 0,
      suggestedAmountRequired: current.suggestedAmountRequired ?? 0,
      expTimeBefore: current.expTimeBefore ?? 0,
      expTimeAfter: current.expTimeAfter ?? 0,
      maximumApprove: current.maximumApprove ?? 0,
      fuelVariationMin: current.fuelVariationMin ?? 0,
      fuelVariationMax: current.fuelVariationMax ?? 0,
      fuelSupplyVariationMin: current.fuelSupplyVariationMin ?? 0,
      fuelSupplyVariationMax: current.fuelSupplyVariationMax ?? 0,
      fuelStatementRequired: current.fuelStatementRequired ?? 1,
      supplierStatementRequired: current.supplierStatementRequired ?? 1,
      fuelLimitRules: current.fuelLimitRules ?? [],
    })
  }, [current])

  const setField = (field: keyof SettingsFormValue, v: any) => {
    setValue((prev) => ({ ...prev, [field]: v }))
  }

  const hasError = (field: keyof SettingsFormValue) =>
    !!touched[field] && !!errors[field]

  const subdivisionMap = useMemo(() => {
    const map: Record<number, string> = {}
    subdivisionsList.forEach((s: any) => {
      map[s.subdivision_id] = s.name
    })
    return map
  }, [subdivisionsList])

  const validateFormApprovers = (): boolean => {
    if (value.approvalRequired !== 1) return true

    const approverSubdivIds = new Set(
      (value.approvers ?? []).map((a) => Number(String(a).split('-')[1])),
    )

    const missing = (value.subdivisions ?? []).filter((id) => !approverSubdivIds.has(id))
    if (missing.length === 0) return true

    const missingNames = missing.map((id) => subdivisionMap[id] || `ID ${id}`)
    const t = (window as any).exaToast
    t?.error?.('Error', `Missing approvers for subdivisions: ${missingNames.join(', ')}`)
    return false
  }

  const validate = async () => {
    try {
      setErrors({})
      const schema = buildSchema(value.maxFuelFeature, value.approvalRequired)
      await schema.validate(value, { abortEarly: false })
      return true
    } catch (err: any) {
      const formatted: Record<string, string> = {}
      ;(err?.inner ?? []).forEach((e: any) => {
        if (e?.path) {
          const key = e.path.replace(/\[(\d+)\]\./, '[$1].')
          if (!formatted[key]) formatted[key] = e.message
        }
      })
      setErrors(formatted)
      return false
    }
  }

  const handleSave = async () => {
    try {
      const allFields: Record<string, boolean> = { name: true, company_id: true, subdivisions: true, workTypes: true, assetTypes: true, fuelOrderTypeId: true, maximumApprove: true }
      setTouched((prev) => ({ ...prev, ...allFields }))

      const ok = await validate()
      if (!ok) return

      if (!validateFormApprovers()) return

      const payload: any = {
        ...current,
        ...value,
        name: value.name?.trim(),
      }
      if (isEdit && editId) payload.fuelModuleConfigId = editId

      const result = isEdit
        ? await dispatch(saveFuelOrderSettings(payload))
        : await dispatch(addFuelOrderSettings(payload))

      if (result?.meta?.requestStatus === 'rejected') {
        setErrorMessage(getErrorMessage((result as any)?.payload))
        setShowErrorModal(true)
        return
      }

      if (result?.meta?.requestStatus === 'fulfilled') {
        navigate('/fuel/settings/fuel-order-settings')
        return
      }

      throw new Error(getErrorMessage((result as any)?.payload))
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err?.message || err))
      setShowErrorModal(true)
    }
  }

  const showLoading = loadingCurrent || (isEdit && !current) || !refDataLoaded

  return (
    <CContainer fluid>
      <CCol xs={12}>
        <PageHero
          kicker={isEdit ? 'Edit Fuel Order Setting' : 'Add Fuel Order Setting'}
          icon={cilCog}
          title="Fuel Order Settings"
        />
      </CCol>

      {showLoading ? (
        <div className="text-center py-5">
          <CSpinner color="primary" />
          <p className="mt-2 text-body-secondary">Loading settings data...</p>
        </div>
      ) : (
        <CCard className="mb-4 shadow-sm">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Fuel Order Setting Details</strong>
          </CCardHeader>

          <CCardBody>
            <FuelOrderSettingsForm
              value={value}
              disabled={saving}
              errors={errors}
              setTouched={setTouched}
              setField={setField}
              hasError={hasError}
            />
          </CCardBody>

          <CCardFooter className="d-flex justify-content-between">
            <CButton
              color="secondary" variant="outline"
              onClick={() => navigate('/fuel/settings/fuel-order-settings')}
              disabled={saving}
            >
              Cancel
            </CButton>

            <CButton color="primary" className="text-white" onClick={handleSave} disabled={saving}>
              <CIcon icon={cilSave} className="me-2" />
              {saving ? 'Saving...' : 'Save'}
            </CButton>
          </CCardFooter>
        </CCard>
      )}

      <ErrorMessageModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        errorMessage={errorMessage}
      />
    </CContainer>
  )
}

export default FuelOrderSettingsEditPage
