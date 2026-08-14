import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
  CMultiSelect,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave } from '@coreui/icons'
import type { AttributeItem } from '../../../Attributes/types'
import type { Company } from '../../Companies/types'
import type { Subdivision } from '../../Subdivisions/types'
import type { AttributeField, OtherAssetFormValues } from '../types'

type SelectOption = { value: string | number; label: string }

interface OtherAssetFormProps {
  initialValues: OtherAssetFormValues
  attributes: AttributeField[]
  vehicleTypes: AttributeItem[]
  companies: Company[]
  subdivisions: Subdivision[]
  relatedAssetOptions: SelectOption[]
  onSubmit: (values: OtherAssetFormValues) => void
  onChange?: (values: OtherAssetFormValues) => void
  loading?: boolean
  attributesLoading?: boolean
  isEdit?: boolean
  readOnly?: boolean
}

const DEFAULT_VALUES: OtherAssetFormValues = {
  otherAssetType: '',
  vehicleType: '',
  company_id: '',
  subdivision_id: '',
  relatedAssetIds: [],
  attributes: {},
}

const shouldVirtualScroll = (options: unknown[]) => (options?.length ?? 0) > 20
const dropdownScrollStyle: React.CSSProperties = { maxHeight: 260, overflowY: 'auto' }

