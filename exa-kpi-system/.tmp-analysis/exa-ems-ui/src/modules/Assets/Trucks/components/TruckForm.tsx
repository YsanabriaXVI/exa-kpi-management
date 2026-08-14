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
  CFormFeedback,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilArrowLeft } from '@coreui/icons'
import { Truck } from '../types'

type SelectOption = { value: string | number; label: string; subdivision_id?: number | null }

interface TruckFormProps {
  initialValues: Truck
  onSubmit: (values: Truck) => void
  loading?: boolean
  attributeOptions?: Record<string, SelectOption[]>
  driverLabels?: Record<string | number, string>
  subdivisionLabels?: Record<string | number, string>
  clientLabels?: Record<string | number, string>
  onFetchOptions?: (field: string) => void
  readOnly?: boolean
}

const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20
const dropdownScrollStyle: React.CSSProperties = { maxHeight: 260, overflowY: 'auto' }

const TruckForm: React.FC<TruckFormProps> = ({
  initialValues,
  onSubmit,
  loading,
  attributeOptions = {},
  driverLabels = {},
  subdivisionLabels = {},
  clientLabels = {},
  onFetchOptions,
  readOnly = false,
}) => {
  const [formData, setFormData] = React.useState<Truck>(initialValues)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  useEffect(() => {
    setFormData(initialValues)
  }, [initialValues])

  useEffect(() => {
    if (attributeOptions.driver_assigned) {
      console.log(
        '🔍 [TruckForm] driver_assigned options:',
        attributeOptions.driver_assigned.slice(0, 5),
        'current value:',
        formData.driver_assigned,
        'label map lookup:',
        driverLabels ? driverLabels[String(formData.driver_assigned ?? '')] : undefined
      )
    }
  }, [attributeOptions.driver_assigned, formData.driver_assigned, driverLabels])

  const handleChange = (field: keyof Truck, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      // When subdivision changes, clear a selected internal supplier that no longer
      // belongs to the new subdivision (unmapped/legacy values are kept).
      if (field === 'subdivision' && prev.internal_supplier) {
        const supplierOptions = attributeOptions['internal_supplier'] || []
        const match = supplierOptions.find((opt) => String(opt.value) === String(prev.internal_supplier))
        const belongs =
          !match || match.subdivision_id == null || String(match.subdivision_id) === String(value)
        if (!belongs) next.internal_supplier = ''
      }
      return next
    })
  }

  const requiredFields: Array<keyof Truck> = [
    'truck_plate',
    'brand',
    'model',
    'year',
    'generic_name1',
    'generic_name2',
    'generic_name3',
    'generic_value1',
    'generic_value2',
    'generic_value3',
    'truck_status',
    'color',
    'fuel_type',
    'initial_miles',
    'customs_code',
    'chassis',
    'engine_no',
    'name_on_registration',
    'name_on_code',
    'subdivision',
    'rtn',
    'sap_code',
    'archive_number',
    'hiring_date',
    'pech_constancy',
  ]

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    requiredFields.forEach((field) => {
      const value = formData[field]
      if (value === undefined || value === null || String(value).trim() === '') {
        const label =
          field === 'truck_plate'
            ? 'Truck Plate'
            : field === 'brand'
              ? 'Brand'
              : field === 'model'
                ? 'Model'
                : field === 'year'
                  ? 'Year'
                  : field === 'generic_name1'
                    ? 'Operational Permit'
                    : field === 'generic_name2'
                      ? 'Exploitation Permit'
                      : field === 'generic_name3'
                        ? 'Registration Permit'
                        : field === 'generic_value1'
                          ? 'Operational Permit Exp. Date'
                          : field === 'generic_value2'
                            ? 'Exploitation Permit Exp. Date'
                            : field === 'generic_value3'
                              ? 'Registration Permit Exp. Date'
                              : field === 'color'
                                ? 'Color'
                                : field === 'fuel_type'
                                  ? 'Fuel Type'
                                  : field === 'initial_miles'
                                    ? 'Initial Miles'
                                    : field === 'customs_code'
                                      ? 'Customs Code'
                                      : field === 'chassis'
                                        ? 'Chassis'
                                      : field === 'engine_no'
                                        ? 'Engine No'
                                      : field === 'name_on_registration'
                                        ? 'Name on Registration'
                                      : field === 'name_on_code'
                                        ? 'Name on Code'
                                      : field === 'subdivision'
                                        ? 'Subdivision'
                                      : field === 'rtn'
                                        ? 'RTN'
                                      : field === 'sap_code'
                                        ? 'SAP Code'
                                      : field === 'archive_number'
                                        ? 'Archive Number'
                                      : field === 'hiring_date'
                                        ? 'Hiring Date'
                                      : field === 'pech_constancy'
                                        ? 'PECH Constancy'
                                      : field
        nextErrors[field as string] = `Please enter a ${label}!`
      }
    })
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
        const firstErrorField = requiredFields.find(field => {
             const value = formData[field]
             return value === undefined || value === null || String(value).trim() === ''
        })
        if (firstErrorField) {
            const element = document.getElementById(firstErrorField)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                element.focus()
            }
        }
        return
    }
    onSubmit(formData)
  }

  const getSelectOptions = (field: keyof Truck): SelectOption[] => {
    const options = attributeOptions[String(field)] || []
    // Internal supplier options are scoped to the truck's current subdivision.
    // Show matching + unmapped (legacy) items; the saved value is re-added below.
    if (field === 'internal_supplier') {
      const currentSubdivision =
        formData.subdivision !== undefined && formData.subdivision !== null && formData.subdivision !== ''
          ? String(formData.subdivision)
          : ''
      if (!currentSubdivision) return options
      return options.filter(
        (opt) => opt.subdivision_id == null || String(opt.subdivision_id) === currentSubdivision,
      )
    }
    return options
  }

  const ensureOptionIncludesValue = (
    field: keyof Truck,
    options: SelectOption[],
    value: any
  ) => {
    if (!value && value !== 0) return options
    const valueKey = String(value)
    const exists = options.some((opt) => String(opt.value) === valueKey)
    if (exists) return options
    const labelOverride =
      (field === 'driver_assigned' && (driverLabels as any)[valueKey]) ||
      (field === 'subdivision' && (subdivisionLabels as any)[valueKey]) ||
      (field === 'rtn' && (clientLabels as any)[valueKey])
    const extraLabel = labelOverride || String(value)
    return [{ value, label: extraLabel }, ...options]
  }

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

  const renderDateField = (field: keyof Truck, placeholder?: string, required = false) => {
    const parsedDate = parseDateValue(formData[field])
    return (
      <CDatePicker
        locale="en-US"
        date={parsedDate}
        inputReadOnly
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
        className={required && errors[field as string] ? 'is-invalid' : undefined}
        id={String(field)}
        disabled={readOnly}
      />
    )
  }

  const renderField = (
    field: keyof Truck,
    required = false,
    placeholder?: string
  ) => {
    const options = getSelectOptions(field)
    // Fields that should trigger lazy load
    const isLazyField = field === 'driver_assigned' || field === 'subdivision' || field === 'rtn'
    // internal_supplier options are subdivision-filtered and may be empty for a given
    // subdivision — keep rendering the select rather than falling back to a text input.
    const forceSelect = field === 'internal_supplier' && (attributeOptions['internal_supplier']?.length ?? 0) > 0
    
    // Even if options are empty, we might need to render the select to allow triggering the fetch
    // But we need to distinguish between "no options because not fetched" and "no options because none exist"
    // For now, if it's a lazy field, we always render the select so user can click it
    
    if (field === 'hiring_date' || field === 'generic_value1' || field === 'generic_value2' || field === 'generic_value3') {
      return (
        <>
          {renderDateField(field, placeholder, required)}
           {required && errors[field as string] && (
            <CFormFeedback invalid style={{ display: 'block' }}>{errors[field as string]}</CFormFeedback>
          )}
        </>
      )
    }
    
    if (options.length > 0 || isLazyField || forceSelect) {
      const safeOptions = ensureOptionIncludesValue(field, options, formData[field])
      const normalizedOptions = safeOptions.map((opt) => {
        const valueKey = String(opt.value)
        const labelOverride =
          (field === 'driver_assigned' && (driverLabels as any)[valueKey]) ||
          (field === 'subdivision' && (subdivisionLabels as any)[valueKey]) ||
          (field === 'rtn' && (clientLabels as any)[valueKey])
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
      const selectPlaceholder = placeholder || 'Select an option'
      return (
        <div onFocus={() => isLazyField && onFetchOptions && onFetchOptions(field)} onClick={() => isLazyField && onFetchOptions && onFetchOptions(field)}>
          <CMultiSelect
            key={`${String(field)}-${currentValue}`}
            options={normalizedOptions}
            value={currentValue}
            onChange={(selected: any) => {
              const option = Array.isArray(selected) ? selected[0] : selected
              handleChange(field, option?.value ?? '')
            }}
            multiple={false}
            placeholder={selectPlaceholder}
            clearSearchOnSelect
            required={required}
            dropdownStyle={dropdownScrollStyle}
            virtualScroller={shouldVirtualScroll(normalizedOptions)}
            invalid={required && Boolean(errors[field as string])}
            className={required && errors[field as string] ? 'is-invalid' : undefined}
            id={String(field)}
            disabled={readOnly}
          />
          {required && errors[field as string] && (
            <CFormFeedback invalid>{errors[field as string]}</CFormFeedback>
          )}
        </div>
      )
    }
    return (
      <>
        <CFormInput
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          required={required}
          invalid={required && Boolean(errors[field as string])}
          className={required && errors[field as string] ? 'is-invalid' : undefined}
          id={String(field)}
          placeholder={placeholder}
          disabled={readOnly}
        />
        {required && errors[field as string] && (
          <CFormFeedback invalid>{errors[field as string]}</CFormFeedback>
        )}
      </>
    )
  }

  return (
    <CForm onSubmit={handleSubmit} className="truck-form" noValidate>
      <CRow className="g-4">
        <CCol xs={12}>
          <CCard className="truck-section-card shadow-sm border-0">
            <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Identity</div>
                <div className="section-title">Truck Details</div>
                <small className="text-body-secondary">Plates, make and ownership details.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Truck Plate <span className="text-danger">*</span></CFormLabel>
                  {renderField('truck_plate', true)}
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Brand <span className="text-danger">*</span></CFormLabel>
                  {renderField('brand', true)}
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Color <span className="text-danger">*</span></CFormLabel>
                   {renderField('color', true)}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Model <span className="text-danger">*</span></CFormLabel>
                  {renderField('model', true)}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Subdivision <span className="text-danger">*</span></CFormLabel>
                  {renderField('subdivision', true)}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Year <span className="text-danger">*</span></CFormLabel>
                  {renderField('year', true)}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Initial Miles <span className="text-danger">*</span></CFormLabel>
                  <CFormInput
                    value={formData.initial_miles || ''}
                    onChange={(e) => handleChange('initial_miles', e.target.value)}
                    required
                    invalid={Boolean(errors.initial_miles)}
                    className={errors.initial_miles ? 'is-invalid' : undefined}
                    id="initial_miles"
                    disabled={readOnly}
                  />
                  {errors.initial_miles && <CFormFeedback invalid>{errors.initial_miles}</CFormFeedback>}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Customs Code <span className="text-danger">*</span></CFormLabel>
                  {renderField('customs_code', true)}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>RTN <span className="text-danger">*</span></CFormLabel>
                  {renderField('rtn', true)}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Chassis <span className="text-danger">*</span></CFormLabel>
                  <CFormInput
                    value={formData.chassis || ''}
                    onChange={(e) => handleChange('chassis', e.target.value)}
                    required
                    invalid={Boolean(errors.chassis)}
                    className={errors.chassis ? 'is-invalid' : undefined}
                    id="chassis"
                    disabled={readOnly}
                  />
                   {errors.chassis && <CFormFeedback invalid>{errors.chassis}</CFormFeedback>}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Engine No <span className="text-danger">*</span></CFormLabel>
                  <CFormInput
                    value={formData.engine_no || ''}
                    onChange={(e) => handleChange('engine_no', e.target.value)}
                    required
                    invalid={Boolean(errors.engine_no)}
                    className={errors.engine_no ? 'is-invalid' : undefined}
                    id="engine_no"
                    disabled={readOnly}
                  />
                  {errors.engine_no && <CFormFeedback invalid>{errors.engine_no}</CFormFeedback>}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Name on Registration <span className="text-danger">*</span></CFormLabel>
                  <CFormInput
                    value={formData.name_on_registration || ''}
                    onChange={(e) => handleChange('name_on_registration', e.target.value)}
                    required
                    invalid={Boolean(errors.name_on_registration)}
                    className={errors.name_on_registration ? 'is-invalid' : undefined}
                    id="name_on_registration"
                    disabled={readOnly}
                  />
                  {errors.name_on_registration && <CFormFeedback invalid>{errors.name_on_registration}</CFormFeedback>}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Name on Code <span className="text-danger">*</span></CFormLabel>
                  {renderField('name_on_code', true)}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Driver Assigned</CFormLabel>
                  {renderField('driver_assigned')}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="truck-section-card shadow-sm border-0">
            <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Compliance</div>
                <div className="section-title">Permits</div>
                <small className="text-body-secondary">Operational, exploitation, and registration details.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Operational Permit <span className="text-danger">*</span></CFormLabel>
                  <CFormInput
                    value={formData.generic_name1 || ''}
                    onChange={(e) => handleChange('generic_name1', e.target.value)}
                    required
                    invalid={Boolean(errors.generic_name1)}
                    className={errors.generic_name1 ? 'is-invalid' : undefined}
                    id="generic_name1"
                    disabled={readOnly}
                  />
                  {errors.generic_name1 && <CFormFeedback invalid>{errors.generic_name1}</CFormFeedback>}
                </CCol>
                <CCol md={6}>
                   <CFormLabel>Operational Permit Exp. Date <span className="text-danger">*</span></CFormLabel>
                   {renderField('generic_value1', true, 'e.g. 06-Oct-25')}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Exploitation Permit <span className="text-danger">*</span></CFormLabel>
                  <CFormInput
                    value={formData.generic_name2 || ''}
                    onChange={(e) => handleChange('generic_name2', e.target.value)}
                    required
                    invalid={Boolean(errors.generic_name2)}
                    className={errors.generic_name2 ? 'is-invalid' : undefined}
                    id="generic_name2"
                    disabled={readOnly}
                  />
                  {errors.generic_name2 && <CFormFeedback invalid>{errors.generic_name2}</CFormFeedback>}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Exploitation Permit Exp. Date <span className="text-danger">*</span></CFormLabel>
                  {renderField('generic_value2', true, 'e.g. 06-Oct-25')}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Registration Permit <span className="text-danger">*</span></CFormLabel>
                  <CFormInput
                    value={formData.generic_name3 || ''}
                    onChange={(e) => handleChange('generic_name3', e.target.value)}
                    required
                    invalid={Boolean(errors.generic_name3)}
                    className={errors.generic_name3 ? 'is-invalid' : undefined}
                    id="generic_name3"
                    disabled={readOnly}
                  />
                  {errors.generic_name3 && <CFormFeedback invalid>{errors.generic_name3}</CFormFeedback>}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Registration Permit Exp. Date <span className="text-danger">*</span></CFormLabel>
                  {renderField('generic_value3', true, 'e.g. 30-Nov-26')}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="truck-section-card shadow-sm border-0">
            <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Status</div>
                <div className="section-title">Status & Compliance</div>
                <small className="text-body-secondary">Lifecycle, codes, fuel, and insurance data.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel>Status <span className="text-danger">*</span></CFormLabel>
                  {renderField('truck_status', true)}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Active</CFormLabel>
                  {renderField('active', false, 'Select an option')}
                </CCol>
                <CCol md={4}>
                   <CFormLabel>Fuel Type <span className="text-danger">*</span></CFormLabel>
                   {renderField('fuel_type', true)}
                </CCol>
                <CCol md={4}>
                   <CFormLabel>SAP Code <span className="text-danger">*</span></CFormLabel>
                   <CFormInput
                    value={formData.sap_code || ''}
                    onChange={(e) => handleChange('sap_code', e.target.value)}
                    required
                    invalid={Boolean(errors.sap_code)}
                    className={errors.sap_code ? 'is-invalid' : undefined}
                    id="sap_code"
                    disabled={readOnly}
                   />
                   {errors.sap_code && <CFormFeedback invalid>{errors.sap_code}</CFormFeedback>}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Archive Number <span className="text-danger">*</span></CFormLabel>
                  <CFormInput
                    value={formData.archive_number || ''}
                    onChange={(e) => handleChange('archive_number', e.target.value)}
                    required
                    invalid={Boolean(errors.archive_number)}
                    className={errors.archive_number ? 'is-invalid' : undefined}
                    id="archive_number"
                    disabled={readOnly}
                  />
                  {errors.archive_number && <CFormFeedback invalid>{errors.archive_number}</CFormFeedback>}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Hiring Date <span className="text-danger">*</span></CFormLabel>
                  {renderField('hiring_date', true, 'e.g. 06-Oct-25')}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Truck Insurance</CFormLabel>
                  {renderField('truck_insurance')}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>VUCEH Comments</CFormLabel>
                  <CFormInput
                    value={formData.vuceh_coments || ''}
                    onChange={(e) => handleChange('vuceh_coments', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>VUCEH Code</CFormLabel>
                  <CFormInput
                    value={formData.vuceh_code || ''}
                    onChange={(e) => handleChange('vuceh_code', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>PECH Constancy <span className="text-danger">*</span></CFormLabel>
                  {renderField('pech_constancy', true)}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Vehicle Type</CFormLabel>
                  {renderField('vehicle_type')}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Internal Supplier</CFormLabel>
                  {renderField('internal_supplier')}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>GPS Unit</CFormLabel>
                  <CFormInput
                    value={formData.gps_unit || ''}
                    onChange={(e) => handleChange('gps_unit', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="truck-section-card shadow-sm border-0">
            <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Equipment</div>
                <div className="section-title">Equipment & Specs</div>
                <small className="text-body-secondary">Power, tires, and electronics.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel>Number of Tires</CFormLabel>
                  <CFormInput
                    value={formData.number_of_tires || ''}
                    onChange={(e) => handleChange('number_of_tires', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Number of Turbo</CFormLabel>
                  <CFormInput
                    value={formData.number_of_turbo || ''}
                    onChange={(e) => handleChange('number_of_turbo', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Batteries</CFormLabel>
                  <CFormInput
                    value={formData.batteries || ''}
                    onChange={(e) => handleChange('batteries', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Number of Start Engine</CFormLabel>
                  <CFormInput
                    value={formData.number_of_start_engine || ''}
                    onChange={(e) => handleChange('number_of_start_engine', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Alternator Number</CFormLabel>
                  <CFormInput
                    value={formData.alternator_number || ''}
                    onChange={(e) => handleChange('alternator_number', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Computer Serial Number</CFormLabel>
                  <CFormInput
                    value={formData.computer_serial_number || ''}
                    onChange={(e) => handleChange('computer_serial_number', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} className="mb-4">
          <div className="truck-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2">
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
                  Save Truck
                </CButton>
              )}
            </div>
          </div>
        </CCol>
      </CRow>
    </CForm>
  )
}

export default TruckForm
