import React from 'react'
import {
  CCol,
  CForm,
  CFormInput,
  CRow,
} from '@coreui/react-pro'

export interface FuelUnitTypeFormValue {
  name: string
}

interface FuelUnitTypeFormProps {
  value: FuelUnitTypeFormValue
  disabled: boolean
  errors: Record<string, string>
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setField: (field: keyof FuelUnitTypeFormValue, value: string) => void
  hasError: (field: keyof FuelUnitTypeFormValue) => boolean
}

const FuelUnitTypeForm: React.FC<FuelUnitTypeFormProps> = ({
  value,
  disabled,
  errors,
  setTouched,
  setField,
  hasError,
}) => {
  return (
    <CRow className="g-3">
      <CCol md={6}>
        <CForm>
          <CFormInput
            type="text"
            label="Name"
            size="lg"
            disabled={disabled}
            value={value.name ?? ''}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            invalid={hasError('name')}
            feedbackInvalid={errors.name}
          />
        </CForm>
      </CCol>
    </CRow>
  )
}

export default FuelUnitTypeForm
