import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  CContainer,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CSpinner,
  CToaster,
  CToast,
  CToastBody,
  CToastClose,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import type { RootState, AppDispatch } from '../../../../store'
import {
  clearCurrentOtherAsset,
  createOtherAsset,
  loadOtherAsset,
  loadOtherAssets,
  loadOtherAssetsAttributes,
  loadVehicleTypes,
  resetFormAttributes,
  updateOtherAsset,
} from '../store/otherAssets.slice'
import { loadCompanies } from '../../../Companies/store/companiesSlice'
import { loadSubdivisions } from '../../Subdivisions/store/subdivisions.slice'
import OtherAssetForm from '../components/OtherAssetForm'
import type { OtherAsset, OtherAssetFormValues } from '../types'
import { MODULE_OTHER_ASSETS, getModuleIdByName } from '../../../../constants/modules'
import PageHero from '../../../../components/PageHero'
import { cilGrid, cilCheckCircle } from '@coreui/icons'
import './OtherAssetForm.scss'
import { authStorage } from '../../../../services/auth/auth.storage'
import { permissionService, UPDATE } from '../../../../services/auth/permission.service'

const DEFAULT_FORM_VALUES: OtherAssetFormValues = {
  otherAssetType: '',
  vehicleType: '',
  company_id: '',
  subdivision_id: '',
  relatedAssetIds: [],
  attributes: {},
}

const normalizeFormValues = (asset?: OtherAsset | null): OtherAssetFormValues => {
  if (!asset) return DEFAULT_FORM_VALUES
  const attrs = asset.attributes || {}
  const vehicleType = attrs['134'] ?? asset.vehicleType

  return {
    assetsid: asset.assetsid,
    otherAssetType: asset.otherAssetType ? String(asset.otherAssetType) : asset.genericname1 ? String(asset.genericname1) : '',
    vehicleType: vehicleType != null ? String(vehicleType) : '',
    company_id: asset.company_id ?? '',
    subdivision_id: asset.subdivisionId ?? asset.subdivision_id ?? '',
    relatedAssetIds: asset.relatedAssetIds || [],
    attributes: attrs,
  }
}

const buildPayload = (values: OtherAssetFormValues) => {
  const payload: any = {
    moduleId: getModuleIdByName(MODULE_OTHER_ASSETS),
    otherAssetType: values.otherAssetType,
    company_id: values.company_id || null,
    subdivision_id: values.subdivision_id || null,
    relatedAssetIds: (values.relatedAssetIds || []).map((id) =>
      typeof id === 'string' && id !== '' ? Number(id) || id : id
    ),
    ...(values.attributes || {}),
  }

  if ((values.otherAssetType === '2' || values.otherAssetType === '3') && values.vehicleType) {
    payload['134'] = values.vehicleType
  }

  return payload
}

const OtherAssetFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()

  const queryParams = new URLSearchParams(location.search)
  const isView = queryParams.get('view') === 'true'
  const isNew = id === 'new' || !id
  const canUpdate = permissionService.checkPermission(getModuleIdByName(MODULE_OTHER_ASSETS), UPDATE)

  // Force view mode if explicitly requested OR user has no update permission for existing records
  const isViewMode = isView || (!isNew && !canUpdate)

  // isEdit means we are working on an existing record AND we are allowed to edit it
  const isEdit = !isNew && !isViewMode

  const otherAssetsState = useSelector((state: RootState) => (state as any).otherAssets || {})
  const companiesState = useSelector((state: RootState) => (state as any).companies || {})
  const subdivisionsState = useSelector((state: RootState) => (state as any).subdivisions || {})

  const {
    list = [],
    current,
    loading,
    error,
    formAttributes = [],
    attributesLoading,
    vehicleTypes = [],
  } = otherAssetsState as any
  const companies = companiesState.companies || []

  // Filter subdivisions for dropdown
  const allSubdivisions = subdivisionsState.list || []
  const [filteredSubdivisions, setFilteredSubdivisions] = useState<any[]>([])

  useEffect(() => {
    const details = authStorage.getDetails()
    const userSubdivisions = details?.details?.subdivisions || []
    
    // VIEW_ALL_SUBDIVISIONS check
    // We check both the standard migration name and the user-referenced name 'All Subdivision' for robustness
    const VIEW_ALL_SUBDIVISIONS = 'View All Subdivisions' 
    const ALL_SUBDIVISION = 'All Subdivision'

    const canViewAll = 
      permissionService.checkPermission(MODULE_OTHER_ASSETS, VIEW_ALL_SUBDIVISIONS) ||
      permissionService.checkPermission(MODULE_OTHER_ASSETS, ALL_SUBDIVISION)
    
    // Debug log to verify what's happening in production
    if (canViewAll) {
      console.log('🔓 [OtherAssets] View All permission granted. Showing all subdivisions.')
      setFilteredSubdivisions(allSubdivisions)
    } else {
      const allowedIds = userSubdivisions
        .map((s: any) => Number(s.subdivision_id))
        .filter((v: number) => !Number.isNaN(v))
        
      console.log('🔒 [OtherAssets] Restricted subdivisions.', { allowedIds })

      if (allowedIds.length > 0) {
        const filtered = allSubdivisions.filter((sub: any) => 
          allowedIds.includes(Number(sub.subdivision_id))
        )
        setFilteredSubdivisions(filtered)
      } else {
          // If no scoped subdivisions and no view all, show empty
          setFilteredSubdivisions([])
      }
    }
  }, [allSubdivisions])

  const subdivisions = filteredSubdivisions

  const [formValues, setFormValues] = useState<OtherAssetFormValues>(DEFAULT_FORM_VALUES)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedAsset, setSavedAsset] = useState<OtherAsset | null>(null)
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  const [toast, addToast] = useState<React.ReactElement | null>(null)
  const toaster = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const loadMetadata = async () => {
      await Promise.all([
        dispatch(loadCompanies()),
        dispatch(loadSubdivisions()),
        dispatch(loadVehicleTypes()),
        dispatch(loadOtherAssets()),
      ])
      setMetadataLoaded(true)
    }
    loadMetadata()

    return () => {
      dispatch(clearCurrentOtherAsset())
      dispatch(resetFormAttributes())
    }
  }, [dispatch])

  useEffect(() => {
    const loadData = async () => {
      // Load data if we have an ID and it's not a new record, regardless of view/edit mode
      if (!isNew && id) {
        await dispatch(loadOtherAsset(id))
      } else {
        dispatch(clearCurrentOtherAsset())
        setFormValues(DEFAULT_FORM_VALUES)
      }
      setDataLoaded(true)
    }
    loadData()
  }, [dispatch, id, isNew])

  useEffect(() => {
    if (current) {
      setFormValues(normalizeFormValues(current))
    }
  }, [current])

  useEffect(() => {
    if (!formValues.otherAssetType) {
      dispatch(resetFormAttributes())
      return
    }
    const needsVehicle = formValues.otherAssetType === '2' || formValues.otherAssetType === '3'
    const vehicleTypeId = needsVehicle ? formValues.vehicleType : undefined
    dispatch(loadOtherAssetsAttributes({ otherAssetType: formValues.otherAssetType, vehicleTypeId }))
  }, [dispatch, formValues.otherAssetType, formValues.vehicleType])

  const relatedAssetOptions = useMemo(() => {
    const assetType = formValues.otherAssetType
    if (!assetType || assetType === '3') return []

    const targetType = assetType === '1' ? '2' : assetType === '2' ? '1' : null
    if (!targetType) return []

    return (list as OtherAsset[])
      .filter((asset: OtherAsset) => {
        const type = String(asset.otherAssetType ?? asset.genericname1 ?? '')
        return type === targetType && asset.assetsid !== formValues.assetsid
      })
      .map((asset: OtherAsset) => {
        const attrs = asset.attributes || {}
        let label =
          attrs['194'] ??
          attrs['137'] ??
          attrs['206'] ??
          attrs['personal_identification'] ??
          `Asset #${asset.assetsid}`

        if (targetType === '1') {
          const first = attrs['195'] ?? attrs['137'] ?? ''
          const last = attrs['196'] ?? ''
          const combined = `${first} ${last}`.trim()
          if (combined) {
            label = combined
          }
        }

        return {
          value: asset.assetsid ?? label,
          label,
        }
      })
  }, [list, formValues.assetsid, formValues.otherAssetType])

  const assetTypeLabel = useMemo(() => {
    const type = (formValues.otherAssetType || '').trim()
    if (type === '1') return 'People'
    if (type === '2') return 'Vehicle'
    if (type === '3') return 'Other'
    return type || '—'
  }, [formValues.otherAssetType])

  const companyName = useMemo(() => {
    const id = formValues.company_id
    if (!id) return '—'
    const match = companies.find((c: any) => String(c.company_id ?? c.id) === String(id))
    return match?.name ?? String(id)
  }, [companies, formValues.company_id])

  const extractErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    if (error?.response?.data?.message) return error.response.data.message
    // Handle array of errors
    if (Array.isArray(error)) {
      return error.map((err) => (typeof err === 'string' ? err : err.message || JSON.stringify(err))).join(', ')
    }
    // Handle object with field errors (e.g., { email: ['Invalid'], name: ['Required'] })
    if (typeof error === 'object') {
      return Object.entries(error)
        .map(([key, value]) => {
          if (Array.isArray(value)) return `${key}: ${value.join(', ')}`
          return `${key}: ${value}`
        })
        .join('; ')
    }
    return 'An unexpected error occurred'
  }

  const showToast = (message: string, color: 'success' | 'danger' = 'success') => {
    addToast(
      <CToast autohide={true} visible={true} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  const handleSubmit = async (values: OtherAssetFormValues) => {
    const payload = buildPayload(values)
    try {
      let result
      if (isEdit && id) {
        result = await dispatch(updateOtherAsset({ id, payload }))
      } else {
        result = await dispatch(createOtherAsset(payload))
      }

      if (result.meta.requestStatus === 'fulfilled') {
        const asset = result.payload as OtherAsset
        setSavedAsset(asset)
        setShowSuccessModal(true)
      } else {
        const errorMsg = extractErrorMessage(result.payload)
        showToast(errorMsg, 'danger')
      }
    } catch (error) {
      console.error('Failed to save other asset', error)
      showToast('An unexpected error occurred', 'danger')
    }
  }

  const contentReady = metadataLoaded && dataLoaded

  return (
    <CContainer fluid>
      {!contentReady ? (
        <div className="other-asset-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading asset information</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : error && !isNew ? (
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          <div className="mb-4">
            <span className="display-1 text-body-secondary">404</span>
          </div>
          <h4 className="mb-3">Asset Not Found or Access Denied</h4>
          <p className="text-body-secondary mb-4">
            We couldn't find the asset you're looking for, or you don't have permission to view it.
          </p>
          <CButton color="primary" className="text-white" onClick={() => navigate('/assets/otherassets')}>
            Back to List
          </CButton>
        </div>
      ) : (
        <>
          <PageHero
            kicker="Other Assets"
            icon={cilGrid}
            title={isViewMode ? 'View Other Asset' : isEdit ? 'Edit Other Asset' : 'Create Other Asset'}
            subtitle={
              (isEdit || isViewMode) && formValues.assetsid
                ? `Asset #${formValues.assetsid}${formValues.attributes?.['194'] ? ` · ${formValues.attributes['194']}` : ''}`
                : 'Manage people, vehicles, and miscellaneous equipment.'
            }
            highlights={
              (isEdit || isViewMode) && formValues.assetsid
                ? [
                    { label: 'Type', value: assetTypeLabel, color: 'info' },
                    { label: 'Company', value: companyName || '—' },
                  ]
                : []
            }
          />
          <OtherAssetForm
            initialValues={formValues}
            attributes={formAttributes}
            vehicleTypes={vehicleTypes}
            companies={companies}
            subdivisions={subdivisions}
            relatedAssetOptions={relatedAssetOptions}
            loading={loading}
            attributesLoading={attributesLoading}
            isEdit={isEdit}
            onSubmit={handleSubmit}
            onChange={setFormValues}
            readOnly={isViewMode}
          />

          <CModal
            alignment="center"
            visible={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            backdrop="static"
          >
            <CModalHeader>
              <CModalTitle className="d-flex align-items-center gap-2">
                <CIcon icon={cilCheckCircle} className="text-success" />
                {isEdit ? 'Asset updated' : 'Asset created'}
              </CModalTitle>
            </CModalHeader>
            <CModalBody>
              <p className="mb-1">
                Asset <strong>{savedAsset?.assetsid || savedAsset?.genericname1 || '—'}</strong> has been{' '}
                {isEdit ? 'updated' : 'created'} successfully.
              </p>
              <p className="text-body-secondary mb-0">What would you like to do next?</p>
            </CModalBody>
            <CModalFooter className="d-flex justify-content-between">
              <CButton color="secondary" onClick={() => navigate('/assets/otherassets')}>
                Back to list
              </CButton>
              <CButton
                color="info"
                className="text-white"
                onClick={() => {
                  if (!isEdit && savedAsset?.assetsid) {
                    navigate(`/assets/otherassets/${savedAsset.assetsid}`)
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
        </>
      )}
    </CContainer>
  )
}

export default OtherAssetFormPage
