// src/modules/RentalPlan/components/RentalPlanTopForm.tsx

import React from 'react'
import { CCol, CForm, CFormInput, CFormLabel, CRow, CFormSwitch } from '@coreui/react-pro'
import { CMultiSelect } from '@coreui/react-pro'

import { RentalPlanFormValues } from '../types/rentalPlan.types'

type ClientOption = {
  value: number
  label: string
}

type Props = {
  value: RentalPlanFormValues
  clientOptions: ClientOption[]
  disabled?: boolean
  errors?: Partial<Record<keyof RentalPlanFormValues, string>>
  onChange: (next: RentalPlanFormValues) => void
}

const RentalPlanTopForm: React.FC<Props> = ({
  value,
  clientOptions,
  disabled = false,
  errors = {},
  onChange,
}) => {
  const setField = <K extends keyof RentalPlanFormValues>(key: K, v: RentalPlanFormValues[K]) => {
    onChange({ ...value, [key]: v })
  }

  return (
    <CForm>
      <CRow className="g-3">
        <CCol md={6}>
          <CFormLabel>Plan Name</CFormLabel>
          <CFormInput
            value={value.planName}
            disabled={disabled}
            invalid={!!errors.planName}
            onChange={(e) => setField('planName', e.target.value)}
            placeholder="Select Plan Name"
          />
          {errors.planName && <div className="invalid-feedback d-block">{errors.planName}</div>}
          <br />
          <CFormSwitch
            label="Active"
            size='lg'
            checked={value.status === 1}
            disabled={disabled}
            onChange={(e) => setField('status', e.target.checked ? 1 : 0)}
          />
        </CCol>

        <CCol md={6}>
          <CFormLabel>Applies For</CFormLabel>
          <CMultiSelect
            options={clientOptions}
            value={value.clientIds}
            disabled={disabled}
            multiple
            search
            size='lg'
            placeholder="Select clients"
            onChange={(selected) =>
              setField(
                'clientIds',
                selected.map((s) => Number(s.value)),
              )
            }
          />
          {errors.clientIds && <div className="invalid-feedback d-block">{errors.clientIds}</div>}
          <br />
          <CFormLabel>Tax Rate</CFormLabel>
          <CFormInput
            value={value.taxRate}
            disabled={disabled}
            invalid={!!errors.taxRate}
            onChange={(e) => setField('taxRate', e.target.value)}
            placeholder="Enter Tax Rate as Decimal"
          />
          {errors.taxRate && <div className="invalid-feedback d-block">{errors.taxRate}</div>}
   
        </CCol>


          

      </CRow>
    </CForm>
  )
}

export default RentalPlanTopForm
