import React, { useCallback, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CFormSwitch,
  CMultiSelect,
  CRow,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../../store'
import type { FuelLimitRule } from '../types/fuelOrderSettings.types'
import {
  loadAttributeItems,
  loadPlatesList,
  loadSubdivisionUsers,
  selectWorkTypes,
  selectAssetTypes,
  selectFuelOrderTypes,
  selectSubdivisionUsers,
  selectPlatesList,
  selectPeriods,
} from '../store/fuelOrderSettings.slice'
import FuelLimitRuleBox from './FuelLimitRuleBox'
import handleTakenPlateIds from '../utils/handleTakenPlateIds'

export interface SettingsFormValue {
  name: string
  company_id: number | null
  subdivisions: number[]
  workTypes: number[]
  assetTypes: number[]
  clients: number[]
  fuelOrderTypeId: number | null
  ratebuilderId: number | null
  approvers: (number | string)[]
  maxFuelFeature: number
  tripRequired: number
  approvalRequired: number
  suggestedAmountRequired: number
  expTimeBefore: number
  expTimeAfter: number
  maximumApprove: number
  fuelVariationMin: number | string
  fuelVariationMax: number | string
  fuelSupplyVariationMin: number | string
  fuelSupplyVariationMax: number | string
  fuelStatementRequired: number
  supplierStatementRequired: number
  fuelLimitRules: FuelLimitRule[]
}

interface SettingsFormProps {
  value: SettingsFormValue
  disabled: boolean
  errors: Record<string, string>
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setField: (field: keyof SettingsFormValue, value: any) => void
  hasError: (field: keyof SettingsFormValue) => boolean
}

const FuelOrderSettingsForm: React.FC<SettingsFormProps> = ({
  value,
  disabled,
  errors,
  setTouched,
  setField,
  hasError,
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const workTypesList = useSelector(selectWorkTypes)
  const assetTypesList = useSelector(selectAssetTypes)
  const fuelOrderTypesList = useSelector(selectFuelOrderTypes)
  const subdivisionUsersList = useSelector(selectSubdivisionUsers)
  const platesList = useSelector(selectPlatesList)
  const periodsList = useSelector(selectPeriods)

  const companiesList = useSelector((s: RootState) => (s.auth as any)?.details?.details?.companies ?? [])
  const subdivisionsList = useSelector((s: RootState) => (s.auth as any)?.details?.details?.subdivisions ?? [])
  const clientsList = useSelector((s: RootState) => (s.auth as any)?.details?.details?.clients ?? [])

  useEffect(() => {
    dispatch(loadAttributeItems({ attributeFlatNameId: 'tipo_de_labor', targetField: 'workType', moduleFlatNameId: 'fuel_order' }))
    dispatch(loadAttributeItems({ attributeFlatNameId: 'asset_type', targetField: 'assetType', moduleFlatNameId: 'fuel_order' }))
    dispatch(loadAttributeItems({ attributeFlatNameId: 'fuel_order_type', targetField: 'fuelOrderType', moduleFlatNameId: 'fuel_order_settings' }))
    dispatch(loadAttributeItems({ attributeFlatNameId: 'fuel_limit_period', targetField: 'period', moduleFlatNameId: 'fuel_order_settings' }))
  }, [dispatch])

  useEffect(() => {
    if (value.subdivisions?.length) {
      dispatch(loadSubdivisionUsers({ subdivisionIds: value.subdivisions }))
    }
  }, [dispatch, value.subdivisions])

  useEffect(() => {
    if (value.subdivisions?.length && value.assetTypes?.length) {
      dispatch(loadPlatesList({ subdivisionIds: value.subdivisions, assetTypeIds: value.assetTypes }))
    }
  }, [dispatch, value.subdivisions, value.assetTypes])

  const companyOptions = useMemo(
    () => companiesList.map((c: any) => ({ value: c.company_id, label: c.name })),
    [companiesList],
  )

  const subdivisionMultiOptions = useMemo(
    () => subdivisionsList.map((s: any) => ({
      value: s.subdivision_id,
      label: s.name,
      selected: (value.subdivisions ?? []).includes(s.subdivision_id),
    })),
    [subdivisionsList, value.subdivisions],
  )

  const clientMultiOptions = useMemo(
    () => clientsList.map((c: any) => ({
      value: c.client_id,
      label: c.name,
      selected: (value.clients ?? []).includes(c.client_id),
    })),
    [clientsList, value.clients],
  )

  const workTypeMultiOptions = useMemo(
    () => workTypesList.map((w: any) => ({
      value: w.attribute_item_id,
      label: w.name,
      selected: (value.workTypes ?? []).includes(w.attribute_item_id),
    })),
    [workTypesList, value.workTypes],
  )

  const assetTypeMultiOptions = useMemo(
    () => assetTypesList.map((a: any) => ({
      value: a.attribute_item_id,
      label: a.name,
      selected: (value.assetTypes ?? []).includes(a.attribute_item_id),
    })),
    [assetTypesList, value.assetTypes],
  )

  const approverMultiOptions = useMemo(
    () => subdivisionUsersList.map((u: any) => ({
      value: `${u.user_id}-${u.subdivision_id ?? 0}`,
      label: u.name ?? u.email ?? `User ${u.user_id}`,
      selected: (value.approvers ?? []).map(String).includes(`${u.user_id}-${u.subdivision_id ?? 0}`),
    })),
    [subdivisionUsersList, value.approvers],
  )

  const rulesWithTaken = useMemo(
    () => handleTakenPlateIds(value.fuelLimitRules ?? []),
    [value.fuelLimitRules],
  )

  const handleSubdivisionsChange = useCallback(
    (items: any[]) => {
      const newIds = items.map((i) => Number(i.value))
      const hadRules = (value.fuelLimitRules ?? []).length > 0
      const hadApprovers = (value.approvers ?? []).length > 0

      if (hadRules && hadApprovers) {
        const t = (window as any).exaToast
        t?.info?.('Info', 'Fuel limit settings and approvers have been reset. Please reconfigure them.')
      } else if (hadRules) {
        const t = (window as any).exaToast
        t?.info?.('Info', 'Fuel limit settings have been reset. Please reconfigure them.')
      } else if (hadApprovers) {
        const t = (window as any).exaToast
        t?.info?.('Info', 'Fuel order approvers have been reset. Please reconfigure them.')
      }

      setField('fuelLimitRules', [])
      setField('maxFuelFeature', 0)
      setField('approvers', [])
      setField('subdivisions', newIds)
    },
    [setField, value.fuelLimitRules, value.approvers],
  )

  const handleAssetTypesChange = useCallback(
    (items: any[]) => {
      const newIds = items.map((i) => Number(i.value))
      const hadRules = (value.fuelLimitRules ?? []).length > 0

      if (hadRules) {
        const t = (window as any).exaToast
        t?.info?.('Info', 'Fuel limit settings have been reset. Please reconfigure them.')
      }

      setField('fuelLimitRules', [])
      setField('maxFuelFeature', 0)
      setField('assetTypes', newIds)
    },
    [setField, value.fuelLimitRules],
  )

  const handleAddRule = useCallback(() => {
    const newRule: FuelLimitRule = { period: undefined, assetIds: [], fuelLimitLtrs: undefined }
    setField('fuelLimitRules', [...(value.fuelLimitRules ?? []), newRule])
  }, [setField, value.fuelLimitRules])

  const handleDeleteRule = useCallback(
    (index: number) => {
      const updated = [...(value.fuelLimitRules ?? [])]
      updated.splice(index, 1)
      setField('fuelLimitRules', handleTakenPlateIds(updated))
    },
    [setField, value.fuelLimitRules],
  )

  const handleRuleFieldChange = useCallback(
    (index: number, field: string, v: any) => {
      const updated = [...(value.fuelLimitRules ?? [])]
      updated[index] = { ...updated[index], [field]: v }
      setField('fuelLimitRules', updated)
    },
    [setField, value.fuelLimitRules],
  )

  const handleRulePlatesChange = useCallback(
    (index: number, assetIds: number[]) => {
      const updated = [...(value.fuelLimitRules ?? [])]
      updated[index] = { ...updated[index], assetIds }
      setField('fuelLimitRules', handleTakenPlateIds(updated))
    },
    [setField, value.fuelLimitRules],
  )

  const showPlatesWarning = value.maxFuelFeature === 1 && platesList.length === 0

  return (
    <>
      <CRow className="g-3 mb-4">
        <CCol md={6}>
          <CForm>
            <CFormInput
              type="text" label="Name *" size="lg" disabled={disabled}
              value={value.name ?? ''}
              onChange={(e) => setField('name', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              invalid={hasError('name')} feedbackInvalid={errors.name}
            />
          </CForm>
        </CCol>
        <CCol md={6}>
          <CFormSelect label="Company *" disabled={disabled}
            value={value.company_id ?? ''}
            onChange={(e) => setField('company_id', Number(e.target.value) || null)}
            invalid={hasError('company_id')} feedbackInvalid={errors.company_id}
          >
            <option value="">Select company...</option>
            {companyOptions.map((c: any) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </CFormSelect>
        </CCol>
      </CRow>

      <CCard className="mb-4">
        <CCardHeader><strong>Relational Fields</strong></CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol md={6}>
              <CMultiSelect
                label="Subdivisions *"
                options={subdivisionMultiOptions}
                disabled={disabled}
                onChange={handleSubdivisionsChange}
                placeholder="Select subdivisions..."
                search selectAll selectionType="tags"
              />
            </CCol>
            <CCol md={6}>
              <CMultiSelect
                label="Clients"
                options={clientMultiOptions}
                disabled={disabled}
                onChange={(items: any[]) => setField('clients', items.map((i) => Number(i.value)))}
                placeholder="Select clients..."
                search selectAll selectionType="tags"
              />
            </CCol>
            <CCol md={6}>
              <CMultiSelect
                label="Work Types *"
                options={workTypeMultiOptions}
                disabled={disabled}
                onChange={(items: any[]) => setField('workTypes', items.map((i) => Number(i.value)))}
                placeholder="Select work types..."
                search selectAll selectionType="tags"
              />
            </CCol>
            <CCol md={6}>
              <CMultiSelect
                label="Asset Types *"
                options={assetTypeMultiOptions}
                disabled={disabled}
                onChange={handleAssetTypesChange}
                placeholder="Select asset types..."
                search selectAll selectionType="tags"
              />
            </CCol>
            <CCol md={6}>
              <CFormSelect label="Fuel Order Type *" disabled={disabled}
                value={value.fuelOrderTypeId ?? ''}
                onChange={(e) => setField('fuelOrderTypeId', Number(e.target.value) || null)}
                invalid={hasError('fuelOrderTypeId')} feedbackInvalid={errors.fuelOrderTypeId}
              >
                <option value="">Select fuel order type...</option>
                {fuelOrderTypesList.map((t: any) => (
                  <option key={t.attribute_item_id} value={t.attribute_item_id}>{t.name}</option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormInput type="number" label="Rate Plan ID" disabled={disabled}
                value={value.ratebuilderId ?? ''}
                onChange={(e) => setField('ratebuilderId', Number(e.target.value) || null)}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {value.approvalRequired === 1 && (
        <CCard className="mb-4">
          <CCardHeader><strong>Authorized Approvers</strong></CCardHeader>
          <CCardBody>
            <CMultiSelect
              label="Approvers"
              options={approverMultiOptions}
              disabled={disabled}
              onChange={(items: any[]) => setField('approvers', items.map((i) => String(i.value)))}
              placeholder="Select approvers..."
              search selectAll selectionType="tags"
            />
          </CCardBody>
        </CCard>
      )}

      <CCard className="mb-4">
        <CCardHeader><strong>Toggles</strong></CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol md={3}>
              <CFormSwitch
                label="Trip Required" id="tripRequired" disabled={disabled}
                checked={value.tripRequired === 1}
                onChange={(e) => setField('tripRequired', e.target.checked ? 1 : 0)}
              />
            </CCol>
            <CCol md={3}>
              <CFormSwitch
                label="Suggested Amount Required" id="suggestedAmountRequired" disabled={disabled}
                checked={value.suggestedAmountRequired === 1}
                onChange={(e) => setField('suggestedAmountRequired', e.target.checked ? 1 : 0)}
              />
            </CCol>
            <CCol md={3}>
              <CFormSwitch
                label="Approval Required" id="approvalRequired" disabled={disabled}
                checked={value.approvalRequired === 1}
                onChange={(e) => setField('approvalRequired', e.target.checked ? 1 : 0)}
              />
            </CCol>
            <CCol md={3}>
              <CFormSwitch
                label="Max Fuel Feature" id="maxFuelFeature" disabled={disabled}
                checked={value.maxFuelFeature === 1}
                onChange={(e) => setField('maxFuelFeature', e.target.checked ? 1 : 0)}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {value.maxFuelFeature === 1 && (
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Fuel Limit Settings</strong>
            {!disabled && (
              <CButton color="primary" size="sm" onClick={handleAddRule}>
                <CIcon icon={cilPlus} className="me-1" />
                Add Limit Rule
              </CButton>
            )}
          </CCardHeader>
          <CCardBody>
            {showPlatesWarning && (
              <div className="alert alert-primary animated fadeIn">
                Please select subdivisions and asset types to load available plates for fuel limit rules.
              </div>
            )}
            <CRow>
              {rulesWithTaken.map((rule, idx) => (
                <FuelLimitRuleBox
                  key={idx}
                  rule={rule}
                  index={idx}
                  periodOptions={periodsList}
                  plateOptions={platesList}
                  disabled={disabled}
                  onChangeField={handleRuleFieldChange}
                  onChangePlates={handleRulePlatesChange}
                  onDelete={handleDeleteRule}
                />
              ))}
            </CRow>
          </CCardBody>
        </CCard>
      )}

      {value.approvalRequired === 1 && (
        <CCard className="mb-4">
          <CCardHeader><strong>Approval Settings</strong></CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormSelect label="Exp. Time Before (min)" disabled={disabled}
                  value={String(value.expTimeBefore ?? 0)}
                  onChange={(e) => setField('expTimeBefore', Number(e.target.value))}
                >
                  {[0, 5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440].map((m) => (
                    <option key={m} value={m}>{m === 0 ? 'None' : `${m} min`}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormSelect label="Exp. Time After (min)" disabled={disabled}
                  value={String(value.expTimeAfter ?? 0)}
                  onChange={(e) => setField('expTimeAfter', Number(e.target.value))}
                >
                  {[0, 5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440].map((m) => (
                    <option key={m} value={m}>{m === 0 ? 'None' : `${m} min`}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormInput type="number" label="Maximum Approve *" disabled={disabled}
                  value={value.maximumApprove ?? 0}
                  onChange={(e) => setField('maximumApprove', Number(e.target.value))}
                  invalid={hasError('maximumApprove')} feedbackInvalid={errors.maximumApprove}
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      )}

      <CCard className="mb-4">
        <CCardHeader><strong>Fuel Variation</strong></CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol md={3}>
              <CFormInput type="number" label="Variation Min" disabled={disabled}
                value={value.fuelVariationMin ?? 0}
                onChange={(e) => setField('fuelVariationMin', e.target.value)}
              />
            </CCol>
            <CCol md={3}>
              <CFormInput type="number" label="Variation Max" disabled={disabled}
                value={value.fuelVariationMax ?? 0}
                onChange={(e) => setField('fuelVariationMax', e.target.value)}
              />
            </CCol>
            <CCol md={3}>
              <CFormInput type="number" label="Supply Variation Min" disabled={disabled}
                value={value.fuelSupplyVariationMin ?? 0}
                onChange={(e) => setField('fuelSupplyVariationMin', e.target.value)}
              />
            </CCol>
            <CCol md={3}>
              <CFormInput type="number" label="Supply Variation Max" disabled={disabled}
                value={value.fuelSupplyVariationMax ?? 0}
                onChange={(e) => setField('fuelSupplyVariationMax', e.target.value)}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader><strong>Statement Settings</strong></CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormSelect label="Fuel Statement Required" disabled={disabled}
                value={String(value.fuelStatementRequired ?? 1)}
                onChange={(e) => setField('fuelStatementRequired', Number(e.target.value))}
              >
                <option value="1">Required</option>
                <option value="0">Not Required</option>
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormSelect label="Supplier Statement Required" disabled={disabled}
                value={String(value.supplierStatementRequired ?? 1)}
                onChange={(e) => setField('supplierStatementRequired', Number(e.target.value))}
              >
                <option value="1">Required</option>
                <option value="0">Not Required</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </>
  )
}

export default FuelOrderSettingsForm
