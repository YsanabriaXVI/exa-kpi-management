import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
  CAlert,
  CSpinner,
} from '@coreui/react-pro'
import PageHero from '../../../components/PageHero'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilLocationPin } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../store'
import { permissionService, UPDATE, CREATE } from '../../../services/auth/permission.service'
import { MODULE_LOCATIONS } from '../../../constants/modules'
import {
  clearCurrentLocation,
  createLocation,
  loadCities,
  loadLocation,
  setDefaultLocation,
  updateLocation,
} from '../store/locationsSlice'
import LocationForm from '../components/LocationForm'
import type { Location } from '../types'
import './LocationForm.scss'

const LocationFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const { currentLocation, cities, loading, error } = useSelector((state: RootState) => (state as any).locations)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedLocation, setSavedLocation] = useState<Location | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  const debugEnabled = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('debugLocation') === 'true'
  }, [location.search])

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

  useEffect(() => {
    const loadMeta = async () => {
      await dispatch(loadCities())
      setMetadataLoaded(true)
    }
    loadMeta()
    return () => {
      dispatch(clearCurrentLocation())
    }
  }, [dispatch])

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        await dispatch(loadLocation(Number(id)))
      } else {
        dispatch(setDefaultLocation())
      }
      setDataLoaded(true)
    }
    loadData()
  }, [dispatch, id, isEdit])

  const showToast = (message: string, color: 'success' | 'danger') => {
    if (!message) return
    setToast(
      <CToast autohide delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  const handleSubmit = async (data: Location) => {
    try {
      let result: Location
      if (isEdit && id) {
        result = await dispatch(updateLocation({ id: Number(id), location: data })).unwrap()
      } else {
        result = await dispatch(createLocation(data)).unwrap()
      }
      setFormError(null)
      setSavedLocation(result)
      setShowSuccessModal(true)
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to save location')
      setFormError(message)
      showToast(message, 'danger')
    }
  }

  const handleCancel = () => {
    navigate('/modules/locations')
  }

  useEffect(() => {
    if (error) {
      const message = extractErrorMessage(error, 'Failed to load location')
      setFormError(message)
      showToast(message, 'danger')
    }
  }, [error])

  const contentReady = metadataLoaded && dataLoaded
  const displayError = formError || (error ? extractErrorMessage(error, 'Failed to load location') : null)

  return (
    <div className="location-form-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      {!contentReady ? (
        <div className="location-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading location</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : (
        <>
          {debugEnabled && (
            <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.5rem' }}>
              <strong>Debug Location Payload</strong>
              {'\n'}
              {JSON.stringify(currentLocation, null, 2)}
            </pre>
          )}
          {displayError && <CAlert color="danger">{displayError}</CAlert>}
          <LocationForm
            initialValues={currentLocation}
            loading={loading || !dataLoaded || !metadataLoaded}
            error={formError || error}
            isEdit={isEdit}
            cities={cities}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/modules/locations')}
            readOnly={
              isEdit
                ? !permissionService.checkPermission(MODULE_LOCATIONS, UPDATE)
                : !permissionService.checkPermission(MODULE_LOCATIONS, CREATE)
            }
          />

          <CModal visible={showSuccessModal} onClose={() => setShowSuccessModal(false)} alignment="center" backdrop="static">
            <CModalHeader>
              <CModalTitle>
                <CIcon icon={cilCheckCircle} className="text-success me-2" size="lg" />
                Success!
              </CModalTitle>
            </CModalHeader>
            <CModalBody>
              <p className="mb-0">
                Location <strong>{savedLocation?.name}</strong> has been {isEdit ? 'updated' : 'created'} successfully.
              </p>
              <p className="text-body-secondary mt-2 mb-0">What would you like to do next?</p>
            </CModalBody>
            <CModalFooter className="d-flex justify-content-between">
              <CButton color="secondary" onClick={() => navigate('/modules/locations')}>
                Back to List
              </CButton>
              <div className="d-flex gap-2">
                {!isEdit && (
                  <CButton
                    color="primary"
                    className="text-white"
                    onClick={() => {
                      setShowSuccessModal(false)
                      setSavedLocation(null)
                      dispatch(setDefaultLocation())
                      navigate('/modules/locations/create')
                    }}
                  >
                    Create Another
                  </CButton>
                )}
                {savedLocation?.location_id && (
                  <CButton
                    color="info"
                    className="text-white"
                    onClick={() => {
                      setShowSuccessModal(false)
                      navigate(`/modules/locations/edit/${savedLocation.location_id}`)
                      dispatch(loadLocation(savedLocation.location_id))
                    }}
                  >
                    {isEdit ? 'Continue Editing' : 'Edit Location'}
                  </CButton>
                )}
              </div>
            </CModalFooter>
          </CModal>
        </>
      )}
    </div>
  )
}

export default LocationFormPage
