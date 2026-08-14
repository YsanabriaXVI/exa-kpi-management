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
  CFormLabel,
  CFormSwitch,
  CMultiSelect,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilList, cilPlus, cilSave, cilTrash, cilX } from '@coreui/icons'
import type { Attribute, AttributeItem, AttributeModule, FieldType } from '../types'
import { ACTIVE_STATUS_ID, DROPDOWN_FIELD_TYPE_ID } from '../constants'

interface AttributeFormProps {
  initialValues: Attribute | null
  modules: AttributeModule[]
  fieldTypes: FieldType[]
  loading: boolean
  error?: string | null
  isEdit: boolean
  onSubmit: (data: Attribute) => void
  onCancel: () => void
}

const emptyAttribute: Attribute = {
  attribute_id: undefined,
  name: '',
  module_id: undefined,
  module: undefined,
  field_type_id: undefined,
  type: undefined,
  integral: 0,
  required: 0,
  row: 0,
  order: 0,
  column: null,
  status: { id: ACTIVE_STATUS_ID, name: 'ACTIVE' },
  primary_key: null,
  secondary_key: null,
  items: [],
}

const AttributeForm: React.FC<AttributeFormProps> = ({
  initialValues,
  modules,
  fieldTypes,
  loading,
  error,
  isEdit,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Attribute>(initialValues || emptyAttribute)
  const [items, setItems] = useState<AttributeItem[]>(initialValues?.items || [])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setFormData(initialValues || emptyAttribute)
    setItems(initialValues?.items || [])
  }, [initialValues])

  const isDropdownType = useMemo(() => {
    const typeId = formData.field_type_id ?? formData.type?.field_type_id
    const matchedType = fieldTypes.find((ft) => ft.field_type_id === typeId)
    const label = formData.type?.name || matchedType?.name || ''
    if (typeId === DROPDOWN_FIELD_TYPE_ID || matchedType?.has_items) return true
    if (!label) return false
    const normalized = label.toLowerCase()
    return normalized.includes('dropdown') || normalized.includes('select') || normalized.includes('list')
  }, [fieldTypes, formData.field_type_id, formData.type])

  const moduleOptions = useMemo(() => {
    const base = (modules || [])
      .filter((module) => module && module.module_id != null && module.name)
      .map((module) => ({
        value: String(module.module_id),
        label: module.name,
      }))

    const selectedValue = formData.module_id ?? formData.module?.module_id
    const selectedLabel = formData.module?.name
    if (selectedValue != null && selectedLabel) {
      const exists = base.some((option) => option.value === String(selectedValue))
      if (!exists) {
        base.unshift({
          value: String(selectedValue),
          label: selectedLabel,
        })
      }
    }

    return base
  }, [modules, formData.module_id, formData.module])

  const fieldTypeOptions = useMemo(() => {
    const base = (fieldTypes || [])
      .filter((type) => type && type.field_type_id != null && type.name)
      .map((type) => ({
        value: String(type.field_type_id),
        label: type.name,
      }))

    const selectedValue = formData.field_type_id ?? formData.type?.field_type_id
    const selectedLabel = formData.type?.name
    if (selectedValue != null && selectedLabel) {
      const exists = base.some((option) => option.value === String(selectedValue))
      if (!exists) {
        base.unshift({
          value: String(selectedValue),
          label: selectedLabel,
        })
      }
    }

    return base
  }, [fieldTypes, formData.field_type_id, formData.type])

  const cleanedItems = useMemo(
    () => items.filter((item) => (item.name || '').trim().length > 0),
    [items]
  )

  const isIntegralLocked = Boolean(formData.integral)

  const handleChange = (field: keyof Attribute, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleToggle = (field: keyof Attribute, checked: boolean) => {
    handleChange(field, checked ? 1 : 0)
  }

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        attribute_item_id: `tmp-${Date.now()}`,
        name: '',
        status: ACTIVE_STATUS_ID,
      },
    ])
  }

  const handleItemChange = (id: string | number | null | undefined, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.attribute_item_id === id ? { ...item, name: value } : item
      )
    )
  }

  const handleItemRemove = (id: string | number | null | undefined) => {
    setItems((prev) => prev.filter((item) => item.attribute_item_id !== id))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!formData.name || formData.name.trim() === '') {
      nextErrors.name = 'Name is required'
    }
    const moduleId = formData.module_id ?? formData.module?.module_id
    if (!moduleId) {
      nextErrors.module_id = 'Module is required'
    }
    const fieldTypeId = formData.field_type_id ?? formData.type?.field_type_id
    if (!fieldTypeId) {
      nextErrors.field_type_id = 'Input type is required'
    }
    if (isDropdownType && cleanedItems.length === 0) {
      nextErrors.items = 'Add at least one option for dropdown/list types'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    const statusId =
      typeof formData.status === 'object' ? formData.status?.id : Number(formData.status || ACTIVE_STATUS_ID)

    const payload: Attribute = {
      ...formData,
      module_id: formData.module_id ?? formData.module?.module_id,
      field_type_id: formData.field_type_id ?? formData.type?.field_type_id,
      integral: formData.integral ? 1 : 0,
      required: formData.required ? 1 : 0,
      status: {
        id: statusId,
        name: statusId === ACTIVE_STATUS_ID ? 'ACTIVE' : 'DISABLED',
      },
      items: isDropdownType ? cleanedItems : [],
    }

    onSubmit(payload)
  }

  const renderItems = () => {
    if (!isDropdownType) {
      return null
    }

    return (
      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <CIcon icon={cilList} />
            <strong>Dropdown / List Options</strong>
          </div>
          <CButton color="secondary" variant="outline" onClick={handleAddItem} size="sm">
            <CIcon icon={cilPlus} className="me-2" />
            Add Option
          </CButton>
        </CCardHeader>
        <CCardBody>
          {errors.items && <CAlert color="warning">{errors.items}</CAlert>}
          <div className="table-responsive">
            <CTable align="middle" className="attribute-items-table">
              <CTableHead>
                <CTableRow>
                  <CTableDataCell className="fw-semibold">Option Name</CTableDataCell>
                  <CTableDataCell className="text-end" style={{ width: 80 }}>
                    Actions
                  </CTableDataCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {items.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={2} className="text-center text-body-secondary">
                      No options yet. Click "Add Option" to start.
                    </CTableDataCell>
                  </CTableRow>
                )}
                {items.map((item) => (
                  <CTableRow key={item.attribute_item_id || `item-${item.name}`}>
                    <CTableDataCell>
                      <CFormInput
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(item.attribute_item_id, e.target.value)}
                        placeholder="Enter option label"
                        disabled={loading}
                      />
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleItemRemove(item.attribute_item_id)}
                        disabled={loading}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard className="attribute-form-card">
      <CCardHeader className="attribute-card-header">
        <div className="attribute-card-title">Attribute Details</div>
        <small className="text-body-secondary">
          Define module-specific fields and, when applicable, dropdown options.
        </small>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger">{error}</CAlert>}
        <CForm>
          <CRow className="g-3">
            <CCol md={6}>
            <div>
              <CFormLabel htmlFor="attribute-name">
                Attribute Name <span className="text-danger">*</span>
              </CFormLabel>
              <CFormInput
                id="attribute-name"
                placeholder="Enter attribute name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                invalid={Boolean(errors.name)}
                disabled={loading || isIntegralLocked}
              />
              {errors.name && <CFormFeedback invalid>{errors.name}</CFormFeedback>}
            </div>
          </CCol>
          <CCol md={3}>
            <div>
              <CFormLabel htmlFor="attribute-module">
                Module <span className="text-danger">*</span>
              </CFormLabel>
              <CMultiSelect
                id="attribute-module"
                placeholder="Select module"
                options={moduleOptions}
                value={
                  formData.module_id != null
                    ? String(formData.module_id)
                    : formData.module?.module_id != null
                      ? String(formData.module.module_id)
                      : ''
                }
                onChange={(selected) => {
                  const value = Array.isArray(selected) ? selected[0]?.value : selected?.value
                  handleChange('module_id', value ? Number(value) : undefined)
                }}
                invalid={Boolean(errors.module_id)}
                disabled={loading || isIntegralLocked}
                multiple={false}
                clearSearchOnSelect
                selectionType="tags"
                optionsMaxHeight={280}
              />
              {errors.module_id && <CFormFeedback invalid>{errors.module_id}</CFormFeedback>}
            </div>
          </CCol>
          <CCol md={3}>
            <div>
              <CFormLabel htmlFor="attribute-type">
                Input Type <span className="text-danger">*</span>
              </CFormLabel>
              <CMultiSelect
                id="attribute-type"
                placeholder="Select type"
                options={fieldTypeOptions}
                value={
                  formData.field_type_id != null
                    ? String(formData.field_type_id)
                    : formData.type?.field_type_id != null
                      ? String(formData.type.field_type_id)
                      : ''
                }
                onChange={(selected) => {
                  const value = Array.isArray(selected) ? selected[0]?.value : selected?.value
                  handleChange('field_type_id', value ? Number(value) : undefined)
                }}
                invalid={Boolean(errors.field_type_id)}
                disabled={loading || isIntegralLocked}
                multiple={false}
                clearSearchOnSelect
                selectionType="tags"
              />
              {errors.field_type_id && <CFormFeedback invalid>{errors.field_type_id}</CFormFeedback>}
            </div>
          </CCol>
        </CRow>

        <CRow className="g-3 mt-1">
          <CCol md={3}>
            <CFormLabel htmlFor="attribute-row">Row</CFormLabel>
            <CFormInput
              type="number"
              id="attribute-row"
              value={formData.row ?? 0}
              min={0}
              onChange={(e) => handleChange('row', Number(e.target.value))}
              disabled={loading}
            />
          </CCol>
          <CCol md={3}>
            <CFormLabel htmlFor="attribute-order">Order</CFormLabel>
            <CFormInput
              type="number"
              id="attribute-order"
              value={formData.order ?? 0}
              min={0}
              onChange={(e) => handleChange('order', Number(e.target.value))}
              disabled={loading}
            />
            </CCol>
            <CCol md={3}>
              <CFormSwitch
                id="integral-switch"
                label="System Integral"
                checked={Boolean(formData.integral)}
                onChange={(e) => handleToggle('integral', e.target.checked)}
                disabled={loading}
                className="attribute-toggle"
              />
            </CCol>
            <CCol md={3}>
              <CFormSwitch
                id="required-switch"
                label="Required"
                checked={Boolean(formData.required)}
                onChange={(e) => handleToggle('required', e.target.checked)}
                disabled={loading}
                className="attribute-toggle"
              />
            </CCol>
          </CRow>

          <div className="attribute-active-row">
            <CFormSwitch
              id="status-switch"
              label={Number((formData.status as any)?.id ?? formData.status ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID ? 'Active' : 'Disabled'}
              checked={Number((formData.status as any)?.id ?? formData.status ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID}
              onChange={(e) =>
                handleChange('status', {
                  id: e.target.checked ? ACTIVE_STATUS_ID : 0,
                  name: e.target.checked ? 'ACTIVE' : 'DISABLED',
                })
              }
              disabled={loading}
              className="attribute-toggle"
            />
          </div>

          {renderItems()}
        </CForm>
      </CCardBody>
      <CCardFooter className="attribute-form-footer d-flex justify-content-between align-items-center">
        <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
          <CIcon icon={cilArrowLeft} className="me-2" />
          Back
        </CButton>
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
            <CIcon icon={cilX} className="me-2" />
            Cancel
          </CButton>
          <CButton color="success" className="text-white" onClick={handleSubmit} disabled={loading}>
            <CIcon icon={cilSave} className="me-2" />
            Save Attribute
          </CButton>
        </div>
      </CCardFooter>
    </CCard>
  )
}

export default AttributeForm
