import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CForm,
  CFormFeedback,
  CFormInput,
  CFormSelect,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave, cilX } from '@coreui/icons'
import { ACTIVE_STATUS_ID } from '../constants'
import type { City, Country, Department, LocationItem, LocationTypeKey, Variant } from '../types'

type FormProps = {
  type: LocationTypeKey
  initialValues: Partial<LocationItem> | null
  loading: boolean
  error?: string | null
  isEdit: boolean
  onSubmit: (item: LocationItem) => void
  onCancel: () => void
  countries: Country[]
  departments: Department[]
  variants: Variant[]
  readOnly?: boolean
  addLabel?: string
}

const LocationItemForm: React.FC<FormProps> = ({
  type,
  initialValues,
  loading,
  error,
  isEdit,
  onSubmit,
  onCancel,
  countries,
  departments,
  variants,
  readOnly = false,
  addLabel,
}) => {
  const [formData, setFormData] = useState<Partial<LocationItem>>(
    initialValues || {
      name: '',
      status: ACTIVE_STATUS_ID,
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues)
    }
  }, [initialValues])

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!formData.name || (formData.name as string).trim() === '') {
      nextErrors.name = 'Name is required'
    } else if (!/[a-zA-Z]/.test(formData.name as string)) {
      nextErrors.name = 'Name must contain at least one letter'
    }
    if (type === 'departments') {
      const countryId = (formData as Department).country_id ?? (formData as Department).country?.country_id
      if (!countryId) {
        nextErrors.country_id = 'Country is required'
      }
    }
    if (type === 'cities') {
      const departmentId =
        (formData as City).department_id ?? (formData as City).department?.department_id
      if (!departmentId) {
        nextErrors.department_id = 'Department is required'
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const status =
      typeof formData.status === 'object' ? (formData.status as any).id : formData.status ?? ACTIVE_STATUS_ID
    onSubmit({
      ...formData,
      status,
    } as LocationItem)
  }

  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: c.country_id ?? c.id,
        label: c.name,
      })),
    [countries]
  )

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: d.department_id ?? d.id,
        label: `${d.name}${d.country?.name ? ` (${d.country.name})` : ''}`,
        country_id: d.country_id ?? d.country?.country_id,
      })),
    [departments]
  )

  const variantOptions = useMemo(
    () =>
      variants.map((v) => ({
        value: v.variant_id ?? v.id,
        label: v.name,
      })),
    [variants]
  )

  const renderTypeSpecificFields = () => {
    const dropdownStyle = { maxHeight: 260, overflowY: 'auto' }

    if (type === 'departments') {
      return (
        <CRow className="g-3 mt-1">
          <CCol md={6}>
            <CMultiSelect
              label="Country *"
              options={countryOptions}
              value={
                (formData as Department).country_id
                  ? [(formData as Department).country_id!]
                  : []
              }
              onChange={(vals) => {
                handleChange('country_id', vals[0] ? Number(vals[0].value) : undefined)
              }}
              invalid={Boolean(errors.country_id)}
              disabled={loading || readOnly}
              multiple={false}
              dropdownStyle={dropdownStyle}
            />
            {errors.country_id && <CFormFeedback invalid>{errors.country_id}</CFormFeedback>}
          </CCol>
        </CRow>
      )
    }

    if (type === 'cities') {
      const currentDeptId =
        (formData as City).department_id ?? (formData as City).department?.department_id
      const currentDept = departmentOptions.find((opt) => opt.value === currentDeptId)
      const selectedCountryId =
        (formData as City).country?.country_id ??
        (formData as City).country_id ??
        currentDept?.country_id

      return (
        <CRow className="g-3 mt-1">
          <CCol md={4}>
            <CFormInput
              label="Code"
              value={(formData as City).code ?? ''}
              onChange={(e) => handleChange('code', e.target.value)}
              disabled={loading || readOnly}
            />
          </CCol>
          <CCol md={4}>
            <CMultiSelect
              label="Department *"
              options={departmentOptions}
              value={currentDeptId ? [currentDeptId] : []}
              onChange={(vals) => {
                handleChange('department_id', vals[0] ? Number(vals[0].value) : undefined)
              }}
              invalid={Boolean(errors.department_id)}
              disabled={loading || readOnly}
              multiple={false}
              dropdownStyle={dropdownStyle}
            />
            {errors.department_id && <CFormFeedback invalid>{errors.department_id}</CFormFeedback>}
          </CCol>
          <CCol md={4}>
            <CFormSelect
              label="Country"
              value={selectedCountryId ?? ''}
              options={[
                { value: selectedCountryId ?? '', label: selectedCountryId ? countryOptions.find((c) => c.value === selectedCountryId)?.label || 'Country' : 'Country (auto)' },
              ]}
              disabled
            />
          </CCol>
          <CCol md={4}>
            <CMultiSelect
              label="Variant"
              options={variantOptions}
              value={
                (formData as City).variant_id
                  ? [(formData as City).variant_id!]
                  : []
              }
              onChange={(vals) => {
                handleChange('variant_id', vals[0] ? Number(vals[0].value) : null)
              }}
              disabled={loading || readOnly}
              multiple={false}
              dropdownStyle={dropdownStyle}
            />
          </CCol>
        </CRow>
      )
    }

    return null
  }

  return (
    <CCard className="locationitem-form-card">
      <CCardHeader className="attribute-card-header">
        <div className="attribute-card-title">
          {isEdit ? 'Edit' : addLabel || `Add ${type.slice(0, -1)}`}
        </div>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger">{error}</CAlert>}
        <CForm>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormInput
                label="Name *"
                placeholder="Enter name"
                value={(formData.name as string) || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                invalid={Boolean(errors.name)}
                disabled={loading || readOnly}
              />
              {errors.name && <CFormFeedback invalid>{errors.name}</CFormFeedback>}
            </CCol>
          </CRow>

          {renderTypeSpecificFields()}
        </CForm>
      </CCardBody>
      <CCardFooter className="attribute-form-footer d-flex justify-content-between align-items-center">
        <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
          <CIcon icon={cilArrowLeft} className="me-2" />
          Back
        </CButton>
        <div className="d-flex gap-2">
          {!readOnly && (
            <>
              <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
                <CIcon icon={cilX} className="me-2" />
                Cancel
              </CButton>
              <CButton color="success" className="text-white" onClick={handleSubmit} disabled={loading}>
                <CIcon icon={cilSave} className="me-2" />
                {isEdit ? 'Save Changes' : 'Save'}
              </CButton>
            </>
          )}
        </div>
      </CCardFooter>
    </CCard>
  )
}

export default LocationItemForm
