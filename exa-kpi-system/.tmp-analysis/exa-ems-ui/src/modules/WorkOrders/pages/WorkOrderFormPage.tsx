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
  CSpinner,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilNotes } from '@coreui/icons'
import type { AppDispatch, RootState } from '../../../store'
import {
  clearWorkOrder,
  createWorkOrder,
  loadWorkOrder,
  resetStatus,
  updateWorkOrder,
} from '../store/workordersSlice'
import WorkOrderForm, { type Option } from '../components/WorkOrderForm'
import CoordinatesEditModal from '../components/CoordinatesEditModal'
import type { WorkOrder, WorkOrderTrip } from '../types'
import { workOrderHelpers } from '../api/workorders.api'
import { clientsAPI } from '../api/clients.api'
import { locationsAPI } from '../../Locations/api/locations.api'
import { hasValidCoordinates } from '../../../utils/coordinates'
import Comments from '../../../components/Comments/Comments'
import Attachments from '../../../components/Attachments/Attachments'
import {
  permissionService,
  UPDATE,
  CREATE,
  COMMENT_READ,
  COMMENT_UPDATE,
  ATTACHMENT_READ,
  ATTACHMENT_UPDATE,
  INVOICE_PRICE_KM
} from '../../../services/auth/permission.service'

import { MODULE_WORK_ORDERS, getModuleIdByName } from '../../../constants/modules'
import PageHero from '../../../components/PageHero'
import './WorkOrderForm.scss'
const priceFormat = (value: number) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '$0.00'
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

const defaultTrip = (): WorkOrderTrip => ({
  trip_id: null,
  price: null,
  others: null,
  container_ref: '',
  driver: null,
  inventory: null,
  km: null,
  container_type_id: '',
})

const defaultWorkOrder: WorkOrder = {
  ref_number: '',
  is_return_trip: false,
  is_return: false,
  client_id: '',
  cargo_id: '',
  city_a_id: '',
  city_b_id: '',
  city_c_id: '',
  location_a_id: '',
  location_b_id: '',
  location_c_id: '',
  city_a_name: '',
  city_b_name: '',
  city_c_name: '',
  location_a_name: '',
  location_b_name: '',
  location_c_name: '',
  date_a: null,
  date_b: null,
  customs: false,
  trips: [defaultTrip()],
  work_order_routes: [],
  active: 'Yes',
}

const WorkOrderFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id && id !== 'new')
  const moduleId = getModuleIdByName(MODULE_WORK_ORDERS)

  const { details } = useSelector((state: RootState) => (state as any).auth || {})
  const { workorder, status } = useSelector((state: RootState) => (state as any).workorders)

  const [formData, setFormData] = useState<WorkOrder>(defaultWorkOrder)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const toaster = useRef<any>()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedOrder, setSavedOrder] = useState<WorkOrder | null>(null)
  const [attributesLoaded, setAttributesLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  const [cargoOptions, setCargoOptions] = useState<Option[]>([])
  const [containerOptions, setContainerOptions] = useState<Option[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [locationsByCity, setLocationsByCity] = useState<Record<string, Option[] | null>>({})
  const [locationRecordsByCity, setLocationRecordsByCity] = useState<Record<string, any[]>>({})
  const [coordsModal, setCoordsModal] = useState<{ leg: 'a' | 'b' | 'c'; cityId: string | number; location: any } | null>(null)
  const [inventoryOptions, setInventoryOptions] = useState<Option[]>([])
  const [clientOptions, setClientOptions] = useState<Option[]>([])

  const canUpdate = permissionService.checkPermission(MODULE_WORK_ORDERS, UPDATE)
  const canCreate = permissionService.checkPermission(MODULE_WORK_ORDERS, CREATE)
  
  // Debug permissions
  useEffect(() => {
    console.log('🔐 [Permissions Debug] User Details:', details)
    console.log('🔐 [Permissions Debug] Module ID:', MODULE_WORK_ORDERS)
    console.log('🔐 [Permissions Debug] Can Update:', canUpdate)
    console.log('🔐 [Permissions Debug] Can Create:', canCreate)
    console.log('🔐 [Permissions Debug] Comment Read:', permissionService.checkPermission(MODULE_WORK_ORDERS, COMMENT_READ))
    console.log('🔐 [Permissions Debug] Attachment Read:', permissionService.checkPermission(MODULE_WORK_ORDERS, ATTACHMENT_READ))
    console.log('🔐 [Permissions Debug] Invoice Price & Km:', permissionService.checkPermission(MODULE_WORK_ORDERS, INVOICE_PRICE_KM))
  }, [details, canUpdate, canCreate])

  const locked = useMemo(() => {
    const isLockedByStatus = (formData.trips || []).some((t: any) => {
      const hasPayment = t.payment !== null && t.payment !== undefined && t.payment !== false && t.payment !== 0 && t.payment !== ''
      const hasInvoice = t.invoice !== null && t.invoice !== undefined && t.invoice !== false && t.invoice !== 0 && t.invoice !== ''
      const isClosed = t.close_trip_date !== null && t.close_trip_date !== undefined && t.close_trip_date !== ''
      // console.log('🔍 [locked] Trip check:', { trip_id: t.trip_id, hasPayment, hasInvoice, isClosed, payment: t.payment, invoice: t.invoice, close_trip_date: t.close_trip_date })
      return hasPayment || hasInvoice || isClosed
    })
    const isLockedByPermission = isEdit ? !canUpdate : !canCreate
    
    console.log('🔐 [locked] Calculation:', { 
      isLockedByStatus, 
      isLockedByPermission, 
      isEdit, 
      canUpdate, 
      canCreate,
      tripsCount: formData.trips?.length 
    })
    
    const params = new URLSearchParams(location.search)
    const isViewMode = params.get('mode') === 'view'
    return isLockedByStatus || isLockedByPermission || isViewMode
  }, [formData.trips, isEdit, canUpdate, canCreate, location.search])

  const clients: Option[] = useMemo(() => {
    if (clientOptions.length) return clientOptions
    const clientList = details?.clients || []
    return clientList.map((c: any) => ({
      value: String(c.client_id ?? c.id ?? c.value),
      label: c.name ?? c.label ?? c.client_name ?? `Client ${c.client_id ?? c.id}`,
    }))
  }, [details, clientOptions])

  // Helper to format city name like legacy: "City Name (Variant), Department, Country"
  const getCityName = (city: any): string => {
    if (!city) return ''
    const parts = [
      city.name,
      city.variant ? `(${city.variant.name})` : null,
      city.department?.name,
    ].filter(Boolean)
    const cityPart = parts.join(' ')
    const countryPart = city.department?.country?.name || ''
    return countryPart ? `${cityPart}, ${countryPart}` : cityPart
  }

  // Helper to get base city name (for address field)
  const getBaseCityName = (city: any): string => {
    return city?.name || ''
  }

  // Get all cities from routes (for City A) - with address field support
  const cityOptionsA: Option[] = useMemo(() => {
    console.log('🔍 [cityOptionsA] Computing - routes.length:', routes?.length, 'formData.city_a_id:', formData.city_a_id, 'formData.city_a_name:', formData.city_a_name)
    if (!routes || routes.length === 0) {
      // If no routes but we have a selected city, include it
      if (formData.city_a_id) {
        const fallback = [{ 
          value: String(formData.city_a_id), 
          label: formData.city_a_name || `City ${formData.city_a_id}`,
          address: formData.city_a_name || '' // Store base name as address
        }]
        console.log('🔍 [cityOptionsA] No routes, returning fallback:', fallback)
        return fallback
      }
      console.log('🔍 [cityOptionsA] No routes and no city_a_id, returning empty')
      return []
    }
    const list: Record<string, any> = {}
    const currentRouteIds = (formData.work_order_routes || []).map((r: any) => r.route?.route_id || r.route_id)
    console.log('🔍 [cityOptionsA] currentRouteIds:', currentRouteIds)
    
    routes.forEach((route: any) => {
      // Include route if it's active or already selected
      if (!route.status && !currentRouteIds.includes(route.route_id)) return
      
      if (route.city_a) {
        const cityId = route.city_a.city_id
        list[cityId] = { 
          value: String(cityId), 
          label: getCityName(route.city_a) || route.city_a.name || `City ${cityId}`,
          address: getBaseCityName(route.city_a) // Store base city name for address field
        }
      }
      if (route.city_b) {
        const cityId = route.city_b.city_id
        list[cityId] = { 
          value: String(cityId), 
          label: getCityName(route.city_b) || route.city_b.name || `City ${cityId}`,
          address: getBaseCityName(route.city_b) // Store base city name for address field
        }
      }
    })
    
    console.log('🔍 [cityOptionsA] Cities from routes:', Object.keys(list).length, 'list keys:', Object.keys(list))
    
    // Ensure currently selected city is present
    if (formData.city_a_id) {
      const cityId = Number(formData.city_a_id)
      // Check if city is already in list (keys are numbers from route.city_id)
      const exists = Object.keys(list).some((key) => Number(key) === cityId)
      console.log('🔍 [cityOptionsA] Checking if city_a_id', cityId, 'exists in list:', exists)
      if (!exists) {
        list[cityId] = { 
          value: String(cityId), 
          label: formData.city_a_name || `City ${cityId}`,
          address: formData.city_a_name || '' // Fallback address
        }
        console.log('🔍 [cityOptionsA] Added city_a_id to list:', list[cityId])
      }
    }
    
    const result = Object.values(list).sort((a, b) => String(a.label).localeCompare(String(b.label)))
    console.log('🔍 [cityOptionsA] Final result:', result.length, 'options. Sample:', result.slice(0, 5))
    return result
  }, [routes, formData.work_order_routes, formData.city_a_id, formData.city_a_name])

  // Get cities reachable from City A (for City B)
  const cityOptionsB: Option[] = useMemo(() => {
    if (!formData.city_a_id || !routes || routes.length === 0) {
      if (formData.city_b_id) {
        return [{ 
          value: String(formData.city_b_id), 
          label: formData.city_b_name || `City ${formData.city_b_id}`,
          address: formData.city_b_name || ''
        }]
      }
      return []
    }
    const list: Record<string, any> = {}
    const currentRouteIds = (formData.work_order_routes || []).map((r: any) => r.route?.route_id || r.route_id)
    const cityAId = Number(formData.city_a_id)
    
    routes.forEach((route: any) => {
      if (!route.status && !currentRouteIds.includes(route.route_id)) return
      
      // If route starts from City A, include City B
      if (route.city_a?.city_id === cityAId && route.city_b) {
        const cityId = route.city_b.city_id
        list[cityId] = { 
          value: String(cityId), 
          label: getCityName(route.city_b) || route.city_b.name || `City ${cityId}`,
          address: getBaseCityName(route.city_b)
        }
      }
      // If route ends at City A, include City B (reverse route)
      if (route.city_b?.city_id === cityAId && route.city_a) {
        const cityId = route.city_a.city_id
        list[cityId] = { 
          value: String(cityId), 
          label: getCityName(route.city_a) || route.city_a.name || `City ${cityId}`,
          address: getBaseCityName(route.city_a)
        }
      }
    })
    
    // Ensure currently selected city is present
    if (formData.city_b_id) {
      const cityId = Number(formData.city_b_id)
      const exists = Object.keys(list).some((key) => Number(key) === cityId)
      if (!exists) {
        list[cityId] = { 
          value: String(cityId), 
          label: formData.city_b_name || `City ${cityId}`,
          address: formData.city_b_name || ''
        }
      }
    }
    
    return Object.values(list).sort((a, b) => String(a.label).localeCompare(String(b.label)))
  }, [routes, formData.work_order_routes, formData.city_a_id, formData.city_b_id, formData.city_b_name])

  // Get cities reachable for return (for City C)
  const cityOptionsC: Option[] = useMemo(() => {
    if (!routes || routes.length === 0) {
      if (formData.city_c_id) {
        return [{ 
          value: String(formData.city_c_id), 
          label: formData.city_c_name || `City ${formData.city_c_id}`,
          address: formData.city_c_name || ''
        }]
      }
      return []
    }
    const list: Record<string, any> = {}
    const currentRouteIds = (formData.work_order_routes || []).map((r: any) => r.route?.route_id || r.route_id)
    
    // If is_return_trip, start from City A, otherwise from City B
    const isReturnTrip = formData.is_return_trip ?? false
    const startCityId = isReturnTrip 
      ? Number(formData.city_a_id) 
      : Number(formData.city_b_id)
    
    if (!startCityId) {
      if (formData.city_c_id) {
        return [{ 
          value: String(formData.city_c_id), 
          label: formData.city_c_name || `City ${formData.city_c_id}`,
          address: formData.city_c_name || ''
        }]
      }
      return []
    }
    
    routes.forEach((route: any) => {
      if (!route.status && !currentRouteIds.includes(route.route_id)) return

      // If route starts from start city, include destination
      if (route.city_a?.city_id === startCityId && route.city_b) {
        const cityId = route.city_b.city_id
        list[cityId] = {
          value: String(cityId),
          label: getCityName(route.city_b) || route.city_b.name || `City ${cityId}`,
          address: getBaseCityName(route.city_b)
        }
      }
      // Reverse route
      if (route.city_b?.city_id === startCityId && route.city_a) {
        const cityId = route.city_a.city_id
        list[cityId] = {
          value: String(cityId),
          label: getCityName(route.city_a) || route.city_a.name || `City ${cityId}`,
          address: getBaseCityName(route.city_a)
        }
      }
    })

    // Include delivery city (B) and pickup city (A) as valid return destinations
    if (formData.city_b_id && !list[Number(formData.city_b_id)]) {
      const cityId = Number(formData.city_b_id)
      list[cityId] = {
        value: String(cityId),
        label: formData.city_b_name || `City ${cityId}`,
        address: formData.city_b_name || ''
      }
    }
    if (formData.city_a_id && !list[Number(formData.city_a_id)]) {
      const cityId = Number(formData.city_a_id)
      list[cityId] = {
        value: String(cityId),
        label: formData.city_a_name || `City ${cityId}`,
        address: formData.city_a_name || ''
      }
    }

    // Ensure currently selected city is present
    if (formData.city_c_id) {
      const cityId = Number(formData.city_c_id)
      const exists = Object.keys(list).some((key) => Number(key) === cityId)
      if (!exists) {
        list[cityId] = { 
          value: String(cityId), 
          label: formData.city_c_name || `City ${cityId}`,
          address: formData.city_c_name || ''
        }
      }
    }
    
    return Object.values(list).sort((a, b) => String(a.label).localeCompare(String(b.label)))
  }, [routes, formData.work_order_routes, formData.is_return_trip, formData.city_a_id, formData.city_a_name, formData.city_b_id, formData.city_b_name, formData.city_c_id, formData.city_c_name])

  // Helpers
  const showToast = (message: string, color: 'success' | 'danger') => {
    setToast(
      <CToast autohide delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  const loadAttributes = async () => {
    try {
      // Match legacy implementation: get attributes WITHOUT admin header
      // The admin header causes backend to return incomplete item data (items missing attribute_item_id and name)
      const attrs = await workOrderHelpers.getAttributesWithItems()
      
      // Find cargo and container attributes (matching legacy: attribute_id 76 and 77)
      const cargoAttr = attrs.find((a: any) => Number(a.attribute_id) === 76)
      const containerAttr = attrs.find((a: any) => Number(a.attribute_id) === 77)
      
      // Map items using RenderOptions pattern: (list, idField = 'attribute_item_id', nameField = 'name')
      // Legacy: RenderOptions(cargoType.items, 'attribute_item_id')
      const mapOption = (item: any) => {
        const value = item?.attribute_item_id
        const label = item?.name
        if (value !== null && value !== undefined && value !== '') {
          return { value: String(value), label: String(label || `Item ${value}`) }
        }
        return null
      }
      
      const cargoMapped = (cargoAttr?.items || [])
        .map(mapOption)
        .filter(Boolean) as Option[]
      
      const containerMapped = (containerAttr?.items || [])
        .map(mapOption)
        .filter(Boolean) as Option[]
      
      console.log('📦 Loaded cargo options:', cargoMapped.length, 'items')
      console.log('📦 Loaded container options:', containerMapped.length, 'items')
      
      setCargoOptions(cargoMapped)
      setContainerOptions(containerMapped)
      
      if (cargoMapped.length === 0 && cargoAttr?.items?.length > 0) {
        console.error('❌ Cargo items exist but missing attribute_item_id or name fields')
        console.error('❌ Sample item:', cargoAttr.items[0])
        showToast('Cargo types loaded but data format is incorrect', 'danger')
      }
      
      if (containerMapped.length === 0 && containerAttr?.items?.length > 0) {
        console.error('❌ Container items exist but missing attribute_item_id or name fields')
        console.error('❌ Sample item:', containerAttr.items[0])
        showToast('Container types loaded but data format is incorrect', 'danger')
      }
    } catch (err: any) {
      console.error('❌ Failed to load attributes:', err)
      showToast('Failed to load cargo and container types', 'danger')
    }
  }

  const loadRoutesForClient = async (clientId: number | string) => {
    if (!clientId) {
      console.log('🔍 [loadRoutesForClient] No clientId, clearing routes')
      setRoutes([])
      return
    }
    try {
      console.log('🔍 [loadRoutesForClient] Loading routes for client:', clientId)
      const list = await workOrderHelpers.getRoutesByClient(Number(clientId))
      console.log('🔍 [loadRoutesForClient] Routes loaded:', list?.length, 'routes. Sample:', list?.slice(0, 3))
      setRoutes(list || [])
    } catch (err: any) {
      console.error('❌ [loadRoutesForClient] Failed to load routes', err)
      showToast('Failed to load routes for client', 'danger')
      setRoutes([])
    }
  }

  const loadLocations = async (cityId?: number | string) => {
    if (!cityId) {
      console.log('🔍 [loadLocations] No cityId provided')
      return
    }
    try {
      console.log('🔍 [loadLocations] Loading locations for city:', cityId)
      const list = await workOrderHelpers.getLocationsByCity(Number(cityId))
      console.log('🔍 [loadLocations] Locations loaded for city', cityId, ':', list?.length, 'locations. Sample:', list?.slice(0, 3))
      const mapped = (list || []).map((loc: any) => ({
        value: String(loc.location_id ?? loc.id),
        label: loc.name,
      }))
      console.log('🔍 [loadLocations] Mapped locations:', mapped)
      setLocationsByCity((prev) => {
        const updated = {
          ...prev,
          [String(cityId)]: mapped,
        }
        console.log('🔍 [loadLocations] Updated locationsByCity for city', cityId, ':', updated[String(cityId)])
        return updated
      })
      // Keep the raw records too — they carry the position/coordinate data the
      // option list drops, needed to validate that locations have lat/long set.
      setLocationRecordsByCity((prev) => ({
        ...prev,
        [String(cityId)]: list || [],
      }))
    } catch (err: any) {
      console.error('❌ [loadLocations] Failed to load locations for city', cityId, ':', err)
      showToast('Failed to load locations for city', 'danger')
    }
  }

  const loadInventory = async (includes?: string) => {
    const query: Record<string, any> = {}
    if (includes) query.includes = includes
    try {
      const list = await workOrderHelpers.getInventoryForWorkOrders(query)
      console.log('🔍 [loadInventory] Raw inventory list:', list)
      console.log('🔍 [loadInventory] Includes param:', includes)
      const options = (list || []).map((inv: any) => ({
        value: String(inv.asset_id ?? inv.id),
        label: `${inv.truck ?? inv.name}/${inv.driver_name ?? ''} (${inv.availability ?? inv.status})`,
      }))
      console.log('🔍 [loadInventory] Mapped inventory options:', options)
      setInventoryOptions(options)
    } catch (err: any) {
      console.error('Failed to load inventory', err)
      showToast('Failed to load inventory', 'danger')
    }
  }

  const initNew = async () => {
    setFormData(defaultWorkOrder)
    setErrors({})
  }

  const initEdit = async (workOrderId: number) => {
    setLoading(true)
    try {
      console.log('🔍 [initEdit] Loading work order:', workOrderId)
      const result: any = await dispatch(loadWorkOrder(workOrderId))
      if (result.meta.requestStatus === 'fulfilled') {
        const payload = result.payload as WorkOrder
        const normalizeUnix = (val: any) => {
          if (val === null || val === undefined || val === '') return null
          const num = Number(val)
          if (Number.isFinite(num)) return num
          
          const date = new Date(val)
          if (!Number.isNaN(date.getTime())) {
            return Math.floor(date.getTime() / 1000)
          }
          return null
        }
        console.log('🔍 [initEdit] Payload received:', payload)
        console.log('🔍 [initEdit] payload.city_a_id:', payload.city_a_id, 'payload.city_a_name:', payload.city_a_name)
        console.log('🔍 [initEdit] payload.city_b_id:', payload.city_b_id, 'payload.city_b_name:', payload.city_b_name)
        console.log('🔍 [initEdit] payload.location_a_id:', payload.location_a_id, 'payload.location_a_name:', payload.location_a_name)
        console.log('🔍 [initEdit] payload.location_b_id:', payload.location_b_id, 'payload.location_b_name:', payload.location_b_name)
        
        const isReturn = payload.is_return ?? false
        const formDataToSet = {
          ...defaultWorkOrder,
          ...payload,
          client_id: payload.client_id ?? '',
          cargo_id: payload.cargo_id ?? '',
          city_a_id: payload.city_a_id ?? '',
          city_b_id: payload.city_b_id ?? '',
          city_c_id: payload.city_c_id ?? '',
          location_a_id: payload.location_a_id ?? '',
          location_b_id: payload.location_b_id ?? '',
          location_c_id: payload.location_c_id ?? '',
          date_a: normalizeUnix(payload.date_a),
          date_b: normalizeUnix(payload.date_b),
          is_return: isReturn,
          is_return_trip: payload.is_return_trip ?? isReturn, // Sync with is_return if not provided
          active: payload.active ?? 'Yes',
          trips: payload.trips && payload.trips.length ? payload.trips : [defaultTrip()],
        }
        
        console.log('🔍 [initEdit] FormData to set:', formDataToSet)
        console.log('🔍 [initEdit] formDataToSet.city_a_id:', formDataToSet.city_a_id)
        console.log('🔍 [initEdit] formDataToSet.city_b_id:', formDataToSet.city_b_id)
        console.log('🔍 [initEdit] formDataToSet.location_a_id:', formDataToSet.location_a_id)
        console.log('🔍 [initEdit] formDataToSet.location_b_id:', formDataToSet.location_b_id)
        
        setFormData(formDataToSet)
        
        if (payload.client_id) {
          console.log('🔍 [initEdit] Loading routes for client:', payload.client_id)
          loadRoutesForClient(payload.client_id)
        }
        ;['city_a_id', 'city_b_id', 'city_c_id'].forEach((field) => {
          const val = (payload as any)[field]
          if (val) {
            console.log(`🔍 [initEdit] Loading locations for ${field}:`, val)
            loadLocations(val)
          }
        })
        console.log('🔍 [initEdit] Trips data:', payload.trips)
        const includeIds = (payload.trips || [])
          .map((t: any) => {
            console.log('🔍 [initEdit] Trip inventory value:', t.inventory)
            return t.inventory
          })
          .filter(Boolean)
          .join(',')
        console.log('🔍 [initEdit] Include IDs for inventory:', includeIds)
        await loadInventory(includeIds)
      } else {
        console.error('❌ [initEdit] Failed to load work order:', result.payload)
        showToast('Failed to load work order', 'danger')
      }
    } finally {
      setLoading(false)
    }
  }

  // Debug: Log formData changes for cities and locations
  useEffect(() => {
    console.log('🔍 [formData] Updated - city_a_id:', formData.city_a_id, 'city_a_name:', formData.city_a_name)
    console.log('🔍 [formData] Updated - city_b_id:', formData.city_b_id, 'city_b_name:', formData.city_b_name)
    console.log('🔍 [formData] Updated - location_a_id:', formData.location_a_id, 'location_a_name:', formData.location_a_name)
    console.log('🔍 [formData] Updated - location_b_id:', formData.location_b_id, 'location_b_name:', formData.location_b_name)
    console.log('🔍 [formData] Updated - client_id:', formData.client_id)
  }, [formData.city_a_id, formData.city_b_id, formData.location_a_id, formData.location_b_id, formData.client_id])

  useEffect(() => {
    const loadMetadata = async () => {
      await loadAttributes()
      // Hydrate client list from API to ensure dropdown has complete options
      try {
        const list = await clientsAPI.getClients()
        setClientOptions(list.map((c) => ({ value: c.client_id, label: c.name || `Client ${c.client_id}` })))
      } catch (err) {
        console.error('Failed to load clients fallback', err)
        showToast('Failed to load clients', 'danger')
      } finally {
        setAttributesLoaded(true)
      }
    }
    loadMetadata()

    const loadData = async () => {
      if (isEdit && id) {
        await initEdit(Number(id))
      } else {
        await initNew()
      }
      setDataLoaded(true)
    }
    loadData()

    return () => {
      dispatch(clearWorkOrder())
      dispatch(resetStatus())
    }
  }, [id, isEdit])

  const contentReady = attributesLoaded && dataLoaded

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}
    const required = (value: any) => value !== undefined && value !== null && String(value).trim() !== ''
    if (!required(formData.ref_number)) nextErrors.ref_number = 'Reference is required'
    if (!required(formData.client_id)) nextErrors.client_id = 'Client is required'
    if (!required(formData.cargo_id)) nextErrors.cargo_id = 'Cargo type is required'
    if (!required(formData.city_a_id)) nextErrors.city_a_id = 'City A is required'
    if (!required(formData.city_b_id)) nextErrors.city_b_id = 'City B is required'
    if (!required(formData.location_a_id)) nextErrors.location_a_id = 'Location A is required'
    if (!required(formData.location_b_id)) nextErrors.location_b_id = 'Location B is required'
    if (!formData.date_a) nextErrors.date_a = 'Date A is required'
    if (!formData.date_b) nextErrors.date_b = 'Date B is required'
    if (formData.is_return) {
      if (!required(formData.city_c_id)) nextErrors.city_c_id = 'City C is required'
      if (!required(formData.location_c_id)) nextErrors.location_c_id = 'Location C is required'
    }
    const legs: Array<'a' | 'b' | 'c'> = formData.is_return ? ['a', 'b', 'c'] : ['a', 'b']
    legs.forEach((leg) => {
      const field = `location_${leg}_id`
      if (nextErrors[field]) return
      const cityId = (formData as any)[`city_${leg}_id`]
      const locationId = (formData as any)[field]
      if (!cityId || !locationId) return
      const records = locationRecordsByCity[String(cityId)]
      // Records still loading? Don't false-block; the backend rejects bad coords anyway.
      if (!Array.isArray(records)) return
      const record = records.find((l: any) => String(l.location_id ?? l.id) === String(locationId))
      if (record && !hasValidCoordinates(record)) {
        nextErrors[field] = 'Selected location has no GPS coordinates. Use "Set coordinates" to add them.'
      }
    })
    ;(formData.trips || []).forEach((trip, idx) => {
      if (!required(trip.container_ref)) nextErrors[`trips.${idx}.container_ref`] = 'Container ref is required'
    })
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSaveCoordinates = async (latitud: number, longitud: number) => {
    if (!coordsModal) return
    const { location: record, cityId, leg } = coordsModal
    // Minimal payload: the backend merges fields server-side and keeps
    // address/phone/reference; sending name avoids its uniqueness check.
    await locationsAPI.updateLocation(Number(record.location_id ?? record.id), {
      name: record.name,
      status: record.status,
      latitud,
      longitud,
    })
    await loadLocations(cityId)
    setErrors((prev) => {
      const next = { ...prev }
      delete next[`location_${leg}_id`]
      return next
    })
    setCoordsModal(null)
    showToast('Location coordinates updated', 'success')
  }

  const handleChangeField = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev }
      if (field.startsWith('trips.')) {
        const [, idxStr, key] = field.split('.')
        const idx = Number(idxStr)
        const trips = [...(prev.trips || [])]
        trips[idx] = { ...trips[idx], [key]: value }
        next.trips = trips
      } else {
        ;(next as any)[field] = value
        
        // Chain linking: Clear dependent fields when cities change (matching legacy)
        if (field === 'city_a_id') {
          // When City A changes, clear City B, City C, and their locations
          if (!value || String(value) !== String(prev.city_a_id)) {
            next.city_b_id = ''
            next.city_b_name = ''
            next.city_c_id = ''
            next.city_c_name = ''
            next.location_a_id = ''
            next.location_a_name = ''
            next.location_b_id = ''
            next.location_b_name = ''
            next.location_c_id = ''
            next.location_c_name = ''
          }
        } else if (field === 'city_b_id') {
          // When City B changes, clear City C (if not is_return_trip) and Location B
          if (!value || String(value) !== String(prev.city_b_id)) {
            if (!prev.is_return_trip) {
              next.city_c_id = ''
              next.city_c_name = ''
              next.location_c_id = ''
              next.location_c_name = ''
            }
            next.location_b_id = ''
            next.location_b_name = ''
          }
        } else if (field === 'city_c_id') {
          // When City C changes, clear Location C
          if (!value || String(value) !== String(prev.city_c_id)) {
            next.location_c_id = ''
            next.location_c_name = ''
          }
        }
      }
      return next
    })
  }

  const handleToggleReturn = () => {
    setFormData((prev) => {
      const newIsReturn = !prev.is_return
      return {
        ...prev,
        is_return: newIsReturn,
        is_return_trip: newIsReturn, // Sync with is_return for conditional labels
        city_c_id: '',
        location_c_id: '',
      }
    })
  }

  const handleAddTrip = () => {
    setFormData((prev) => ({
      ...prev,
      trips: [...(prev.trips || []), defaultTrip()],
    }))
  }

  const handleRemoveTrip = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      trips: (prev.trips || []).filter((_, idx) => idx !== index),
    }))
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const payload: any = {
        ...formData,
        active: String(formData.active) === 'Yes' || formData.active === true ? true : false,
      }
      if (!payload.trips || payload.trips.length === 0) {
        payload.trips = [defaultTrip()]
      }
      if (isEdit && id) {
        const result: any = await dispatch(updateWorkOrder({ id: Number(id), workorder: payload }))
        if (result.meta.requestStatus === 'fulfilled') {
          setSavedOrder(result.payload)
          setShowSuccessModal(true)
        } else {
          throw new Error(result.payload || 'Failed to update')
        }
      } else {
        const result: any = await dispatch(createWorkOrder(payload))
        if (result.meta.requestStatus === 'fulfilled') {
          setSavedOrder(result.payload)
          setShowSuccessModal(true)
        } else {
          throw new Error(result.payload || 'Failed to create')
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save work order', 'danger')
    } finally {
      setLoading(false)
    }
  }



  // when client changes: load routes and reset dependant fields
  useEffect(() => {
    if (formData.client_id) {
      loadRoutesForClient(formData.client_id)
    } else {
      setRoutes([])
    }
  }, [formData.client_id])

  // when cities change: load locations
  useEffect(() => {
    if (formData.city_a_id) loadLocations(formData.city_a_id)
    if (formData.city_b_id) loadLocations(formData.city_b_id)
    if (formData.city_c_id) loadLocations(formData.city_c_id)
  }, [formData.city_a_id, formData.city_b_id, formData.city_c_id])

  // Chain linking: When City A changes, validate and clear dependent fields (matching legacy)
  useEffect(() => {
    if (!formData.city_a_id) {
      // If City A is cleared, clear City B, City C, and their locations
      if (formData.city_b_id || formData.city_c_id || formData.location_b_id || formData.location_c_id) {
        setFormData((prev) => ({
          ...prev,
          city_b_id: '',
          city_c_id: '',
          location_b_id: '',
          location_c_id: '',
        }))
      }
      return
    }

    // Check if City B is still valid (exists in cityOptionsB)
    if (formData.city_b_id) {
      const isValid = cityOptionsB.some((c) => String(c.value) === String(formData.city_b_id))
      if (!isValid) {
        setFormData((prev) => ({
          ...prev,
          city_b_id: '',
          city_c_id: '',
          location_b_id: '',
          location_c_id: '',
        }))
      }
    }

    // Check if City C is still valid (exists in cityOptionsC) when is_return_trip
    if (formData.is_return_trip && formData.city_c_id) {
      const isValid = cityOptionsC.some((c) => String(c.value) === String(formData.city_c_id))
      if (!isValid) {
        setFormData((prev) => ({
          ...prev,
          city_c_id: '',
          location_c_id: '',
        }))
      }
    }
  }, [formData.city_a_id, cityOptionsB, cityOptionsC, formData.is_return_trip])

  // Chain linking: When City B changes, validate and clear City C if not is_return_trip (matching legacy)
  useEffect(() => {
    if (!formData.city_b_id) {
      // If City B is cleared and not is_return_trip, clear City C
      if (!formData.is_return_trip && formData.city_c_id) {
        setFormData((prev) => ({
          ...prev,
          city_c_id: '',
          location_c_id: '',
        }))
      }
      return
    }

    // Check if City C is still valid when not is_return_trip
    if (!formData.is_return_trip && formData.city_c_id) {
      const isValid = cityOptionsC.some((c) => String(c.value) === String(formData.city_c_id))
      if (!isValid) {
        setFormData((prev) => ({
          ...prev,
          city_c_id: '',
          location_c_id: '',
        }))
      }
    }
  }, [formData.city_b_id, cityOptionsC, formData.is_return_trip])

  // Chain linking: When locations change, validate they still exist (matching legacy)
  useEffect(() => {
    // Validate Location A
    if (formData.city_a_id && formData.location_a_id) {
      const locOptions = locationsByCity[String(formData.city_a_id)]
      if (locOptions && locOptions.length > 0) {
        const isValid = locOptions.some((l) => String(l.value) === String(formData.location_a_id))
        if (!isValid) {
          setFormData((prev) => ({ ...prev, location_a_id: '' }))
        }
      }
    }

    // Validate Location B
    if (formData.city_b_id && formData.location_b_id) {
      const locOptions = locationsByCity[String(formData.city_b_id)]
      if (locOptions && locOptions.length > 0) {
        const isValid = locOptions.some((l) => String(l.value) === String(formData.location_b_id))
        if (!isValid) {
          setFormData((prev) => ({ ...prev, location_b_id: '' }))
        }
      }
    }

    // Validate Location C
    if (formData.city_c_id && formData.location_c_id) {
      const locOptions = locationsByCity[String(formData.city_c_id)]
      if (locOptions && locOptions.length > 0) {
        const isValid = locOptions.some((l) => String(l.value) === String(formData.location_c_id))
        if (!isValid) {
          setFormData((prev) => ({ ...prev, location_c_id: '' }))
        }
      }
    }
  }, [formData.city_a_id, formData.city_b_id, formData.city_c_id, locationsByCity])

  // inventory load includes currently selected
  useEffect(() => {
    const includes = (formData.trips || [])
      .map((t: any) => t.inventory)
      .filter(Boolean)
      .join(',')
    loadInventory(includes)
  }, [formData.trips])

  const debugEnabled = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('debug') === 'true'
  }, [location.search])

  const viewMode = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('mode') === 'view'
  }, [location.search])

  return (
    <div className="workorder-form-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      
      {!contentReady ? (
        <div className="workorder-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading work order information</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : (
        <>
          <PageHero
            kicker="Operations"
            icon={cilNotes}
            title={isEdit ? (viewMode ? 'View Work Order' : 'Edit Work Order') : 'New Work Order'}
            subtitle={isEdit ? `Work Order #${id}` : 'Create a new work order'}
            highlights={isEdit && formData.work_order_id ? [
              { label: 'Reference', value: formData.ref_number || '—' },
              { label: 'Status', value: formData.active === 'Yes' ? 'Active' : 'Inactive', color: formData.active === 'Yes' ? 'success' : 'secondary' },
              { label: 'Invoice Summary', value: `${formData.trips ? priceFormat(formData.trips.reduce((sum, t: any) => sum + (Number(t.price) || 0), 0)) : '$0.00'}` },
            ] : undefined}
          />
          
          {debugEnabled && (
            <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.5rem' }}>
              {JSON.stringify(formData, null, 2)}
            </pre>
          )}

          <WorkOrderForm
            data={formData}
            errors={errors}
            loading={loading}
            invoiceSummary={{
              totalPrice: formData.trips ? priceFormat(formData.trips.reduce((sum, t: any) => sum + (Number(t.price) || 0), 0)) : '—',
              otherCharges: formData.trips ? priceFormat(formData.trips.reduce((sum, t: any) => sum + (Number(t.others) || 0), 0)) : '—',
              totalKm: formData.trips
                ? formData.trips.reduce((sum, t: any) => sum + (Number(t.km) || 0), 0)
                : '—',
            }}
            clients={clients}
            cargoTypes={cargoOptions}
            containerTypes={containerOptions}
            cityOptions={cityOptionsA || []} // Fallback for backward compatibility
            cityOptionsA={cityOptionsA || []}
            cityOptionsB={cityOptionsB || []}
            cityOptionsC={cityOptionsC || []}
            locationsByCity={locationsByCity}
            locationRecordsByCity={locationRecordsByCity}
            onEditCoordinates={(leg, locationRecord, cityId) => setCoordsModal({ leg, location: locationRecord, cityId })}
            inventoryOptions={inventoryOptions}
            locked={locked}
            viewMode={viewMode}
            onChangeField={handleChangeField}
            onToggleReturn={handleToggleReturn}
            onAddTrip={handleAddTrip}
            onRemoveTrip={handleRemoveTrip}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/operations/workorders')}
            onSendTripEmail={(tripId) => {
              // TODO: Implement send trip email functionality
              console.log('Send email for trip:', tripId)
              showToast('Trip email functionality coming soon', 'info')
            }}
          />

          <CoordinatesEditModal
            visible={coordsModal !== null}
            location={coordsModal?.location || null}
            onSave={handleSaveCoordinates}
            onClose={() => setCoordsModal(null)}
          />

          <CModal visible={showSuccessModal} onClose={() => setShowSuccessModal(false)} alignment="center" backdrop="static">
            <CModalHeader>
              <CModalTitle>
                <CIcon icon={cilCheckCircle} className="text-success me-2" size="lg" />
                Success!
              </CModalTitle>
            </CModalHeader>
            <CModalBody>
              <p className="mb-0">
                Work Order <strong>{savedOrder?.ref_number || savedOrder?.work_order_id}</strong>{' '}
                has been {isEdit ? 'updated' : 'created'} successfully.
              </p>
            </CModalBody>
            <CModalFooter className="d-flex justify-content-between">
              <CButton color="secondary" onClick={() => navigate('/operations/workorders')}>
                Back to List
              </CButton>
              <div className="d-flex gap-2">
                {!isEdit && (
                  <CButton
                    color="primary"
                    className="text-white"
                    onClick={() => {
                      setShowSuccessModal(false)
                      setSavedOrder(null)
                      setFormData(defaultWorkOrder)
                    }}
                  >
                    Create Another
                  </CButton>
                )}
                {savedOrder?.work_order_id && (
                  <CButton
                    color="info"
                    className="text-white"
                    onClick={() => {
                      setShowSuccessModal(false)
                      navigate(`/operations/workorders/order/${savedOrder.work_order_id}`)
                      initEdit(savedOrder.work_order_id)
                    }}
                  >
                    Continue Editing
                  </CButton>
                )}
              </div>
            </CModalFooter>
          </CModal>

          {isEdit && formData.work_order_id && permissionService.checkPermission(MODULE_WORK_ORDERS, COMMENT_READ) && (
            <Comments 
              moduleId={moduleId} 
              itemId={Number(formData.work_order_id)} 
              canAdd={permissionService.checkPermission(MODULE_WORK_ORDERS, COMMENT_UPDATE)}
              canEdit={permissionService.checkPermission(MODULE_WORK_ORDERS, COMMENT_UPDATE)}
              canDelete={permissionService.checkPermission(MODULE_WORK_ORDERS, COMMENT_UPDATE)}
            />
          )}
          {isEdit && formData.work_order_id && permissionService.checkPermission(MODULE_WORK_ORDERS, ATTACHMENT_READ) && (
            <Attachments 
              moduleId={moduleId} 
              itemId={Number(formData.work_order_id)} 
              canAdd={permissionService.checkPermission(MODULE_WORK_ORDERS, ATTACHMENT_UPDATE)}
              canDelete={permissionService.checkPermission(MODULE_WORK_ORDERS, ATTACHMENT_UPDATE)}
              canView={permissionService.checkPermission(MODULE_WORK_ORDERS, ATTACHMENT_READ)}
            />
          )}
        </>
      )}
    </div>
  )
}

export default WorkOrderFormPage
