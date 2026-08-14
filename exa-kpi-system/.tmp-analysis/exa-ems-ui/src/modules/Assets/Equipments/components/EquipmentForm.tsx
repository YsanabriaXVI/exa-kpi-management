import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CForm, CFormInput, CFormLabel, CMultiSelect, CRow, CSpinner } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave } from '@coreui/icons'

type AttributeField = {
  attribute_id: number
  name: string
  required?: number | boolean
  attribute_items?: { attribute_item_id: number | string; name: string }[]
  items?: { attribute_item_id: number | string; name: string }[]
  field_type_id?: number
}

interface EquipmentFormProps {
  attributes: AttributeField[]
  values: Record<string, any>
  sections?: { title: string; description?: string; attrIds: string[] }[]
  loading?: boolean
  attributesLoading?: boolean
  extrasBeforeActions?: React.ReactNode
  errors?: Record<string, string>
  onChange: (values: Record<string, any>) => void
  onSubmit: (values: Record<string, any>) => void
  readOnly?: boolean
}

const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20
const dropdownScrollStyle: React.CSSProperties = { maxHeight: 260, overflowY: 'auto' }

const EquipmentForm: React.FC<EquipmentFormProps> = ({
  attributes,
  values,
  sections = [],
  loading,
  attributesLoading,
  extrasBeforeActions,
  errors = {},
  onChange,
  onSubmit,
  readOnly = false,
}) => {
  const handleAttributeChange = (attributeId: string, value: any) => {
    onChange({
      ...values,
      attributes: { ...(values.attributes || {}), [attributeId]: value },
    })
  }

  const renderAttributeField = (attr: AttributeField) => {
    const attrId = String(attr.attribute_id)
    const value = values.attributes?.[attrId] ?? ''
    const items = attr.attribute_items || attr.items || (attr as any).attributeItems || (attr as any).options || []
    const fieldType = attr.field_type_id
    const isSelect = fieldType === 1
    const required = Boolean(attr.required)
    const error = errors[attrId]

    if (isSelect) {
      return (
        <CCol md={6} key={attrId}>
          <CFormLabel>
            {attr.name} {required ? '*' : ''}
          </CFormLabel>
          <CMultiSelect
            options={items.map((item) => {
              const optionValue =
                (item as any).attribute_item_id ??
                (item as any).id ??
                (item as any).value ??
                (item as any).sizeEquipmentId
              const optionLabel = (item as any).name ?? (item as any).label ?? String(optionValue ?? '')
              return { value: String(optionValue ?? ''), label: optionLabel }
            })}
            value={value ? String(value) : ''}
            onChange={(selected: any) => {
              const option = Array.isArray(selected) ? selected[0] : selected
              handleAttributeChange(attrId, option?.value ?? '')
            }}
            multiple={false}
            selectionType="text"
            placeholder={`Select ${attr.name}`}
            clearSearchOnSelect
            required={required}
            disabled={loading || readOnly}
            dropdownStyle={dropdownScrollStyle}
            virtualScroller={shouldVirtualScroll(items)}
            invalid={!!error}
            feedbackInvalid={error}
            className={error ? 'is-invalid' : ''}
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
          onChange={(e) => handleAttributeChange(attrId, e.target.value)}
          required={required}
          placeholder={attr.name}
          disabled={loading || readOnly}
          invalid={!!error}
          feedbackInvalid={error}
          className={error ? 'is-invalid' : ''}
        />
      </CCol>
    )
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit(values)
  }

  const renderSection = (sectionAttrs: AttributeField[], title: string, description?: string) => (
    <CCol xs={12} key={title}>
      <CCard className="truck-section-card shadow-sm border-0">
        <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
          <div>
            <div className="section-kicker">Details</div>
            <div className="section-title">{title}</div>
            {description ? <small className="text-body-secondary">{description}</small> : null}
          </div>
        </CCardHeader>
        <CCardBody>
          {attributesLoading ? (
            <div className="d-flex align-items-center gap-2">
              <CSpinner size="sm" /> <span>Loading fields…</span>
            </div>
          ) : (
            <CRow className="g-3">{sectionAttrs.map((attr) => renderAttributeField(attr))}</CRow>
          )}
        </CCardBody>
      </CCard>
    </CCol>
  )

  const sectioned = sections && sections.length
    ? sections.map((section) => {
        const ids = new Set(section.attrIds.map(String))
        const sectionAttrs = attributes.filter((attr) => ids.has(String(attr.attribute_id)))
        return { ...section, attrs: sectionAttrs }
      }).filter((s) => s.attrs.length)
    : []

  const remainingAttrs = sectioned.length
    ? attributes.filter((attr) => !sectioned.some((s) => s.attrIds.includes(String(attr.attribute_id))))
    : attributes

  return (
    <CForm
      onSubmit={handleSubmit}
      className="driver-form"
      noValidate
      validated={Object.keys(errors).length > 0}
    >
      <CRow className="g-4">
        {sectioned.length
          ? sectioned.map((section) => renderSection(section.attrs, section.title, section.description))
          : renderSection(attributes, 'Equipment Details', 'Matches the styling and behavior of drivers/trucks.')}

        {remainingAttrs.length > 0 && sectioned.length ? renderSection(remainingAttrs, 'Additional Fields') : null}

        {extrasBeforeActions}

        <CCol xs={12}>
          <div className="driver-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 pb-2">
            <CButton color="secondary" variant="ghost" type="button" onClick={() => window.history.back()} disabled={loading}>
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back
            </CButton>
            <div className="d-flex gap-2">
              {!readOnly && (
                <CButton color="primary" type="submit" disabled={loading} className="text-white px-4">
                  <CIcon icon={cilSave} className="me-2" />
                  Save
                </CButton>
              )}
            </div>
          </div>
        </CCol>
      </CRow>
    </CForm>
  )
}

export default EquipmentForm
