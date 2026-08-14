import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation } from 'react-router-dom'

import {
  CBadge,
  CButton,
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
import { cilCheckCircle, cilUser } from '@coreui/icons'
import PageHero from '../../../../components/PageHero'
import { AppDispatch, RootState } from '../../../../store'
import { clearCurrentClient, createClient, loadClient, updateClient } from '../store/clients.slice'
import ClientForm from '../components/ClientForm'
import { Client, DepotSetup } from '../types'
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
import { MODULE_CLIENTS, getModuleIdByName } from '../../../../constants/modules'
import { rateRoutesAPI } from '../../RateRoutes/api/rateRoutes.api'
import { subdivisionsAPI } from '../../Subdivisions/api/subdivisions.api'
import { depotSetupAPI } from '../api/depotSetups.api'
import '../styles/ClientForm.scss'

interface SelectOption {
  value: string
  label: string
}

const defaultValues: Client = {
  name: '',
  reference: '',
  email: '',
  phone: '',
  exchange_rate: '',
  active: '1',
  skip_routes_inv: [],
  skip_routes_pay: [],
  skip_subdivision: [],
  all_routes_inv: '0',
  all_routes_pay: '0',
  all_subdivision_pay: '0',
}

const normalizeRouteOption = (route: any): SelectOption | null => {
  if (!route) return null
  const value =
    route.route_id ??
    route.id ??
    route.routeId ??
    route.value ??
    route.asset_id ??
    null
  if (value === undefined || value === null) return null
  const label =
    route.name ||
    route.route ||
    [route.city_a?.code, route.city_b?.code].filter(Boolean).join(' - ') ||
    `Route ${value}`
  return { value: String(value), label }
}

const normalizeSubdivisionOption = (subdivision: any): SelectOption | null => {
  if (!subdivision) return null
  const value = subdivision.subdivision_id ?? subdivision.id ?? subdivision.value ?? null
  if (value === undefined || value === null) return null
  const label = subdivision.name || subdivision.reference || `Subdivision ${value}`
  return { value: String(value), label }
}

const isTruthyFlag = (value: any) => value === true || value === 1 || value === '1'

const ClientFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const isView = queryParams.get('view') === 'true'
  const isNew = id === 'new' || !id
  const moduleId = getModuleIdByName(MODULE_CLIENTS)
  const canUpdate = permissionService.checkPermission(moduleId, UPDATE)

  // Force view mode if explicitly requested OR user has no update permission for existing records
  const isViewMode = isView || (!isNew && !canUpdate)

  // isEdit means we are working on an existing record AND we are allowed to edit it
  const isEdit = !isNew && !isViewMode

  const { currentClient, loading } = useSelector((state: RootState) => (state as any).clients)

  const [routesOptions, setRoutesOptions] = useState<SelectOption[]>([])
  const [subdivisionOptions, setSubdivisionOptions] = useState<SelectOption[]>([])
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedClient, setSavedClient] = useState<Client | null>(null)
  const [depotSetups, setDepotSetups] = useState<DepotSetup[]>([])
  const [depotLoading, setDepotLoading] = useState(false)
  const [depotError, setDepotError] = useState<string | null>(null)
  const [togglingSetupId, setTogglingSetupId] = useState<number | null>(null)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const toaster = React.useRef<any>()
  const [toast, setToast] = useState<any>(null)

  useEffect(() => {
    if (!isNew && id) {
      dispatch(loadClient(id))
    } else {
      dispatch(clearCurrentClient())
    }
    return () => {
      dispatch(clearCurrentClient())
    }
  }, [dispatch, id, isEdit])

  useEffect(() => {
    let cancelled = false
    const loadMetadata = async () => {
      try {
        const [routes, subdivisions] = await Promise.all([
          rateRoutesAPI.getRateRoutes().catch(() => []),
          subdivisionsAPI.getSubdivisions().catch(() => []),
        ])
        if (cancelled) return
        setRoutesOptions(
          (routes || [])
            .map(normalizeRouteOption)
            .filter(Boolean) as SelectOption[]
        )
        setSubdivisionOptions(
          (subdivisions || [])
            .map(normalizeSubdivisionOption)
            .filter(Boolean) as SelectOption[]
        )
      } catch (error) {
        console.error('Failed to load client metadata', error)
      } finally {
        if (!cancelled) {
          setMetadataLoaded(true)
        }
      }
    }

    loadMetadata()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (isNew || !id) {
      setDepotSetups([])
      return
    }
    setDepotLoading(true)
    depotSetupAPI
      .getClientSetups(id)
      .then((setups) => {
        if (cancelled) return
        setDepotError(null)
        setDepotSetups(Array.isArray(setups) ? setups : [])
      })
      .catch((error) => {
        console.error('Failed to load depot setups', error)
        if (!cancelled) {
          setDepotError('Unable to load depot setups right now.')
          setDepotSetups([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDepotLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, isEdit])

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

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' | 'info') => {
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

  const initialValues = React.useMemo<Client>(
    () => (currentClient ? { ...defaultValues, ...currentClient } : { ...defaultValues }),
    [currentClient]
  )

  const handleSubmit = async (values: Client) => {
    setSubmitError(null)
    try {
      let result: any
      if (isEdit && id) {
        result = await dispatch(updateClient({ id, client: values }))
      } else {
        result = await dispatch(createClient(values))
      }

      if (result.meta.requestStatus === 'fulfilled') {
        setSavedClient(result.payload)
        setShowSuccessModal(true)
        if (!isEdit && result.payload?.client_id) {
            dispatch(loadClient(result.payload.client_id))
        }
      } else {
        const payload = result.payload
        let errorMessage = 'Failed to save client'
        
        if (payload && typeof payload === 'object') {
            if (payload.data && typeof payload.data === 'object') {
                const firstKey = Object.keys(payload.data)[0]
                if (firstKey && payload.data[firstKey]) {
                  const errorValue = payload.data[firstKey]
                  if (Array.isArray(errorValue)) {
                    errorMessage = errorValue[0] || 'Unknown validation error'
                  } else {
                    errorMessage = String(errorValue)
                  }
                }
            } else if (payload.message) {
                errorMessage = payload.message
            } else if (typeof payload === 'string') {
                errorMessage = payload
            }
        } else if (typeof payload === 'string') {
            errorMessage = payload
        }
        
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      console.error('Failed to save client:', error)
      const message = error.message || extractErrorMessage(error, 'Failed to save client. Please check your input and try again.')
      setSubmitError(message)
      showToast(message, 'danger')
    }
  }

  const handleAddDepot = () => {
    if (!isEdit || !id) return
    navigate(`/assets/clients/${id}/depot-setup/new`)
  }

  const handleEditDepot = (setupId: number | string) => {
    if (!isEdit || !id) return
    navigate(`/assets/clients/${id}/depot-setup/${setupId}`)
  }

  const handleViewDepot = (setupId: number | string) => {
    if (!isEdit || !id) return
    navigate(`/assets/clients/${id}/depot-setup/${setupId}`, {state: { viewMode: true }})
  }

  const handleToggleDepotActive = async (setup: DepotSetup) => {
    if (!setup?.setupId) return
    try {
      setTogglingSetupId(setup.setupId)
      const nextActive = isTruthyFlag(setup.active) ? 0 : 1
      const updated = await depotSetupAPI.updateDepotSetup(setup.setupId, {
        ...setup,
        active: nextActive,
      })
      setDepotSetups((prev) =>
        prev.map((item) => (item.setupId === updated.setupId ? updated : item))
      )
    } catch (error) {
      console.error('Failed to update depot setup', error)
      alert('Unable to update the depot setup. Please try again.')
    } finally {
      setTogglingSetupId(null)
    }
  }

  const contentReady = metadataLoaded && (isNew || currentClient)

  if (!contentReady) {
    return (
      <div className="client-form-loading d-flex flex-column align-items-center justify-content-center">
        <CSpinner color="primary" size="xl" className="mb-3" />
        <div className="text-center">
          <div className="fw-semibold">Loading client information</div>
          <small className="text-body-secondary">Please wait while we prepare the form.</small>
        </div>
      </div>
    )
  }

  const numericClientId =
    currentClient?.client_id ?? (id && id !== 'new' && !Number.isNaN(Number(id)) ? Number(id) : null)

  const canViewComments = permissionService.checkPermission(moduleId, COMMENT_READ)
  const canViewAttachments = permissionService.checkPermission(moduleId, ATTACHMENT_READ)
  const canManageComments = permissionService.checkPermission(moduleId, COMMENT_UPDATE)
  const canManageAttachments = permissionService.checkPermission(moduleId, ATTACHMENT_UPDATE)

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false)
  }

  const handleGoToList = () => {
    setShowSuccessModal(false)
    navigate('/assets/clients')
  }

  const handleContinueEditing = () => {
    const targetId = savedClient?.client_id ?? savedClient?.id ?? (id && id !== 'new' ? id : null)
    if (targetId) {
      const nextId = String(targetId)
      navigate(`/assets/clients/${nextId}`)
      dispatch(loadClient(nextId))
    }
    setShowSuccessModal(false)
  }

  const heroActions = !isNew ? (
    <div className="d-flex flex-wrap gap-2">
      {currentClient?.active !== undefined && (
        <CBadge
          color={isTruthyFlag(currentClient.active) ? 'success' : 'secondary'}
          shape="rounded-pill"
          className="px-3 py-2"
        >
          {isTruthyFlag(currentClient.active) ? 'Active' : 'Inactive'}
        </CBadge>
      )}
      {currentClient?.name && (
        <CBadge color="primary" shape="rounded-pill" className="px-3 py-2">
          {currentClient.name}
        </CBadge>
      )}
    </div>
  ) : undefined

  return (
    <CContainer fluid className="client-form-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <PageHero
        kicker="Client Management"
        icon={cilUser}
        title={isViewMode ? 'View Client' : isEdit ? 'Edit Client' : 'Create Client'}
        subtitle={
          !isNew
            ? `Client #${(currentClient?.client_id ?? id) || '—'}`
            : 'Register a new client and configure billing preferences'
        }
        actions={heroActions}
      />

      <ClientForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        loading={loading}
        submitError={submitError}
        routesOptions={routesOptions}
        subdivisionOptions={subdivisionOptions}
        isEdit={isEdit}
        depotSetups={depotSetups}
        depotLoading={depotLoading}
        depotError={depotError}
        togglingSetupId={togglingSetupId}
        onAddDepotSetup={handleAddDepot}
        onEditDepotSetup={handleEditDepot}
        handleViewDepot={handleViewDepot}
        onToggleDepotActive={handleToggleDepotActive}
        readOnly={isViewMode}
      />

      {!isNew && numericClientId && (
        <div className="mt-4 d-flex flex-column gap-3">
          {canViewComments && (
            <Comments
              moduleId={moduleId}
              itemId={Number(numericClientId)}
              canAdd={canManageComments}
              canEdit={canManageComments}
              canDelete={canManageComments}
            />
          )}
          {canViewAttachments && (
            <Attachments
              moduleId={moduleId}
              itemId={Number(numericClientId)}
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
            {savedClient?.name || 'Client'} saved
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Client <strong>{savedClient?.name || savedClient?.client_id || '—'}</strong> has been{' '}
            {!isNew ? 'updated' : 'created'} successfully.
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
    </CContainer>
  )
}

export default ClientFormPage
