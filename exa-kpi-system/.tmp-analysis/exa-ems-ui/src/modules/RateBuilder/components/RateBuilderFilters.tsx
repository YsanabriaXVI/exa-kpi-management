import React from 'react'
import { CCol, CRow, CFormLabel, CMultiSelect } from '@coreui/react-pro'

interface Option {
  value: number
  label: string
}

interface RateBuilderFiltersProps {
  typeValue: number
  classValue: number
  onTypeChange: (value: number) => void
  onClassChange: (value: number) => void
  disabled?: boolean
  typeOptions: Option[]
  classOptions: Option[]
  clientOptions: Option[]
  subdivisionOptions: Option[]
  selectedClientIds: number[]
  selectedSubdivisionIds: number[]
  onClientsFilterChange: (values: number[]) => void
  onSubdivisionsFilterChange: (values: number[]) => void
}

const RateBuilderFilters: React.FC<RateBuilderFiltersProps> = ({
  typeValue,
  classValue,
  onTypeChange,
  onClassChange,
  disabled,
  typeOptions,
  classOptions,
  clientOptions,
  subdivisionOptions,
  selectedClientIds,
  selectedSubdivisionIds,
  onClientsFilterChange,
  onSubdivisionsFilterChange,
}) => {
  const mapOptions = (options: Option[]) => options.map((opt) => ({ value: String(opt.value), label: opt.label }))

  const handleChange = (selected: any, setter: (value: number) => void) => {
    const option = Array.isArray(selected) ? selected[0] : selected
    const numericValue = option?.value ? Number(option.value) : null
    if (numericValue !== null) {
      setter(numericValue)
    }
  }

  const handleMultiChange = (selected: any, onChange: (values: number[]) => void) => {
    if (!Array.isArray(selected)) {
      onChange([])
      return
    }
    const values = selected
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return item.value ?? item.id ?? null
        }
        return item
      })
      .filter((val) => val !== null && `${val}`.trim() !== '')
      .map((val) => Number(val))
      .filter((val) => Number.isFinite(val))
    onChange(values)
  }

  return (
    <div className="rate-builder-filter-card">
      <CRow className="g-3 align-items-end">
        <CCol md={3}>
          <CFormLabel className="text-uppercase small fw-semibold text-body-secondary">Type</CFormLabel>
          <CMultiSelect
            options={mapOptions(typeOptions)}
            value={String(typeValue)}
            onChange={(selected: any) => handleChange(selected, onTypeChange)}
            multiple={false}
            selectionType="text"
            placeholder="Select type"
            clearSearchOnSelect
            disabled={disabled}
            className="w-100"
          />
        </CCol>
        <CCol md={3}>
          <CFormLabel className="text-uppercase small fw-semibold text-body-secondary">Class</CFormLabel>
          <CMultiSelect
            options={mapOptions(classOptions)}
            value={String(classValue)}
            onChange={(selected: any) => handleChange(selected, onClassChange)}
            multiple={false}
            selectionType="text"
            placeholder="Select class"
            clearSearchOnSelect
            disabled={disabled}
            className="w-100"
          />
        </CCol>
        <CCol md={3}>
          <CFormLabel className="text-uppercase small fw-semibold text-body-secondary">Clients</CFormLabel>
          <CMultiSelect
            options={mapOptions(clientOptions)}
            value={selectedClientIds.map((id) => String(id))}
            onChange={(selected: any) => handleMultiChange(selected, onClientsFilterChange)}
            multiple
            selectionType="tags"
            placeholder="Filter clients"
            clearSearchOnSelect
            disabled={disabled}
            className="w-100"
          />
        </CCol>
        <CCol md={3}>
          <CFormLabel className="text-uppercase small fw-semibold text-body-secondary">Subdivisions</CFormLabel>
          <CMultiSelect
            options={mapOptions(subdivisionOptions)}
            value={selectedSubdivisionIds.map((id) => String(id))}
            onChange={(selected: any) => handleMultiChange(selected, onSubdivisionsFilterChange)}
            multiple
            selectionType="tags"
            placeholder="Filter subdivisions"
            clearSearchOnSelect
            disabled={disabled}
            className="w-100"
          />
        </CCol>
      </CRow>
      <style>{`
        .rate-builder-filter-card {
          background: var(--rb-filter-bg);
          border: 1px solid var(--rb-filter-border);
          border-radius: 16px;
          padding: 1.25rem 1.25rem 0.75rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 6px 18px rgba(15, 48, 84, 0.08);
        }
      `}</style>
    </div>
  )
}

export default RateBuilderFilters
