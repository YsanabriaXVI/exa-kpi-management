import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CContainer,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilBadge, cilClipboard, cilHome, cilCheckCircle } from '@coreui/icons'
import { AppDispatch, RootState } from '../../../../store'
import { clearCurrentSubdivision, createSubdivision, loadSubdivision, updateSubdivision } from '../store/subdivisions.slice'
import SubdivisionForm from '../components/SubdivisionForm'
import { Subdivision } from '../types'
import './SubdivisionForm.scss'
import Comments from '../../../../components/Comments/Comments'
import Attachments from '../../../../components/Attachments/Attachments'
import {
  ATTACHMENT_READ,
  ATTACHMENT_UPDATE,
  COMMENT_READ,
  COMMENT_UPDATE,
  permissionService,
  UPDATE,
} from '../../../../services/auth/permission.service'
import { MODULE_SUBDIVISION, getModuleIdByName } from '../../../../constants/modules'

const defaultValues: Subdivision = {
  name: '',
  reference: '',
  email: '',
  phone: '',
  exchange_rate: '',
  active: '1',
}

const SubdivisionFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const isView = queryParams.get('view') === 'true'
  const isNew = id === 'new' || !id
  const canUpdate = permissionService.checkPermission(getModuleIdByName(MODULE_SUBDIVISION), UPDATE)
  
  // Force view mode if explicitly requested OR user has no update permission for existing records
  const isViewMode = isView || (!isNew && !canUpdate)
  
  // isEdit means we are working on an existing record AND we are allowed to edit it
  const isEdit = !isNew && !isViewMode
  const moduleId = getModuleIdByName(MODULE_SUBDIVISION)

  const { currentSubdivision, loading } = useSelector((state: RootState) => (state as any).subdivisions)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedSubdivision, setSavedSubdivision] = useState<Subdivision | null>(null)

  useEffect(() => {
    // Load data if we have an ID and it's not a new record, regardless of view/edit mode
    if (!isNew && id) {
      dispatch(loadSubdivision(id))
    } else {
      dispatch(clearCurrentSubdivision())
    }
    return () => {
      dispatch(clearCurrentSubdivision())
    }
  }, [dispatch, id, isNew])

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

  const initialValues: Subdivision = useMemo(() => {
    return currentSubdivision ? { ...defaultValues, ...currentSubdivision } : defaultValues
  }, [currentSubdivision])

  const handleSubmit = async (values: Subdivision) => {
    try {
      let result: any
      if (isEdit && id) {
        result = await dispatch(updateSubdivision({ id, subdivision: values }))
      } else {
        result = await dispatch(createSubdivision(values))
      }

      if (result.meta.requestStatus === 'fulfilled') {
        setSavedSubdivision(result.payload)
        setShowSuccessModal(true)
        if (!isEdit && result.payload?.subdivision_id) {
          dispatch(loadSubdivision(result.payload.subdivision_id))
        }
      } else {
        const errorMsg = extractErrorMessage(result.payload, 'Failed to save subdivision')
        showToast(errorMsg, 'danger')
      }
    } catch (error) {
       showToast('An unexpected error occurred', 'danger')
    }
  }

  // Wait until loading is done. 
  // If it's a new record (!id or id='new'), we don't need to wait for loading.
  // If existing record, wait for loading or data.
  const contentReady = isNew || Boolean(currentSubdivision) || !loading

  if (!contentReady) {
    return (
      <div className="subdivision-form-loading d-flex flex-column align-items-center justify-content-center">
        <CSpinner color="primary" size="xl" className="mb-3" />
        <div className="text-center">
          <div className="fw-semibold">Loading subdivision information</div>
          <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
        </div>
      </div>
    )
  }

  const numericSubdivisionId =
    currentSubdivision?.subdivision_id ??
    (id && id !== 'new' && !Number.isNaN(Number(id)) ? Number(id) : null)

  const canViewComments = permissionService.checkPermission(moduleId, COMMENT_READ)
  const canViewAttachments = permissionService.checkPermission(moduleId, ATTACHMENT_READ)
  const canManageComments = permissionService.checkPermission(moduleId, COMMENT_UPDATE)
  const canManageAttachments = permissionService.checkPermission(moduleId, ATTACHMENT_UPDATE)

  const handleCloseSuccessModal = () => setShowSuccessModal(false)

  const handleGoToList = () => {
    setShowSuccessModal(false)
    navigate('/assets/subdivisions')
  }

  const handleContinueEditing = () => {
    const targetId =
      savedSubdivision?.subdivision_id ??
      savedSubdivision?.id ??
      (id && id !== 'new' ? id : null)
    if (targetId) {
      const normalized = String(targetId)
      navigate(`/assets/subdivisions/${normalized}`)
      dispatch(loadSubdivision(normalized))
    }
    setShowSuccessModal(false)
  }

  return (
    <CContainer fluid className="subdivision-form-page">
      <CCard className="subdivision-hero-card shadow-sm border-0 mb-4">
        <CCardBody className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <div className="text-uppercase text-body-secondary fw-semibold small">Subdivision Management</div>
            <h3 className="d-flex align-items-center gap-2 mb-1">
              <CIcon icon={cilHome} className="text-primary" />
              {isViewMode ? 'View Subdivision' : isEdit ? 'Edit Subdivision' : 'Create Subdivision'}
            </h3>
            <div className="text-body-secondary">
              {isViewMode 
                ? `View details for subdivision #${currentSubdivision?.subdivision_id || '—'}` 
                : isEdit
                  ? `ID #${(currentSubdivision?.subdivision_id ?? id) || '—'} · ${currentSubdivision?.name || ''}`.trim()
                  : 'Register a new subdivision and configure settings'}
            </div>
          </div>
          {(isEdit || isViewMode) && (
            <div className="d-flex align-items-center gap-3 flex-wrap">
              {currentSubdivision?.active !== undefined && (
                <CBadge color="info" shape="rounded-pill" className="px-3 py-2 d-flex align-items-center">
                  <CIcon icon={cilClipboard} className="me-2" />
                  {String(currentSubdivision.active) === '1' || currentSubdivision.active === true ? 'Active' : 'Inactive'}
                </CBadge>
              )}
              {currentSubdivision?.name && (
                <CBadge color="primary" shape="rounded-pill" className="px-3 py-2 d-flex align-items-center">
                  <CIcon icon={cilBadge} className="me-2" />
                  {currentSubdivision.name}
                </CBadge>
              )}
            </div>
          )}
        </CCardBody>
      </CCard>

      <SubdivisionForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        loading={loading}
        readOnly={isViewMode}
        subdivisionId={numericSubdivisionId}
      />

      {(isEdit || (isViewMode && numericSubdivisionId)) && numericSubdivisionId && (
        <div className="mt-4 d-flex flex-column gap-3">
          {canViewComments && (
            <Comments
              moduleId={moduleId}
              itemId={Number(numericSubdivisionId)}
              canAdd={canManageComments}
              canEdit={canManageComments}
              canDelete={canManageComments}
            />
          )}
          {canViewAttachments && (
            <Attachments
              moduleId={moduleId}
              itemId={Number(numericSubdivisionId)}
              canAdd={canManageAttachments}
              canDelete={canManageAttachments}
              canView={canViewAttachments}
            />
          )}
        </div>
      )}

      <CModal visible={showSuccessModal} onClose={handleCloseSuccessModal} alignment="center" backdrop="static">
        <CModalHeader>
          <CModalTitle className="d-flex align-items-center gap-2">
            <CIcon icon={cilCheckCircle} className="text-success" />
            {savedSubdivision?.name || 'Subdivision'} saved
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Subdivision <strong>{savedSubdivision?.name || savedSubdivision?.subdivision_id || '—'}</strong> has been{' '}
            {isEdit ? 'updated' : 'created'} successfully.
          </p>
          <p className="text-body-secondary mt-2 mb-0">What would you like to do next?</p>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <CButton color="secondary" onClick={handleGoToList}>
            Back to List
          </CButton>
          <CButton color="info" className="text-white" onClick={handleContinueEditing}>
            Continue Editing
          </CButton>
        </CModalFooter>
      </CModal>
      <CToaster ref={toaster} push={toast} placement="top-end" />
    </CContainer>
  )
}

export default SubdivisionFormPage
