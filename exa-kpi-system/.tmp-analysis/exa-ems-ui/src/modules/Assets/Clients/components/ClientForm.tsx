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
  CFormFeedback,
  CFormSwitch,
  CFormText,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave, cilWarning } from '@coreui/icons'
import { Client, DepotSetup } from '../types'
import DepotSetupTable from './DepotSetupTable'
import { MODULE_DEPOT_SETUP } from '../../../../constants/modules'
import { 
  permissionService, 
  UPDATE,
  CREATE,
  READ,
  DELETE } from '../../../../services/auth/permission.service'

interface SelectOption {
  value: string
  label: string
}

interface ClientFormProps {
  initialValues: Client
  onSubmit: (values: Client) => void
  loading?: boolean
  submitError?: string | null
  routesOptions?: SelectOption[]
  subdivisionOptions?: SelectOption[]
  isEdit?: boolean
  depotSetups?: DepotSetup[]
  depotLoading?: boolean
  depotError?: string | null
  togglingSetupId?: number | null
  onAddDepotSetup?: () => void
  onEditDepotSetup?: (setupId: number | string) => void
  handleViewDepot?: (setupId: number | string) => void
  onToggleDepotActive?: (setup: DepotSetup) => void
  readOnly?: boolean
}

const parseMultiValue = (value: any, fallbackData?: any[], fallbackKey = 'id'): string[] => {
  if (Array.isArray(value) && value.length) {
    return value
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return item.value ?? item.id ?? item[fallbackKey] ?? item
        }
        return item
      })
      .filter((val) => val !== undefined && val !== null && `${val}`.trim() !== '')
      .map((val) => String(val))
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((val) => val.trim())
      .filter(Boolean)
  }
  if (Array.isArray(fallbackData) && fallbackData.length) {
    return fallbackData
      .map((item) => item?.[fallbackKey])
      .filter((val) => val !== undefined && val !== null)
      .map((val) => String(val))
  }
  return []
}

const normalizeFlag = (value: any, defaultValue: '0' | '1' = '0'): '0' | '1' =>
  value === true || value === 1 || value === '1' ? '1' : defaultValue

const normalizeFormValues = (values: Client): Client => ({
  ...values,
  active: normalizeFlag(values.active, '1'),
  all_routes_inv: normalizeFlag(values.all_routes_inv),
  all_routes_pay: normalizeFlag(values.all_routes_pay),
  all_subdivision_pay: normalizeFlag(values.all_subdivision_pay),
  skip_routes_inv: parseMultiValue(values.skip_routes_inv, values.skip_routes_inv_data, 'route_id'),
  skip_routes_pay: parseMultiValue(values.skip_routes_pay, values.skip_routes_pay_data, 'route_id'),
  skip_subdivision: parseMultiValue(values.skip_subdivision, values.skip_subdivision_data, 'subdivision_id'),
})

const preparePayload = (values: Client): Client => ({
  ...values,
  active: normalizeFlag(values.active, '1'),
  all_routes_inv: normalizeFlag(values.all_routes_inv),
  all_routes_pay: normalizeFlag(values.all_routes_pay),
  all_subdivision_pay: normalizeFlag(values.all_subdivision_pay),
  skip_routes_inv: parseMultiValue(values.skip_routes_inv),
  skip_routes_pay: parseMultiValue(values.skip_routes_pay),
  skip_subdivision: parseMultiValue(values.skip_subdivision),
})

const mergeOptionsWithSelected = (
  options: SelectOption[] = [],
  selectedValues: string[] = [],
  fallbackData: any[] = [],
  valueKey = 'id',
  labelResolver?: (item: any) => string
): SelectOption[] => {
  const map = new Map(options.map((opt) => [String(opt.value), opt]))
  selectedValues.forEach((value) => {
    if (map.has(value)) return
    const fallbackItem = fallbackData?.find((item) => String(item?.[valueKey]) === value)
    const label =
      (labelResolver && fallbackItem ? labelResolver(fallbackItem) : undefined) ||
      fallbackItem?.name ||
      fallbackItem?.label ||
      `Item ${value}`
    map.set(value, { value, label })
  })
  return Array.from(map.values())
}

