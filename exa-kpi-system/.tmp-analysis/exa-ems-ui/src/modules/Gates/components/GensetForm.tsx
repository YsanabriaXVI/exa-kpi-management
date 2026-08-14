
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CCollapse,
  CFormInput,
  CFormSelect,
  CFormSwitch,
  CFormText,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowThickFromBottom, cilPlus } from '@coreui/icons'
import { useMemo } from 'react'
import { AutoSuggest } from 'src/components'
import type { AutoSuggestOption } from 'src/components/AutoSuggest'
import apiClient from 'src/services/api/axios.config'

import type { 
  ChangeEvt, 
  GateDetail, 
  GateType, 
  NewGensetObject, 
  SelectOption, 
  OnChangeEvt, 
  GensetAutoSuggestData,
  GateImagesFlatInfo,
  EquipmentRequirement
} from '../types'

import Checklist from './Checklist'
import CreateGensetForm from './CreateGensetForm'
import Damages from './Damage'
import { EquipmentPart } from 'src/modules/PartsAndSections/types'

type ErrorsMap = Record<string, string>

type Props = {
  gateType: GateType
  currentGateId: number
  sizeRequirement: any
  ownerRequirement: any
  isGateOut: boolean
  isEdit: boolean
  isViewMode?: boolean
  blocked?: boolean
  value: GateDetail
  newGensetValue: NewGensetObject
  errors: ErrorsMap
  damageErrors: any
  newGensetErrors: ErrorsMap
  gensetTypeOptions: SelectOption[]
  clientsOptions: SelectOption[]
  conditionOptions?: SelectOption[]
  damageOptions?: SelectOption[]
  subdivisionOptions: SelectOption[]
  showCreateForm: boolean
  toggleCreateForm: (formId: number, show: boolean) => void
  onChange: (e: OnChangeEvt<GensetAutoSuggestData>, equipmentTypeId: number) => Promise<void>
  onChangeNewGenset: any
  onSaveNewGenset: () => void
  checkList: any
  onChangeCheckList?: any
  damagesList?: any[]
  setDamages?: any
  handleDamageChange?: any
  imagesInfo?: GateImagesFlatInfo
  partsList: EquipmentPart[]
  requirement?: EquipmentRequirement
}

