import React, { useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDatePicker,
  CForm,
  CFormInput,
  CFormLabel,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave } from '@coreui/icons'
import { Driver } from '../types'

interface DriverFormProps {
  initialValues: Driver
  onSubmit: (values: Driver) => void
  loading?: boolean
  attributeOptions?: Record<string, { value: string | number; label: string }[]>
  subdivisionLabels?: Record<string | number, string>
  truckLabels?: Record<string | number, string>
  readOnly?: boolean
}

const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20
const dropdownScrollStyle: React.CSSProperties = { maxHeight: 260, overflowY: 'auto' }

const DriverForm: React.FC<DriverFormProps> = ({
  initialValues,
  onSubmit,
  loading,
  attributeOptions = {},
  subdivisionLabels = {},
  truckLabels = {},
  readOnly = false,
}) => {
  const [formData, setFormData] = React.useState<Driver>(initialValues)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  useEffect(() => {
    setFormData(initialValues)
  }, [initialValues])

  const requiredFields: Array<keyof Driver> = ['first_name', 'last_name']

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    let firstErrorField: string | null = null
    
    requiredFields.forEach((field) => {
      const value = formData[field]
      if (value === undefined || value === null || String(value).trim() === '') {
        const label =
          field === 'first_name'
            ? 'First Name'
            : field === 'last_name'
              ? 'Last Name'
              : field
        nextErrors[field as string] = `${label} is required`
        if (!firstErrorField) {
            firstErrorField = field as string
        }
      }
    })
    setErrors(nextErrors)

    if (firstErrorField) {
        const element = document.getElementById(firstErrorField)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.focus()
        }
    }

    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (field: keyof Driver, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field as string]
        return next
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(formData)
  }

  const getSelectOptions = (field: keyof Driver) => {
    return attributeOptions[String(field)] || []
  }

  const getLabelOverride = (field: keyof Driver, valueKey: string) => {
    if (field === 'subdivision') {
      return (subdivisionLabels as any)[valueKey]
    }
    if (field === 'truck_assigned') {
      return (truckLabels as any)[valueKey]
    }
    return undefined
  }

  const ensureOptionIncludesValue = (
    field: keyof Driver,
    options: { value: string | number; label: string }[],
    value: any
  ) => {
    if (value === undefined || value === null || value === '') {
      return options
    }
    const valueKey = String(value)
    const exists = options.some((opt) => String(opt.value) === valueKey)
    if (exists) {
      return options
    }
    const override = getLabelOverride(field, valueKey)
    return [{ value, label: override || String(value) }, ...options]
  }

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const DATE_FIELDS: (keyof Driver)[] = ['hiring_date', 'generic_value1', 'generic_value2', 'generic_value3']

  const parseDateValue = (value: any): Date | undefined => {
    if (!value && value !== 0) return undefined
    if (value instanceof Date) return value
    const asNumber = typeof value === 'number' ? value : Number(value)
    if (!Number.isNaN(asNumber) && `${value}`.trim() !== '') {
      const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber
      const dateFromNumber = new Date(ms)
      if (!Number.isNaN(dateFromNumber.getTime())) {
        return dateFromNumber
      }
    }
    const str = String(value).trim()
    if (!str) return undefined
    const ddMmmYY = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/.exec(str)
    if (ddMmmYY) {
      const [, dayStr, monthStr, yearStr] = ddMmmYY
      const monthIndex = MONTH_LABELS.findIndex((label) => label.toLowerCase() === monthStr.toLowerCase())
      if (monthIndex >= 0) {
        const fullYear = 2000 + Number(yearStr)
        const day = Number(dayStr)
        const parsed = new Date(fullYear, monthIndex, day)
        if (!Number.isNaN(parsed.getTime())) {
          return parsed
        }
      }
    }
    const parsed = new Date(str)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  const formatDateValue = (value?: Date | null) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const day = date.getDate().toString().padStart(2, '0')
    const month = MONTH_LABELS[date.getMonth()] || ''
    const year = (date.getFullYear() % 100).toString().padStart(2, '0')
    return `${day}-${month}-${year}`
  }

  const renderDateField = (field: keyof Driver, placeholder?: string) => {
    const parsedDate = parseDateValue(formData[field])
    return (
      <CDatePicker
        locale="en-US"
        date={parsedDate}
        inputReadOnly
        disabled={loading || readOnly}
        placeholder={placeholder || 'Select a date'}
        inputDateFormat={(value) => {
          const mapped = parseDateValue(value)
          return formatDateValue(mapped) || ''
        }}
        onDateChange={(date: Date | string | null) => {
          if (!date) {
            handleChange(field, '')
            return
          }
          const nextValue =
            date instanceof Date
              ? formatDateValue(date)
              : formatDateValue(new Date(date))
          handleChange(field, nextValue)
        }}
        id={field}
      />
    )
  }

  const renderField = (
    field: keyof Driver,
    required = false,
    placeholder?: string
  ) => {
    if (DATE_FIELDS.includes(field)) {
      return renderDateField(field, placeholder)
    }
    const options = getSelectOptions(field)
    if (options.length > 0) {
      const safeOptions = ensureOptionIncludesValue(field, options, formData[field])
      const normalizedOptions = safeOptions.map((opt) => {
        const valueKey = String(opt.value)
        const labelOverride = getLabelOverride(field, valueKey)
        return {
          ...opt,
          value: valueKey,
          label: labelOverride || opt.label,
        }
      })
      const currentValue =
        formData[field] !== undefined && formData[field] !== null
          ? String(formData[field])
          : ''
      return (
        <>
        <CMultiSelect
          key={`${String(field)}-${currentValue}`}
          id={field}
          options={normalizedOptions}
          value={currentValue}
          disabled={loading || readOnly}
          onChange={(selected: any) => {
            const option = Array.isArray(selected) ? selected[0] : selected
            handleChange(field, option?.value ?? '')
          }}
          multiple={false}
          placeholder={placeholder || 'Select an option'}
          clearSearchOnSelect
          required={required}
          dropdownStyle={dropdownScrollStyle}
          virtualScroller={shouldVirtualScroll(normalizedOptions)}
          invalid={required && Boolean(errors[field as string])}
          className={required && errors[field as string] ? 'is-invalid' : undefined}
        />
        {required && errors[field as string] && (
            <div className="invalid-feedback d-block">{errors[field as string]}</div>
        )}
      </>
      )
    }
    return (
      <>
      <CFormInput
        value={formData[field] ?? ''}
        onChange={(e) => handleChange(field, e.target.value)}
        disabled={loading || readOnly}
        required={required}
        placeholder={placeholder}
        invalid={required && Boolean(errors[field as string])}
        className={required && errors[field as string] ? 'is-invalid' : undefined}
        id={field}
      />
      {required && errors[field as string] && (
        <div className="invalid-feedback d-block">{errors[field as string]}</div>
      )}
      </>
    )
  }

  return (
    <CForm onSubmit={handleSubmit} className="driver-form" noValidate>
      <CRow className="g-4">
        <CCol xs={12}>
          <CCard className="driver-section-card shadow-sm border-0">
            <CCardHeader className="driver-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Identity</div>
                <div className="section-title">Driver Details</div>
                <small className="text-body-secondary">Names, subdivision, and status.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>First Name *</CFormLabel>
                  {renderField('first_name', true)}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Last Name *</CFormLabel>
                  {renderField('last_name', true)}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Subdivision</CFormLabel>
                  {renderField('subdivision')}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Driver Status</CFormLabel>
                  {renderField('driver_status')}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Internal Identification</CFormLabel>
                  {renderField('internal_identification')}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Address</CFormLabel>
                  {renderField('address')}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="driver-section-card shadow-sm border-0">
            <CCardHeader className="driver-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Compliance</div>
                <div className="section-title">Records & Licenses</div>
                <small className="text-body-secondary">Document numbers and expiration dates.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Driver&apos;s License</CFormLabel>
                  {renderField('generic_name1', false, 'License ID')}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Driver&apos;s License Exp. Date</CFormLabel>
                  {renderField('generic_value1', false, 'e.g. 04-Nov-25')}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Police Records</CFormLabel>
                  {renderField('generic_name2')}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Police Records Exp. Date</CFormLabel>
                  {renderField('generic_value2', false, 'e.g. 27-Oct-26')}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Criminal Records</CFormLabel>
                  {renderField('generic_name3')}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Criminal Records Exp. Date</CFormLabel>
                  {renderField('generic_value3', false, 'e.g. 17-Apr-26')}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="driver-section-card shadow-sm border-0">
            <CCardHeader className="driver-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Employment</div>
                <div className="section-title">Experience & Assignment</div>
                <small className="text-body-secondary">Tenure, hiring, and truck allocation.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel>Years of Experience</CFormLabel>
                  {renderField('years_of_experience')}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Hiring Date</CFormLabel>
                  {renderField('hiring_date', false, 'e.g. 24-Jan-21')}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Truck Assigned</CFormLabel>
                  {renderField('truck_assigned')}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>RTN</CFormLabel>
                  {renderField('rtn')}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="driver-section-card shadow-sm border-0">
            <CCardHeader className="driver-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Contact</div>
                <div className="section-title">Phones & Reachability</div>
                <small className="text-body-secondary">Regional contact numbers.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={3}>
                  <CFormLabel>Telephone 1 Honduras</CFormLabel>
                  {renderField('telephone_1_honduras')}
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Telephone 2 Nicaragua</CFormLabel>
                  {renderField('telephone_2_nicaragua')}
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Telephone 3 El Salvador</CFormLabel>
                  {renderField('telephone_3_el_salvador')}
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Telephone 4 Guatemala</CFormLabel>
                  {renderField('telephone_4_guatemala')}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="driver-section-card shadow-sm border-0">
            <CCardHeader className="driver-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Compliance</div>
                <div className="section-title">Codes & Notes</div>
                <small className="text-body-secondary">VUCEH and other compliance references.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>VUCEH Comments</CFormLabel>
                  {renderField('vuceh_coments')}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>VUCEH Code</CFormLabel>
                  {renderField('vuceh_code')}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} className="mb-4">
          <div className="driver-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2">
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
                    Save Driver
                  </CButton>
                )}
            </div>
          </div>
        </CCol>
      </CRow>
    </CForm>
  )
}

export default DriverForm
