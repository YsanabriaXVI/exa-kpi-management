import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import * as Yup from 'yup'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CRow,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilDrop, cilSave, cilArrowLeft, cilCloudDownload } from '@coreui/icons'

import type { AppDispatch, RootState } from '../../../../store'
import type { FuelOrderForm, FuelLimitAssessmentParams } from '../types/fuelOrder.types'
import PageHero from '../../../../components/PageHero'
import ErrorMessageModal from '../../../../components/ErrorMessageModal'
import {
  fetchFuelOrder,
  addFuelOrder,
  saveFuelOrder,
  loadDefaultFuelOrder,
  updateFuelOrderForm,
  resetStatuses,
  loadFuelOrderAttributes,
  loadTripDetail,
  loadConnectedCities,
  loadFuelSettings,
  checkFuelLimit,
  loadDefaultValuesFromEquipment,
  calculateSuggestedFuel,
  calculateSuggestedFuelForType1,
  selectFuelOrderCurrent,
  selectFuelOrderErrors,
  selectFuelOrderStatuses,
  selectFuelOrderSaving,
  selectFuelOrderLoadingCurrent,
  selectFuelOrderOrderTypes,
  selectFuelOrderTripDetail,
  selectFuelOrderSettings,
  selectFuelOrderFuelOrderStatuses,
  selectFuelOrderSuggested,
  selectFuelOrderEquipmentDetail,
  selectFuelOrderFuelRecipients,
  downloadFuelOrderPdf,
  loadEquipmentAndDrivers,
} from '../store/fuelOrder.slice'
import { selectAllGasStores } from '../../GasSupplier/store/gasSupplier.slice'

import { permissionService, CREATE, UPDATE } from '../../../../services/auth/permission.service'
import { authStorage } from '../../../../services/auth/auth.storage'
import { MODULE_FUEL_ORDERS, getModuleIdByName } from '../../../../constants/modules'
import Comments from '../../../../components/Comments/Comments'

import GasStoreFormSection from '../components/GasStoreFormSection'
import FuelQuantitySection from '../components/FuelQuantitySection'
import TripInformationDisplay from '../components/TripInformationDisplay'
import GasStoreDetails from '../components/GasStoreDetails'
import RouteLegsSection from '../components/RouteLegsSection'
import OrderStatusSection from '../components/OrderStatusSection'
import ReconciliationSection from '../components/ReconciliationSection'

const VIEW_ALL_SUBDIVISIONS = 'View All Subdivisions'

// Gap 8: Only require resourceCategory when equipmentType === 3
const buildValidationSchema = (equipmentType?: number | null) => {
  const base: Record<string, any> = {
    gasStationsId: Yup.number().min(1, 'Gas station is required').required('Gas station is required'),
    orderType: Yup.number().required('Order type is required'),
    equipmentType: Yup.number().required('Equipment type is required'),
    fuelType: Yup.number().required('Fuel type is required'),
    typeContainer: Yup.number().required('Container type is required'),
    fuelRequest: Yup.number().min(0.01, 'Fuel request is required').required('Fuel request is required'),
    fuelTank: Yup.number().min(0, 'Fuel tank must be >= 0').required('Fuel tank is required'),
    dateSchedule: Yup.string().nullable().required('Schedule Date is required'),
    expirationDate: Yup.string().nullable().required('Expiration Date is required'),
  }

  const eType = Number(equipmentType)

  if (eType === 3) {
    base.resourceCategory = Yup.number().required('Resource category is required')
  }

  if (eType === 1 || eType === 3) {
    base.measure = Yup.number().required('Odometer is required')
  } else if (eType === 2) {
    base.measure = Yup.number().required('Horometer is required')
  }

  return Yup.object(base)
}

const FuelOrderEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const current = useSelector(selectFuelOrderCurrent)
  const errors = useSelector(selectFuelOrderErrors)
  const statuses = useSelector(selectFuelOrderStatuses)
  const saving = useSelector(selectFuelOrderSaving)
  const loading = useSelector(selectFuelOrderLoadingCurrent)
  const orderTypes = useSelector(selectFuelOrderOrderTypes)
  const tripDetail = useSelector(selectFuelOrderTripDetail)
  const settings = useSelector(selectFuelOrderSettings)
  const allGasStores = useSelector(selectAllGasStores)
  const fuelOrderStatuses = useSelector(selectFuelOrderFuelOrderStatuses)
  const suggested = useSelector(selectFuelOrderSuggested)
  const equipmentDetail = useSelector(selectFuelOrderEquipmentDetail)
  const fuelRecipients = useSelector(selectFuelOrderFuelRecipients)

  const subdivisionsList = useSelector(
    (s: RootState) => (s.auth as any)?.details?.details?.subdivisions ?? [],
  )

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [errorModalVisible, setErrorModalVisible] = useState(false)

  const isNew = !id || id === 'new'
  const isCreateFromTrip = searchParams.get('create') === 'true' && !isNew
  const viewMode = (location.state as any)?.viewMode === true

  const canCreate = permissionService.checkPermission(MODULE_FUEL_ORDERS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_FUEL_ORDERS, UPDATE)
  const canViewAllSubdivisions = permissionService.checkPermission(
    MODULE_FUEL_ORDERS,
    VIEW_ALL_SUBDIVISIONS,
  )

  const allowedSubdivisionIds = useMemo(
    () =>
      subdivisionsList
        .map((s: any) => Number(s.subdivision_id))
        .filter((v: number) => !Number.isNaN(v)),
    [subdivisionsList],
  )

  const originalTripsidRef = useRef<number | null | undefined>(undefined)
  const equipmentLoadedRef = useRef(false)
  const lastAutoFilledTripRef = useRef<number | null>(null)

  const resolvedStatusFlatName = useMemo(() => {
    if (!current) return ''
    const statusId = Number(current.statusFuelOrder)
    if (statusId && fuelOrderStatuses.length > 0) {
      const attr = fuelOrderStatuses.find(
        (s: any) => Number(s.attributeItemId ?? s.attribute_item_id) === statusId,
      )
      if (attr?.flat_name_id) return attr.flat_name_id
      if (attr?.name) return attr.name.toLowerCase().replace(/\s+/g, '_')
    }
    const name = current.statusFuelOrderName?.toLowerCase() ?? ''
    return name
  }, [current, fuelOrderStatuses])

  const isOrderEditable = useMemo(() => {
    if (isNew || isCreateFromTrip) return true
    if (!current) return false
    if (!resolvedStatusFlatName) return false

    const lockedStatuses = ['approved', 'pending_approval', 'cancel']
    if (lockedStatuses.some((s) => resolvedStatusFlatName.includes(s))) return false

    return true
  }, [isNew, isCreateFromTrip, current, resolvedStatusFlatName])

  const isApproved = useMemo(() => {
    if (!resolvedStatusFlatName) return false
    return ['approved', 'pending_approval', 'cancel'].some(
      (s) => resolvedStatusFlatName.includes(s),
    )
  }, [resolvedStatusFlatName])

  const isEditable = !viewMode && ((isNew && canCreate) || (!isNew && canUpdate && isOrderEditable))

  const isApprovedForPdf = useMemo(() => {
    if (!resolvedStatusFlatName) return false
    return resolvedStatusFlatName.includes('approved')
  }, [resolvedStatusFlatName])

  useEffect(() => {
    if (canViewAllSubdivisions || isNew || isCreateFromTrip || !current) return
    if (allowedSubdivisionIds.length === 0) return

    const orderSubId = Number(current.subdivisionId)
    if (orderSubId && !allowedSubdivisionIds.includes(orderSubId)) {
      const toast = (window as any).exaToast
      toast?.error?.('Error', 'You do not have access to this fuel order\'s subdivision.')
      navigate('/fuel/fuelorder')
    }
  }, [current, canViewAllSubdivisions, allowedSubdivisionIds, isNew, isCreateFromTrip, navigate])

  useEffect(() => {
    const attributeLoads: { attributeFlatNameId: string; targetField: string; moduleFlatNameId?: string }[] = [
      { attributeFlatNameId: 'order_status', targetField: 'fuelOrderStatus' },
      { attributeFlatNameId: 'reconciliation_status', targetField: 'reconciliationStatus' },
      { attributeFlatNameId: 'tipo_de_labor', targetField: 'orderType' },
      { attributeFlatNameId: 'fuel_recipient', targetField: 'fuelRecipient' },
      { attributeFlatNameId: 'fuel_order_type', targetField: 'resourceCategory', moduleFlatNameId: 'fuel_order_settings' },
      { attributeFlatNameId: 'fuel_type', targetField: 'fuelType', moduleFlatNameId: 'trucks' },
      { attributeFlatNameId: 'payment_method', targetField: 'paymentMethod' },
      { attributeFlatNameId: 'subdivision_payment_status', targetField: 'subdivisionPaymentStatus' },
      { attributeFlatNameId: 'gas_supplier_payment_status', targetField: 'gasSupplierPaymentStatus' },
    ]
    attributeLoads.forEach((load) => dispatch(loadFuelOrderAttributes(load)))
  }, [dispatch])

  useEffect(() => {
    const locState = location.state as any
    const isMaintenanceOrder = locState?.maintenanceOrder === true
    const preloadData = locState?.preloadData

    if (isNew && isMaintenanceOrder && preloadData) {
      dispatch(loadDefaultValuesFromEquipment(preloadData))
    } else if (isNew) {
      dispatch(loadDefaultFuelOrder())
    } else if (isCreateFromTrip && id) {
      dispatch(loadDefaultFuelOrder())
      const tripId = Number(id)
      if (tripId) {
        dispatch(loadTripDetail(tripId))
        dispatch(updateFuelOrderForm({ tripsid: tripId, orderType: 961, equipmentType: 1 }))
      }
    } else if (id) {
      dispatch(fetchFuelOrder(Number(id)))
    }
  }, [dispatch, id, isNew, isCreateFromTrip, location.state])

  // After fetching an existing order, load equipment detail + drivers and trip detail
  useEffect(() => {
    if (isNew || isCreateFromTrip || !current?.fuelOrderId || loading) return

    // Store original tripsid once on first load
    if (originalTripsidRef.current === undefined) {
      originalTripsidRef.current = current.tripsid ?? null
    }

    // Load equipment detail + drivers if not already loaded
    const eqId = Number(current.equipmentId) || 0
    const eqType = Number(current.equipmentType) || 0
    if (eqId > 0 && eqType > 0 && !equipmentLoadedRef.current) {
      equipmentLoadedRef.current = true
      dispatch(loadEquipmentAndDrivers({ equipmentType: eqType, equipmentId: eqId }))
    }

    // Load trip detail if tripsid exists and tripDetail not yet loaded
    const tripId = Number(current.tripsid) || 0
    if (tripId > 0 && !tripDetail) {
      dispatch(loadTripDetail(tripId))
    }
  }, [dispatch, current?.fuelOrderId, current?.equipmentId, current?.equipmentType, current?.tripsid, isNew, isCreateFromTrip, loading, tripDetail])

  // GAP 1: Fetch settings when subdivision + orderType + equipmentType are set (for new orders)
  useEffect(() => {
    if (!current) return
    const subId = Number(current.subdivisionId) || 0
    const oType = Number(current.orderType) || 0
    const eType = Number(current.equipmentType) || 0
    if (!subId || !oType || !eType) return

    // For 1588 in edit mode, keep existing settings (legacy keepExistingSettings behavior)
    if (!isNew && !isCreateFromTrip && oType === 1588 && settings) return

    // Map equipmentType to asset type ID used by settings API (same mapping as old app)
    const assetTypeIdMap: Record<number, number> = { 1: 1021, 2: 1537 }
    const assetTypeId = assetTypeIdMap[eType] ?? Number((equipmentDetail as any)?.vehicle_type_id) ?? 0
    // Default resourceCategory per equipment type when not explicitly set
    const rCat = Number(current.resourceCategory) || (eType === 1 ? 1500 : eType === 2 ? 1499 : 0)

    if (!assetTypeId || !rCat) return

    const params: Record<string, any> = {
      subdivision: subId,
      workType: oType,
      assetType: assetTypeId,
      fuelOrderTypeId: rCat,
    }
    if (oType === 1588 && (current as any).clientId) {
      params.client = (current as any).clientId
    }

    dispatch(loadFuelSettings(params))
  }, [
    dispatch,
    current?.subdivisionId,
    current?.orderType,
    current?.equipmentType,
    current?.resourceCategory,
    equipmentDetail,
    isNew,
    isCreateFromTrip,
  ])

  // GAP 2: Calculate suggested fuel after trip loads, route legs change, or equipment selection
  useEffect(() => {
    if (!current || !isOrderEditable) return
    const eType = Number(current.equipmentType) || 0
    const oType = Number(current.orderType) || 0
    if (!eType) return

    const legs = current.routeLegs ?? []

    if (oType === 1588 && legs.length > 0) {
      const completedLegs = legs.filter((l) => l.fromCityId && l.toCityId)
      if (completedLegs.length > 0) {
        dispatch(calculateSuggestedFuel({
          orderType: oType,
          routeLegs: completedLegs,
          subdivisionId: Number(current.subdivisionId) || undefined,
          equipmentType: eType,
          ratebuilderId: settings?.ratebuilderId,
        }))
      }
    } else if (eType === 3 && legs.length > 0) {
      const completedLegs = legs.filter((l) => l.fromCityId && l.toCityId)
      if (completedLegs.length > 0) {
        dispatch(calculateSuggestedFuel({
          orderType: oType,
          routeLegs: completedLegs,
          subdivisionId: Number(current.subdivisionId) || undefined,
          equipmentType: eType,
          ratebuilderId: settings?.ratebuilderId,
        }))
      }
    } else if (eType === 1 && tripDetail) {
      const td = tripDetail as any
      const wo = td.workOrder ?? td.work_order
      dispatch(
        calculateSuggestedFuelForType1({
          legs,
          tripDetail,
          ratebuilderId: settings?.ratebuilderId,
          clientid: (current as any).clientId ?? wo?.clientid ?? wo?.clientId,
          subdivisionId: Number(current.subdivisionId) || Number(td.subdivisionId) || Number(td.subdivision_id) || undefined,
          workorderid: wo?.workorderid ?? wo?.workOrderId ?? td.workorderid ?? td.workOrderId,
        }),
      )
    }
  }, [
    dispatch,
    tripDetail,
    current?.routeLegs,
    current?.equipmentType,
    current?.orderType,
    current?.equipmentId,
    current?.clientId,
    current?.subdivisionId,
    settings?.ratebuilderId,
    isOrderEditable,
  ])

  // Reset auto-fill ref when trip is cleared so re-selecting same trip works
  useEffect(() => {
    if (!tripDetail) lastAutoFilledTripRef.current = null
  }, [tripDetail])

  // Auto-fill equipment fields from trip detail when creating a new order
  useEffect(() => {
    if (!tripDetail || (!isNew && !isCreateFromTrip) || !current) return

    const trip = tripDetail as any
    // Old API uses lowercase: inventoryid, driverid
    const tripId = trip.tripsid ?? trip.trip_id ?? trip.id
    if (!tripId || lastAutoFilledTripRef.current === tripId) return

    const updates: Partial<FuelOrderForm> = { equipmentType: 1, resourceCategory: 1500 }

    // inventoryid = truck asset ID (field name from workorder-service API)
    const truckId = trip.inventoryid ?? trip.inventoryId ?? trip.assetsid ?? trip.truckId ?? trip.truck_id ?? trip.equipmentId
    if (truckId) updates.equipmentId = Number(truckId)

    // driverid = responsible/driver ID (field name from workorder-service API)
    const responsibleId = trip.driverid ?? trip.driverId ?? trip.responsibleId ?? trip.responsible_id ?? trip.driver_id
    if (responsibleId) updates.responsibleId = Number(responsibleId)

    const subdivisionId = trip.subdivisionId ?? trip.subdivision_id ?? trip.subdivision
    if (subdivisionId) updates.subdivisionId = Number(subdivisionId)

    const fuelType = trip.fuelType ?? trip.fuel_type
    if (fuelType) updates.fuelType = Number(fuelType)

    // typeContainer defaults to 'tank' attribute item (same as old app behavior)
    const fuelRecipient = trip.fuel_recipient ?? trip.typeContainer ?? trip.type_container
    if (fuelRecipient) {
      updates.typeContainer = Number(fuelRecipient)
    } else {
      const tankItem = fuelRecipients.find(
        (item: any) => item.flat_name_id === 'tanque' || item.flat_name_id === 'tank' || item.name === 'Tank' || item.name === 'Tanque',
      )
      if (tankItem) updates.typeContainer = tankItem.attributeItemId
    }

    lastAutoFilledTripRef.current = tripId
    dispatch(updateFuelOrderForm(updates))

    if (updates.equipmentId) {
      dispatch(loadEquipmentAndDrivers({ equipmentType: 1, equipmentId: updates.equipmentId }))
    }
  }, [dispatch, tripDetail, isNew, isCreateFromTrip, current, fuelRecipients])

  useEffect(() => {
    if (!errors) return
    const toast = (window as any).exaToast

    // Extract readable message(s) from all error shapes the API can return:
    // - string
    // - {message: "..."}
    // - [{message: "...", field: "..."}]  ← most common API validation shape
    // - {errors: [{message: "..."}]}
    let messages: string[] = []
    if (typeof errors === 'string') {
      messages = [errors]
    } else if (Array.isArray(errors)) {
      messages = (errors as any[]).map((e) => e?.message ?? String(e)).filter(Boolean)
    } else if (typeof errors === 'object' && errors !== null) {
      const errObj = errors as any
      if (Array.isArray(errObj.errors)) {
        messages = errObj.errors.map((e: any) => e?.message ?? String(e)).filter(Boolean)
      } else if (errObj.message) {
        messages = [errObj.message]
      }
    }

    const msg = messages.length > 0 ? messages.join('\n') : JSON.stringify(errors)

    if (msg.toLowerCase().includes('trip') && msg.toLowerCase().includes('not found')) {
      toast?.error?.('Trip Not Found', 'The trip you searched for could not be found.')
    } else if (msg.toLowerCase().includes('does not allow fueling')) {
      toast?.error?.('Gas Station Not Allowed', msg)
    } else {
      toast?.error?.('Error al guardar Fuel Order', msg)
    }
  }, [errors])

  const gasStationInfo = useMemo(() => {
    if (!current?.gasStationsId || !allGasStores.length) return null
    return allGasStores.find(
      (s: any) => s.gasStationsId === current.gasStationsId,
    ) ?? null
  }, [current?.gasStationsId, allGasStores])

  useEffect(() => {
    if (statuses.added || statuses.updated) {
      const toast = (window as any).exaToast
      if (statuses.added) toast?.success?.('Success', 'Fuel Order created successfully')
      if (statuses.updated) toast?.success?.('Success', 'Fuel Order updated successfully')
      dispatch(resetStatuses())
      navigate('/fuel/fuelorder')
    }
  }, [statuses, dispatch, navigate])

  useEffect(() => {
    if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
      setErrorModalVisible(true)
    }
  }, [errors])

  const setField = useCallback(
    (field: keyof FuelOrderForm, value: any) => {
      dispatch(updateFuelOrderForm({ [field]: value }))
      setTouched((prev) => ({ ...prev, [field]: true }))
    },
    [dispatch],
  )

  const hasError = useCallback(
    (field: keyof FuelOrderForm) => {
      return touched[field] === true && !!validationErrors[field]
    },
    [touched, validationErrors],
  )

  const validate = useCallback(async (): Promise<boolean> => {
    try {
      const schema = buildValidationSchema(current?.equipmentType)
      await schema.validate(current, { abortEarly: false })
      setValidationErrors({})
      return true
    } catch (err: any) {
      const errs: Record<string, string> = {}
      err.inner?.forEach((e: any) => {
        if (e.path) errs[e.path] = e.message
      })
      setValidationErrors(errs)
      setTouched(
        Object.keys(errs).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {},
        ),
      )
      return false
    }
  }, [current])

  const validateSuggestedFuel = useCallback((): boolean => {
    if (!settings?.suggestedAmountRequired || settings.suggestedAmountRequired !== 1) return true

    const suggestedVal = suggested ?? current?.suggested
    if (!suggestedVal || suggestedVal <= 0) return true

    const fuelRequest = Number(current?.fuelRequest) || 0
    const fuelTank = Number(current?.fuelTank) || 0
    const totalFuel = fuelRequest + fuelTank

    const variationMin = Number(settings.fuelVariationMin) || 0
    const variationMax = Number(settings.fuelVariationMax) || 0
    const minAllowed = suggestedVal - (suggestedVal * variationMin / 100)
    const maxAllowed = suggestedVal + (suggestedVal * variationMax / 100)

    if (totalFuel < minAllowed || totalFuel > maxAllowed) {
      const toast = (window as any).exaToast
      toast?.error?.(
        'Validation Error',
        `The sum of requested fuel (${fuelRequest}) and current tank (${fuelTank}) is ${totalFuel}, ` +
        `but must be between ${minAllowed.toFixed(2)} and ${maxAllowed.toFixed(2)}.`,
      )
      return false
    }
    return true
  }, [current, settings, suggested])

  const validateFuelLimit = useCallback(async (): Promise<boolean> => {
    if (!settings?.maxFuelFeature || settings.maxFuelFeature !== 1) return true
    if (!current) return true

    const eType = Number(current.equipmentType) || 1
    let assetTypeId: number
    if (eType === 1) {
      assetTypeId = 1021
    } else if (eType === 2) {
      assetTypeId = 1537
    } else {
      assetTypeId = (equipmentDetail as any)?.vehicle_type_id ?? 1023
    }
    const params: FuelLimitAssessmentParams = {
      fuelRequestLtr: Number(current.fuelRequestLiters ?? current.fuelRequest) || 0,
      fuelModuleConfigId: Number(settings.fuelModuleConfigId) || 0,
      assetId: Number(current.equipmentId) || 0,
      subdivisionId: Number(current.subdivisionId) || 0,
      assetTypeId,
    }

    try {
      const result = await dispatch(checkFuelLimit(params)).unwrap()
      if (result?.limitReached) {
        const toast = (window as any).exaToast
        toast?.error?.(
          'Fuel Limit Exceeded',
          `Fuel limit of ${result.fuelLimit ?? 'N/A'} liters was exceeded. ` +
          `Current usage: ${result.currentUsage ?? 'N/A'} liters.`,
        )
        return false
      }
      return true
    } catch {
      return true
    }
  }, [current, settings, dispatch])

  const handleAddRoute = useCallback(async () => {
    if (!tripDetail || !current) return
    const eqType = Number(current.equipmentType)
    if (eqType !== 1 && eqType !== 2) return
    const workOrder = (tripDetail as any)?.workOrder ?? tripDetail
    const citybid = workOrder?.citybid ?? workOrder?.deliveryCityId
    if (!citybid) return
    try {
      const fromCity = await (await import('../api/fuelOrder.api')).fuelOrderApi.fetchCity(citybid)
      const fromCityId = fromCity?.citieid ?? fromCity?.cityId ?? citybid
      const subdivisionId = Number(current.subdivisionId) || undefined
      dispatch(loadConnectedCities({ fromCityId, subdivisionId }))
      const initialLeg = {
        fromCityId,
        fromCityName: fromCity?.name ?? '',
        toCityId: null,
        toCityName: '',
      }
      dispatch(updateFuelOrderForm({ routeLegs: [initialLeg] }))
    } catch { /* non-fatal */ }
  }, [tripDetail, current, dispatch])

  const handleRemoveRoute = useCallback(() => {
    dispatch(updateFuelOrderForm({ routeLegs: [] }))
    if (tripDetail && current) {
      dispatch(
        calculateSuggestedFuelForType1({
          tripDetail,
          ratebuilderId: settings?.ratebuilderId,
          clientid: (current as any).clientId,
          subdivisionId: Number(current.subdivisionId) || undefined,
        }),
      )
    }
  }, [dispatch, tripDetail, current, settings])

  const buildCreatePayload = useCallback(
    (form: FuelOrderForm): any => {
      const payload: any = { ...form }

      payload.companyId = form.companyId ?? 5
      payload.paymentStatus = payload.paymentStatus ?? '1558'
      payload.reconciliationStatus = payload.reconciliationStatus ?? '1562'
      payload.status = payload.status ?? 1
      payload.supplied = payload.supplied ?? 0
      payload.fuelRequestLtr = form.fuelRequestLiters ?? form.fuelRequest ?? form.fuelRequestLtr
      payload.fuelTankLiters = form.fuelTankLiters ?? form.fuelTank ?? 0
      payload.fuelTypeMeasure = payload.fuelTypeMeasure ?? 'typeMeasure'
      payload.approvalDate = new Date()

      const eType = Number(form.equipmentType)
      if (!payload.measureType) {
        payload.measureType = eType === 2 ? 'horometer' : 'odometer'
      }
      if (!payload.resourceCategory) {
        if (eType === 1) payload.resourceCategory = 1500
        else if (eType === 2) payload.resourceCategory = 1499
      }

      payload.expTimeBefore =
        (form as any).expTimeBefore ?? settings?.expTimeBefore ?? 0
      payload.expTimeAfter =
        (form as any).expTimeAfter ?? settings?.expTimeAfter ?? 0

      if (settings) {
        payload.fuelModuleConfigId = settings.fuelModuleConfigId
        payload.settings_tripRequired = settings.tripRequired
        payload.settings_expTimeBefore = settings.expTimeBefore
        payload.settings_expTimeAfter = settings.expTimeAfter
        payload.settings_approvalRequired = settings.approvalRequired
        payload.settings_minimumApprove = settings.minimumApprove
        payload.settings_maximumApprove = settings.maximumApprove
        payload.settings_fuelVariationMin = settings.fuelVariationMin
        payload.settings_fuelVariationMax = settings.fuelVariationMax
        payload.settings_fuelSupplyVariationMin = settings.fuelSupplyVariationMin
        payload.settings_fuelSupplyVariationMax = settings.fuelSupplyVariationMax
        payload.settings_suggestedAmountRequired = settings.suggestedAmountRequired
        payload.settings_maxFuelFeature = settings.maxFuelFeature
        payload.settings_name = settings.name
        payload.settings_ratebuilderId = settings.ratebuilderId
        payload.settings_fuelOrderTypeId = settings.fuelOrderTypeId
        payload.settings_fuelStatementRequired = settings.fuelStatementRequired
        payload.settings_supplierStatementRequired = settings.supplierStatementRequired
        payload.approvalRequired = settings.approvalRequired
      }

      if (form.dateSchedule) {
        payload.dateSchedule = form.dateSchedule
      }
      if (form.expirationDate) {
        payload.expirationDate = form.expirationDate
      }

      // Fields required by backend that are hardcoded or derived
      payload.fuelPriceId = payload.fuelPriceId ?? null
      payload.gasSupplierStatementId = payload.gasSupplierStatementId ?? 6
      payload.totalLps = payload.totalLps ?? 250
      payload.totalDollar = payload.totalDollar ?? 300

      const userId = authStorage.getUser()?.user_id ?? 3
      payload.createdBy = payload.createdBy ?? userId
      payload.updatedBy = payload.updatedBy ?? userId

      if (!payload.statusFuelOrder) {
        const approvedStatus = fuelOrderStatuses.find(
          (s: any) => s.flat_name_id === 'approved',
        )
        payload.statusFuelOrder = approvedStatus ? String(approvedStatus.attributeItemId) : null
      }

      // settings_suggestedAmountRequired must be an integer
      if (payload.settings_suggestedAmountRequired == null) {
        payload.settings_suggestedAmountRequired = 0
      } else {
        payload.settings_suggestedAmountRequired = Number(payload.settings_suggestedAmountRequired) || 0
      }

      return payload
    },
    [settings, fuelOrderStatuses],
  )

  const handleSave = useCallback(async () => {
    if (!current) return
    const toast = (window as any).exaToast
    const isValid = await validate()
    if (!isValid) {
      toast?.error?.('Validation Error', 'Please fill in all required fields before saving.')
      return
    }

    const orderType = Number(current.orderType) || 0
    const tripRequired = orderType !== 1588 && ([961, 963].includes(orderType) || settings?.tripRequired === 1)
    if (tripRequired && !current.tripsid) {
      setValidationErrors((prev) => ({ ...prev, tripsid: 'Trip ID is required for this order type' }))
      setTouched((prev) => ({ ...prev, tripsid: true }))
      return
    }

    if (Number(orderType) === 1588 && !(current as any).clientId) {
      toast?.error?.('Validation Error', 'Client is required for this order type.')
      return
    }

    if (!settings && orderType !== 1588) {
      toast?.warning?.('Warning', 'No matching fuel order settings found. Please verify the configuration.')
    }

    if (!validateSuggestedFuel()) return

    const fuelLimitOk = await validateFuelLimit()
    if (!fuelLimitOk) return

    if (isNew || isCreateFromTrip) {
      const payload = buildCreatePayload(current)
      console.log('[FuelOrder] create payload:', payload)
      dispatch(addFuelOrder(payload))
    } else {
      const updatePayload: any = { ...current }
      updatePayload.expTimeBefore =
        (current as any).expTimeBefore ?? settings?.expTimeBefore ?? 0
      updatePayload.expTimeAfter =
        (current as any).expTimeAfter ?? settings?.expTimeAfter ?? 0
      updatePayload.fuelRequestLtr =
        current.fuelRequestLiters ?? current.fuelRequest ?? current.fuelRequestLtr
      updatePayload.fuelTankLiters = current.fuelTankLiters ?? current.fuelTank ?? 0
      if (!updatePayload.measureType) {
        const eType = Number(current.equipmentType)
        updatePayload.measureType = eType === 2 ? 'horometer' : 'odometer'
      }
      if (current.expirationDate) {
        updatePayload.expirationDate = new Date(current.expirationDate).toISOString()
      }
      if (current.dateSchedule) {
        updatePayload.dateSchedule = new Date(current.dateSchedule).toISOString()
      }
      dispatch(saveFuelOrder(updatePayload))
    }
  }, [current, validate, validateSuggestedFuel, validateFuelLimit, buildCreatePayload, isNew, isCreateFromTrip, dispatch, settings])

  const handleBack = () => navigate('/fuel/fuelorder')

  const pageTitle = isNew || isCreateFromTrip
    ? 'New Fuel Order'
    : viewMode
      ? `Fuel Order #${id}`
      : `Edit Fuel Order #${id}`

  if (loading) {
    return (
      <CContainer fluid className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-2">Loading fuel order...</p>
      </CContainer>
    )
  }

  if (!current) {
    return (
      <CContainer fluid>
        <CCard>
          <CCardBody>No fuel order data found.</CCardBody>
        </CCard>
      </CContainer>
    )
  }

  return (
    <CContainer fluid>
      <PageHero
        kicker="Fuel"
        icon={cilDrop}
        title={pageTitle}
        actions={
          <div className="d-flex gap-2">
            <CButton
              color="secondary"
              variant="outline"
              onClick={handleBack}
            >
              <CIcon icon={cilArrowLeft} className="me-2" /> Back
            </CButton>
            {/* Gap 7: PDF only for approved orders */}
            {!isNew && !isCreateFromTrip && current?.fuelOrderId && isApprovedForPdf && (
              <CButton
                color="danger"
                variant="outline"
                onClick={() => dispatch(downloadFuelOrderPdf(current.fuelOrderId!))}
              >
                <CIcon icon={cilCloudDownload} className="me-2" /> PDF
              </CButton>
            )}
            {isEditable && (
              <CButton
                color="primary"
                className="text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <CSpinner size="sm" className="me-2" />
                ) : (
                  <CIcon icon={cilSave} className="me-2" />
                )}
                {isNew || isCreateFromTrip ? 'Create' : 'Save'}
              </CButton>
            )}
          </div>
        }
      />

      {/* Gap 25: Created At / Updated At in header area for existing orders */}
      {current.fuelOrderId && (current.createdAt || current.updatedAt) && (
        <CRow className="mb-2">
          <CCol>
            <small className="text-body-secondary">
              {current.createdAt && (
                <span className="me-4">
                  Created: {new Intl.DateTimeFormat('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  }).format(new Date(current.createdAt))}
                </span>
              )}
              {current.updatedAt && (
                <span>
                  Updated: {new Intl.DateTimeFormat('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  }).format(new Date(current.updatedAt))}
                </span>
              )}
            </small>
          </CCol>
        </CRow>
      )}

      <CRow>
        <CCol lg={8}>
          <CCard className="mb-3">
            <CCardBody>
              <GasStoreFormSection
                value={current}
                disabled={!isEditable}
                errors={validationErrors}
                orderTypes={orderTypes}
                settings={settings}
                setField={setField}
                hasError={hasError}
                isNew={isNew || isCreateFromTrip}
                originalTripsid={originalTripsidRef.current}
              />
            </CCardBody>
          </CCard>

          <RouteLegsSection
            value={current}
            disabled={!isEditable}
            setField={setField}
          />

          {/* Gap 28: FuelQuantitySection now self-hides when prerequisites not met */}
          <FuelQuantitySection
            value={current}
            disabled={!isEditable}
            errors={validationErrors}
            setField={setField}
            hasError={hasError}
            tripDetail={tripDetail}
            subdivisionsList={subdivisionsList}
          />

          {current.fuelOrderId && (
            <ReconciliationSection
              fuelOrder={current}
              disabled={!isEditable}
              isApprovedOrder={isApproved}
            />
          )}
        </CCol>

        <CCol lg={4}>
          {current.fuelOrderId && (
            <OrderStatusSection
              value={current}
              disabled={!isEditable}
              fuelOrderStatuses={fuelOrderStatuses}
            />
          )}

          <TripInformationDisplay
            tripDetail={tripDetail}
            routeLegs={current.routeLegs}
            disabled={!isEditable}
            onAddRoute={handleAddRoute}
            onRemoveRoute={handleRemoveRoute}
          />
          <GasStoreDetails gasStation={gasStationInfo} />
        </CCol>
      </CRow>

      {current.fuelOrderId && (
        <CRow className="mt-3">
          <CCol>
            <Comments moduleId={getModuleIdByName(MODULE_FUEL_ORDERS)} itemId={current.fuelOrderId} />
          </CCol>
        </CRow>
      )}

      <ErrorMessageModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        errors={errors}
      />
    </CContainer>
  )
}

export default FuelOrderEditPage
