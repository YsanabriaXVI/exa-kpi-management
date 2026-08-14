import React from 'react'
import {
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormText,
  CRow,
} from '@coreui/react-pro'

import type { RepairStatusFormValue } from '../types/repairStatus.types'

type Props = {
  value: RepairStatusFormValue
  disabled?: boolean

  errors: Record<string, string>
  touched: Record<string, boolean>

  setField: (field: keyof RepairStatusFormValue, value: any) => void
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  hasError: (field: keyof RepairStatusFormValue) => boolean
}

const RepairStatusForm: React.FC<Props> = ({
  value,
  disabled,
  errors,
  touched,
  setField,
  setTouched,
  hasError,
}) => {
  return (
    <CForm>
      <CRow className="g-3">
        <CCol md={6}>
          <CFormLabel>Status Code</CFormLabel>
          <CFormInput
            value={value.ISOCode ?? ''}
            disabled={disabled}
            invalid={hasError('ISOCode')}
            onBlur={() => setTouched((t) => ({ ...t, ISOCode: true }))}
            onChange={(e) => setField('ISOCode', e.target.value)}
            placeholder="Status ISO Code..."
          />
          {hasError('ISOCode') && (
            <CFormText className="text-danger">
              {errors.ISOCode}
            </CFormText>
          )}
        </CCol>

        <CCol md={6}>
          <CFormLabel>Description</CFormLabel>
          <CFormInput
            value={value.description ?? ''}
            disabled={disabled}
            invalid={hasError('description')}
            onBlur={() => setTouched((t) => ({ ...t, description: true }))}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Status Description..."
          />
          {hasError('description') && (
            <CFormText className="text-danger">
              {errors.description}
            </CFormText>
          )}
        </CCol>
      </CRow>
    </CForm>
  )
}

export default RepairStatusForm