const getRouteLabel = (route: any) =>
  route?.name || route?.route || [route?.city_a?.code, route?.city_b?.code].filter(Boolean).join(' - ') || `Route ${route?.route_id ?? ''}`

const getSubdivisionLabel = (subdivision: any) =>
  subdivision?.name || subdivision?.reference || `Subdivision ${subdivision?.subdivision_id ?? ''}`

const isFlagEnabled = (value: any) => value === true || value === 1 || value === '1'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[0-9\s\-\(\).]{7,20}$/

const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20
const dropdownScrollStyle: React.CSSProperties = { maxHeight: 260, overflowY: 'auto' }

const canCreateSetup = permissionService.checkPermission(MODULE_DEPOT_SETUP, CREATE);

const ClientForm: React.FC<ClientFormProps> = ({
  initialValues,
  onSubmit,
  loading,
  submitError,
  routesOptions = [],
  subdivisionOptions = [],
  isEdit = false,
  depotSetups = [],
  depotLoading,
  depotError,
  togglingSetupId,
  onAddDepotSetup,
  onEditDepotSetup,
  handleViewDepot,
  onToggleDepotActive,
  readOnly = false,
}) => {
  const [formData, setFormData] = useState<Client>(normalizeFormValues(initialValues))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setFormData(normalizeFormValues(initialValues))
    setErrors({})
  }, [initialValues])

  const handleChange = (field: keyof Client, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field as string]
        return next
      })
    }
  }

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}
    let firstErrorField: string | null = null

    if (!formData.name?.trim()) {
      nextErrors.name = 'Client Name is required'
      if (!firstErrorField) firstErrorField = 'name'
    }

    const email = (formData.email || '').trim()
    if (!email) {
      nextErrors.email = 'Email is required'
      if (!firstErrorField) firstErrorField = 'email'
    } else if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = 'Please enter a valid email address.'
      if (!firstErrorField) firstErrorField = 'email'
    }

    const phone = (formData.phone || '').trim()
    if (phone && !PHONE_REGEX.test(phone)) {
        nextErrors.phone = 'Please enter a valid phone number.'
        if (!firstErrorField) firstErrorField = 'phone'
    }

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }
    onSubmit(preparePayload(formData))
  }

  const handleMultiSelectChange = (field: keyof Client) => (selected: any) => {
    let values: string[] = []
    if (Array.isArray(selected)) {
      values = selected
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            return item.value ?? item.id ?? item
          }
          return item
        })
        .filter((val) => val !== undefined && val !== null && `${val}`.trim() !== '')
        .map((val) => String(val))
    }
    handleChange(field, values)
  }

  const invoiceRouteOptions = useMemo(
    () =>
      mergeOptionsWithSelected(
        routesOptions,
        (formData.skip_routes_inv as string[]) || [],
        formData.skip_routes_inv_data,
        'route_id',
        getRouteLabel
      ),
    [routesOptions, formData.skip_routes_inv, formData.skip_routes_inv_data]
  )

  const paymentRouteOptions = useMemo(
    () =>
      mergeOptionsWithSelected(
        routesOptions,
        (formData.skip_routes_pay as string[]) || [],
        formData.skip_routes_pay_data,
        'route_id',
        getRouteLabel
      ),
    [routesOptions, formData.skip_routes_pay, formData.skip_routes_pay_data]
  )

  const subdivisionSelectOptions = useMemo(
    () =>
      mergeOptionsWithSelected(
        subdivisionOptions,
        (formData.skip_subdivision as string[]) || [],
        formData.skip_subdivision_data,
        'subdivision_id',
        getSubdivisionLabel
      ),
    [subdivisionOptions, formData.skip_subdivision, formData.skip_subdivision_data]
  )

  const isActive = isFlagEnabled(formData.active)

  return (
    <CForm onSubmit={handleSubmit} className="client-form" noValidate>
      <CRow className="g-4">
        {submitError && (
          <CCol xs={12}>
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <CIcon icon={cilWarning} className="flex-shrink-0 me-2" width={24} height={24} />
              <div>{submitError}</div>
            </div>
          </CCol>
        )}
        <CCol xs={12}>
          <CCard className="client-section-card shadow-sm border-0">
            <CCardHeader className="client-section-header">
              <div>
                <div className="section-kicker">Identity</div>
                <div className="section-title">Client Details</div>
                <small className="text-body-secondary">Primary contact and reference information.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Client Name *</CFormLabel>
                  <CFormInput
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    id="name"
                    invalid={Boolean(errors.name)}
                    className={errors.name ? 'is-invalid' : undefined}
                    required
                    disabled={loading || readOnly}
                  />
                  {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Reference Name</CFormLabel>
                  <CFormInput value={formData.reference || ''} onChange={(e) => handleChange('reference', e.target.value)} disabled={loading || readOnly} />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Email *</CFormLabel>
                  <CFormInput
                    value={formData.email || ''}
                    type="email"
                    onChange={(e) => handleChange('email', e.target.value)}
                    invalid={Boolean(errors.email)}
                    id="email"
                    className={errors.email ? 'is-invalid' : undefined}
                    required
                    disabled={loading || readOnly}
                  />
                  {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Phone</CFormLabel>
                  <CFormInput
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    invalid={Boolean(errors.phone)}
                    id="phone"
                    className={errors.phone ? 'is-invalid' : undefined}
                    disabled={loading || readOnly}
                  />
                  {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="client-section-card shadow-sm border-0">
            <CCardHeader className="client-section-header">
              <div>
                <div className="section-kicker">Finance</div>
                <div className="section-title">Billing & Status</div>
                <small className="text-body-secondary">Exchange rates and activation.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Exchange Rate (Lps.)</CFormLabel>
                  <CFormInput
                    value={formData.exchange_rate || ''}
                    onChange={(e) => handleChange('exchange_rate', e.target.value)}
                    placeholder="e.g. 24.50"
                    disabled={loading || readOnly}
                  />
                </CCol>
                <CCol md={6} className="d-flex align-items-center gap-2">
                  <CFormSwitch
                    size="lg"
                    color="success"
                    checked={isActive}
                    onChange={(e) => handleChange('active', e.target.checked ? '1' : '0')}
                    disabled={loading || readOnly}
                  />
                  <span className="fw-semibold">{isActive ? 'Active' : 'Inactive'}</span>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="client-section-card shadow-sm border-0">
            <CCardHeader className="client-section-header">
              <div>
                <div className="section-kicker">Invoice Setup</div>
                <div className="section-title">Skip Auditor (Routes)</div>
                <small className="text-body-secondary">
                  Select the specific routes that should skip the auditor when generating invoices.
                </small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={8}>
                  <CFormLabel>Routes to Skip</CFormLabel>
                  <CMultiSelect
                    options={invoiceRouteOptions}
                    value={(formData.skip_routes_inv as string[]) || []}
                    onChange={handleMultiSelectChange('skip_routes_inv')}
                    placeholder="Search routes..."
                    multiple
                    selectionType="tags"
                    search
                    disabled={isFlagEnabled(formData.all_routes_inv) || loading || readOnly}
                    dropdownStyle={dropdownScrollStyle}
                    virtualScroller={shouldVirtualScroll(invoiceRouteOptions)}
                  />
                  <CFormText>Only applies if "All Routes" is disabled.</CFormText>
                </CCol>
                <CCol md={4} className="d-flex align-items-center">
                  <div>
                    <CFormLabel className="d-block">All Routes</CFormLabel>
                    <CFormSwitch
                      size="lg"
                      color="info"
                      checked={isFlagEnabled(formData.all_routes_inv)}
                      onChange={(e) => handleChange('all_routes_inv', e.target.checked ? '1' : '0')}
                      disabled={loading || readOnly}
                    />
                    <CFormText>When enabled, all invoice routes skip the auditor.</CFormText>
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="client-section-card shadow-sm border-0">
            <CCardHeader className="client-section-header">
              <div>
                <div className="section-kicker">Payment Setup</div>
                <div className="section-title">Skip Auditor</div>
                <small className="text-body-secondary">Control which subdivisions and routes bypass payment auditing.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-4">
                <CCol md={6}>
                  <CFormLabel>Subdivisions</CFormLabel>
                  <CMultiSelect
                    options={subdivisionSelectOptions}
                    value={(formData.skip_subdivision as string[]) || []}
                    onChange={handleMultiSelectChange('skip_subdivision')}
                    placeholder="Search subdivisions..."
                    multiple
                    selectionType="tags"
                    search
                    disabled={isFlagEnabled(formData.all_subdivision_pay) || loading || readOnly}
                    dropdownStyle={dropdownScrollStyle}
                    virtualScroller={shouldVirtualScroll(subdivisionSelectOptions)}
                  />
                  <CFormText>Disable to target specific subdivisions.</CFormText>
                </CCol>
                <CCol md={6} className="d-flex align-items-center">
                  <div>
                    <CFormLabel className="d-block">All Subdivisions</CFormLabel>
                    <CFormSwitch
                      size="lg"
                      color="info"
                      checked={isFlagEnabled(formData.all_subdivision_pay)}
                      onChange={(e) => handleChange('all_subdivision_pay', e.target.checked ? '1' : '0')}
                      disabled={loading || readOnly}
                    />
                    <CFormText>Apply payment skipping to every subdivision.</CFormText>
                  </div>
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Routes</CFormLabel>
                  <CMultiSelect
                    options={paymentRouteOptions}
                    value={(formData.skip_routes_pay as string[]) || []}
                    onChange={handleMultiSelectChange('skip_routes_pay')}
                    placeholder="Search routes..."
                    multiple
                    selectionType="tags"
                    search
                    disabled={isFlagEnabled(formData.all_routes_pay) || loading || readOnly}
                    dropdownStyle={dropdownScrollStyle}
                    virtualScroller={shouldVirtualScroll(paymentRouteOptions)}
                  />
                  <CFormText>Disable to focus on a subset of routes.</CFormText>
                </CCol>
                <CCol md={6} className="d-flex align-items-center">
                  <div>
                    <CFormLabel className="d-block">All Routes</CFormLabel>
                    <CFormSwitch
                      size="lg"
                      color="info"
                      checked={isFlagEnabled(formData.all_routes_pay)}
                      onChange={(e) => handleChange('all_routes_pay', e.target.checked ? '1' : '0')}
                      disabled={loading || readOnly}
                    />
                    <CFormText>Mark all routes as approved for payment without audit.</CFormText>
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        {isEdit && (
          <CCol xs={12}>
            <CCard className="client-section-card shadow-sm border-0">
              <CCardHeader className="client-section-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <div className="section-kicker">Depot Setup</div>
                  <div className="section-title">Linked Depots & Configurations</div>
                  <small className="text-body-secondary">
                    Manage depot preferences, notifications, and EDI codes per client.
                  </small>
                </div>
                { canCreateSetup && <CButton
                  color="success"
                  className="text-white"
                  onClick={onAddDepotSetup}
                  disabled={!onAddDepotSetup || readOnly}
                  variant={readOnly ? 'ghost' : undefined}
                  style={readOnly ? { visibility: 'hidden' } : undefined}
                >
                  Add Depot
                </CButton>}
              </CCardHeader>
              <CCardBody>
                <DepotSetupTable
                  setups={depotSetups}
                  loading={depotLoading}
                  error={depotError}
                  onEdit={onEditDepotSetup}
                  onView={handleViewDepot}
                  onToggleActive={onToggleDepotActive}
                  togglingSetupId={togglingSetupId}
                />
              </CCardBody>
            </CCard>
          </CCol>
        )}

        <CCol xs={12} className="mb-4">
          <div className="client-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2">
            <CButton color="secondary" variant="ghost" type="button" onClick={() => window.history.back()} disabled={loading}>
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back
            </CButton>
            <div className="d-flex gap-2">
              {!readOnly && (
                <CButton color="primary" type="submit" disabled={loading} className="text-white px-4">
                  <CIcon icon={cilSave} className="me-2" />
                  Save Client
                </CButton>
              )}
            </div>
          </div>
        </CCol>
      </CRow>
    </CForm>
  )
}

export default ClientForm
