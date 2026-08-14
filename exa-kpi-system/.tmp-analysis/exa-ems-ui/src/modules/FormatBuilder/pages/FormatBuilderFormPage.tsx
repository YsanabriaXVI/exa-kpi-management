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
import CIcon from '@coreui/icons-react'
import PageHero from '../../../components/PageHero'
import { cilCheckCircle, cilFile } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../store'
import {
  clearCurrentFormat,
  createFormat,
  loadFormat,
  loadTripItems,
  setDefaultFormat,
  updateFormat,
} from '../store/formatBuilderSlice'
import FormatBuilderForm from '../components/FormatBuilderForm'
import type { FormatBuilder } from '../types'
import './FormatBuilderForm.scss'
import { loadAttributesList } from '../../Attributes/store/attributesSlice'

const FormatBuilderFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const { currentFormat, loading, error, tripitems } = useSelector((state: RootState) => (state as any).formatbuilder)
  const attributes = useSelector((state: RootState) => (state as any).attributes?.attributes || [])
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedFormat, setSavedFormat] = useState<FormatBuilder | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  const debugEnabled = useMemo(() => {
    if (import.meta.env?.VITE_ATTRIBUTE_FORM_DEBUG === 'true') return true
    const params = new URLSearchParams(location.search)
    return params.get('debugFormatBuilder') === 'true'
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
        dispatch(loadTripItems()),
        (!attributes || !attributes.length)
          ? dispatch(loadAttributesList({ rows: 1000, first: 0, sortField: 'attribute_id', sortOrder: -1 } as any))
          : Promise.resolve(null),
      ])
      setMetadataLoaded(true)
    }
    loadMetadata()

    return () => {
      dispatch(clearCurrentFormat())
    }
  }, [dispatch, id, isEdit])

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        await dispatch(loadFormat(Number(id)))
      } else {
        dispatch(setDefaultFormat())
      }
      setDataLoaded(true)
    }
    loadData()
  }, [dispatch, id, isEdit])

  const attributeOptions = useMemo(() => {
    const mapAttributes = (moduleId: number) =>
      attributes
        .filter((attr: any) => Number(attr.module_id ?? attr.module?.module_id) === moduleId)
        .map((attr: any) => ({
          value: attr.attribute_id ?? attr.id,
          label: attr.name,
        }))
    return {
      driver: mapAttributes(9),
      truck: mapAttributes(3),
      chassis: mapAttributes(24),
      genset: mapAttributes(25),
    }
  }, [attributes])

  const tripOptions = useMemo(() => {
    const filterByType = (type: string) =>
      (tripitems || [])
        .filter((item: any) => item.type === type)
        .map((item: any) => ({
          value: item.tripitem_id ?? item.id,
          label: item.alias || item.name || `Item ${item.tripitem_id ?? item.id}`,
        }))
    return {
      Trip: filterByType('Trip'),
      Client: filterByType('Client'),
      Subdivision: filterByType('Subdivision'),
      Header: filterByType('Header'),
      Footer: filterByType('Footer'),
    }
  }, [tripitems])

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

  const handleSubmit = async (data: FormatBuilder) => {
    try {
      let result: FormatBuilder
      if (isEdit && id) {
        result = await dispatch(updateFormat({ id: Number(id), format: data })).unwrap()
      } else {
        result = await dispatch(createFormat(data)).unwrap()
      }
      setFormError(null)
      setSavedFormat(result)
      setShowSuccessModal(true)
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to save format')
      setFormError(message)
      showToast(message, 'danger')
    }
  }

  const handleCancel = () => {
    navigate('/modules/formatbuilder')
  }

  useEffect(() => {
    if (error) {
      const message = extractErrorMessage(error, 'Failed to load format')
      setFormError(message)
      showToast(message, 'danger')
    }
  }, [error])

  const contentReady = metadataLoaded && dataLoaded
  const displayError = formError || (error ? extractErrorMessage(error, 'Failed to load format') : null)

  return (
    <div className="formatbuilder-form-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      {!contentReady ? (
        <div className="formatbuilder-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading format builder</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : (
        <>
          {debugEnabled && (
            <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.5rem' }}>
              <strong>Debug Format Payload</strong>
              {'\n'}
              {JSON.stringify(currentFormat, null, 2)}
            </pre>
          )}
          {displayError && <CAlert color="danger">{displayError}</CAlert>}
          <FormatBuilderForm
            initialValues={currentFormat}
            loading={loading}
            error={displayError}
            isEdit={isEdit}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            attributeOptions={attributeOptions}
            tripOptions={tripOptions}
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
            Format <strong>{savedFormat?.name}</strong> has been {isEdit ? 'updated' : 'created'} successfully.
          </p>
          <p className="text-body-secondary mt-2 mb-0">What would you like to do next?</p>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <CButton color="secondary" onClick={() => navigate('/modules/formatbuilder')}>
            Back to List
          </CButton>
          <div className="d-flex gap-2">
            {!isEdit && (
              <CButton
                color="primary"
                className="text-white"
                onClick={() => {
                  setShowSuccessModal(false)
                  setSavedFormat(null)
                  dispatch(setDefaultFormat())
                  navigate('/modules/formatbuilder/create')
                }}
              >
                Create Another
              </CButton>
            )}
            {savedFormat?.id && (
              <CButton
                color="info"
                className="text-white"
                onClick={() => {
                  setShowSuccessModal(false)
                  navigate(`/modules/formatbuilder/edit/${savedFormat.id}`)
                  dispatch(loadFormat(savedFormat.id))
                }}
              >
                {isEdit ? 'Continue Editing' : 'Edit Format'}
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

export default FormatBuilderFormPage
