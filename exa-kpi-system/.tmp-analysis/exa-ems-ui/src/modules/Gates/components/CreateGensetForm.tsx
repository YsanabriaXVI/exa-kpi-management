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
} from '@coreui/react-pro'
import type { SelectOption, NewGensetObject } from '../types'
import CIcon from '@coreui/icons-react'
import { cilSave, cilXCircle } from '@coreui/icons'

type ErrorsMap = Record<string, string>
type ChangeEvt = React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

type Props = {
  value: NewGensetObject
  errors: ErrorsMap
  gensetTypeOptions: SelectOption[]
  clientsOptions: SelectOption[]
  subdivisionOptions: SelectOption[]
  onChange: (e: ChangeEvt, assetTypeId: number | null) => void
  onSave: () => void
  onClose: () => void
  disabled?: boolean
}

export default function CreateGensetForm({
  value,
  errors,
  gensetTypeOptions,
  clientsOptions,
  subdivisionOptions,
  onChange,
  onSave,
  onClose,
  disabled,
}: Props) {

  return (
    <CCard className="mt-3">
      <CCardHeader className="d-flex align-items-center justify-content-between">
        <div>
          <i className="icon-note me-2" />
          <strong>Create New Genset</strong>
        </div>

        <CButton color="link" className="p-0" onClick={onClose} disabled={disabled}>
          <i className="fa icon-close" />
        </CButton>
      </CCardHeader>

      <CCardBody>
        <CRow className="g-3">
          <CCol sm={12} xl={6}>
            <CFormInput
              type="text"
               label="Genset #"
              name="194"
              required
              onChange={(e) => onChange(e as any, 3)}
              value={value['194'] ?? ''}
              invalid={typeof errors['194'] === 'string'}
              feedbackInvalid={errors['194']}
              //disabled={viewMode}
            />
          </CCol>

          <CCol sm={12} xl={6} className="d-flex align-items-end">
            <div>
              <CFormSwitch
                label="In Transit"
                name='inTransit'
                checked={value.inTransit as any}
                onChange={(e) => onChange(e as any, 3)}
                disabled={disabled}
                size='lg'
              />
            </div>
          </CCol>

          <CCol sm={12} xl={6}>
            <CFormSelect
              name="227"
              label="Genset Type"
              onChange={(e) => onChange(e as any, 3)}
              value={value["227"] ?? ''}
              options={gensetTypeOptions as any}
              //disabled
              invalid={typeof errors['227'] === 'string'}
              feedbackInvalid={errors['227']}
            />
          </CCol>

          <CCol sm={12} xl={6}>
            {value.inTransit ? (
              <CFormSelect
                name="subdivision_id"
                label="Subdivision"
                onChange={(e) => onChange(e as any, 3)}
                value={value.subdivision_id ?? ''}
                options={subdivisionOptions as any}
                //disabled
                invalid={typeof errors.subdivision_id === 'string'}
                feedbackInvalid={errors.subdivision_id}
              />
            ) : (
               <CFormSelect
                name="223"
                label="Client"
                onChange={(e) => onChange(e as any, 3)}
                value={value["223"] ?? ''}
                options={clientsOptions as any}
                //disabled={viewMode}
                invalid={typeof errors['223'] === 'string'}
                feedbackInvalid={errors['223']}
              />
            )}
          </CCol>

          <CCol sm={12} xl={6}>
            <CFormInput
                type="text"
                label="Serial No."
                name="206"
                required
                onChange={(e) => onChange(e as any, 3)}
                value={value["206"] ?? ''}
                //invalid={!!FEerrors?.checkListName}
                invalid={typeof errors['206'] === 'string'}
                feedbackInvalid={errors['206']}
              />
                 
          </CCol>
        </CRow>
      </CCardBody>

      <CCardFooter className="d-flex justify-content-end gap-2">
        <CButton color="warning" onClick={onClose} disabled={disabled}>
          <CIcon icon={cilXCircle} className="me-2" />
          Cancel
        </CButton>
        <CButton color="primary" onClick={onSave} disabled={disabled}>
          <CIcon icon={cilSave} className="me-2" />
          Save Genset
        </CButton>
      </CCardFooter>
    </CCard>
  )
}
