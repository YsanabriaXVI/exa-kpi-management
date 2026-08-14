import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CFormSwitch,
  CRow,
  CFormText,
  CFormLabel,
} from '@coreui/react-pro'

import type { 
  SelectOption, 
  NewRequestObject, 
  EquipmentRequirementDraft,
  EquipmentRequestData,
  EquipmentRequirementData
} from '../types'

import { RequestTopForm } from 'src/modules/EquipmentRequest/components/RequestTopForm'
import CIcon from '@coreui/icons-react'
import { cilSave, cilXCircle } from '@coreui/icons'


type Props = {
  data: NewRequestObject
  onChangeRequest: (name: keyof EquipmentRequestData, value: any) => void
  onChangeRequirement: (name: keyof EquipmentRequirementData, value: any) => void
  requestTypeOptions: any[]
  clientsOptions: any[]
  containerSizeOptions: any[]
  chassisSizeOptions: any[]
  tripOptions: any[]
  newRequestErrors?: Record<string, string>
  newRequirementErrors?: Record<string, string>
  save: () => void
  toggleForm?: (index: number, open: boolean) => void
}

export default function CreateRequestForm({
  data,
  onChangeRequest,
  onChangeRequirement,
  requestTypeOptions,
  clientsOptions,
  containerSizeOptions,
  chassisSizeOptions,
  tripOptions,
  newRequestErrors = {},
  newRequirementErrors = {},
  save,
  toggleForm,
}: Props) {

  const request = data?.requestDetails;
  const requirement = data?.requirements[0];
  const isTripRequest = request.requestTypeId === 1526;

  return (
    <CCard className="animated fadeIn">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <i className="icon-note me-2" />
          <strong>Create Equipment Request</strong>
        </div>

        {toggleForm && (
          <i
            className="fa icon-close box-icn"
            role="button"
            tabIndex={0}
            onClick={() => toggleForm(5, false)}
            onKeyDown={(e) => e.key === 'Enter' && toggleForm(5, false)}
          />
        )}
      </CCardHeader>

      <CCardBody>
        <RequestTopForm
          clients = {clientsOptions}
          requestTypes = {requestTypeOptions || []}
          value = {request as any}
          errors = {newRequestErrors}
          onChange = {onChangeRequest as any}
          isView = {false}
        /> 
        <CRow>
        <CCol xs={12} xl={6}>
      < br />
      <CFormSelect
        label="Chassis Size"
          value={requirement.chassisSizeId ?? ''}
          onChange={(e) => onChangeRequirement("chassisSizeId", e.target.value)}
          //disabled={isView}
        >
          {chassisSizeOptions.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
      </CFormSelect>
      < br />
      <CFormSelect
          label="Container Size"
          value={requirement.containerSizeId ?? ''}
          onChange={(e) => onChangeRequirement('containerSizeId', e.target.value)}
          //disabled={isView}
        >
          {containerSizeOptions.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
      </CFormSelect>
      < br />
        <CFormSelect
          label="Genset"
          value={requirement.genset ?? ''}
          invalid={!!newRequirementErrors.genset}
          onChange={(e) => onChangeRequirement('genset', e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">No</option>
          <option value="1">Yes</option>
        </CFormSelect>
        {newRequirementErrors.genset && <CFormText className="text-danger">{newRequirementErrors.genset}</CFormText>}

        {isTripRequest && ( 
          <div className="mt-3">
          <CFormLabel>Trip ID</CFormLabel>
          <CFormSelect
            value={requirement.tripId ?? ''}
            invalid={typeof newRequestErrors?.["requirements[0].tripId"] === 'string'}
            feedbackInvalid={newRequestErrors?.["requirements[0].tripId"]}
            onChange={(e) => onChangeRequirement('tripId', e.target.value)}
            //disabled={isView}
          >
            {tripOptions.map((o) => (
              <option key={String(o.value)} value={o.value}>
                {o.label}
              </option>
            ))}
          </CFormSelect>
          </div>
        )}

        </CCol>
        <CCol xs={12} xl={6}>
          < br />
          < br />
          <CFormLabel>Client Owns Container</CFormLabel>
          <CFormSwitch
            checked={requirement.equipmentClientContainer === 1}
            onChange={(e) => onChangeRequirement("equipmentClientContainer", e.target.checked)}
            size='lg'
            //disabled={isView}
          />      
          < br />    
          < br />  
          <CFormLabel>Client Owns Chassis</CFormLabel> 
          <CFormSwitch
            checked={requirement.equipmentClientChassis === 1}
            onChange={(e) => onChangeRequirement("equipmentClientChassis", e.target.checked)}
            size='lg'
            //disabled={isView}
          />
          < br />
          < br />
          <CFormLabel>Client Owns Genset</CFormLabel> 
          <CFormSwitch
            checked={requirement.equipmentClientGenset === 1}
            onChange={(e) => onChangeRequirement("equipmentClientGenset", e.target.checked)}
            size='lg'
            //disabled={isView}
          />
                    
        </CCol>
        </CRow>
      </CCardBody>

      <CCardFooter className="d-flex justify-content-end gap-2">
        <CButton color="warning" onClick={() => toggleForm?.(5, false)}>
          <CIcon icon={cilXCircle} className="me-2" />
          Cancel
        </CButton>
        <CButton color="primary" onClick={save} >
          <CIcon icon={cilSave} className="me-2" />
          Save Request
        </CButton>
      </CCardFooter>
    </CCard>
  )
}