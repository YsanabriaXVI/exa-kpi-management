import React, { useState, useMemo } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CCollapse,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CRow,
  CFormText
} from '@coreui/react-pro'
import type { 
  GateType, 
  NewChassisDraft, 
  GateDetail, 
  ChangeEvt, 
  SelectOption, 
  NewChassisObject,
  OnChangeEvt, 
  ChassisAutoSuggestData ,
  GateImagesFlatInfo,
  EquipmentRequirement,
} from '../types'
import CreateChassisForm from './CreateChassisForm'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilArrowThickFromBottom } from '@coreui/icons'
import Checklist from './Checklist'
import Damages from './Damage'
import { AutoSuggest } from 'src/components'
import apiClient from 'src/services/api/axios.config'
import { AutoSuggestOption } from 'src/components/AutoSuggest'
import { EquipmentPart } from 'src/modules/PartsAndSections/types'


type ErrorsMap = Record<string, string>

type Props = {
  gateType: GateType
  currentGateId: number
  sizeRequirement: any
  ownerRequirement: any
  isGateOut: boolean
  value: GateDetail
  errors: ErrorsMap
  damageErrors: any
  equipmentSizesOptions: SelectOption[]
  clientsOptions: SelectOption[]
  subdivisionOptions: SelectOption[]
  chassisOptions: SelectOption[]
  onChange: (e: OnChangeEvt<ChassisAutoSuggestData>, equipmentTypeId: number) => Promise<void>
  showCreateForm: boolean
  toggleCreateForm: (formId: number, show: boolean) => void
  newChassisValue: NewChassisObject
  newChassisErrors: ErrorsMap
  onChangeNewChassis: (name: keyof NewChassisDraft, value: string) => void
  onSaveNewChassis: () => void
  isViewMode?: boolean
  isEdit: boolean
  blocked?: boolean
  checkList?: any
  conditionOptions?:  any[]
  damagesList?: any[]
  damageOptions?: any[]
  setDamages?: any
  handleDamageChange?: any
  onChangeCheckList?: any
  imagesInfo?: GateImagesFlatInfo
  partsList: EquipmentPart[]
  requirement: EquipmentRequirement
}

