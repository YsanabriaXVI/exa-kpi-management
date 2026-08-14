import React, { useCallback, useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilSave, cilCheckCircle, cilNotes } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import type { AppDispatch, RootState } from '../../../store'
import { loadTrip, saveTrip, loadTripRates, clearCurrentTrip } from '../store/tripsSlice'
import type {
  TripDetails,
  InventoryItem,
  Asset,
  SelectOption,
} from '../types'
import TripGeneralForm from '../components/TripGeneralForm'
import TripPriceForm from '../components/TripPriceForm'
import TripTrackForm from '../components/TripTrackForm'
import { tripsAPI } from '../api/trips.api'
import { assetsAPI, MODULE_CHASSIS, MODULE_GENSET } from '../api/assets.api'
import {
  updateTripDurationField,
  timeControlFields,
  RATE_TYPES,
} from '../utils/tripTransformers'
import Comments from '../../../components/Comments/Comments'
import Attachments from '../../../components/Attachments/Attachments'
import {
  MODULE_TRIP,
  MODULE_TRIP_AUDITOR,
  getModuleIdByName,
} from '../../../constants/modules'
import {
  permissionService,
  UPDATE,
  COMMENT_READ,
  COMMENT_UPDATE,
  ATTACHMENT_READ,
  ATTACHMENT_UPDATE,
} from '../../../services/auth/permission.service'
import './TripForm.scss'

const ATTR_ID_AUDITOR_STATUS = 79
const ATTR_ID_ACTIVE = 80
const ATTR_ID_TRIP_STATUS = 81
const ATTR_ID_INVOICE_STATUS = 85
const ATTR_ID_PAYMENT_STATUS = 86
const ATTR_CLIENT_CHARGES = 'Client Charges'
const ATTR_SUBDIVISION_CHARGES = 'Subdivision Charges'
const INV_STATUS_ALLOWED = [266, 267]
const PAY_STATUS_ALLOWED = [270, 271]

const TripFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)
  const isAudit = location.pathname.includes('trip-auditor')
  const viewMode = new URLSearchParams(location.search).get('mode') === 'view' || (location.state as any)?.viewMode === true
  const {
    currentTrip,
    isLoading,
    errors,
    isSaving,
  } = useSelector((state: RootState) => state.trips)

  const toaster = React.useRef<any>(null)
  const [toast, setToast] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const [formState, setFormState] = useState<TripDetails | null>(null)
  const [attributesLoaded, setAttributesLoaded] = useState(false)
  const [helpersLoaded, setHelpersLoaded] = useState(false)
  const [inventoryOptions, setInventoryOptions] = useState<InventoryItem[]>([])
  const [chassisOptions, setChassisOptions] = useState<Asset[]>([])
  const [gensetOptions, setGensetOptions] = useState<Asset[]>([])
  const [auditorStatusOptions, setAuditorStatusOptions] = useState<SelectOption[]>([])
  const [activeOptions, setActiveOptions] = useState<SelectOption[]>([])
  const [tripStatusOptions, setTripStatusOptions] = useState<SelectOption[]>([])
  const [invoiceStatusOptions, setInvoiceStatusOptions] = useState<SelectOption[]>([])
  const [paymentStatusOptions, setPaymentStatusOptions] = useState<SelectOption[]>([])
  const [invoiceChargeOptions, setInvoiceChargeOptions] = useState<SelectOption[]>([])
  const [paymentChargeOptions, setPaymentChargeOptions] = useState<SelectOption[]>([])
  const moduleId = getModuleIdByName(isAudit ? MODULE_TRIP_AUDITOR : MODULE_TRIP)
  const canUpdate = permissionService.checkPermission(moduleId, UPDATE)
  const canViewComments = permissionService.checkPermission(moduleId, COMMENT_READ)
  const canViewAttachments = permissionService.checkPermission(moduleId, ATTACHMENT_READ)

  useEffect(() => {
    if (numericId) {
      dispatch(clearCurrentTrip())
      dispatch(loadTrip({ id: numericId, isAudit }))
    }
    return () => {
      dispatch(clearCurrentTrip())
    }
  }, [dispatch, numericId, isAudit])

  useEffect(() => {
    if (currentTrip) {
      setFormState(currentTrip)
    }
  }, [currentTrip])

  const mapAttributeItems = useCallback((items: any[] = []): SelectOption[] => {
    return items
      .map((item) => ({
        value: item.attribute_item_id ?? item.attributeItemId ?? item.id ?? '',
        label: item.name ?? item.label ?? '',
      }))
      .filter((item) => item.value && item.label)
  }, [])

  const loadAttributes = useCallback(async () => {
    try {
      const attributes = await tripsAPI.getAttributesWithItems(getModuleIdByName(MODULE_TRIP))
      const getAttr = (id: number) => attributes.find((attr: any) => attr.attribute_id === id)
      setAuditorStatusOptions(mapAttributeItems(getAttr(ATTR_ID_AUDITOR_STATUS)?.items))
      setActiveOptions(mapAttributeItems(getAttr(ATTR_ID_ACTIVE)?.items))
      setTripStatusOptions(mapAttributeItems(getAttr(ATTR_ID_TRIP_STATUS)?.items))
      const invoiceAttr = getAttr(ATTR_ID_INVOICE_STATUS)
      const paymentAttr = getAttr(ATTR_ID_PAYMENT_STATUS)
      setInvoiceStatusOptions(
        mapAttributeItems(
          (invoiceAttr?.items || []).filter((item: any) => INV_STATUS_ALLOWED.includes(item.attribute_item_id))
        )
      )
      setPaymentStatusOptions(
        mapAttributeItems(
          (paymentAttr?.items || []).filter((item: any) => PAY_STATUS_ALLOWED.includes(item.attribute_item_id))
        )
      )
      const clientCharges = attributes.find((attr: any) => attr.name === ATTR_CLIENT_CHARGES)
      const subdivisionCharges = attributes.find((attr: any) => attr.name === ATTR_SUBDIVISION_CHARGES)
      setInvoiceChargeOptions(mapAttributeItems(clientCharges?.items))
      setPaymentChargeOptions(mapAttributeItems(subdivisionCharges?.items))
    } catch (error) {
      console.error('Failed to load attributes', error)
    } finally {
      setAttributesLoaded(true)
    }
  }, [mapAttributeItems])

  const ensureOptionExists = (list: Asset[], current?: Asset | null) => {
    if (!current?.id) return list
    if (list.some((item) => item.id === current.id)) return list
    return [...list, current]
  }

  const ensureInventoryExists = (list: InventoryItem[], current?: InventoryItem | null) => {
    if (!current?.asset_id) return list
    if (list.some((item) => item.asset_id === current.asset_id)) return list
    return [...list, current]
  }

  const loadHelpers = useCallback(async () => {
    try {
      const [inventory, chassis, gensets] = await Promise.all([
        tripsAPI.getInventoryOptions(),
        assetsAPI.getAssetNamesAttributes(MODULE_CHASSIS),
        assetsAPI.getAssetNamesAttributes(MODULE_GENSET),
      ])
      setInventoryOptions(inventory)
      setChassisOptions(chassis)
      setGensetOptions(gensets)
    } catch (error) {
      console.error('Failed to load helper data', error)
    } finally {
      setHelpersLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadAttributes()
  }, [loadAttributes])

useEffect(() => {
  loadHelpers()
}, [loadHelpers])

  const loadRatesForInventory = useCallback(async (tripId?: number, inventoryId?: number | null) => {
    if (!tripId || !inventoryId) return
    try {
      const rates = await tripsAPI.getTripRates(tripId, inventoryId)
      setFormState((prev) => (prev ? { ...prev, rates } : prev))
    } catch (error) {
      console.error('Failed to load trip rates', error)
    }
  }, [])

useEffect(() => {
  setInventoryOptions((prev) => ensureInventoryExists(prev, formState?.inventory))
  setChassisOptions((prev) => ensureOptionExists(prev, formState?.chassis || null))
  setGensetOptions((prev) => ensureOptionExists(prev, formState?.genset || null))
}, [formState?.inventory, formState?.chassis, formState?.genset])

useEffect(() => {
  loadRatesForInventory(formState?.trip_id, formState?.inventoryId ?? null)
}, [formState?.trip_id, formState?.inventoryId, loadRatesForInventory])

  useEffect(() => {
    const enrichInventoryDetails = async () => {
      if (!formState?.inventoryId) return
      const hasFullRecord = inventoryOptions.some((item) => {
        if (Number(item.asset_id) !== Number(formState.inventoryId)) return false
        return Boolean(item.truck || item.name)
      })
      if (hasFullRecord) {
        const matched = inventoryOptions.find(
          (item) => Number(item.asset_id) === Number(formState.inventoryId),
        )
        if (matched && formState.inventory && Object.keys(formState.inventory).length <= 1) {
          setFormState((prev) => (prev ? { ...prev, inventory: matched } : prev))
        }
        return
      }
      try {
        const result = await tripsAPI.getInventoryOptions({ includes: formState.inventoryId })
        if (Array.isArray(result) && result.length) {
          setInventoryOptions((prev) => {
            const filtered = prev.filter((item) => Number(item.asset_id) !== Number(formState.inventoryId))
            return [...filtered, ...result]
          })
          setFormState((prev) => (prev ? { ...prev, inventory: result[0] } : prev))
        }
      } catch (error) {
        console.error('Failed to load inventory details', error)
      }
    }
    enrichInventoryDetails()
  }, [formState?.inventoryId, inventoryOptions])

  const handleInventoryChange = async (inventoryId: number | null) => {
    if (!formState) return
    const inventory = inventoryOptions.find((item) => item.asset_id === inventoryId)
    const next: TripDetails = {
      ...formState,
      inventoryId,
      inventory,
    }
    if (!formState.isClosedTrip && inventory) {
      next.subdivision = {
        id: inventory.subdivision_id,
        name: inventory.subdivision_name,
        exchange_rate: inventory.subdivision_exchange_rate,
      }
    }
    setFormState(next)
    loadRatesForInventory(next.trip_id, inventoryId)
  }

  const handleChange = (event: any) => {
    if (!formState) return
    const { name, value } = event.target
    if (name === 'inventoryId') {
      handleInventoryChange(value ? Number(value) : null)
      return
    }
    if (timeControlFields.includes(name)) {
      const normalizedValue = value === '' ? null : Number(value)
      const updated = updateTripDurationField(formState, name, normalizedValue)
      setFormState({ ...updated })
      return
    }
    if (name === 'rates') {
      const { rate, field, value: fieldValue } = event.target.value
      setFormState((prev) => {
        if (!prev?.rates) return prev
        return {
          ...prev,
          rates: prev.rates.map((item) =>
            item.trip_rate_id === rate.trip_rate_id ? { ...item, [field]: fieldValue } : item
          ),
        }
      })
      return
    }
    setFormState((prev) => (prev ? { ...prev, [name]: value } : prev))
  }

  const handleTimeChange = (field: string, unixValue: number | null) => {
    if (!formState) return
    if (!timeControlFields.includes(field)) {
      setFormState((prev) => (prev ? { ...prev, [field]: unixValue } : prev))
      return
    }
    const updated = updateTripDurationField(formState, field, unixValue)
    setFormState({ ...updated })
  }

  const handleRefreshRate = async (type: keyof typeof RATE_TYPES) => {
    if (!formState?.inventoryId) return
    const rates = await tripsAPI.refreshTripRate(formState.trip_id, formState.inventoryId, type)
    setFormState((prev) => (prev ? { ...prev, rates } : prev))
  }

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

  const handleSave = async () => {
    if (!formState || !numericId) return
    try {
      const result = await dispatch(saveTrip({ id: numericId, trip: formState, isAudit }))
      if (saveTrip.fulfilled.match(result)) {
        const updatedTrip = result.payload
        if (updatedTrip.inventoryId) {
          await dispatch(loadTripRates({ tripId: numericId, inventoryId: updatedTrip.inventoryId }))
        }
        setShowSuccessModal(true)
      } else {
        showToast(typeof result.payload === 'string' ? result.payload : 'Failed to save trip', 'danger')
      }
    } catch (error: any) {
      showToast(error.message || 'An unexpected error occurred', 'danger')
    }
  }

  const handleGoToList = () => {
    setShowSuccessModal(false)
    navigate(isAudit ? '/operations/trip-auditor' : '/operations/trips')
  }

  const handleContinueEditing = () => {
    setShowSuccessModal(false)
  }

  const contentReady = attributesLoaded && helpersLoaded && (!numericId || (formState && !isLoading))

  return (
    <div className="animated fadeIn">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      
      {!contentReady ? (
        <div className="trip-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading trip information</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : (
        <>
          <PageHero
            kicker="Trip Management"
            icon={cilNotes}
            title={isAudit ? 'Trip Auditor' : viewMode ? 'View Trip' : 'Trip'}
            subtitle={id ? `Trip #${id}` : 'Create a new trip'}
            actions={
              !viewMode ? (
                <CButton
                  color="primary"
                  className="text-white"
                  onClick={handleSave}
                  disabled={!formState || isSaving || !canUpdate}
                >
                  {isSaving ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilSave} className="me-2" />
                      Save
                    </>
                  )}
                </CButton>
              ) : undefined
            }
          />
          <CCard>
            <CCardBody>
              {errors && (
                <CAlert color="danger" className="mb-4">
                  {errors}
                </CAlert>
              )}

              {formState && (
                <>
                  <TripGeneralForm
                    trip={formState}
                    inventoryOptions={inventoryOptions}
                    chassisOptions={chassisOptions}
                    gensetOptions={gensetOptions}
                    onChange={handleChange}
                    locked={!canUpdate || viewMode}
                    viewMode={viewMode}
                  />

                  <TripPriceForm
                    trip={formState}
                    invoiceStatusOptions={invoiceStatusOptions}
                    paymentStatusOptions={paymentStatusOptions}
                    invoiceChargeOptions={invoiceChargeOptions}
                    paymentChargeOptions={paymentChargeOptions}
                    onChange={handleChange}
                    onRefreshRate={handleRefreshRate}
                    isAudit={isAudit}
                  />

                  <TripTrackForm
                    trip={formState}
                    auditorStatusOptions={auditorStatusOptions}
                    activeOptions={activeOptions}
                    tripStatusOptions={tripStatusOptions}
                    onChange={handleChange}
                    onTimeChange={handleTimeChange}
                    disabled={!canUpdate}
                  />

                  <CRow className="mt-4">
                    {numericId && canViewComments && (
                      <CCol md={6}>
                        <Comments
                          moduleId={moduleId}
                          itemId={numericId}
                          canAdd={permissionService.checkPermission(moduleId, COMMENT_UPDATE)}
                          canEdit={permissionService.checkPermission(moduleId, COMMENT_UPDATE)}
                          canDelete={permissionService.checkPermission(moduleId, COMMENT_UPDATE)}
                        />
                      </CCol>
                    )}
                    {numericId && canViewAttachments && (
                      <CCol md={6}>
                        <Attachments
                          moduleId={moduleId}
                          itemId={numericId}
                          canAdd={permissionService.checkPermission(moduleId, ATTACHMENT_UPDATE)}
                          canDelete={permissionService.checkPermission(moduleId, ATTACHMENT_UPDATE)}
                          canView={canViewAttachments}
                        />
                      </CCol>
                    )}
                  </CRow>

                  <CCard className="mt-4 shadow-sm">
                    <CCardBody className="d-flex justify-content-between align-items-center">
                      <CButton color="secondary" variant="ghost" onClick={handleGoToList}>
                        Back to List
                      </CButton>
                      <CButton
                        color="primary"
                        className="text-white"
                        onClick={handleSave}
                        disabled={!formState || isSaving || !canUpdate}
                      >
                        {isSaving ? (
                          <>
                            <CSpinner size="sm" className="me-2" />
                            Saving
                          </>
                        ) : (
                          <>
                            <CIcon icon={cilSave} className="me-2" />
                            Save Trip
                          </>
                        )}
                      </CButton>
                    </CCardBody>
                  </CCard>
                </>
              )}
            </CCardBody>
          </CCard>

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
                Trip <strong>#{id}</strong> has been updated successfully.
              </p>
              <p className="text-body-secondary mt-2 mb-0">What would you like to do next?</p>
            </CModalBody>
            <CModalFooter className="d-flex justify-content-between">
              <CButton color="secondary" onClick={handleGoToList}>
                Back to List
              </CButton>
              <CButton color="primary" className="text-white" onClick={handleContinueEditing}>
                Continue Editing
              </CButton>
            </CModalFooter>
          </CModal>
        </>
      )}
    </div>
  )
}

export default TripFormPage
