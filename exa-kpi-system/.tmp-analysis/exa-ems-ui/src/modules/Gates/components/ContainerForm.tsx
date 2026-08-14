import React, { useMemo } from 'react'
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
import CIcon from '@coreui/icons-react'
import { cilPlus, cilArrowThickFromBottom } from '@coreui/icons'

import type { 
  GateDetail, 
  GateType, 
  ChangeEvt, 
  SelectOption, 
  NewContainerObject, 
  OnChangeEvt, 
  ContainerAutoSuggestData,
  EquipmentRequirement
} from '../types'

import { EquipmentPart } from 'src/modules/PartsAndSections/types'

import CreateContainerForm from './CreateContainerForm'
import Checklist from './Checklist'
import Damages from './Damage'
import './styles/gates.css'
import { AutoSuggest } from 'src/components'
import apiClient from 'src/services/api/axios.config'
import { AutoSuggestOption } from 'src/components/AutoSuggest'

type ErrorsMap = Record<string, string>

type Props = {
  gateType: GateType
  currentGateId: number
  sizeRequirement: any
  ownerRequirement: any
  isGateOut: boolean
  isViewMode?: boolean
  isEdit: boolean
  blocked?: boolean
  rightSlot?: React.ReactNode
  value: GateDetail
  newContainerValue: NewContainerObject
  errors: ErrorsMap
  damageErrors: any
  newContainerErrors: ErrorsMap
  equipmentSizesOptions: SelectOption[]
  clientsOptions: SelectOption[]
  containerOptions: SelectOption[]
  conditionOptions: SelectOption[]
  colorOptions: SelectOption[]
  damageOptions?: SelectOption[]
  showCreateForm: boolean
  toggleCreateForm: (formId: number, show: boolean) => void
  onChange: (e: OnChangeEvt<ContainerAutoSuggestData>, equipmentTypeId: number) => Promise<void>
  onChangeNewContainer: (e: ChangeEvt, assetTypeId: number | null) => void
  onSaveNewContainer: () => void
  checkList?: any
  onChangeCheckList?: (
    e: any,
    partId: number,
    sectionId: number,
    type: 'conditionId' | 'remarks'
  ) => void
  damagesList?: any[]
  setDamages?: any
  handleDamageChange?: any
  imagesInfo?: any
  partsList: EquipmentPart[]
  cleanCheckList?: (payload: any) => void
  requirement?: EquipmentRequirement
}

