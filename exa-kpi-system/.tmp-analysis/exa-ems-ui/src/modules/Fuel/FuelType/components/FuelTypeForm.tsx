import React from 'react'
import {
  CCol,
  CForm,
  CFormInput,
  CRow,
} from '@coreui/react-pro'

export interface FuelTypeFormValue {
  name: string
}

interface FuelTypeFormProps {
  value: FuelTypeFormValue
  disabled: boolean
  errors: Record<string, string>
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setField: (field: keyof FuelTypeFormValue, value: string) => void
  hasError: (field: keyof FuelTypeFormValue) => boolean
}

const FuelTypeForm: React.FC<FuelTypeFormProps> = ({
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

export default FuelTypeForm
