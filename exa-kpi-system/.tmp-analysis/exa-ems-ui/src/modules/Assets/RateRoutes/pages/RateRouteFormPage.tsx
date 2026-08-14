import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CBadge,
  CCard,
  CCardBody,
  CContainer,
  CSpinner,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CButton,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilMap, cilBadge, cilCheckCircle } from '@coreui/icons'
import { AppDispatch, RootState } from '../../../../store'
import { clearCurrentRateRoute, createRateRoute, loadRateRoute, updateRateRoute } from '../store/rateRoutes.slice'
import { loadRatePlans } from '../../../RatePlans/store/ratePlansSlice'
import { locationsAPI } from '../../../Locations/api/locations.api'
import RateRouteForm from '../components/RateRouteForm'
import { RateRoute } from '../types'
import './RateRouteForm.scss'

const RateRouteFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id && id !== 'new')

  const { currentRateRoute, loading } = useSelector((state: RootState) => (state as any).rateroutes)
  const ratePlansState = useSelector((state: RootState) => (state as any).rateplans) || {}
  const ratePlansLoading = Boolean(ratePlansState.loading)
  const ratePlans = Array.isArray(ratePlansState.rateplans) ? ratePlansState.rateplans : []

  const [cities, setCities] = useState<any[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedRoute, setSavedRoute] = useState<RateRoute | null>(null)
  
  // Toaster
  const [toast, setToast] = useState<any>(null)
  const toaster = useRef<any>()

  const extractErrorMessage = (payload: any, fallback = 'An unexpected error occurred') => {
      if (!payload) return fallback
      if (typeof payload === 'string') return payload
      if (payload.message && typeof payload.message === 'string') return payload.message
      const data = payload.data ?? payload.response?.data
      if (typeof data === 'string') return data
      if (data?.message && typeof data.message === 'string') return data.message
      if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0]
        const firstValue = firstKey ? data[firstKey] : null
        if (typeof firstValue === 'string') return firstValue
        if (Array.isArray(firstValue) && firstValue.length > 0 && typeof firstValue[0] === 'string') {
          return firstValue[0]
        }
      }
      return fallback
  }

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' = 'success') => {
    setToast(
      <CToast autohide={true} delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setCitiesLoading(true)
        const list = await locationsAPI.getCities()
        setCities(list)
      } catch (e) {
        console.error('Failed to load cities', e)
      } finally {
        setCitiesLoading(false)
      }
    }
    fetchCities()
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      dispatch(loadRateRoute(id))
    } else {
      dispatch(clearCurrentRateRoute())
    }
    if (!ratePlans.length) {
      dispatch(loadRatePlans(undefined))
    }
    return () => {
      dispatch(clearCurrentRateRoute())
    }
  }, [dispatch, id, isEdit])

  const combinedRatePlans = useMemo(() => {
    const map = new Map<number, any>()
    ratePlans.forEach((plan: any) => {
      if (plan?.id) {
        map.set(plan.id, plan)
      }
    })
    if (Array.isArray(currentRateRoute?.rate_routes)) {
      currentRateRoute.rate_routes.forEach((rr: any) => {
        const id = rr?.rate_builder?.id
        if (id && !map.has(id)) {
          map.set(id, { id, name: rr.rate_builder?.name || `Plan ${id}` })
        }
      })
    }
    return Array.from(map.values())
  }, [ratePlans, currentRateRoute])

  const initialValues: RateRoute = useMemo(() => {
    const base: RateRoute = {
      city_a_id: currentRateRoute?.city_a_id || currentRateRoute?.city_a?.city_id || '',
      city_b_id: currentRateRoute?.city_b_id || currentRateRoute?.city_b?.city_id || '',
    }

    combinedRatePlans.forEach((plan) => {
      if (!plan?.id) return
      base[`km_${plan.id}`] = ''
      base[`price_${plan.id}`] = ''
      base[`fuel_${plan.id}`] = ''
      base[`fuelgenset_${plan.id}`] = ''
    })

    if (currentRateRoute) {
      const routeRates = currentRateRoute.rate_routes || []
      routeRates.forEach((rr: any) => {
        const id = rr?.rate_builder?.id
        if (!id) return
        base[`km_${id}`] = rr?.km ?? currentRateRoute[`km_${id}`] ?? ''
        base[`price_${id}`] = rr?.price ?? currentRateRoute[`price_${id}`] ?? ''
        base[`fuel_${id}`] = rr?.fuel ?? currentRateRoute[`fuel_${id}`] ?? ''
        base[`fuelgenset_${id}`] = rr?.fuelgenset ?? currentRateRoute[`fuelgenset_${id}`] ?? ''
      })
    }

    return base
  }, [currentRateRoute, combinedRatePlans])

  const handleSubmit = async (values: RateRoute) => {
    const payload: RateRoute = {
      city_a_id: values.city_a_id,
      city_b_id: values.city_b_id,
      rate_routes: combinedRatePlans.map((plan: any) => ({
        rate_builder_id: plan.id,
        km: values[`km_${plan.id}`] ?? '',
        price: values[`price_${plan.id}`] ?? '',
        fuel: values[`fuel_${plan.id}`] ?? '',
        fuelgenset: values[`fuelgenset_${plan.id}`] ?? '',
      })),
    }
    try {
      let result: any
      if (isEdit && id) {
        result = await dispatch(updateRateRoute({ id, route: payload }))
      } else {
        result = await dispatch(createRateRoute(payload))
      }

      if (result.meta.requestStatus === 'fulfilled') {
        setSavedRoute(result.payload)
        setShowSuccessModal(true)
      } else {
         const errorMsg = extractErrorMessage(result.payload, 'Failed to save rate route')
         showToast(errorMsg, 'danger')
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'danger')
    }
  }

  const isPageLoading = citiesLoading || ratePlansLoading || (isEdit && loading && !currentRateRoute)

  return (
    <CContainer fluid className="rate-route-form-page">
      <CCard className="rate-route-hero-card shadow-sm border-0 mb-4">
        <CCardBody className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <div className="text-uppercase text-body-secondary fw-semibold small">Rate Routes</div>
            <h3 className="d-flex align-items-center gap-2 mb-1">
              <CIcon icon={cilMap} className="text-primary" />
              {isEdit ? 'Edit Route' : 'Create Route'}
            </h3>
            <div className="text-body-secondary">
              {isEdit
                ? `ID #${(currentRateRoute?.route_id ?? id) || '—'} · ${currentRateRoute?.route || ''}`.trim()
                : 'Set up a route and assign rate plan values'}
            </div>
          </div>
          {isEdit && currentRateRoute?.route && (
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <CBadge color="primary" shape="rounded-pill" className="px-3 py-2">
                <CIcon icon={cilBadge} className="me-2" />
                {currentRateRoute.route}
              </CBadge>
            </div>
          )}
        </CCardBody>
      </CCard>

      {isPageLoading ? (
        <div className="text-center py-5">
          <CSpinner color="primary" />
        </div>
      ) : (
        <RateRouteForm
          cities={cities}
          ratePlans={combinedRatePlans}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          loading={loading || citiesLoading || ratePlansLoading}
          enablePlanFilter={isEdit}
        />
      )}

      <CModal
        alignment="center"
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle className="d-flex align-items-center gap-2">
            <CIcon icon={cilCheckCircle} className="text-success" />
            {isEdit ? 'Route updated' : 'Route created'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-1">
            Route <strong>{savedRoute?.route || savedRoute?.route_id || '—'}</strong> has been{' '}
            {isEdit ? 'updated' : 'created'} successfully.
          </p>
          <p className="text-body-secondary mb-0">What would you like to do next?</p>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <CButton color="secondary" onClick={() => navigate('/assets/rate-routes')}>
            Back to list
          </CButton>
          <CButton
            color="info"
            className="text-white"
            onClick={() => {
              if (!isEdit && savedRoute?.route_id) {
                navigate(`/assets/rate-routes/${savedRoute.route_id}`)
              } else {
                setShowSuccessModal(false)
              }
            }}
          >
            Continue editing
          </CButton>
        </CModalFooter>
      </CModal>

      <CToaster ref={toaster} push={toast} placement="top-end" />
    </CContainer>
  )
}

export default RateRouteFormPage
