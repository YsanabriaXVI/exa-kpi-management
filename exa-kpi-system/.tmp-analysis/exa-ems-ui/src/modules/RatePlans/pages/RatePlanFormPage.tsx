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
} from '@coreui/react-pro'
import PageHero from '../../../components/PageHero'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilMoney } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../store'
import {
  clearCurrentRatePlan,
  createRatePlan,
  loadRatePlan,
  setDefaultRatePlan,
  updateRatePlan,
} from '../store/ratePlansSlice'
import RatePlanForm from '../components/RatePlanForm'
import type { RatePlan } from '../types'
import './RatePlanForm.scss'

const RatePlanFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const { currentRatePlan, loading, error } = useSelector((state: RootState) => (state as any).rateplans)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedPlan, setSavedPlan] = useState<RatePlan | null>(null)

  const debugEnabled = useMemo(() => {
    if (import.meta.env?.VITE_ATTRIBUTE_FORM_DEBUG === 'true') return true
    const params = new URLSearchParams(location.search)
    return params.get('debugRatePlan') === 'true'
  }, [location.search])

  useEffect(() => {
    if (isEdit && id) {
      dispatch(loadRatePlan(Number(id)))
    } else {
      dispatch(setDefaultRatePlan())
    }

    return () => {
      dispatch(clearCurrentRatePlan())
    }
  }, [dispatch, id, isEdit])

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' | 'info') => {
    setToast(
      <CToast autohide={true} delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  const handleSubmit = async (data: RatePlan) => {
    try {
      let result: any
      if (isEdit && id) {
        result = await dispatch(updateRatePlan({ id: Number(id), plan: data }))
      } else {
        result = await dispatch(createRatePlan(data))
      }

      if (result.meta.requestStatus === 'fulfilled') {
        setSavedPlan(result.payload)
        setShowSuccessModal(true)
      } else {
        throw new Error(result.payload || 'Failed to save rate plan')
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'An error occurred while saving the rate plan.'}`, 'danger')
    }
  }

  const handleCancel = () => {
    navigate('/modules/rateplans')
  }

  return (
    <div className="rateplan-form-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      {debugEnabled && (
        <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.5rem' }}>
          <strong>Debug Rate Plan Payload</strong>
          {'\n'}
          {JSON.stringify(currentRatePlan, null, 2)}
        </pre>
      )}
      <RatePlanForm
        initialValues={currentRatePlan}
        loading={loading}
        error={error}
        isEdit={isEdit}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />

      <CModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilCheckCircle} className="text-success me-2" size="lg" />
            Success!
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Rate Plan <strong>{savedPlan?.name}</strong> has been {isEdit ? 'updated' : 'created'} successfully.
          </p>
          <p className="text-body-secondary mt-2 mb-0">What would you like to do next?</p>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <CButton color="secondary" onClick={() => navigate('/modules/rateplans')}>
            Back to List
          </CButton>
          <div className="d-flex gap-2">
            {!isEdit && (
              <CButton
                color="primary"
                className="text-white"
                onClick={() => {
                  setShowSuccessModal(false)
                  setSavedPlan(null)
                  dispatch(setDefaultRatePlan())
                  navigate('/modules/rateplans/create')
                }}
              >
                Create Another
              </CButton>
            )}
            {savedPlan?.id && (
              <CButton
                color="info"
                className="text-white"
                onClick={() => {
                  setShowSuccessModal(false)
                  navigate(`/modules/rateplans/edit/${savedPlan.id}`)
                  dispatch(loadRatePlan(savedPlan.id))
                }}
              >
                {isEdit ? 'Continue Editing' : 'Edit Rate Plan'}
              </CButton>
            )}
          </div>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default RatePlanFormPage