const OtherAssetForm: React.FC<OtherAssetFormProps> = ({
  initialValues,
  attributes,
  vehicleTypes,
  companies,
  subdivisions,
  relatedAssetOptions,
  onSubmit,
  onChange,
  loading,
  attributesLoading,
  isEdit,
  readOnly = false,
}) => {
  const [formData, setFormData] = useState<OtherAssetFormValues>({ ...DEFAULT_VALUES, ...initialValues })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitCount, setSubmitCount] = useState(0)

  useEffect(() => {
    setFormData({ ...DEFAULT_VALUES, ...initialValues })
  }, [initialValues])

  useEffect(() => {
    if (submitCount > 0) {
      const firstErrorElement = document.querySelector('.is-invalid')
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ;(firstErrorElement as HTMLElement).focus()
      }
    }
  }, [submitCount, errors])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    if (!formData.otherAssetType) {
      newErrors.otherAssetType = 'Asset Type is required'
      isValid = false
    }

    attributes.forEach((attr) => {
      if (attr.required) {
        const attrId = String(attr.attribute_id)
        if (!formData.attributes?.[attrId]) { // Check for empty value
          newErrors[attrId] = `${attr.name} is required`
          isValid = false
        }
      }
    })

    setErrors(newErrors)
    setSubmitCount((prev: number) => prev + 1)
    return isValid
  }

  const emitChange = (updated: OtherAssetFormValues) => {
    setFormData(updated)
    onChange?.(updated)
  }

  const handleAttributeChange = (attributeId: string, value: string | number | string[]) => {
    emitChange({
      ...formData,
      attributes: { ...(formData.attributes || {}), [attributeId]: value },
    })
    if (errors[attributeId]) {
      setErrors((prev: Record<string, string>) => ({ ...prev, [attributeId]: '' }))
    }
  }

  const handleAssetTypeChange = (value: string) => {
    emitChange({
      otherAssetType: value,
      vehicleType: '',
      company_id: formData.company_id || '',
      subdivision_id: formData.subdivision_id || '',
      relatedAssetIds: [],
      attributes: {},
      assetsid: formData.assetsid,
    })
    if (errors.otherAssetType) {
        setErrors((prev: Record<string, string>) => ({ ...prev, otherAssetType: '' }))
    }
  }

  const handleVehicleTypeChange = (value: string) => {
    emitChange({
      ...formData,
      vehicleType: value,
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (validate()) {
        onSubmit(formData)
    }
  }

  const filteredVehicleTypes = useMemo(() => {
    const allowedForOther = ['Flatbed', 'Chassis', 'Container', 'Reefer Unit', 'Genset']
    const disallowedForVehicle = allowedForOther

    return vehicleTypes.filter((item: AttributeItem) => {
      const name = (item?.name || '').trim()
      if (formData.otherAssetType === '3') {
        return allowedForOther.includes(name)
      }
      if (formData.otherAssetType === '2') {
        return !disallowedForVehicle.includes(name)
      }
      return true
    })
  }, [vehicleTypes, formData.otherAssetType])

  const renderAttributeField = (attr: AttributeField) => {
    if (!attr?.attribute_id || String(attr.attribute_id) === '134') {
      return null
    }

    const attrId = String(attr.attribute_id)
    const value = formData.attributes?.[attrId] ?? ''
    const items = attr.attribute_items || []
    const fieldType = attr.field_type_id ?? attr.fieldTypeId
    const isSelect = fieldType === 1 || items.length > 0
    const required = Boolean(attr.required)
    const error = errors[attrId]

    if (isSelect) {
      return (
        <CCol md={6} key={attrId}>
          <CFormLabel>
            {attr.name} {required ? '*' : ''}
          </CFormLabel>
          <CMultiSelect
            options={items.map((item: AttributeItem) => {
              const optionValue = item.attribute_item_id ?? (item as any).attributeItemId ?? (item as any).id
              return { value: String(optionValue ?? ''), label: item.name || String(optionValue ?? '') }
            })}
            value={value ? String(value) : ''}
            onChange={(selected: SelectOption | SelectOption[]) => {
              const option = Array.isArray(selected) ? selected[0] : selected
              handleAttributeChange(attrId, String(option?.value ?? ''))
            }}
            multiple={false}
            selectionType="text"
            placeholder={`Select ${attr.name}`}
            clearSearchOnSelect
            required={required}
            dropdownStyle={dropdownScrollStyle}
            virtualScroller={shouldVirtualScroll(items)}
            invalid={!!error}
            feedbackInvalid={error}
            id={attrId}
            disabled={readOnly}
          />
        </CCol>
      )
    }

    return (
      <CCol md={6} key={attrId}>
        <CFormLabel>
          {attr.name} {required ? '*' : ''}
        </CFormLabel>
        <CFormInput
          value={value ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAttributeChange(attrId, e.target.value)}
          required={required}
          placeholder={attr.name}
          invalid={!!error}
          feedbackInvalid={error}
          id={attrId}
          disabled={readOnly}
        />
      </CCol>
    )
  }

  const selectedAssetType = formData.otherAssetType
  const showVehicleType = selectedAssetType === '2' || selectedAssetType === '3'
  const hasAssetTypeSelected = Boolean(selectedAssetType)

  return (
    <CForm onSubmit={handleSubmit} className="driver-form" noValidate>
      <CRow className="g-4">
        <CCol xs={12}>
          <CCard className="driver-section-card shadow-sm border-0">
            <CCardHeader className="driver-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Identity</div>
                <div className="section-title">{formData.assetsid ? `Asset #${formData.assetsid}` : 'Other Asset'}</div>
                <small className="text-body-secondary">Choose the asset category and optional vehicle type.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Asset Type *</CFormLabel>
                  <CMultiSelect
                    options={[
                      { value: '1', label: 'People' },
                      { value: '2', label: 'Vehicle' },
                      { value: '3', label: 'Other' },
                    ]}
                    value={formData.otherAssetType}
                    onChange={(selected: SelectOption | SelectOption[]) => {
                      const option = Array.isArray(selected) ? selected[0] : selected
                      handleAssetTypeChange(String(option?.value ?? ''))
                    }}
                    multiple={false}
                    selectionType="text"
                    placeholder="Select asset type"
                    clearSearchOnSelect
                    required
                    invalid={!!errors.otherAssetType}
                    feedbackInvalid={errors.otherAssetType}
                    id="otherAssetType"
                    disabled={isEdit || readOnly}
                  />
                </CCol>
                {showVehicleType && (
                  <CCol md={6}>
                    <CFormLabel>Vehicle Type</CFormLabel>
                    <CMultiSelect
                      options={filteredVehicleTypes.map((item: AttributeItem) => {
                        const id = item.attribute_item_id ?? (item as any).attributeItemId ?? (item as any).id
                        return { value: String(id ?? ''), label: item.name }
                      })}
                      value={formData.vehicleType || ''}
                      onChange={(selected: SelectOption | SelectOption[]) => {
                        const option = Array.isArray(selected) ? selected[0] : selected
                        handleVehicleTypeChange(String(option?.value ?? ''))
                      }}
                      multiple={false}
                      selectionType="text"
                      placeholder="Select vehicle type"
                      clearSearchOnSelect
                      dropdownStyle={dropdownScrollStyle}
                      virtualScroller={shouldVirtualScroll(filteredVehicleTypes)}
                      disabled={isEdit || readOnly}
                    />
                  </CCol>
                )}
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="driver-section-card shadow-sm border-0">
            <CCardHeader className="driver-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Ownership</div>
                <div className="section-title">Company & Links</div>
                <small className="text-body-secondary">
                  Assign the owning company, subdivision, and any related assets.
                </small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Company</CFormLabel>
                  <CMultiSelect
                    options={companies.map((company) => ({
                      value: String(company.company_id ?? company.id),
                      label: company.name,
                    }))}
                    value={formData.company_id ? String(formData.company_id) : ''}
                    onChange={(selected: SelectOption | SelectOption[]) => {
                      const option = Array.isArray(selected) ? selected[0] : selected
                      emitChange({
                        ...formData,
                        company_id: option?.value ?? '',
                      })
                    }}
                    multiple={false}
                    selectionType="text"
                    placeholder="Select company"
                    clearSearchOnSelect
                    dropdownStyle={dropdownScrollStyle}
                    virtualScroller={shouldVirtualScroll(companies)}
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Subdivision</CFormLabel>
                  <CMultiSelect
                    options={subdivisions.map((subdivision) => ({
                      value: String(subdivision.subdivision_id ?? subdivision.id),
                      label: subdivision.name,
                    }))}
                    value={formData.subdivision_id ? String(formData.subdivision_id) : ''}
                    onChange={(selected: SelectOption | SelectOption[]) => {
                      const option = Array.isArray(selected) ? selected[0] : selected
                      emitChange({
                        ...formData,
                        subdivision_id: option?.value ?? '',
                      })
                    }}
                    multiple={false}
                    selectionType="text"
                    placeholder="Select subdivision"
                    clearSearchOnSelect
                    dropdownStyle={dropdownScrollStyle}
                    virtualScroller={shouldVirtualScroll(subdivisions)}
                    disabled={readOnly}
                  />
                </CCol>

                {selectedAssetType !== '3' && (
                  <CCol md={12}>
                    <CFormLabel>Related Assets</CFormLabel>
                    <CMultiSelect
                      options={relatedAssetOptions.map((option) => ({
                        value: String(option.value),
                        label: option.label,
                      }))}
                      value={(formData.relatedAssetIds || []).map(String)}
                      onChange={(selected: SelectOption | SelectOption[]) => {
                        const values = Array.isArray(selected)
                          ? selected.map((item) => (typeof item === 'object' ? item.value : item)).filter(Boolean)
                          : []
                        emitChange({ ...formData, relatedAssetIds: values as (string | number)[] })
                      }}
                      multiple
                    selectionType="tags"
                    placeholder="Link related assets"
                    clearSearchOnSelect
                    dropdownStyle={dropdownScrollStyle}
                    virtualScroller={shouldVirtualScroll(relatedAssetOptions)}
                    disabled={readOnly}
                  />
                  <div className="text-body-secondary small mt-1">
                    Link people to vehicles or vehicles back to operators for quick lookups.
                  </div>
                  </CCol>
                )}
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="driver-section-card shadow-sm border-0">
            <CCardHeader className="driver-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Details</div>
                <div className="section-title">Asset Attributes</div>
                <small className="text-body-secondary">
                  Fields load automatically based on the selected asset and vehicle type.
                </small>
              </div>
            </CCardHeader>
            <CCardBody>
              {!hasAssetTypeSelected ? (
                <div className="text-body-secondary">Select an asset type above to load attribute fields.</div>
              ) : attributesLoading ? (
                <div className="d-flex align-items-center gap-2">
                  <CSpinner size="sm" /> <span>Loading fields…</span>
                </div>
              ) : (
                <CRow className="g-3">{attributes.map((attr) => renderAttributeField(attr))}</CRow>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} className="mb-4">
          <div className="driver-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 pb-2">
            <CButton
              color="secondary"
              variant="ghost"
              type="button"
              onClick={() => window.history.back()}
              disabled={loading}
            >
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back
            </CButton>
            <div className="d-flex gap-2">
              {!readOnly && (
                <CButton color="primary" type="submit" disabled={loading} className="text-white px-4">
                  <CIcon icon={cilSave} className="me-2" />
                  Save Asset
                </CButton>
              )}
            </div>
          </div>
        </CCol>
      </CRow>
    </CForm>
  )
}

export default OtherAssetForm