export default function ChassisForm({
  gateType,
  currentGateId,
  sizeRequirement,
  ownerRequirement,
  isGateOut,
  isEdit,
  value,
  errors,
  damageErrors,
  equipmentSizesOptions,
  clientsOptions,
  subdivisionOptions,
  onChange,
  showCreateForm,
  toggleCreateForm,
  newChassisValue,
  newChassisErrors,
  onChangeNewChassis,
  onSaveNewChassis,
  isViewMode,
  blocked,
  checkList,
  conditionOptions,
  damagesList,
  damageOptions,
  setDamages,
  handleDamageChange,
  onChangeCheckList,
  imagesInfo,
  partsList,
  requirement
}: Props) {

  const disabled = !!isViewMode || !!blocked
  const isVisible = value.showEquipment;

  const canAddNew =
    !disabled &&
    ((value.ownedEquipment === 0 && gateType === 'IN') || (value.inTransit === 1 && gateType === 'OUT'))

  const searchChassisOptions = async (query: string): Promise<AutoSuggestOption[]> => {
    const response = await apiClient.get(`/assets-service/chassis/search?query=${query}`)

    if (!("data" in response) || !Array.isArray(response.data)) return [];

    let filtered = response.data.filter((container: any) =>
      container?.details?.current_gate_id !== currentGateId
    );

    if (isGateOut && !isEdit) {
      filtered = filtered.filter((container: any) => 
        container?.details?.equipment_size === sizeRequirement.chassisSize
      );
    }

    if (isGateOut && !isEdit && ownerRequirement.chassisOwner !== null) {
      filtered = filtered.filter((chassis: any) => {
        const owner = Number(chassis?.details?.client)
        const moduleid = Number(chassis?.details?.moduleid)
        return owner === ownerRequirement.chassisOwner && moduleid === 44
      }
    )
  }

    return filtered.map((chassis: any) => ({
      value: chassis.value,
      label: chassis.label,
      data: chassis  
    }))
  }

  const fetchChassisById = async (id: number): Promise<AutoSuggestOption | null> => { // api/assets-service
    const response = await apiClient.get(`/assets-service/chassis/search?query=${id}`)
    const chassis = (response.data || []).find((chassis: any) => chassis.value === id)
    return {
      value: chassis.value,
      label: chassis.label,
      data: chassis
    }
  }

  const partsListBySize = useMemo(
    () => (partsList ?? []).filter((x: any) => x?.sizeEquipmentId === value.sizeEquipmentId),
    [value.sizeEquipmentId]
  );

  return (
    <CCard>
      <CCardHeader 
      style={{ color: "#6b6f77", minHeight : "50px", borderRadius: "0px" }}
      className="d-flex align-items-center justify-content-between"
      >
        <div>
          <i className="fa fa-gear me-2" />
          <strong>Chassis</strong>
        </div>

        <CFormSwitch
          name='showEquipment'
          checked={value.showEquipment as any}
          onChange={(e) => onChange(e as any, "1" as any)}
          disabled={disabled}
          size="lg"
        />
      </CCardHeader>

      <CCollapse visible={isVisible as any}>
        <CCardBody>
          <CRow className="g-3">
            <CCol xs={12} xl={6}>

              <div>
                 <AutoSuggest
                    key={value?.equipmentId ?? 'no-chassis'}
                    label="Chassis ID"
                    name='equipmentId'
                    value={value?.equipmentId}
                    onChange={(option) =>  onChange({ target: {...option, name: 'equipmentId'} } as any, "1" as any)}
                    onSearch={searchChassisOptions}
                    onFetchById={fetchChassisById as any}
                    placeholder="Search chassis..."
                    minCharacters={1}
                    invalid={(errors.equipmentId && typeof errors.equipmentId === 'string') as any}
                    feedbackInvalid="invalid feedback"
                    disabled={isViewMode}
                  />
                  {isGateOut && requirement?.trip_details?.chassisid !== 0 && requirement?.trip_details?.chassisid !== null &&
                  <div className="text-muted">* Chassis Reference: {requirement?.trip_details?.chassisid}</div>}
                  {errors.equipmentId && <CFormText className="text-danger">{errors.equipmentId}</CFormText>}
              </div>
              <br />
              <div className="mb-2">
                <CFormSwitch
                  label="Owned equipment"
                  name='ownedEquipment'
                  checked={value.ownedEquipment as any}
                  onChange={(e) => onChange(e as any, "1" as any)}
                  disabled={isViewMode}
                  size='lg'
                />
        
              </div>
              <div className="mb-2">
                <CFormSwitch
                  label="In Transit"
                  name='inTransit'
                  checked={value.inTransit as any}
                  onChange={(e) => onChange(e as any, "1" as any)}
                  disabled={isViewMode}
                  size='lg'
                />
              </div>
                <br />
              {canAddNew && (
                <div className="mt-2">
                  <CButton color="secondary" className="text-white" onClick={() => toggleCreateForm(1, !showCreateForm)}>
                    <CIcon icon={showCreateForm ? cilArrowThickFromBottom : cilPlus} className="me-2" />
                    {showCreateForm ? 'Hide New Chassis Form' : 'Add New Chassis'}
                  </CButton>
                </div>
              )}
            </CCol>

            <CCol xs={12} xl={6}>

              <div>
                <CFormSelect
                  name="sizeEquipmentId"
                  label="Equipment Size-Type"
                  onChange={onChange as any}
                  value={value.sizeEquipmentId ?? ''}
                  options={equipmentSizesOptions as any}
                  disabled
                  invalid={errors.sizeEquipmentId as any}
                  feedbackInvalid={errors.sizeEquipmentId}
                />
              </div>

                {value.inTransit ? (
                  <>
                    <CFormSelect
                      name="subdivision_id"
                      label="Subdivision"
                      onChange={onChange as any}
                      value={value.subdivision_id ?? ''}
                      options={subdivisionOptions as any}
                      disabled
                      //invalid={!!FEerrors?.gateTypeId}
                      //feedbackInvalid={FEerrors?.gateTypeId}
                    />
                  </>
                ) : (
                  <>
                    <CFormSelect
                      name="clientId"
                      label="Client"
                      onChange={onChange as any}
                      value={value.clientId ?? ''}
                      options={clientsOptions as any}
                      disabled
                      //invalid={!!FEerrors?.sizeEquipmentId}
                      //feedbackInvalid={FEerrors?.sizeEquipmentId}
                    />
                  </>
                )}

              <CFormInput
                type="text"
                label="Remarks"
                name="remarks"
                required
                onChange={onChange as any}
                value={value.remarks}
                //invalid={!!FEerrors?.checkListName}
                //feedbackInvalid={FEerrors?.checkListName}
                disabled={disabled}
              />
            </CCol>

              <CCol xs={12}>
                <CCollapse visible={showCreateForm}>
                <CreateChassisForm
                  value={newChassisValue}
                  errors={newChassisErrors}
                  equipmentSizesOptions={equipmentSizesOptions}
                  clientsOptions={clientsOptions}
                  subdivisionOptions={subdivisionOptions}
                  onChange={onChangeNewChassis as any}
                  onSave={onSaveNewChassis}
                  onClose={() => toggleCreateForm(1, false)}
                  disabled={disabled}
                />
              </CCollapse>
              </CCol>

              <CCol  xs={12} xl={6}>
                <br />
                <br />   
                <Checklist
                  key={value?.equipmentId ?? 'no-chassis-checklist'}
                  checkList = {checkList}
                  errors = {errors as any}
                  isInsert = "new"
                  onChange = {onChangeCheckList}
                  equipmentTypeId = {1}
                  statusOptions = {conditionOptions as any}
                  removeError = {()=>{}}
                  errorPrefix = ""
                  clientId = {value.clientId}
                  equipmentId = {value.equipmentId}
                  sizeEquipmentId = {value.sizeEquipmentId}
                  isViewMode = {isViewMode || blocked}
                />

              </CCol>
              <CCol xs={12} xl={6}>
                <br />
                <br />   
                <Damages
                  gateIdTemp = {0}
                  damageList = {damagesList as any}
                  damageOptions = {damageOptions as any}
                  errors = {damageErrors as any}
                  damagePrefix = "chassis"
                  damageTypeOptions = {[]}
                  equipmentParts = {[]}
                  isEdit={isEdit}
                  isViewMode = {isViewMode}
                  //onAddDamage = {()=>{}}
                  //onRemoveDamage = {()=>{}}
                  //onUploadImage = {() => {}}
                  //onDeleteImage = {() => {}}
                  //onSetFileDetails = {() => {}}
                  //loadPartImageUrl = {"#"}
                  //getExistingDamageImageUrl = {() => {}}
                  setDamages = {setDamages}
                  onChange = {handleDamageChange}
                  imagesInfo = {imagesInfo}
                  partsList = {partsListBySize}
                />
              </CCol>
          </CRow>
        </CCardBody>
      </CCollapse>
    </CCard>
  )
}
