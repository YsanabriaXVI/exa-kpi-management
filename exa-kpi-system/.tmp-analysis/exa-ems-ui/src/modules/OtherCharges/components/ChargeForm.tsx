/**
 * Charge Form Component
 * Form for creating and editing other charges
 */

import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CButton,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CFormSelect,
  CMultiSelect,
  CBadge,
} from '@coreui/react-pro'
import { APPLY_TO_OPTIONS } from '../constants'
import PaymentPlanCards from './PaymentPlanCards'

interface Route {
  id: number
  name: string
  [key: string]: any
}

interface PaymentPlan {
  id: number
  name: string
  [key: string]: any
}

interface PlanPrice {
  unitsIncluded: string | number
  price: string | number
  rate?: string | number
}

interface FormData {
  name: string
  applyTo: string
  selectedRoutes: number[]
  planPrices: Record<number, PlanPrice>
  status?: string
}

interface ChargeFormProps {
  initialValues?: any
  onSubmit: (formData: FormData) => void
  onCancel: () => void
  routes: Route[]
  paymentPlans: PaymentPlan[]
  onRoutesChange?: (params: { routes: number[]; applyTo: string }) => void
  loading?: boolean
  error?: string | null
}

const ChargeForm: React.FC<ChargeFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  routes,
  paymentPlans,
  onRoutesChange,
  loading = false,
  error = null,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    applyTo: '',
    selectedRoutes: [],
    planPrices: {},
    status: 'ACTIVE',
    ...initialValues,
  })

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || '',
        applyTo: initialValues.applyTo || '',
        selectedRoutes: initialValues.selectedRoutes || [],
        planPrices: initialValues.planPrices || {},
        status: initialValues.status || 'ACTIVE',
      })
    }
  }, [initialValues])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleRoutesChange = (selectedOptions: any) => {
    console.log('🔄 Routes changed:', selectedOptions)
    
    // CMultiSelect can return different formats
    // Handle both array of objects and array of values
    let routeIds: number[] = []
    
    if (Array.isArray(selectedOptions)) {
      routeIds = selectedOptions.map((option) => {
        if (typeof option === 'object' && option !== null) {
          return option.value || option.id
        }
        return option
      }).filter(id => id !== undefined && id !== null)
    }
    
    console.log('✅ Extracted route IDs:', routeIds)
    
    setFormData((prev) => ({
      ...prev,
      selectedRoutes: routeIds,
    }))

    // Trigger parent callback to fetch payment plans
    if (onRoutesChange && routeIds.length > 0 && formData.applyTo) {
      onRoutesChange({
        routes: routeIds,
        applyTo: formData.applyTo,
      })
    }
  }

  const handleApplyToChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      applyTo: value,
    }))

    // Trigger parent callback to fetch payment plans if routes already selected
    if (onRoutesChange && formData.selectedRoutes.length > 0 && value) {
      onRoutesChange({
        routes: formData.selectedRoutes,
        applyTo: value,
      })
    }
  }

  const handlePlanPriceChange = (planId: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      planPrices: {
        ...prev.planPrices,
        [planId]: {
          ...prev.planPrices[planId],
          [field]: value,
        },
      },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleReset = () => {
    setFormData({
      name: '',
      applyTo: '',
      selectedRoutes: [],
      planPrices: {},
      status: 'ACTIVE',
    })
  }

  // Safely map routes with proper formatting - enhanced with codes and grouping
  const routeOptions = Array.isArray(routes) 
    ? routes.map((route) => {
        // Handle both camelCase (API) and snake_case properties
        const routeId = route.routeId || route.route_id || route.id
        const originCity = route.cityAName || route.origin_city_name || route.origin_city || ''
        const destCity = route.cityBName || route.destination_city_name || route.destination_city || ''
        const isActive = route.active !== false && route.status !== 0 && route.status !== 'INACTIVE'
        
        // Generate route code (e.g., "R-1116")
        const routeCode = `R-${routeId}`
        
        // Build display text with code on first line, cities on second
        const displayText = `${routeCode}: ${originCity} → ${destCity}`
        
        return {
          value: routeId,
          text: displayText,
          label: displayText,
          // Store additional data for rich display and grouping
          code: routeCode,
          originCity: originCity,
          destinationCity: destCity,
          disabled: !isActive, // Disable inactive routes
        }
      }).filter(opt => opt.value && opt.text) // Filter out invalid entries
    : []
  
  // Group routes by origin city for better organization
  const groupedRoutes = routeOptions.reduce((acc, route) => {
    const origin = route.originCity || 'Other'
    if (!acc[origin]) {
      acc[origin] = []
    }
    acc[origin].push(route)
    return acc
  }, {} as Record<string, typeof routeOptions>)
  
  // Sort groups alphabetically and sort routes within each group
  const sortedGroupedRoutes = Object.entries(groupedRoutes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([origin, routes]) => ({
      label: `📍 ${origin}`, // Group header
      options: routes.sort((a, b) => a.destinationCity.localeCompare(b.destinationCity))
    }))
  
  console.log('📊 Route options prepared:', routeOptions.length, 'valid routes in', sortedGroupedRoutes.length, 'groups')

  const showPaymentPlans =
    formData.selectedRoutes.length > 0 && 
    formData.applyTo && 
    Array.isArray(paymentPlans) && 
    paymentPlans.length > 0

  // Get display info for selected routes count
  const getSelectedRoutesDisplay = () => {
    if (formData.selectedRoutes.length === 0) return ''
    if (formData.selectedRoutes.length === routeOptions.length) return 'All routes selected'
    return `${formData.selectedRoutes.length} route${formData.selectedRoutes.length > 1 ? 's' : ''} selected`
  }

  return (
    <CForm onSubmit={handleSubmit}>
      <CCard>
        <CCardBody>
          {error && (
            <CAlert color="danger" dismissible>
              {error}
            </CAlert>
          )}

          <CRow className="mb-3">
            <CCol md={12}>
              <CFormLabel htmlFor="name">
                Charge Name <span className="text-danger">*</span>
              </CFormLabel>
              <CFormInput
                type="text"
                id="name"
                placeholder="Enter charge name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="applyTo">
                Apply To <span className="text-danger">*</span>
              </CFormLabel>
              <div className="select-wrapper">
                <CFormSelect
                  id="applyTo"
                  value={formData.applyTo}
                  onChange={(e) => handleApplyToChange(e.target.value)}
                  required
                  className="modern-select"
                >
                  <option value="">Select...</option>
                  {APPLY_TO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
              <small className="text-body-secondary d-block mt-1">
                Choose who will be charged for this service
              </small>
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="status">Status</CFormLabel>
              <div className="select-wrapper">
                <CFormSelect
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="modern-select"
                >
                  <option value="ACTIVE">✓ Active</option>
                  <option value="INACTIVE">○ Inactive</option>
                </CFormSelect>
              </div>
              <small className="text-body-secondary d-block mt-1">
                {formData.status === 'ACTIVE' ? 'Charge is currently active' : 'Charge is currently inactive'}
              </small>
            </CCol>
          </CRow>

          {/* Routes - Full Width Section (Always Visible and Enabled) */}
          <CRow className="mb-4">
            <CCol xs={12}>
              <CFormLabel htmlFor="routes" className="d-flex align-items-center justify-content-between mb-2">
                <span>
                  Routes <span className="text-danger">*</span>
                </span>
                {getSelectedRoutesDisplay() && (
                  <CBadge color="success" className="fs-6 px-3 py-2">
                    ✓ {getSelectedRoutesDisplay()}
                  </CBadge>
                )}
              </CFormLabel>
              <div className="route-select-wrapper-enhanced">
                <CMultiSelect
                  id="routes"
                  options={sortedGroupedRoutes}
                  onChange={handleRoutesChange}
                  placeholder={routeOptions.length > 0 ? "🔍 Search by route code, origin city, or destination..." : "Loading routes..."}
                  selectAllLabel="✓ Select All Routes"
                  clearAllLabel="✕ Clear All"
                  search
                  searchNoResultsLabel="No routes found matching your search"
                  selectAll
                  virtualScroller
                  visibleItems={10}
                  loading={!Array.isArray(routes) || routes.length === 0}
                  optionsStyle="text"
                  selectionType="tags"
                />
                <small className="text-body-secondary d-block mt-2">
                  <strong>{routeOptions.length}</strong> routes available • <strong>{sortedGroupedRoutes.length}</strong> origin cities • 
                  💡 Routes are organized by origin city • Search by code, origin, or destination
                </small>
              </div>
            </CCol>
          </CRow>

          {showPaymentPlans && (
            <div className="payment-plans-section">
              <PaymentPlanCards
                plans={paymentPlans}
                planPrices={formData.planPrices}
                onPriceChange={handlePlanPriceChange}
              />
            </div>
          )}

          {/* Action Buttons - Professional Layout */}
          <div className="form-actions-bar">
            <CButton 
              color="secondary" 
              variant="ghost"
              onClick={onCancel}
              disabled={loading}
              className="px-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
              </svg>
              Go Back
            </CButton>
            <div className="d-flex gap-2">
              <CButton 
                color="secondary" 
                variant="outline" 
                onClick={handleReset}
                disabled={loading}
                className="px-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                  <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                  <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
                Reset
              </CButton>
              <CButton 
                color="success" 
                type="submit" 
                disabled={
                  loading ||
                  !formData.name ||
                  !formData.applyTo ||
                  formData.selectedRoutes.length === 0
                }
                className="px-5"
              >
                {loading ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                      <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                    </svg>
                    Save Charge
                  </>
                )}
              </CButton>
            </div>
          </div>
        </CCardBody>
      </CCard>
    </CForm>
  )
}

export default ChargeForm

