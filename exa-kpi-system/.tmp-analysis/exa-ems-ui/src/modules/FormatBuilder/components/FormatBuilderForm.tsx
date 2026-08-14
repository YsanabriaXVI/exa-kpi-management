import React, { useEffect, useState } from 'react'
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
  CFormSwitch,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilList, cilSave, cilX } from '@coreui/icons'
import { ACTIVE_STATUS_ID } from '../constants'
import type { FormatBuilder, FormatStatus } from '../types'

interface FormatBuilderFormProps {
  initialValues: FormatBuilder | null
  loading: boolean
  error?: string | null
  isEdit: boolean
  onSubmit: (format: FormatBuilder) => void
  onCancel: () => void
  attributeOptions: {
    driver: { value: any; label: string }[]
    truck: { value: any; label: string }[]
    chassis: { value: any; label: string }[]
    genset: { value: any; label: string }[]
  }
  tripOptions: {
    Trip: { value: any; label: string }[]
    Client: { value: any; label: string }[]
    Subdivision: { value: any; label: string }[]
    Header: { value: any; label: string }[]
    Footer: { value: any; label: string }[]
  }
}

const FormatBuilderForm: React.FC<FormatBuilderFormProps> = ({
  initialValues,
  loading,
  error,
  isEdit,
  onSubmit,
  onCancel,
  attributeOptions,
  tripOptions,
}) => {
  const dropdownStyle: React.CSSProperties = { maxHeight: 260, overflowY: 'auto' }
  const [formData, setFormData] = useState<FormatBuilder>(
    initialValues || {
      name: '',
      type: 'Invoice',
      tax_rate: 0,
      currency: 0,
      note: 0,
      othercharges: 0,
      totalkm: 0,
      duedays: 0,
      font: 50,
      row: 1,
      status: { id: ACTIVE_STATUS_ID, name: 'ACTIVE' },
      items: {},
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues)
    }
  }, [initialValues])

  const handleChange = (field: keyof FormatBuilder, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleStatusToggle = (checked: boolean) => {
    const status: FormatStatus = { id: checked ? ACTIVE_STATUS_ID : 0, name: checked ? 'ACTIVE' : 'DISABLED' }
    handleChange('status', status)
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!formData.name || formData.name.trim() === '') {
      nextErrors.name = 'Name is required'
    }
    if (!formData.type || formData.type.trim() === '') {
      nextErrors.type = 'Type is required'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const statusId =
      typeof formData.status === 'object' ? formData.status.id : Number(formData.status || ACTIVE_STATUS_ID)
    onSubmit({
      ...formData,
      status: {
        id: statusId,
        name: statusId === ACTIVE_STATUS_ID ? 'ACTIVE' : 'DISABLED',
      },
    })
  }

  const getItemValues = (key: string) => {
    const items = (formData.items as any) || {}
    const value = items[key]
    if (Array.isArray(value)) return value
    if (value == null) return []
    return [value]
  }

  const handleItemsChange = (key: string, values: any[]) => {
    setFormData((prev) => ({
      ...prev,
      items: {
        ...(prev.items || {}),
        [key]: values,
      },
    }))
  }

  const typeOptions = [
    { value: 'Invoice', label: 'Invoice' },
    { value: 'Statment', label: 'Statment' },
    { value: 'StatusSummaryReport', label: 'Status Summary Report' },
  ]

  const pdfSizeOptions = Array.from({ length: 51 }, (_, idx) => {
    const val = 50 + idx
    return { value: val, label: `${val}%` }
  })

  const rowOptions = Array.from({ length: 26 }, (_, idx) => ({ value: idx, label: `${idx}` }))

  return (
    <CCard className="formatbuilder-form-card">
      <CCardHeader className="attribute-card-header">
        <div>
          <div className="attribute-card-title">Format Builder Details</div>
          <div className="attribute-card-subtitle text-body-secondary">
            Configure invoice fields plus attribute and trip data sections.
          </div>
        </div>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger">{error}</CAlert>}
        <CForm>
          <CCard className="mb-3 invoice-card">
            <CCardHeader>
              <CIcon icon={cilList} className="me-2" />
              <strong>Invoice Fields</strong>
              <div className="text-body-secondary small">
                Configure type, taxes, currency, size, rows, and notes.
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CMultiSelect
                    label="Type *"
                    value={formData.type ? [formData.type] : []}
                    options={typeOptions}
                    onChange={(vals) => handleChange('type', vals[0]?.value ?? '')}
                    invalid={Boolean(errors.type)}
                    feedbackInvalid={errors.type}
                    disabled={loading}
                    multiple={false}
                    dropdownStyle={dropdownStyle}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormInput
                    label="Name *"
                    placeholder="Format name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    invalid={Boolean(errors.name)}
                    disabled={loading}
                  />
                  {errors.name && <CFormFeedback invalid>{errors.name}</CFormFeedback>}
                </CCol>
              </CRow>

              <CRow className="g-3 mt-1">
                <CCol md={4}>
                  <CFormInput
                    type="number"
                    label="Tax % (Optional)"
                    value={formData.tax_rate ?? 0}
                    onChange={(e) => handleChange('tax_rate', Number(e.target.value))}
                    disabled={loading}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormInput
                    label="Currency (Optional)"
                    value={formData.currency ?? ''}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    disabled={loading}
                  />
                </CCol>
                <CCol md={4}>
                  <CMultiSelect
                    label="PDF Size %"
                    value={[formData.font ?? 50]}
                    options={pdfSizeOptions}
                    onChange={(vals) => handleChange('font', Number(vals[0]?.value ?? 50))}
                    disabled={loading}
                    multiple={false}
                    dropdownStyle={dropdownStyle}
                  />
                </CCol>
              </CRow>

              <CRow className="g-3 mt-1">
                <CCol md={4}>
                  <CMultiSelect
                    label="Content Rows"
                    value={[formData.row ?? 1]}
                    options={rowOptions}
                    onChange={(vals) => handleChange('row', vals[0] ? Number(vals[0].value) : 1)}
                    disabled={loading}
                    multiple={false}
                    dropdownStyle={dropdownStyle}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormInput
                    label="Due Days"
                    type="number"
                    value={formData.duedays ?? 0}
                    onChange={(e) => handleChange('duedays', Number(e.target.value))}
                    disabled={loading}
                  />
                </CCol>
                <CCol md={4} className="d-flex align-items-center">
                  <CFormSwitch
                    id="format-note"
                    label="Display Notes?"
                    checked={Boolean(formData.note)}
                    onChange={(e) => handleChange('note', e.target.checked ? 1 : 0)}
                    disabled={loading}
                    className="attribute-toggle mb-0"
                  />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          <CRow className="g-3 mt-1">
            <CCol xl={6} lg={12}>
              <CCard>
                <CCardHeader>
                  <CIcon icon={cilList} className="me-2" />
                  <strong>Attributes Data</strong>
                </CCardHeader>
                <CCardBody>
                  <CRow className="g-3">
                    <CCol md={12}>
                      <CMultiSelect
                        options={attributeOptions.driver}
                        selectionType="tags"
                        placeholder="Select driver attributes"
                        label="Driver"
                        value={getItemValues('9')}
                        onChange={(vals) => handleItemsChange('9', vals.map((v) => v.value))}
                        disabled={loading}
                        dropdownStyle={dropdownStyle}
                      />
                    </CCol>
                    <CCol md={12}>
                      <CMultiSelect
                        options={attributeOptions.truck}
                        selectionType="tags"
                        placeholder="Select truck attributes"
                        label="Truck"
                        value={getItemValues('3')}
                        onChange={(vals) => handleItemsChange('3', vals.map((v) => v.value))}
                        disabled={loading}
                        dropdownStyle={dropdownStyle}
                      />
                    </CCol>
                    <CCol md={12}>
                      <CMultiSelect
                        options={attributeOptions.chassis}
                        selectionType="tags"
                        placeholder="Select chassis attributes"
                        label="Chassis"
                        value={getItemValues('24')}
                        onChange={(vals) => handleItemsChange('24', vals.map((v) => v.value))}
                        disabled={loading}
                        dropdownStyle={dropdownStyle}
                      />
                    </CCol>
                    <CCol md={12}>
                      <CMultiSelect
                        options={attributeOptions.genset}
                        selectionType="tags"
                        placeholder="Select genset attributes"
                        label="Genset"
                        value={getItemValues('25')}
                        onChange={(vals) => handleItemsChange('25', vals.map((v) => v.value))}
                        disabled={loading}
                        dropdownStyle={dropdownStyle}
                      />
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            </CCol>

            <CCol xl={6} lg={12}>
              <CCard>
                <CCardHeader>
                  <CIcon icon={cilList} className="me-2" />
                  <strong>Trip Data</strong>
                </CCardHeader>
                <CCardBody>
                  <CRow className="g-3">
                    <CCol md={12}>
                      <CMultiSelect
                        options={tripOptions.Trip}
                        selectionType="tags"
                        placeholder="Select trip data"
                        label="Trip"
                        value={getItemValues('Trip')}
                        onChange={(vals) => handleItemsChange('Trip', vals.map((v) => v.value))}
                        disabled={loading}
                        dropdownStyle={dropdownStyle}
                      />
                    </CCol>
                    <CCol md={12}>
                      <CMultiSelect
                        options={tripOptions.Client}
                        selectionType="tags"
                        placeholder="Select clients"
                        label="Client"
                        value={getItemValues('Client')}
                        onChange={(vals) => handleItemsChange('Client', vals.map((v) => v.value))}
                        disabled={loading}
                        dropdownStyle={dropdownStyle}
                      />
                    </CCol>
                    <CCol md={12}>
                      <CMultiSelect
                        options={tripOptions.Subdivision}
                        selectionType="tags"
                        placeholder="Select subdivisions"
                        label="Subdivision"
                        value={getItemValues('Subdivision')}
                        onChange={(vals) => handleItemsChange('Subdivision', vals.map((v) => v.value))}
                        disabled={loading}
                        dropdownStyle={dropdownStyle}
                      />
                    </CCol>
                    <CCol md={12}>
                      <CMultiSelect
                        options={tripOptions.Header}
                        selectionType="tags"
                        placeholder="Select header fields"
                        label="Header"
                        value={getItemValues('Header')}
                        onChange={(vals) => handleItemsChange('Header', vals.map((v) => v.value))}
                        disabled={loading}
                        dropdownStyle={dropdownStyle}
                      />
                    </CCol>
                    <CCol md={12}>
                      <CMultiSelect
                        options={tripOptions.Footer}
                        selectionType="tags"
                        placeholder="Select footer fields"
                        label="Footer"
                        value={getItemValues('Footer')}
                        onChange={(vals) => handleItemsChange('Footer', vals.map((v) => v.value))}
                        disabled={loading}
                        dropdownStyle={dropdownStyle}
                      />
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
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
            {isEdit ? 'Save Changes' : 'Save Format'}
          </CButton>
        </div>
      </CCardFooter>
    </CCard>
  )
}

export default FormatBuilderForm
