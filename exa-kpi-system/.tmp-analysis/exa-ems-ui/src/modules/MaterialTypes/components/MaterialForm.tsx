// src/modules/MaterialTypes/components/MaterialForm.tsx
import React from 'react'
import {
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormFeedback,
} from '@coreui/react-pro'

export type MaterialFormErrors = Record<string, string>

interface EquipmentTypeOption {
  equipmentTypeId: number
  equipmentName: string
}

interface MaterialFormProps {
  data: any
  list?: EquipmentTypeOption[]
  errors?: MaterialFormErrors
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
}

const MaterialForm: React.FC<MaterialFormProps> = ({ data, list, errors, onChange }) => {
  const equipmentTypesList = list || []
  const safeErrors = (errors || {}) as MaterialFormErrors

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
          invalid={Boolean(safeErrors.equipmentTypeId)}
        >
          <option value="">Select an option</option>
          {equipmentTypesList.map((et) => (
            <option key={et.equipmentTypeId} value={et.equipmentTypeId}>
              {et.equipmentName}
            </option>
          ))}
        </CFormSelect>
        {safeErrors.equipmentTypeId && <CFormFeedback invalid>{safeErrors.equipmentTypeId}</CFormFeedback>}
      </div>

      {/* Name */}
      <div className="mb-3">
        <CFormLabel htmlFor="name">Name</CFormLabel>
        <CFormInput
          id="name"
          name="name"
          value={data.name ?? ''}
          onChange={onChange}
          invalid={Boolean(safeErrors.name)}
          placeholder="Material name"
        />
        {safeErrors.name && <CFormFeedback invalid>{safeErrors.name}</CFormFeedback>}
      </div>

      {/* Description */}
      <div className="mb-3">
        <CFormLabel htmlFor="description">Description</CFormLabel>
        <CFormInput
          id="description"
          name="description"
          value={data.description ?? ''}
          onChange={onChange}
          invalid={Boolean(safeErrors.description)}
          placeholder="Material description"
        />
        {safeErrors.description && <CFormFeedback invalid>{safeErrors.description}</CFormFeedback>}
      </div>

      {/* Code */}
      <div className="mb-3">
        <CFormLabel htmlFor="code">Code</CFormLabel>
        <CFormInput
          id="code"
          name="code"
          value={data.code ?? ''}
          onChange={onChange}
          invalid={Boolean(safeErrors.code)}
          placeholder="6-10 characters"
        />
        {safeErrors.code && <CFormFeedback invalid>{safeErrors.code}</CFormFeedback>}
      </div>

      {/* ISO Code */}
      <div className="mb-3">
        <CFormLabel htmlFor="isoCode">ISO Code</CFormLabel>
        <CFormInput
          id="isoCode"
          name="isoCode"
          value={data.isoCode ?? ''}
          onChange={onChange}
          invalid={Boolean(safeErrors.isoCode)}
          placeholder="1-6 characters"
        />
        {safeErrors.isoCode && <CFormFeedback invalid>{safeErrors.isoCode}</CFormFeedback>}
      </div>
    </CForm>
  )
}

export default MaterialForm