export default function GensetForm({
  gateType,
  currentGateId,
  ownerRequirement,
  isGateOut,
  isEdit,
  isViewMode,
  blocked,
  value,
  newGensetValue,
  errors,
  damageErrors,
  newGensetErrors,
  gensetTypeOptions,
  clientsOptions,
  conditionOptions,
  damageOptions,
  subdivisionOptions,
  showCreateForm,
  toggleCreateForm,
  onChange,
  onChangeNewGenset,
  onSaveNewGenset,
  checkList,
  onChangeCheckList,
  damagesList,
  setDamages,
  handleDamageChange,
  imagesInfo,
  partsList,
  requirement
}: Props) {
  const disabled = !!isViewMode || !!blocked

  const canAddNew =
    !disabled &&
    gateType === 'IN' &&
    String(value?.ownedEquipment ? 1 : 0) === '0' // legacy: only when not owned

  const searchGensetOptions = async (query: string): Promise<AutoSuggestOption[]> => {
    const response = await apiClient.get(`/assets-service/genset/search?query=${query}`)
    if (!('data' in response) || !Array.isArray(response.data)) return []

    let filtered = response.data.filter(
      (genset: any) => genset?.details?.current_gate_id !== currentGateId,
    )

    if (isGateOut && !isEdit && ownerRequirement.gensetOwner !== null) {
    filtered = filtered.filter((genset: any) => {
      const owner = Number(genset?.details?.client)
      const moduleid = Number(genset?.details?.moduleid)
      return owner === ownerRequirement.gensetOwner && moduleid === 44
      }
    )
  }

    return filtered.map((genset: any) => ({
      value: genset.value,
      label: genset.label,
      data: genset,
    }))
  }

  const fetchGensetById = async (id: number): Promise<AutoSuggestOption | null> => {
    const response = await apiClient.get(`/assets-service/genset/search?query=${id}`)
    const genset = (response.data || []).find((g: any) => g.value === id)
    if (!genset) return null

    return { value: genset.value, label: genset.label, data: genset }
  }

  const partsListByType = useMemo(
    () => (partsList ?? []).filter((x: any) => x?.gensetTypeId === value.gensetTypeId),
    [value.gensetTypeId]
  ); 

  return (
    <CCard className="mb-3">
      <CCardHeader
        style={{ color: '#6b6f77', minHeight: '50px', borderRadius: '0px' }}
        className="d-flex align-items-center justify-content-between"
      >
        <div>
          <i className="fa fa-gear me-2" />
          <strong>Genset</strong>
        </div>

        <div className="d-flex align-items-center gap-3">
          <CFormSwitch
            name="showEquipment"
            checked={!!value.showEquipment}
            onChange={(e) => onChange(e as any, 3)}
            disabled={disabled}
            size="lg"
          />
        </div>
      </CCardHeader>

      <CCollapse visible={!!value.showEquipment}>
        <CCardBody>
          <CRow className="g-3">
            <CCol sm={12} xl={6}>
              <AutoSuggest
                key={value?.equipmentId ?? 'no-genset'}
                label="Genset ID"
                name="equipmentId"
                value={value?.equipmentId}
                onChange={(option) =>
                  onChange({ target: { ...option, name: 'equipmentId' } } as any, 3)
                }
                onSearch={searchGensetOptions}
                onFetchById={fetchGensetById as any}
                placeholder="Search genset..."
                minCharacters={1}
                invalid={!!errors.equipmentId}
                disabled={isViewMode}
              />
              {isGateOut && requirement?.trip_details?.gensetid !== 0 && requirement?.trip_details?.gensetid !== null && 
              <div className="text-muted">* Genset Reference: {requirement?.trip_details?.gensetid}</div>}

              {errors.equipmentId && <CFormText className="text-danger">{errors.equipmentId}</CFormText>}

              <br />

              <CFormSwitch
                label="Owned equipment"
                name="ownedEquipment"
                checked={!!value.ownedEquipment}
                onChange={(e) => onChange(e as any, 3)}
                disabled={disabled}
                size="lg"
              />

              <CFormSwitch
                label="In Transit"
                name="inTransit"
                checked={!!value.inTransit}
                onChange={(e) => onChange(e as any, 3)}
                disabled={disabled}
                size="lg"
              />

              <br />

              {canAddNew && (
                <CButton
                  color="secondary"
                  className="text-white"
                  onClick={() => toggleCreateForm(3, !showCreateForm)}
                >
                  <CIcon icon={showCreateForm ? cilArrowThickFromBottom : cilPlus} className="me-2" />
                  {showCreateForm ? 'Hide New Genset Form' : 'Add New Genset'}
                </CButton>
              )}
            </CCol>

            <CCol sm={12} xl={6}>
              <CFormSelect
                name="gensetTypeId"
                label="Genset Type"
                onChange={onChange as any}
                value={value.gensetTypeId ?? ''}
                options={gensetTypeOptions as any}
                disabled
                invalid={!!errors.gensetTypeId}
                feedbackInvalid={errors.gensetTypeId}
              />

              {value.inTransit ? (
                <CFormSelect
                  name="subdivision_id"
                  label="Subdivision"
                  onChange={onChange as any}
                  value={value.subdivision_id ?? ''}
                  options={subdivisionOptions as any}
                  disabled
                />
              ) : (
                <CFormSelect
                  name="clientId"
                  label="Client"
                  onChange={onChange as any}
                  value={value.clientId ?? ''}
                  options={clientsOptions as any}
                  disabled
                />
              )}

              <CFormInput
                type="number"
                label="Fuel Level"
                name="fuelLevel"
                required
                onChange={onChange as any}
                value={value.fuelLevel ?? ""}
                disabled={disabled}
              />

              <CFormInput
                type="number"
                name="engineHours"
                label="Engine Hours"
                value={value.engineHours ?? ""}
                onChange={onChange as any}
                disabled={disabled}
              />

              <CFormInput
                type="text"
                label="Remarks"
                name="remarks"
                required
                onChange={onChange as any}
                value={value.remarks}
                disabled={disabled}
              />
            </CCol>
          </CRow>

          <CCollapse visible={showCreateForm && canAddNew}>
            <CreateGensetForm
              value={newGensetValue}
              errors={newGensetErrors}
              gensetTypeOptions={gensetTypeOptions}
              clientsOptions={clientsOptions}
              subdivisionOptions={subdivisionOptions}
              onChange={onChangeNewGenset}
              onSave={onSaveNewGenset}
              onClose={() => toggleCreateForm(3, false)}
              disabled={disabled}
            />
          </CCollapse>

          <CRow>
            <CCol xs={12} xl={6}>
              <br />
              <br />
              <Checklist
                key={value?.equipmentId ?? 'no-genset-checklist'}
                checkList={checkList}
                errors={errors as any}
                isInsert="new"
                onChange={onChangeCheckList}
                equipmentTypeId={3}
                statusOptions={conditionOptions as any}
                removeError={() => {}}
                errorPrefix=""
                clientId={value.clientId}
                equipmentId={value.equipmentId}
                sizeEquipmentId={value.gensetTypeId}
                isViewMode={isViewMode || blocked}
              />
            </CCol>

            <CCol xs={12} xl={6}>
              <br />
              <br />
              <Damages
                gateIdTemp={0}
                damageList={damagesList as any}
                damageOptions={damageOptions as any}
                errors={damageErrors as any}
                damagePrefix="genset"
                damageTypeOptions={[]}
                equipmentParts={[]}
                isEdit={isEdit}
                isViewMode={isViewMode}
                onSetFileDetails={() => {}}
                setDamages={setDamages}
                onChange={handleDamageChange}
                imagesInfo={imagesInfo}
                partsList = {partsListByType}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCollapse>
    </CCard>
  )
}
