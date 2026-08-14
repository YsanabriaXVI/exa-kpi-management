
import { CButton, CCard, CCardBody, CCardFooter, CCardHeader, CCol, CFormInput, CFormSelect, CRow } from '@coreui/react-pro'
import type { NewTruckObject, NewDriverObject, SelectOption } from '../types'
import CIcon from '@coreui/icons-react'
import { cilSave, cilXCircle } from '@coreui/icons'

type Props = {
  truck: NewTruckObject
  driver: NewDriverObject
  colorOptions: SelectOption[]
  subdivisionOptions: SelectOption[]
  truckErrors?: any
  driverErrors?: any
  onChange: any
  onSave: () => void
  onClose: () => void
}

export default function CreateTruckForm({
  truck,
  driver,
  colorOptions,
  subdivisionOptions,
  truckErrors,
  driverErrors,
  onChange,
  onSave,
  onClose,
}: Props) {

  return (
    <CCard className="animated fadeIn">
      <CCardHeader className="d-flex align-items-center justify-content-between">
        <div>
          <strong>Create New Truck</strong>
        </div>
        <CButton color="light" variant="ghost" onClick={onClose}>
          ✕
        </CButton>
      </CCardHeader>
{/*      <CCardBody style={{ backgroundColor: 'rgba(123, 129, 149, 0.8)' }}> */}
      <CCardBody>
        <CRow className="g-3">
          <CCol sm={12} xl={6}>
            <CRow className="align-items-center">
              <CCol>
                <CFormInput
                    type="text"
                    name="194"
                    label="Truck Plate #"
                    required
                    onChange={(e) => onChange(e as any, 4)}
                    value={truck["194"] ?? ''}
                    //invalid={!!FEerrors?.checkListName}
                    //invalid={typeof errors['206'] === 'string'}
                    //feedbackInvalid={errors['206']}
                    invalid={typeof truckErrors['194'] === 'string'}
                    feedbackInvalid={truckErrors['194']}
                  />
              </CCol>
            </CRow>

            <CRow className="align-items-center mt-2">
              <CCol>
                <CFormSelect
                    name="203"
                    label="Color"
                    onChange={(e) => onChange(e as any, 4)}
                    value={truck["203"] ?? ''}
                    options={colorOptions as any}
                    //disabled={viewMode}
                    invalid={typeof truckErrors['203'] === 'string'}
                    feedbackInvalid={truckErrors['203']}
                  />
              </CCol>
            </CRow>

            <CRow className="align-items-center mt-2">
              <CCol>
                <CFormSelect
                    name="subdivision_id"
                    label="Subdivision"
                    onChange={(e) => onChange(e as any, 4)}
                    value={truck.subdivision_id ?? ''}
                    options={subdivisionOptions as any}
                    //disabled={viewMode}
                    invalid={typeof truckErrors['subdivision_id'] === 'string'}
                    feedbackInvalid={truckErrors['subdivision_id']}
                  />
              </CCol>
            </CRow>
          </CCol>

          <CCol sm={12} xl={6}>
            <CRow className="align-items-center">
              <CCol> 
              <CFormInput
                type="text"
                name="195"
                label="Driver's First Name"
                required
                onChange={(e) => onChange(e as any, 5)}
                value={driver["195"] ?? ''}
                invalid={typeof driverErrors['195'] === 'string'}
                feedbackInvalid={driverErrors['195']}
              />
              </CCol>
            </CRow>

            <CRow className="align-items-center mt-2">
              <CCol> 
              <CFormInput
                type="text"
                name="196"
                label="Driver's Last Name"
                required
                onChange={(e) => onChange(e as any, 5)}
                value={driver["196"] ?? ''}
                //invalid={!!FEerrors?.checkListName}
                invalid={typeof driverErrors['196'] === 'string'}
                feedbackInvalid={driverErrors['196']}
              />
              </CCol>
            </CRow>

            <CRow className="align-items-center mt-2">
              <CCol>
                <CFormInput
                type="text"
                name="194"
                label="Driver's License"
                required
                onChange={(e) => onChange(e as any, 5)}
                value={driver["194"] ?? ''}
                //invalid={!!FEerrors?.checkListName}
                invalid={typeof driverErrors['194'] === 'string'}
                feedbackInvalid={driverErrors['194']}
              />
              </CCol>
            </CRow>
          </CCol>
        </CRow>
      </CCardBody>

      <CCardFooter className="d-flex justify-content-end gap-2">
        <CButton color="warning" onClick={onClose} /* disabled={disabled} */>
          <CIcon icon={cilXCircle} className="me-2" />
          Cancel
        </CButton>
        <CButton color="primary" onClick={onSave} /* disabled={disabled} */>
          <CIcon icon={cilSave} className="me-2" />
          Save Truck/Driver
        </CButton>
      </CCardFooter>
    </CCard>
  )
}