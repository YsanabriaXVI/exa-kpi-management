
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilXCircle, cilViewColumn } from '@coreui/icons'
import type {SelectOption, NewContainerObject, ChangeEvt } from '../types'

type ErrorsMap = Record<string, string>

type Props = {
  value: NewContainerObject
  errors: ErrorsMap
  equipmentSizesOptions: SelectOption
  clientsOptions: SelectOption
  colorOptions: SelectOption
  onChange: (e: ChangeEvt, assetTypeId: number | null) => void
  onSave: () => void
  onClose: () => void
  disabled?: boolean
}

export default function CreateContainerForm({
  value,
  errors,
  equipmentSizesOptions,
  clientsOptions,
  colorOptions,
  onChange,
  onSave,
  onClose,
  disabled,
}: Props) {

  return (
    <CCard className="mt-3">
      <CCardHeader>
        <div>
          <strong>Create New Container </strong>
          <CIcon icon={cilViewColumn}></CIcon>
        </div>
      </CCardHeader>

      <CCardBody>
        <CRow className="g-3">
          <CCol xs={12} xl={6}>

            <CFormInput
              type="text"
              label="Container #"
              name="194"
              required
              onChange={(e) => onChange(e as any, 2)}
              value={value['194'] ?? ''}
              invalid={typeof errors['194'] === 'string'}
              feedbackInvalid={errors['194']}
              //disabled={viewMode}
            />
          </CCol>

          <CCol xs={12} xl={6}>
            <CFormSelect
              name="225"
              label="Size-Type"
              onChange={(e) => onChange(e as any, 2)}
              value={value['225'] ?? ''}
              options={equipmentSizesOptions as any}
              //disabled
              invalid={typeof errors['225'] === 'string'}
              feedbackInvalid={errors['225']}
            />
          </CCol>

          <CCol xs={12} xl={6}>
            <CFormInput
              type="text"
              label="Tare"
              name="224"
              required
              onChange={(e) => onChange(e as any, 2)}
              value={value["224"] ?? ''}
              //invalid={!!FEerrors?.checkListName}
              invalid={typeof errors['224'] === 'string'}
              feedbackInvalid={errors['224']}
            />
          </CCol>

          <CCol xs={12} xl={6}>
            <CFormSelect
              name="223"
              label="Client"
              onChange={(e) => onChange(e as any, 2)}
              value={value["223"] ?? ''}
              options={clientsOptions as any}
              //disabled={isEquipmentSizeDisabled || viewMode}
              invalid={typeof errors['223'] === 'string'}
              feedbackInvalid={errors['223']}
            />
          </CCol>

          <CCol xs={12} xl={6}>
            <CFormSelect
              name="203"
              label="Color"
              onChange={(e) => onChange(e as any, 2)}
              value={value["203"] as any}
              options={colorOptions as any}
              //disabled={isEquipmentSizeDisabled || viewMode}
              invalid={typeof errors['203'] === 'string'}
              feedbackInvalid={errors['203']}
            />
          </CCol>

          <CCol xs={12} xl={6}>
            <CFormInput
              type="text"
              label="Plate"
              name="206"
              required
              onChange={(e) => onChange(e as any, 2)}
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
          Save Container
        </CButton>
      </CCardFooter>
    </CCard>
  )
}
