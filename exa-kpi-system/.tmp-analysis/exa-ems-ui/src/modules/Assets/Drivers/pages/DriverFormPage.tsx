import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  CButton,
  CCol,
  CContainer,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilUser } from '@coreui/icons'
import { AppDispatch, RootState } from '../../../../store'
import { clearCurrentDriver, createDriver, loadDriver, updateDriver } from '../store/drivers.slice'
import DriverForm from '../components/DriverForm'
import { Driver } from '../types'
import PageHero from '../../../../components/PageHero'
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
import { MODULE_DRIVERS, getModuleIdByName } from '../../../../constants/modules'
import './DriverForm.scss'
import { driversAPI } from '../api/drivers.api'
import { subdivisionsAPI } from '../../Subdivisions/api/subdivisions.api'
import { trucksAPI } from '../../Trucks/api/trucks.api'

const defaultValues: Driver = {
  first_name: '',
  last_name: '',
  years_of_experience: '',
  hiring_date: '',
  subdivision: '',
  telephone_1_honduras: '',
  telephone_2_nicaragua: '',
  telephone_3_el_salvador: '',
  telephone_4_guatemala: '',
  truck_assigned: '',
  driver_status: '',
  rtn: '',
  address: '',
  internal_identification: '',
  vuceh_coments: '',
  vuceh_code: '',
  generic_name1: '',
  generic_value1: '',
  generic_name2: '',
  generic_value2: '',
  generic_name3: '',
  generic_value3: '',
}

const attributeFieldMap: Record<string, string[]> = {
  first_name: ['21'],
  last_name: ['22'],
  years_of_experience: ['23'],
  hiring_date: ['24'],
  subdivision: ['25'],
  telephone_1_honduras: ['4', '60'],
  telephone_2_nicaragua: ['26', '61'],
  telephone_3_el_salvador: ['58'],
  telephone_4_guatemala: ['59'],
  truck_assigned: ['27'],
  driver_status: ['75'],
  rtn: ['95'],
  vuceh_coments: ['101'],
  vuceh_code: ['103'],
  address: ['107'],
  internal_identification: ['108'],
}

const SUBDIVISION_ATTRIBUTE_IDS = (attributeFieldMap.subdivision || []).map((id) => Number(id))
const TRUCK_ASSIGNED_ATTRIBUTE_IDS = (attributeFieldMap.truck_assigned || []).map((id) => Number(id))

const normalizeDriverForForm = (driver?: Driver): Driver => {
  if (!driver) return defaultValues
  const attrs = driver.attributes || {}
  const flattened: Record<string, any> = {}

  Object.entries(attributeFieldMap).forEach(([fieldKey, attrIds]) => {
    if (driver[fieldKey] !== undefined) {
      flattened[fieldKey] = driver[fieldKey]
      return
    }
    for (const attrId of attrIds) {
      if (attrs[attrId] !== undefined) {
        flattened[fieldKey] = attrs[attrId]
        break
      }
    }
  })

  return {
    ...defaultValues,
    ...driver,
    ...flattened,
    attributes: attrs,
  }
}

const mapFormToPayload = (values: Driver): Driver => {
  const baseAttributes = values.attributes || {}
  const mappedAttributes: Record<string, any> = { ...baseAttributes }

  Object.entries(attributeFieldMap).forEach(([fieldKey, attrIds]) => {
    if (values[fieldKey] !== undefined) {
      mappedAttributes[attrIds[0]] = values[fieldKey]
    }
  })

  return {
    ...values,
    attributes: mappedAttributes,
  }
}

const DriverFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const isView = queryParams.get('view') === 'true'
  const canUpdate = permissionService.checkPermission(MODULE_DRIVERS, UPDATE)
  
  const isNew = !id || id === 'new'
  const isViewMode = isView || (!isNew && !canUpdate)
  const isEdit = !isNew && !isViewMode
  const moduleId = getModuleIdByName(MODULE_DRIVERS)
  const [attributeOptions, setAttributeOptions] = useState<
    Record<string, { value: string | number; label: string }[]>
  >({})
  const [subdivisionLabels, setSubdivisionLabels] = useState<Record<string | number, string>>({})
  const [truckLabels, setTruckLabels] = useState<Record<string | number, string>>({})
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedDriverData, setSavedDriverData] = useState<Driver | null>(null)

  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const toaster = React.useRef<any>()
  const [toast, setToast] = useState<any>(null)

  const { currentDriver, loading } = useSelector((state: RootState) => (state as any).drivers)

  useEffect(() => {
    if (!isNew && id) {
      dispatch(loadDriver(id))
    } else {
      dispatch(clearCurrentDriver())
    }
    return () => {
      dispatch(clearCurrentDriver())
    }
  }, [dispatch, id, isNew])

  useEffect(() => {
    const loadAttributeOptions = async () => {
      try {
        const [attributes, subdivisions, trucks] = await Promise.all([
          driversAPI.getAttributesWithItems(),
          subdivisionsAPI.getSubdivisions().catch(() => []),
          trucksAPI.getTruckNames().catch(() => []),
        ])
        const subdivisionNameMap: Record<string | number, string> = {}
        ;(subdivisions || []).forEach((subdivision: any) => {
          const rawId =
            subdivision.subdivision_id ??
            subdivision.id ??
            subdivision.subdivisionId ??
            subdivision.value ??
            null
          if (rawId === undefined || rawId === null) return
          const label = subdivision.name || subdivision.reference || `Subdivision ${rawId}`
          subdivisionNameMap[String(rawId)] = label
        })
        const truckNameMap: Record<string | number, string> = {}
        ;(trucks || []).forEach((truck: any) => {
          const rawId =
            truck.asset_id ??
            truck.id ??
            truck.assetId ??
            truck.truck_id ??
            truck.value ??
            null
          if (rawId === undefined || rawId === null) return
          const label = truck.truck_plate || truck.plate || truck.name || `Truck ${rawId}`
          truckNameMap[String(rawId)] = label
        })
        const optionsMap: Record<string, { value: string | number; label: string }[]> = {}
        attributes.forEach((attr: any) => {
          const items = (attr.items || [])
            .filter((item: any) => item.status === 1 || item.status === '1' || item.status === true)
            .map((item: any) => {
              const rawValue = item.attribute_item_id ?? item.id ?? item.attributeItemId ?? item.value ?? ''
              const normalizedAttrName =
                (attr.flat_name_id || attr.flatNameId || attr.flat_name || attr.name || '')
                  .toString()
                  .toLowerCase()
                  .replace(/\s+/g, '_')
              const attrNumericId = Number(attr.attribute_id ?? attr.id ?? 0)
              const isSubdivisionField =
                normalizedAttrName === 'subdivision' || SUBDIVISION_ATTRIBUTE_IDS.includes(attrNumericId)
              const isTruckAssignedField =
                normalizedAttrName === 'truck_assigned' || TRUCK_ASSIGNED_ATTRIBUTE_IDS.includes(attrNumericId)
              const label =
                (isSubdivisionField && subdivisionNameMap[String(rawValue)]) ||
                (isTruckAssignedField && truckNameMap[String(rawValue)]) ||
                item.name ||
                item.label ||
                String(rawValue)
              return { value: rawValue, label }
            })
          if (items.length > 0) {
            const key =
              attr.flat_name_id ||
              attr.flatNameId ||
              attr.flat_name ||
              attr.name?.toLowerCase().replace(/\s+/g, '_') ||
              String(attr.attribute_id || attr.id || '')
            optionsMap[key] = items
          }
        })
        if (!optionsMap.subdivision && Object.keys(subdivisionNameMap).length) {
          optionsMap.subdivision = Object.entries(subdivisionNameMap).map(([value, label]) => ({
            value,
            label,
          }))
        }
        if (!optionsMap.truck_assigned && Object.keys(truckNameMap).length) {
          optionsMap.truck_assigned = Object.entries(truckNameMap).map(([value, label]) => ({
            value,
            label,
          }))
        }
        setAttributeOptions(optionsMap)
        setSubdivisionLabels(subdivisionNameMap)
        setTruckLabels(truckNameMap)
      } catch (error) {
        console.error('Failed to load driver attributes', error)
      } finally {
        setMetadataLoaded(true)
      }
    }

    loadAttributeOptions()
  }, [])

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

  const initialValues: Driver = normalizeDriverForForm(currentDriver || undefined)

  const handleSubmit = async (values: Driver) => {
    try {
      const payload = mapFormToPayload(values)
      let result: any
      if (isEdit && id) {
        result = await dispatch(updateDriver({ id, driver: payload }))
      } else {
        result = await dispatch(createDriver(payload))
      }

      if (result.meta.requestStatus === 'fulfilled') {
        setSavedDriverData(result.payload)
        setShowSuccessModal(true)
      } else {
        const payload = result.payload
        let errorMessage = 'Failed to save driver'
        
        if (payload && typeof payload === 'object') {
           if (payload.data && typeof payload.data === 'object') {
             const firstKey = Object.keys(payload.data)[0]
             if (firstKey && payload.data[firstKey]) {
               errorMessage = payload.data[firstKey]
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
      const message = error.message || extractErrorMessage(error, 'Failed to save driver')
      setFormError(message)
      showToast(message, 'danger')
    }
  }

  const contentReady = metadataLoaded && (isNew || currentDriver)

  if (!contentReady) {
    return (
      <div className="driver-form-loading d-flex flex-column align-items-center justify-content-center">
        <CSpinner color="primary" size="xl" className="mb-3" />
        <div className="text-center">
          <div className="fw-semibold">Loading driver information</div>
          <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
        </div>
      </div>
    )
  }

  const numericAssetId =
    currentDriver?.asset_id ?? (id && id !== 'new' && !Number.isNaN(Number(id)) ? Number(id) : null)
  const canViewComments = permissionService.checkPermission(moduleId, COMMENT_READ)
  const canViewAttachments = permissionService.checkPermission(moduleId, ATTACHMENT_READ)
  const canManageComments = permissionService.checkPermission(moduleId, COMMENT_UPDATE)
  const canManageAttachments = permissionService.checkPermission(moduleId, ATTACHMENT_UPDATE)
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false)
  }

  const handleGoToList = () => {
    setShowSuccessModal(false)
    navigate('/assets/drivers')
  }

  const handleContinueEditing = () => {
    const targetId =
      savedDriverData?.asset_id ??
      savedDriverData?.id ??
      (id && id !== 'new' ? id : null)
    if (targetId) {
      const normalizedId = String(targetId)
      navigate(`/assets/drivers/${normalizedId}`)
      dispatch(loadDriver(normalizedId))
    }
    setShowSuccessModal(false)
  }

  return (
    <CContainer fluid className="driver-form-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <PageHero
        kicker="Driver Management"
        icon={cilUser}
        title={isViewMode ? 'View Driver' : isEdit ? 'Edit Driver' : 'Create Driver'}
        subtitle={
          isEdit || isViewMode
            ? `Asset #${(currentDriver?.asset_id ?? id) || '—'}`
            : 'Register a new driver and fill in compliance details'
        }
      />

      <DriverForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        loading={loading}
        subdivisionLabels={subdivisionLabels}
        truckLabels={truckLabels}
        attributeOptions={attributeOptions}
        readOnly={isViewMode}
      />
      {!isNew && numericAssetId && (
        <div className="mt-4 d-flex flex-column gap-3">
          {canViewComments && (
            <Comments
              moduleId={moduleId}
              itemId={Number(numericAssetId)}
              canAdd={canManageComments}
              canEdit={canManageComments}
              canDelete={canManageComments}
            />
          )}
          {canViewAttachments && (
            <Attachments
              moduleId={moduleId}
              itemId={Number(numericAssetId)}
              canAdd={canManageAttachments}
              canDelete={canManageAttachments}
              canView={canViewAttachments}
            />
          )}
        </div>
      )}
      <CModal
        visible={showSuccessModal}
        onClose={handleCloseSuccessModal}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle className="d-flex align-items-center gap-2">
            <CIcon icon={cilCheckCircle} className="text-success" />
            {savedDriverData?.first_name || 'Driver'} saved
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Driver <strong>{`${savedDriverData?.first_name || ''} ${savedDriverData?.last_name || ''}`.trim() || savedDriverData?.asset_id || '—'}</strong> has been{' '}
            {isEdit || isViewMode ? 'updated' : 'created'} successfully.
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

export default DriverFormPage
