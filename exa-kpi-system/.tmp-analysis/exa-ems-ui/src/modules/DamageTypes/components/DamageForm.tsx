// src/modules/DamageTypes/components/DamageForm.tsx
import React from 'react'
import {
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormFeedback,
} from '@coreui/react-pro'

export interface EquipmentType {
  equipmentTypeId: number
  equipmentName: string
  // agrega más campos si los necesitas
}

export interface DamageFormData {
  equipmentTypeId?: number | string
  damageName?: string
  description?: string
  code?: string
  isoCode?: string
}

export interface DamageFormErrors {
  [key: string]: string
}

interface DamageFormProps {
  list?: EquipmentType[]
  data: DamageFormData
  errors?: DamageFormErrors | false
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void
}

const DamageForm: React.FC<DamageFormProps> = ({
  list,
  data,
  errors,
  onChange,
}) => {
  const equipmentTypesList = list || []
  const safeErrors = (errors || {}) as DamageFormErrors

  return (
    <CForm>
      {/* Equipment Type */}
      <div className="mb-3">
        <CFormLabel htmlFor="equipmentTypeId">Equipment Type</CFormLabel>
        <CFormSelect
          id="equipmentTypeId"
          name="equipmentTypeId"
          value={data.equipmentTypeId ?? ''}
          onChange={onChange}
          invalid={!!safeErrors.equipmentTypeId}
        >
          <option value="">Select Equipment...</option>
          {equipmentTypesList.map((et) => (
            <option key={et.equipmentTypeId} value={et.equipmentTypeId}>
              {et.equipmentName}
            </option>
          ))}
        </CFormSelect>
        {safeErrors.equipmentTypeId && (
          <CFormFeedback invalid>
            {safeErrors.equipmentTypeId}
          </CFormFeedback>
        )}
      </div>

      {/* Damage Name */}
      <div className="mb-3">
        <CFormLabel htmlFor="damageName">Name</CFormLabel>
        <CFormInput
          id="damageName"
          name="damageName"
          placeholder="Damage Name..."
          value={data.damageName ?? ''}
          onChange={onChange}
          invalid={!!safeErrors.damageName}
        />
        {safeErrors.damageName && (
          <CFormFeedback invalid>{safeErrors.damageName}</CFormFeedback>
        )}
      </div>

      {/* Description */}
      <div className="mb-3">
        <CFormLabel htmlFor="description">Description</CFormLabel>
        <CFormInput
          id="description"
          name="description"
          placeholder="Description..."
          value={data.description ?? ''}
          onChange={onChange}
          invalid={!!safeErrors.description}
        />
        {safeErrors.description && (
          <CFormFeedback invalid>{safeErrors.description}</CFormFeedback>
        )}
      </div>

      {/* Internal Code */}
      <div className="mb-3">
        <CFormLabel htmlFor="code">Internal Code</CFormLabel>
        <CFormInput
          id="code"
          name="code"
          placeholder="Code..."
          value={data.code ?? ''}
          onChange={onChange}
          invalid={!!safeErrors.code}
        />
        {safeErrors.code && (
          <CFormFeedback invalid>{safeErrors.code}</CFormFeedback>
        )}
      </div>

      {/* ISO Code */}
      <div className="mb-3">
        <CFormLabel htmlFor="isoCode">ISO Code</CFormLabel>
        <CFormInput
          id="isoCode"
          name="isoCode"
          placeholder="ISO Code..."
          value={data.isoCode ?? ''}
          onChange={onChange}
          invalid={!!safeErrors.isoCode}
        />
        {safeErrors.isoCode && (
          <CFormFeedback invalid>{safeErrors.isoCode}</CFormFeedback>
        )}
      </div>
    </CForm>
  )
}

export default DamageForm
