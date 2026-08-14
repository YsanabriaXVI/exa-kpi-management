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
  CMultiSelect,
  CCard as CCardInner,
  CCardHeader as CCardInnerHeader,
  CCardBody as CCardInnerBody,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave } from '@coreui/icons'
import { RateRoute } from '../types'

interface RateRouteFormProps {
  cities: Array<{ city_id: number; name: string }>
  ratePlans: any[]
  initialValues: RateRoute
  onSubmit: (values: RateRoute) => void
  loading?: boolean
  enablePlanFilter?: boolean
}

const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20
const dropdownScrollStyle: React.CSSProperties = { maxHeight: 260, overflowY: 'auto' }

const RateRouteForm: React.FC<RateRouteFormProps> = ({
  cities,
  ratePlans,
  initialValues,
  onSubmit,
  loading,
  enablePlanFilter,
}) => {
  const [formData, setFormData] = React.useState<RateRoute>(initialValues)
  const [validated, setValidated] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const [visiblePlanIds, setVisiblePlanIds] = useState<number[]>([])

  useEffect(() => {
    setFormData(initialValues)
  }, [initialValues])

  const handleChange = (field: keyof RateRoute, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    if (!formData.city_a_id) {
        newErrors.city_a_id = 'City A is required'
        isValid = false
    }
    
    if (!formData.city_b_id) {
        newErrors.city_b_id = 'City B is required'
        isValid = false
    }

    if (formData.city_a_id && formData.city_b_id && formData.city_a_id === formData.city_b_id) {
        newErrors.city_b_id = 'City B must be different from City A'
        isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidated(true)

    if (validateForm()) {
        onSubmit(formData)
    } else {
        const firstErrorField = document.querySelector('.is-invalid')
        if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
            ;(firstErrorField as HTMLElement).focus()
        }
    }
  }

  const handleReset = () => {
    setFormData(initialValues)
    setVisiblePlanIds([])
  }

  const planFilterOptions = useMemo(
    () =>
      ratePlans.map((plan) => ({
        value: String(plan.id),
        label: plan.name,
      })),
    [ratePlans],
  )

  const displayedPlans = useMemo(() => {
    if (!visiblePlanIds.length) {
      return ratePlans
    }
    return ratePlans.filter((plan) => visiblePlanIds.includes(plan.id))
  }, [ratePlans, visiblePlanIds])

  const handlePlanFilterChange = (selected: any) => {
    if (!Array.isArray(selected)) {
      setVisiblePlanIds([])
      return
    }
    const ids = selected
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return Number(item.value ?? item.id ?? item)
        }
        return Number(item)
      })
      .filter((value) => Number.isFinite(value))

    setVisiblePlanIds(ids)
  }

  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: String(c.city_id), label: c.name })),
    [cities],
  )

  return (
    <CForm onSubmit={handleSubmit} className="rate-route-form" noValidate>
      <CRow className="g-4">
        <CCol xs={12}>
          <CCard className="rate-route-section-card shadow-sm border-0">
            <CCardHeader className="rate-route-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Route</div>
                <div className="section-title">Cities</div>
                <small className="text-body-secondary">Select the origin and destination cities.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>City A</CFormLabel>
                  <CMultiSelect
                    options={cityOptions}
                    value={formData.city_a_id ? String(formData.city_a_id) : ''}
                    onChange={(selected: any) => {
                      const option = Array.isArray(selected) ? selected[0] : selected
                      handleChange('city_a_id', option?.value ? Number(option.value) : '')
                    }}
                    multiple={false}
                    selectionType="text"
                    placeholder="Select City A"
                    clearSearchOnSelect
                    required
                    dropdownStyle={dropdownScrollStyle}
                    virtualScroller={shouldVirtualScroll(cityOptions)}
                    invalid={!!errors.city_a_id}
                    feedbackInvalid={errors.city_a_id}
                    id="city_a_id"
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>City B</CFormLabel>
                  <CMultiSelect
                    options={cityOptions}
                    value={formData.city_b_id ? String(formData.city_b_id) : ''}
                    onChange={(selected: any) => {
                      const option = Array.isArray(selected) ? selected[0] : selected
                      handleChange('city_b_id', option?.value ? Number(option.value) : '')
                    }}
                    multiple={false}
                    selectionType="text"
                    placeholder="Select City B"
                    clearSearchOnSelect
                    required
                    dropdownStyle={dropdownScrollStyle}
                    virtualScroller={shouldVirtualScroll(cityOptions)}
                    invalid={!!errors.city_b_id}
                    feedbackInvalid={errors.city_b_id}
                    id="city_b_id"
                  />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="rate-route-section-card shadow-sm border-0">
            <CCardHeader className="rate-route-section-header d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <div className="section-kicker">Rates</div>
                <div className="section-title">Per Rate Plan</div>
                <small className="text-body-secondary">Enter KM, Price, and fuel values for each rate plan.</small>
              </div>
              {enablePlanFilter && ratePlans.length > 0 && (
                <div className="rate-plan-filter" style={{ minWidth: '240px' }}>
                  <CFormLabel className="text-uppercase small fw-semibold text-body-secondary mb-1">
                    Filter Plans
                  </CFormLabel>
                  <CMultiSelect
                    options={planFilterOptions}
                    value={visiblePlanIds.map((id) => String(id))}
                    onChange={handlePlanFilterChange}
                    multiple
                    selectionType="tags"
                    placeholder="Show all plans"
                    clearSearchOnSelect
                    dropdownStyle={dropdownScrollStyle}
                    virtualScroller={shouldVirtualScroll(planFilterOptions)}
                  />
                </div>
              )}
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                {displayedPlans.map((plan: any) => (
                  <CCol md={6} key={plan.id}>
                    <CCardInner className="rate-plan-card">
                      <CCardInnerHeader className="rate-plan-card__header">
                        {plan.name}
                      </CCardInnerHeader>
                      <CCardInnerBody className="rate-plan-card__body">
                        <div className={`rate-plan-field ${ (formData as any)[`km_${plan.id}`] ? 'has-value' : '' }`}>
                          <CFormLabel>KM</CFormLabel>
                          <CFormInput
                            value={(formData as any)[`km_${plan.id}`] || ''}
                            onChange={(e) => handleChange(`km_${plan.id}` as keyof RateRoute, e.target.value)}
                            placeholder="KM"
                          />
                        </div>
                        <div className={`rate-plan-field ${ (formData as any)[`price_${plan.id}`] ? 'has-value' : '' }`}>
                          <CFormLabel>Price</CFormLabel>
                          <CFormInput
                            value={(formData as any)[`price_${plan.id}`] || ''}
                            onChange={(e) => handleChange(`price_${plan.id}` as keyof RateRoute, e.target.value)}
                            placeholder="Price"
                          />
                        </div>
                        <div className={`rate-plan-field ${ (formData as any)[`fuel_${plan.id}`] ? 'has-value' : '' }`}>
                          <CFormLabel>Fuel Truck</CFormLabel>
                          <CFormInput
                            value={(formData as any)[`fuel_${plan.id}`] || ''}
                            onChange={(e) => handleChange(`fuel_${plan.id}` as keyof RateRoute, e.target.value)}
                            placeholder="Fuel Truck"
                          />
                        </div>
                        <div className={`rate-plan-field ${ (formData as any)[`fuelgenset_${plan.id}`] ? 'has-value' : '' }`}>
                          <CFormLabel>Fuel Genset</CFormLabel>
                          <CFormInput
                            value={(formData as any)[`fuelgenset_${plan.id}`] || ''}
                            onChange={(e) => handleChange(`fuelgenset_${plan.id}` as keyof RateRoute, e.target.value)}
                            placeholder="Fuel Genset"
                          />
                        </div>
                      </CCardInnerBody>
                    </CCardInner>
                  </CCol>
                ))}
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} className="mb-4">
          <div className="rate-route-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex gap-2 flex-wrap">
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
              <CButton color="danger" variant="outline" type="button" onClick={handleReset} disabled={loading}>
                Reset Form
              </CButton>
            </div>
            <div className="d-flex gap-2">
              <CButton color="primary" type="submit" disabled={loading} className="text-white px-4">
                <CIcon icon={cilSave} className="me-2" />
                Save Route
              </CButton>
            </div>
          </div>
        </CCol>
      </CRow>
    </CForm>
  )
}

export default RateRouteForm