export default function ContainerForm(props: Props) {

const {
  gateType,
  currentGateId,
  sizeRequirement,
  ownerRequirement,
  isGateOut,
  isViewMode,
  isEdit,
  blocked,
  value,
  newContainerValue,
  errors,
  damageErrors,
  newContainerErrors,
  equipmentSizesOptions,
  clientsOptions,
  conditionOptions,
  colorOptions,
  damageOptions,
  showCreateForm,
  toggleCreateForm,
  onChange,
  onChangeNewContainer,
  onSaveNewContainer,
  checkList,
  onChangeCheckList,
  damagesList,
  setDamages,
  handleDamageChange,
  imagesInfo,
  partsList,
  requirement
} = props


  const disabled = !!isViewMode || !!blocked
  const isVisible = value.showEquipment

  //const selectedRequest = requests?.find((er:any) => er?.requirements === Number(requestId))

console.log("container value: ", value)

const searchContainerOptions = async (query: string): Promise<AutoSuggestOption[]> => {
  const response = await apiClient.get(`/assets-service/container/search?query=${query}`);
  if (!("data" in response) || !Array.isArray(response.data)) return [];

  let filtered: any = response;

  console.log("CNT filtered", filtered);

  if (!isEdit) {
    filtered = response.data.filter((container: any) => {
      const rec = container?.details?.current_gate_id !== currentGateId
      return rec
      }
    );
  }

  if (isGateOut && !isEdit) {
    filtered = filtered.filter((container: any) => 
      container?.details?.equipment_size === sizeRequirement.containerSize
    );
  }

  if (isGateOut && !isEdit && ownerRequirement.containerOwner !== null) {
    filtered = filtered.filter((container: any) => {
      const owner = Number(container?.details?.equipment_owner_id)
      const moduleid = Number(container?.details?.moduleid)
      return owner === ownerRequirement.containerOwner && moduleid === 44
      }
    )
  }

  return filtered.map((container: any) => ({
    value: container.value,
    label: container.label,
    data: container,
  }));
};

  // Fetch by ID - called for pre-population (optional)
  const fetchContainerById = async (id: number): Promise<AutoSuggestOption | null> => { //api/assets-service
    const response = await apiClient.get(`/assets-service/container/search?query=${id}`)
    const container = (response.data || []).find((container: any) => container.value === id)
    return {
      value: container.value,
      label: container.label,
      data: container
    }
  }

  const partsListBySize = useMemo(
    () => (partsList ?? []).filter((x: any) => x?.sizeEquipmentId === value.sizeEquipmentId),
    [value.sizeEquipmentId]
  );

  console.log('partsListBySize: ', partsListBySize)
  console.log('conatiner value: ', value)

  
  return (
    <CCard>
      <CCardHeader 
      style={{ color: "#6b6f77", minHeight : "50px", borderRadius: "0px" }}
      className="d-flex align-items-center justify-content-between primary"
      >
        <div>
          <i className="fa fa-gear me-2" />
          <strong>Container</strong>
        </div>

        <div className="d-flex align-items-center gap-3">
          <CFormSwitch
            name='showEquipment'
            checked={value.showEquipment as any}
            onChange={(e) => onChange(e as any, "2" as any)}
            disabled={disabled}
            size='lg'
          />
        </div>
      </CCardHeader>

      <CCollapse visible={isVisible as any}>
        <CCardBody>
          <CRow className="g-3">
            <CCol xs={12} xl={6}>
                <AutoSuggest
                  key={value?.equipmentId ?? 'no-cnt'}
                  label="Container ID"
                  name='equipmentId'
                  value={value?.equipmentId ?? ''}
                  onChange={(option) =>  onChange({ target: {...option, name: 'equipmentId'} } as any, "2" as any)}
                  onSearch={searchContainerOptions}
                  onFetchById={fetchContainerById as any}
                  placeholder="Search container..."
                  minCharacters={1}
                  invalid={(errors.equipmentId && typeof errors.equipmentId === 'string') as any}
                  disabled={isViewMode}
                />
                 {errors.equipmentId && <CFormText className="text-danger">{errors.equipmentId}</CFormText>}
                  {isGateOut && requirement?.trip_details?.containerRef && 
                  <div className="text-muted">* Container Reference: {requirement?.trip_details?.containerRef}</div>}
                  <br />
                <CFormSwitch
                  label="Owned equipment"
                  name='ownedEquipment'
                  checked={value.ownedEquipment as any}
                  onChange={(e) => onChange(e as any, "2" as any)}
                  disabled={disabled}
                  size='lg'
                />
              
                <br />
              {gateType === 'IN' && !disabled && (
                <CButton color="secondary" className="text-white" onClick={() => toggleCreateForm(2, !showCreateForm)}>
                  <CIcon icon={showCreateForm ? cilArrowThickFromBottom : cilPlus} className="me-2" />
                  {showCreateForm ? 'Hide New Container Form' : 'Add New Container'}
                </CButton>
              )}
              
            </CCol>

            <CCol xs={12} xl={6}>
                <CFormSelect
                  name="sizeEquipmentId"
                  label="Equipment Size-Type"
                  onChange={onChange as any}
                  value={value.sizeEquipmentId ?? ''}
                  options={equipmentSizesOptions as any}
                  invalid={(errors.sizeEquipmentId && typeof errors.sizeEquipmentId === 'string') as any}
                  feedbackInvalid={errors.sizeEquipmentId}
                  disabled
                />

                <CFormSelect
                  name="clientId"
                  label="Client"
                  onChange={onChange as any}
                  value={value.clientId ?? ''}
                  options={clientsOptions as any}
                  disabled
                  //disabled={isEquipmentSizeDisabled || viewMode}
                  //invalid={!!FEerrors?.sizeEquipmentId}
                  //feedbackInvalid={FEerrors?.sizeEquipmentId}
                />
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
              <CCollapse visible={showCreateForm && gateType === 'IN'}>
              <CreateContainerForm
                value={newContainerValue}
                errors={newContainerErrors}
                equipmentSizesOptions={equipmentSizesOptions as any}
                clientsOptions={clientsOptions as any}
                colorOptions={colorOptions as any}
                onChange={onChangeNewContainer}
                onSave={onSaveNewContainer}
                onClose={() => toggleCreateForm(2, false)}
                disabled={disabled}
              />
              </CCollapse>
            </CCol>
          
              <CCol  xs={12} xl={6}>
                <br />
                <br />   
                <Checklist
                  key={value?.equipmentId ?? 'no-cnt-checklist'}
                  checkList = {checkList}
                  errors = {errors as any}
                  isInsert = "new"
                  onChange = {onChangeCheckList as any}
                  equipmentTypeId = {2}
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
                  damagePrefix = "container"
                  damageTypeOptions = {[]}
                  equipmentParts = {[]}
                  isEdit = {isEdit}
                  isViewMode = {isViewMode}
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
