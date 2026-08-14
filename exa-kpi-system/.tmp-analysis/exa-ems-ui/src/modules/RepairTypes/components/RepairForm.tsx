// src/modules/RepairTypes/components/RepairForm.tsx
import React from 'react'
import {
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormText,
  CRow,
  CMultiSelect,
} from '@coreui/react-pro'

type Option = { label: string; value: string }

export type RepairFormValue = {
  equipmentTypeId?: string | number
  repairName?: string
  description?: string
  internalCode?: string
  ISOCode?: string
}

type Props = {
  value: RepairFormValue
  disabled?: boolean

  errors: Record<string, string>
  touched: Record<string, boolean>

  equipmentTypeOptions: Option[]

  setField: (field: keyof RepairFormValue, value: any) => void
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  hasError: (field: keyof RepairFormValue) => boolean
}

const RepairForm: React.FC<Props> = ({
  value,
  disabled,
  errors,
  touched,
  equipmentTypeOptions,
  setField,
  setTouched,
  hasError,
}) => {
  const selectValue =
    value.equipmentTypeId === undefined ||
    value.equipmentTypeId === null ||
    value.equipmentTypeId === ''
      ? []
      : [String(value.equipmentTypeId)]

  return (
    <CForm>
      <CRow className="g-3">
        <CCol md={6}>
          <CFormLabel>Equipment Type</CFormLabel>
          <CMultiSelect
            options={equipmentTypeOptions}
            multiple={false}
            search
            placeholder="Pick Equipment Type"
            disabled={disabled}
            className={hasError('equipmentTypeId') ? 'is-invalid' : undefined}
            value={selectValue}
            onBlur={() => setTouched((t) => ({ ...t, equipmentTypeId: true }))}
            onChange={(selected) => {
              const v = selected?.[0]?.value ?? ''
              setField('equipmentTypeId', v)
            }}
          />
          {hasError('equipmentTypeId') && (
            <CFormText className="text-danger">
              {errors.equipmentTypeId}
            </CFormText>
          )}

          <CFormLabel className="mt-3">Name</CFormLabel>
          <CFormInput
            value={value.repairName ?? ''}
            disabled={disabled}
            invalid={hasError('repairName')}
            onBlur={() => setTouched((t) => ({ ...t, repairName: true }))}
            onChange={(e) => setField('repairName', e.target.value)}
            placeholder="Repair Name..."
          />
          {hasError('repairName') && (
            <CFormText className="text-danger">{errors.repairName}</CFormText>
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
            <CFormText className="text-danger">{errors.description}</CFormText>
          )}

          <CFormLabel className="mt-3">Internal Code</CFormLabel>
          <CFormInput
            value={value.internalCode ?? ''}
            disabled={disabled}
            invalid={hasError('internalCode')}
            onBlur={() => setTouched((t) => ({ ...t, internalCode: true }))}
            onChange={(e) => setField('internalCode', e.target.value)}
            placeholder="Internal Code..."
          />
          {hasError('internalCode') && (
            <CFormText className="text-danger">
              {errors.internalCode}
            </CFormText>
          )}

          <CFormLabel className="mt-3">ISO Code</CFormLabel>
          <CFormInput
            value={value.ISOCode ?? ''}
            disabled={disabled}
            invalid={hasError('ISOCode')}
            onBlur={() => setTouched((t) => ({ ...t, ISOCode: true }))}
            onChange={(e) => setField('ISOCode', e.target.value)}
            placeholder="ISO Code..."
          />
          {hasError('ISOCode') && (
            <CFormText className="text-danger">{errors.ISOCode}</CFormText>
          )}
        </CCol>
      </CRow>
    </CForm>
  )
}

export default RepairForm
