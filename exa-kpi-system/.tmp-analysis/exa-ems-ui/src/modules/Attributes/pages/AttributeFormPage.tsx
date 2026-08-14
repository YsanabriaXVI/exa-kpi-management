import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AttributeForm from '../components/AttributeForm'
import type { RootState, AppDispatch } from '../../../store'
import {
  clearCurrentAttribute,
  createAttribute,
  loadAttribute,
  loadFieldTypes,
  loadModules,
  setDefaultAttribute,
  updateAttribute,
} from '../store/attributesSlice'
import type { Attribute } from '../types'
import './AttributeForm.scss'
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
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilXCircle, cilTags } from '@coreui/icons'
import PageHero from '../../../components/PageHero'

const AttributeFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const { currentAttribute, modules, fieldTypes, loading, error } = useSelector(
    (state: RootState) => state.attributes
  )
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedAttribute, setSavedAttribute] = useState<Attribute | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  const debugEnabled = useMemo(() => {
    if (import.meta.env?.VITE_ATTRIBUTE_FORM_DEBUG === 'true') return true
    const params = new URLSearchParams(location.search)
    return params.get('debugAttributeForm') === 'true'
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
    const loadMetadata = async () => {
      await Promise.all([
        dispatch(loadModules()),
        dispatch(loadFieldTypes()),
      ])
      setMetadataLoaded(true)
    }
    loadMetadata()

    return () => {
      dispatch(clearCurrentAttribute())
    }
  }, [dispatch])

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        await dispatch(loadAttribute(Number(id)))
      } else {
        dispatch(setDefaultAttribute())
      }
      setDataLoaded(true)
    }
    loadData()
  }, [dispatch, id, isEdit])

  useEffect(() => {
    if (error) {
      const message = extractErrorMessage(error, 'Failed to load attribute')
      setFormError(message)
      showToast(message, 'danger')
    }
  }, [error])

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' | 'info') => {
    if (!message) return
    setToast(
      <CToast autohide={true} delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  const handleSubmit = async (data: Attribute) => {
    try {
      let result: Attribute
      if (isEdit && id) {
        result = await dispatch(updateAttribute({ id: Number(id), attribute: data })).unwrap()
      } else {
        result = await dispatch(createAttribute(data)).unwrap()
      }
      setFormError(null)
      setSavedAttribute(result)
      setShowSuccessModal(true)
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to save attribute')
      setFormError(message)
      showToast(message, 'danger')
    }
  }

  const handleCancel = () => {
    navigate('/modules/attributes')
  }

  const contentReady = metadataLoaded && dataLoaded
  const displayError = formError || (error ? extractErrorMessage(error, 'Failed to load attribute') : null)

  return (
    <div className="attribute-form-page">
      {!contentReady ? (
        <div className="attribute-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading attribute information</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : (
        <>
          <CToaster ref={toaster} push={toast} placement="top-end" />
          {debugEnabled && (
            <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.5rem' }}>
              <strong>Debug Attribute Payload</strong>
              {'\n'}
              {JSON.stringify(currentAttribute, null, 2)}
            </pre>
          )}
          {displayError && <CAlert color="danger">{displayError}</CAlert>}
          <AttributeForm
            initialValues={currentAttribute}
            modules={modules}
            fieldTypes={fieldTypes}
            loading={loading}
            error={displayError}
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
                Attribute <strong>{savedAttribute?.name}</strong> has been {isEdit ? 'updated' : 'created'} successfully.
              </p>
              <p className="text-body-secondary mt-2 mb-0">What would you like to do next?</p>
            </CModalBody>
            <CModalFooter className="d-flex justify-content-between">
              <CButton color="secondary" onClick={() => navigate('/modules/attributes')}>
                Back to List
              </CButton>
              <div className="d-flex gap-2">
                {!isEdit && (
                  <CButton
                    color="primary"
                    className="text-white"
                    onClick={() => {
                      setShowSuccessModal(false)
                      setSavedAttribute(null)
                      dispatch(setDefaultAttribute())
                      navigate('/modules/attributes/create')
                    }}
                  >
                    Create Another
                  </CButton>
                )}
                {savedAttribute?.attribute_id && (
                  <CButton
                    color="info"
                    className="text-white"
                    onClick={() => {
                      setShowSuccessModal(false)
                      navigate(`/modules/attributes/edit/${savedAttribute.attribute_id}`)
                      dispatch(loadAttribute(savedAttribute.attribute_id))
                    }}
                  >
                    {isEdit ? 'Continue Editing' : 'Edit Attribute'}
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

export default AttributeFormPage
