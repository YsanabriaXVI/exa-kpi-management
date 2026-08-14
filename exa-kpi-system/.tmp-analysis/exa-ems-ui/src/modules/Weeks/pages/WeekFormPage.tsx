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
import { cilCalendar, cilCheckCircle } from '@coreui/icons'
import type { AppDispatch, RootState } from '../../../store'
import { clearCurrentWeek, createWeek, loadWeek, setDefaultWeek, updateWeek } from '../store/weeksSlice'
import WeekForm from '../components/WeekForm'
import type { Week } from '../types'
import './WeekForm.scss'

const WeekFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const { currentWeek, loading, error } = useSelector((state: RootState) => (state as any).weeks)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedWeek, setSavedWeek] = useState<Week | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  const debugEnabled = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('debugWeek') === 'true'
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
    const loadData = async () => {
      if (isEdit && id) {
        await dispatch(loadWeek(Number(id)))
      } else {
        dispatch(setDefaultWeek())
      }
      setDataLoaded(true)
    }
    loadData()
    return () => {
      dispatch(clearCurrentWeek())
    }
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

  const handleSave = async (data: Week) => {
    setFormError(null) // Clear previous errors
    try {
      let result: Week
      if (isEdit && id) {
        result = await dispatch(updateWeek({ id: Number(id), week: data })).unwrap()
      } else {
        result = await dispatch(createWeek(data)).unwrap()
      }
      setSavedWeek(result)
      setShowSuccessModal(true)
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to save week')
      setFormError(message)
      showToast(message, 'danger')
    }
  }

  const handleCancel = () => {
    navigate('/modules/weeks')
  }

  useEffect(() => {
    if (error) {
      const message = extractErrorMessage(error, 'Failed to load week')
      setFormError(message)
      showToast(message, 'danger')
    }
  }, [error])

  const contentReady = dataLoaded
  const displayError = formError || (error ? extractErrorMessage(error, 'Failed to load week') : null)

  return (
    <div className="week-form-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      {!contentReady ? (
        <div className="week-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading week</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : (
        <>
          <PageHero
            kicker="Weeks Management"
            icon={cilCalendar}
            title={isEdit ? 'Edit Week' : 'Create Week'}
            subtitle={isEdit ? `Week ${currentWeek?.week_number} - ${currentWeek?.year}` : 'Create a new week'}
          />
          {debugEnabled && (
            <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.5rem' }}>
              <strong>Debug Week Payload</strong>
              {'\n'}
              {JSON.stringify(currentWeek, null, 2)}
            </pre>
          )}
          {displayError && <CAlert color="danger">{displayError}</CAlert>}
          <WeekForm
            initialValues={currentWeek}
            loading={loading}
            error={displayError}
            isEdit={isEdit}
            onSubmit={handleSave}
            onCancel={handleCancel}
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
            Week <strong>{savedWeek?.week_no}</strong> has been {isEdit ? 'updated' : 'created'} successfully.
          </p>
          <p className="text-body-secondary mt-2 mb-0">What would you like to do next?</p>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <CButton color="secondary" onClick={() => navigate('/modules/weeks')}>
            Back to List
          </CButton>
          <div className="d-flex gap-2">
            {!isEdit && (
              <CButton
                color="primary"
                className="text-white"
                onClick={() => {
                  setShowSuccessModal(false)
                  setSavedWeek(null)
                  dispatch(setDefaultWeek())
                  navigate('/modules/weeks/create')
                }}
              >
                Create Another
              </CButton>
            )}
            {savedWeek?.week_id && (
              <CButton
                color="info"
                className="text-white"
                onClick={() => {
                  setShowSuccessModal(false)
                  navigate(`/modules/weeks/edit/${savedWeek.week_id}`)
                  dispatch(loadWeek(savedWeek.week_id))
                }}
              >
                {isEdit ? 'Continue Editing' : 'Edit Week'}
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

export default WeekFormPage
