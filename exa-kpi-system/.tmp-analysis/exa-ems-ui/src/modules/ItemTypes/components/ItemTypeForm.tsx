// src/modules/ItemTypes/components/ItemTypeForm.tsx
import React from 'react'
import {
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormText,
  CRow,
} from '@coreui/react-pro'

export type ItemTypeFormValue = {
  ISOCode?: string
  description?: string
}

type Props = {
  value: ItemTypeFormValue
  disabled?: boolean

  errors: Record<string, string>
  touched: Record<string, boolean>

  setField: (field: keyof ItemTypeFormValue, value: any) => void
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  hasError: (field: keyof ItemTypeFormValue) => boolean
}

const ItemTypeForm: React.FC<Props> = ({
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
          <CFormLabel>ISO Code</CFormLabel>
          <CFormInput
            value={value.ISOCode ?? ''}
            disabled={disabled}
            invalid={hasError('ISOCode')}
            onBlur={() => setTouched((t) => ({ ...t, ISOCode: true }))}
            onChange={(e) =>
              setField('ISOCode', String(e.target.value).toUpperCase())
            }
            placeholder="ISO Code..."
          />
          {hasError('ISOCode') && (
            <CFormText className="text-danger">{errors.ISOCode}</CFormText>
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
            placeholder="Description..."
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

export default ItemTypeForm
