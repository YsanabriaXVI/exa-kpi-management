import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  CAlert,
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
import { cilCheckCircle, cilTruck } from '@coreui/icons'
import { AppDispatch, RootState } from '../../../../store'
import { createTruck, loadTruck, updateTruck, clearCurrentTruck } from '../store/trucks.slice'
import TruckForm from '../components/TruckForm'
import { Truck } from '../types'
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
import { MODULE_TRUCKS, getModuleIdByName } from '../../../../constants/modules'
import { trucksAPI } from '../api/trucks.api'
import { driversAPI } from '../../Drivers/api/drivers.api'
import { subdivisionsAPI } from '../../Subdivisions/api/subdivisions.api'
import { clientsAPI } from '../../Clients/api/clients.api'
import './TruckForm.scss'

const defaultValues: Truck = {
  truck_plate: '',
  brand: '',
  model: '',
  color: '',
  subdivision: '',
  year: '',
  initial_miles: '',
  customs_code: '',
  chassis: '',
  name_on_registration: '',
  engine_no: '',
  name_on_code: '',
  driver_assigned: '',
  rtn: '',
  truck_status: '',
  active: '',
  vuceh_code: '',
  serial_mild_refe: '',
  vuceh_coments: '',
  truck_insurance: '',
  hiring_date: '',
  sap_code: '',
  number_of_tires: '',
  number_of_turbo: '',
  batteries: '',
  number_of_start_engine: '',
  alternator_number: '',
  computer_serial_number: '',
  fuel_type: '',
  archive_number: '',
  vehicle_type: '',
  internal_supplier: '',
  gps_unit: '',
  pech_constancy: '',
  generic_name1: '',
  generic_value1: '',
  generic_name2: '',
  generic_value2: '',
  generic_name3: '',
  generic_value3: '',
}

const attributeFieldMap: Record<string, string> = {
  truck_plate: '8',
  brand: '9',
  color: '10',
  model: '12',
  subdivision: '13',
  year: '14',
  initial_miles: '15',
  customs_code: '16',
  chassis: '17',
  name_on_registration: '18',
  engine_no: '19',
  name_on_code: '20',
  driver_assigned: '53',
  rtn: '56',
  truck_status: '65',
  active: '66',
  vuceh_code: '87',
  serial_mild_refe: '99',
  vuceh_coments: '100',
  truck_insurance: '102',
  hiring_date: '104',
  sap_code: '111',
  number_of_tires: '119',
  number_of_turbo: '120',
  batteries: '121',
  number_of_start_engine: '122',
  alternator_number: '123',
  computer_serial_number: '124',
  fuel_type: '125',
  archive_number: '130',
  vehicle_type: '134',
  internal_supplier: '136',
  gps_unit: '137',
  pech_constancy: '148',
}

const SUBDIVISION_ATTRIBUTE_ID = Number(attributeFieldMap.subdivision)

const normalizeTruckForForm = (truck?: Truck): Truck => {
  if (!truck) {
    return defaultValues
  }

  const attrs = truck.attributes || {}
  const flattened: Record<string, any> = {}

  Object.entries(attributeFieldMap).forEach(([fieldKey, attrId]) => {
    if (truck[fieldKey] !== undefined) {
      flattened[fieldKey] = truck[fieldKey]
    } else if (attrs[attrId] !== undefined) {
      flattened[fieldKey] = attrs[attrId]
    }
  })

  return {
    ...defaultValues,
    ...truck,
    ...flattened,
    attributes: attrs, // preserve original attributes for submit merge
  }
}

const mapFormToPayload = (values: Truck): Truck => {
  const baseAttributes = values.attributes || {}
  const mappedAttributes: Record<string, any> = { ...baseAttributes }

  Object.entries(attributeFieldMap).forEach(([fieldKey, attrId]) => {
    if (values[fieldKey] !== undefined) {
      mappedAttributes[attrId] = values[fieldKey]
    }
  })

  return {
    ...values,
    // Ensure truck_status is sent as integer to prevent 500 error (StatusLog::setStatusId expects int)
    truck_status: values.truck_status ? parseInt(String(values.truck_status), 10) : undefined,
    attributes: mappedAttributes,
  }
}

const TruckFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const isView = query.get('view') === 'true'
  const moduleId = getModuleIdByName(MODULE_TRUCKS)
  const canUpdate = permissionService.checkPermission(moduleId, UPDATE)

  const isNew = id === 'new' || !id
  const isViewMode = isView || (!isNew && !canUpdate)
  const isEdit = !isNew && !isViewMode

  const [attributeOptions, setAttributeOptions] = useState<Record<string, { value: string | number; label: string; subdivision_id?: number | null }[]>>({})
  const [driverLabels, setDriverLabels] = useState<Record<string | number, string>>({})
  const [subdivisionLabels, setSubdivisionLabels] = useState<Record<string | number, string>>({})
  const [clientLabels, setClientLabels] = useState<Record<string | number, string>>({})
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedTruckData, setSavedTruckData] = useState<Truck | null>(null)
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const toaster = React.useRef<any>()
  const [toast, setToast] = useState<any>(null)

  const { currentTruck, loading, error } = useSelector((state: RootState) => (state as any).trucks)

  useEffect(() => {
    if (!isNew && id) {
      dispatch(loadTruck(id))
    } else {
      dispatch(clearCurrentTruck())
    }
    return () => {
      dispatch(clearCurrentTruck())
    }
  }, [dispatch, id, isNew])

  useEffect(() => {
    const loadAttributeOptions = async () => {
      try {
        // Only fetch attributes initially
        const attributes = await trucksAPI.getAttributesWithItems()
        
        const optionsMap: Record<string, { value: string | number; label: string; subdivision_id?: number | null }[]> = {}

        attributes.forEach((attr: any) => {
          const items = (attr.items || [])
            .map((item: any) => {
              const rawValue = item.attribute_item_id ?? item.id ?? item.attributeItemId ?? item.value ?? ''
              return {
                value: rawValue,
                label: item.name || item.label || String(rawValue),
                subdivision_id: item.subdivision_id != null ? Number(item.subdivision_id) : null,
              }
            })

          if (items.length) {
            const key =
              attr.flat_name_id ||
              attr.flatNameId ||
              attr.flat_name ||
              attr.name?.toLowerCase().replace(/\s+/g, '_') ||
              String(attr.attribute_id || attr.id || '')
            optionsMap[key] = items
          }
        })

        setAttributeOptions(optionsMap)

        // Fetch specific labels for current truck values if they exist
        if (currentTruck) {
          const promises = []
          
          // Driver
          const driverId = currentTruck.driver_assigned || currentTruck.attributes?.[53]
          const driverInOptions = optionsMap['driver_assigned']?.some(opt => String(opt.value) === String(driverId))
          if (driverId && !driverInOptions) {
            promises.push(
              driversAPI.getDriver(driverId).then(driver => {
                if (driver) {
                  const attrs = driver.attributes || {}
                  const first = driver.first_name || attrs['21'] || attrs[21] || ''
                  const last = driver.last_name || attrs['22'] || attrs[22] || ''
                  const fullName = `${first} ${last}`.replace(/\s+/g, ' ').trim()
                  const label = driver.name || fullName || driver.driver_assigned || 'Driver'
                  setDriverLabels(prev => ({ ...prev, [String(driverId)]: String(label) }))
                }
              }).catch(() => {
                 setDriverLabels(prev => ({ ...prev, [String(driverId)]: `Driver ${driverId} (Inactive)` }))
              })
            )
          }

          // Subdivision
          const subdivisionId = currentTruck.subdivision || currentTruck.attributes?.[SUBDIVISION_ATTRIBUTE_ID]
          const subInOptions = optionsMap['subdivision']?.some(opt => String(opt.value) === String(subdivisionId))
          if (subdivisionId && !subdivisionLabels[String(subdivisionId)] && !subInOptions) {
            promises.push(
              subdivisionsAPI.getSubdivision(subdivisionId).then(sub => {
                if (sub) {
                  const label = sub.name || sub.reference || `Subdivision ${subdivisionId}`
                  setSubdivisionLabels(prev => ({ ...prev, [String(subdivisionId)]: String(label) }))
                }
              }).catch(() => {
                  setSubdivisionLabels(prev => ({ ...prev, [String(subdivisionId)]: `Subdivision ${subdivisionId} (Inactive)` }))
              })
            )
          }

          // Client (RTN)
          const clientId = currentTruck.rtn || currentTruck.attributes?.[Number(attributeFieldMap.rtn)]
          const clientInOptions = optionsMap['rtn']?.some(opt => String(opt.value) === String(clientId))

          if (clientId && !clientLabels[String(clientId)] && !clientInOptions) {
            promises.push(
              clientsAPI.getClient(clientId).then(client => {
                if (client) {
                  const label = client.name || client.reference || client.company_name || `Client ${clientId}`
                  setClientLabels(prev => ({ ...prev, [String(clientId)]: String(label) }))
                }
              }).catch((e) => {
                 console.warn(`Failed to fetch client ${clientId} details (likely inactive). Using fallback label.`)
                 setClientLabels(prev => ({ ...prev, [String(clientId)]: `Client ${clientId} (Inactive)` }))
              })
            )
          }

          await Promise.all(promises)
        }

      } catch (error) {
        console.error('Failed to load truck attributes', error)
      } finally {
        setMetadataLoaded(true)
      }
    }

    loadAttributeOptions()
  }, [currentTruck]) // Re-run if currentTruck changes (e.g. loaded)

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

  const handleFetchOptions = async (field: string) => {
    if (field === 'driver_assigned' && !attributeOptions.driver_assigned) {
      try {
        const drivers = await driversAPI.getDrivers()
        const driverOptions = drivers.map((driver: any) => {
          const attrs = driver.attributes || {}
          const first = driver.first_name || attrs['21'] || attrs[21] || ''
          const last = driver.last_name || attrs['22'] || attrs[22] || ''
          const fullName = `${first} ${last}`.replace(/\s+/g, ' ').trim()
          const label = driver.name || fullName || driver.driver_assigned || 'Driver'
          const value = driver.asset_id ?? driver.id ?? driver.driver_id ?? driver.driver_assigned
          
          // Update label map as well
          if (value) {
            setDriverLabels(prev => ({ ...prev, [String(value)]: String(label) }))
          }
          
          return { value: String(value), label: String(label) }
        })
        setAttributeOptions(prev => ({ ...prev, driver_assigned: driverOptions }))
      } catch (e) { console.error('Failed to fetch drivers', e) }
    } else if (field === 'subdivision' && !attributeOptions.subdivision) {
      try {
        const subdivisions = await subdivisionsAPI.getSubdivisions()
        const subOptions = subdivisions.map((sub: any) => {
          const value = sub.subdivision_id ?? sub.id
          const label = sub.name || sub.reference || `Subdivision ${value}`
          if (value) {
            setSubdivisionLabels(prev => ({ ...prev, [String(value)]: String(label) }))
          }
          return { value: String(value), label: String(label) }
        })
        setAttributeOptions(prev => ({ ...prev, subdivision: subOptions }))
      } catch (e) { console.error('Failed to fetch subdivisions', e) }
    } else if (field === 'rtn' && !attributeOptions.rtn) {
      try {
        const clients = await clientsAPI.getClients()
        const clientOptions = clients.map((client: any) => {
          const value = client.client_id ?? client.id
          const label = client.name || client.reference || client.company_name || `Client ${value}`
          if (value) {
            setClientLabels(prev => ({ ...prev, [String(value)]: String(label) }))
          }
          return { value: String(value), label: String(label) }
        })
        setAttributeOptions(prev => ({ ...prev, rtn: clientOptions }))
      } catch (e) { console.error('Failed to fetch clients', e) }
    }
  }

  useEffect(() => {
    if (error) {
      const message = extractErrorMessage(error, 'Failed to load truck')
      setFormError(message)
      showToast(message, 'danger')
    }
  }, [error])

  const initialValues: Truck = normalizeTruckForForm(currentTruck || undefined)

  const handleSubmit = async (values: Truck) => {
    try {
      const payload = mapFormToPayload(values)
      let result: any
      if (isEdit && id) {
        result = await dispatch(updateTruck({ id, truck: payload }))
      } else {
        result = await dispatch(createTruck(payload))
      }

      if (result.meta.requestStatus === 'fulfilled') {
        setSavedTruckData(result.payload)
        setShowSuccessModal(true)
      } else {
        const payload = result.payload
        let errorMessage = 'Failed to save truck'
        
        // Handle structured backend error: { status: "fail", data: { field: "..." } }
        if (payload && typeof payload === 'object') {
           if (payload.data && typeof payload.data === 'object') {
             // Extract first error message from data object
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
      const message = error.message || extractErrorMessage(error, 'Failed to save truck')
      setFormError(message)
      showToast(message, 'danger')
    }
  }

  const contentReady = metadataLoaded && (isNew || currentTruck || error)
  const displayError = formError || (error ? extractErrorMessage(error, 'Failed to load truck') : null)

  if (!contentReady) {
    return (
      <div className="truck-form-loading d-flex flex-column align-items-center justify-content-center">
        <CSpinner color="primary" size="xl" className="mb-3" />
        <div className="text-center">
          <div className="fw-semibold">Loading truck information</div>
          <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
        </div>
      </div>
    )
  }

  const numericAssetId =
    currentTruck?.asset_id ?? (id && id !== 'new' && !Number.isNaN(Number(id)) ? Number(id) : null)
  const canViewComments = permissionService.checkPermission(moduleId, COMMENT_READ)
  const canViewAttachments = permissionService.checkPermission(moduleId, ATTACHMENT_READ)
  const canManageComments = permissionService.checkPermission(moduleId, COMMENT_UPDATE)
  const canManageAttachments = permissionService.checkPermission(moduleId, ATTACHMENT_UPDATE)
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false)
  }

  const handleGoToList = () => {
    setShowSuccessModal(false)
    navigate('/assets/trucks')
  }

  const handleContinueEditing = () => {
    const targetId =
      savedTruckData?.asset_id ??
      savedTruckData?.id ??
      (id && id !== 'new' ? id : null)
    if (targetId) {
      const normalizedId = String(targetId)
      navigate(`/assets/trucks/${normalizedId}`)
      dispatch(loadTruck(normalizedId))
    }
    setShowSuccessModal(false)
  }



  return (
    <CContainer fluid className="truck-form-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <PageHero
        kicker="Truck Management"
        icon={cilTruck}
        title={isViewMode ? 'View Truck' : isEdit ? 'Edit Truck' : 'Create Truck'}
        subtitle={
          !isNew
            ? `Asset #${(currentTruck?.asset_id ?? id) || '—'} · ${currentTruck?.truck_plate || 'Unknown plate'}`
            : 'Register a new unit and fill in compliance details'
        }

      />
      {displayError && <CAlert color="danger" className="mt-3">{displayError}</CAlert>}
      <TruckForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        loading={loading}
        driverLabels={driverLabels}
        subdivisionLabels={subdivisionLabels}
        clientLabels={clientLabels}
        attributeOptions={attributeOptions}
        onFetchOptions={handleFetchOptions}
        readOnly={isViewMode}
      />
      {isEdit && numericAssetId && (
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
            {savedTruckData?.truck_plate || 'Truck'} saved
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Truck <strong>{savedTruckData?.truck_plate || savedTruckData?.asset_id || '—'}</strong> has been{' '}
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
    </CContainer>
  )
}

export default TruckFormPage
