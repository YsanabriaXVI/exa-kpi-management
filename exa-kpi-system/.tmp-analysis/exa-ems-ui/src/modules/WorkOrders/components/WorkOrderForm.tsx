import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CDatePicker,
  CForm,
  CFormFeedback,
  CFormInput,
  CFormSwitch,
  CMultiSelect,
  CRow,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilLocationPin, cilPlus, cilSave } from '@coreui/icons'
import type { WorkOrder, WorkOrderTrip } from '../types'
import type { AppDispatch, RootState } from '../../../store'
import TripTable from './TripTable'
import RequestTable from './RequestTable'
import { Switches } from './RequestSwitches'
import { hasValidCoordinates } from '../../../utils/coordinates'
import {
  EQUIPMENT_OWNER_KEYS_ARRAY,
  EQUIPMENT_SIZE_ID_KEYS_ARRAY,
} from '../../EquipmentRequest/components/feConstants'
import {
  saveEquipmentRequest,
  updateEquipmentRequest,
  bootstrapWorkOrderEquipmentRequestEdit,
} from '../../EquipmentRequest/store/equipmentRequest.slice'

export interface Option {
  value: string | number
  label: string
  address?: string  // Base city name for address field display
}

interface WorkOrderFormProps {
  data: WorkOrder
  errors: Record<string, string>
  loading: boolean
  locked?: boolean
  viewMode?: boolean
  invoiceSummary?: {
    totalPrice?: string | number
    otherCharges?: string | number
    totalKm?: string | number
  }
  clients: Option[]
  cargoTypes: Option[]
  containerTypes: Option[]
  cityOptions: Option[]
  cityOptionsA?: Option[]
  cityOptionsB?: Option[]
  cityOptionsC?: Option[]
  locationsByCity: Record<string, Option[] | null | undefined>
  locationRecordsByCity?: Record<string, any[]>
  onEditCoordinates?: (leg: 'a' | 'b' | 'c', location: any, cityId: string | number) => void
  inventoryOptions: Option[]
  onChangeField: (field: string, value: any) => void
  onToggleReturn: () => void
  onAddTrip: () => void
  onRemoveTrip: (index: number) => void
  onSubmit: () => void
  onCancel: () => void
  onSendTripEmail?: (tripId: number) => void
}

const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20


const WorkOrderForm: React.FC<WorkOrderFormProps> = ({
  data,
  errors,
  loading,
  locked = false,
  viewMode = false,
  clients,
  cargoTypes,
  containerTypes,
  cityOptions,
  cityOptionsA,
  cityOptionsB,
  cityOptionsC,
  locationsByCity,
  locationRecordsByCity,
  onEditCoordinates,
  inventoryOptions,
  invoiceSummary,
  onChangeField,
  onToggleReturn,
  onAddTrip,
  onRemoveTrip,
  onSubmit,
  onCancel,
  onSendTripEmail,
}) => {
  const trips = useMemo(() => data.trips || [], [data.trips])
  const safeClients = useMemo(() => {
    const cleaned = (clients || [])
      .filter((c) => c && c.value !== undefined && c.value !== null && c.label)
      .map((c) => ({
        value: String(c.value),
        label: String(c.label),
      }))
    return cleaned
  }, [clients])

  const safeCargoTypes = useMemo(() => {
    return (cargoTypes || [])
      .filter((c) => c && c.value !== undefined && c.value !== null && c.label)
      .map((c) => ({ value: String(c.value), label: String(c.label) }))
  }, [cargoTypes])

  const safeContainerTypes = useMemo(() => {
    return (containerTypes || [])
      .filter((c) => c && c.value !== undefined && c.value !== null && c.label)
      .map((c) => ({ value: String(c.value), label: String(c.label) }))
  }, [containerTypes])

  const clientValue = useMemo(() => {
    const val = data.client_id ? String(data.client_id) : ''
    return safeClients.find((opt) => String(opt.value) === val)
  }, [safeClients, data.client_id])

  const cargoValue = useMemo(() => {
    const val = data.cargo_id ? String(data.cargo_id) : ''
    return safeCargoTypes.find((opt) => String(opt.value) === val)
  }, [safeCargoTypes, data.cargo_id])

  // Helper to get city options for each leg with fallback
  const getCityOptionsForLeg = (leg: 'a' | 'b' | 'c'): Option[] => {
    let options: Option[] = []
    
    if (leg === 'a' && cityOptionsA?.length) {
      options = [...cityOptionsA]
    } else if (leg === 'b' && cityOptionsB?.length) {
      options = [...cityOptionsB]
    } else if (leg === 'c' && cityOptionsC?.length) {
      options = [...cityOptionsC]
    } else if (cityOptions?.length) {
      options = [...cityOptions]
    }
    
    // ALWAYS ensure selected city is in the options (critical for initial load)
    const selectedCityId = data[`city_${leg}_id`]
    const selectedCityName = data[`city_${leg}_name`]
    
    console.log(`🔍 [getCityOptionsForLeg ${leg}] selectedCityId:`, selectedCityId, 'selectedCityName:', selectedCityName)
    console.log(`🔍 [getCityOptionsForLeg ${leg}] options.length:`, options.length, 'first option:', options[0])
    
    // Convert selectedCityId to string for consistent comparison
    const selectedCityIdStr = selectedCityId ? String(selectedCityId) : null
    
    if (selectedCityIdStr && selectedCityName) {
      // Check if city already exists in options
      const existingIndex = options.findIndex(opt => String(opt.value) === selectedCityIdStr)
      
      if (existingIndex === -1) {
        // City not in options - add it at the beginning
        console.log(`🔍 [getCityOptionsForLeg ${leg}] City ${selectedCityIdStr} not in options, adding:`, selectedCityName)
        options.unshift({
          value: selectedCityIdStr,
          label: selectedCityName
        })
      } else {
        console.log(`🔍 [getCityOptionsForLeg ${leg}] City ${selectedCityIdStr} already in options at index:`, existingIndex)
      }
    }
    
    console.log(`🔍 [getCityOptionsForLeg ${leg}] Final options.length:`, options.length, 'returning with value:', selectedCityIdStr)
    
    return options
  }

  // Get dynamic label for each leg based on is_return_trip
  const getLegLabel = (leg: 'a' | 'b' | 'c'): string => {
    const isReturnTrip = data.is_return_trip ?? false
    switch (leg) {
      case 'a':
        return isReturnTrip ? 'Delivery' : 'Pick Up'
      case 'b':
        return isReturnTrip ? 'Return To' : 'Delivery'
      case 'c':
        return 'Return To'
      default:
        return ''
    }
  }

  // Get placeholder for city select
  const getCityPlaceholder = (leg: 'a' | 'b' | 'c'): string => {
    switch (leg) {
      case 'a':
        return data.client_id ? 'Select a City' : 'Please Choose a Client'
      case 'b':
        return data.city_a_id ? 'Select a City' : `Please Choose a ${getLegLabel('a')}`
      case 'c':
        if (data.is_return_trip) {
          return data.city_a_id ? 'Select a City' : 'Please Choose a Delivery'
        }
        return data.city_b_id ? 'Select a City' : 'Please Choose a Delivery'
      default:
        return 'Select a City'
    }
  }

  // Get placeholder for location select
  const getLocationPlaceholder = (leg: 'a' | 'b' | 'c', cityId?: string | number): string => {
    if (!cityId) {
      return `Please Choose a ${getLegLabel(leg)}`
    }
    const locations = getLocationOptions(cityId, '')
    if (locations.length > 0) {
      return 'Please Choose a Location'
    }
    return 'No location available'
  }

  // Check if city select should be disabled
  const isCityDisabled = (leg: 'a' | 'b' | 'c'): boolean => {
    switch (leg) {
      case 'a':
        return !data.client_id
      case 'b':
        return !data.city_a_id
      case 'c':
        return data.is_return_trip ? !data.city_a_id : !data.city_b_id
      default:
        return false
    }
  }

  // Get address for display (from cityOptions, matching legacy behavior)
  const getAddressForLeg = (leg: 'a' | 'b' | 'c'): string => {
    const cityId = data[`city_${leg}_id`]
    const locationId = data[`location_${leg}_id`]
    
    // Only show address when BOTH city and location are selected (matching legacy behavior)
    if (!cityId || !locationId) {
      return ''
    }
    
    // Look up the city in the appropriate options to get the base address
    let cityOptions: Option[] = []
    if (leg === 'a') cityOptions = cityOptionsA || []
    else if (leg === 'b') cityOptions = cityOptionsB || []
    else if (leg === 'c') cityOptions = cityOptionsC || []
    
    const selectedCity = cityOptions.find(opt => String(opt.value) === String(cityId))
    return selectedCity?.address || ''
  }

  const parseDate = (unix?: number | string | null) => {
    if (unix === null || unix === undefined || unix === '') return undefined
    const asNumber = Number(unix)
    if (!Number.isFinite(asNumber)) return undefined
    const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? undefined : d
  }

  const toUnix = (date: Date | string | null | undefined) => {
    if (!date) return null
    if (date instanceof Date) return Math.floor(date.getTime() / 1000)
    const parsed = new Date(date)
    return Number.isNaN(parsed.getTime()) ? null : Math.floor(parsed.getTime() / 1000)
  }

  // Keep date fields synced when user uses picker
  useEffect(() => {
    // no-op; placeholder to show we intentionally watch date changes
  }, [data.date_a, data.date_b])

  const getLocationOptions = (cityId?: string | number, currentLabel?: string, selectedLocationId?: string | number) => {
    if (!cityId) return []
    const key = String(cityId)
    let opts = locationsByCity[key] || []

    // If we have a selected location but it's not in the options, add it
    if (selectedLocationId && currentLabel && !opts.some(opt => String(opt.value) === String(selectedLocationId))) {
      opts = [
        { value: String(selectedLocationId), label: currentLabel },
        ...opts
      ]
    }

    return opts
  }

  // Warning + quick-fix button shown when the selected location has no lat/long configured
  const renderCoordinateWarning = (leg: 'a' | 'b' | 'c') => {
    const cityId = (data as any)[`city_${leg}_id`]
    const locationId = (data as any)[`location_${leg}_id`]
    // Not gated on `locked`: setting a location's GPS edits location master data,
    // not the payment-locked work order, so keep it available on locked WOs too.
    if (!cityId || !locationId || viewMode) return null
    const records = locationRecordsByCity?.[String(cityId)]
    if (!Array.isArray(records)) return null
    const record = records.find((l: any) => String(l.location_id ?? l.id) === String(locationId))
    if (!record || hasValidCoordinates(record)) return null
    return (
      <div className="d-flex align-items-center gap-2 mt-1">
        <small className="text-warning">
          <CIcon icon={cilLocationPin} className="me-1" size="sm" />
          This location has no GPS coordinates.
        </small>
        <CButton
          size="sm"
          color="warning"
          variant="outline"
          onClick={() => onEditCoordinates?.(leg, record, cityId)}
          disabled={loading}
        >
          Set coordinates
        </CButton>
      </div>
    )
  }

  // #region Equipment Request
  const dispatch = useDispatch<AppDispatch>()
  const id = data?.work_order_id

  useEffect(() => {
    dispatch(bootstrapWorkOrderEquipmentRequestEdit({ id: id ?? undefined }))
  }, [dispatch, id])

  function getEquipmentSizeOptions(sizes: any[]): [Option[], Option[]] {
    const container = (sizes || []).filter((s: any) => s.equipmentTypeId === 2)
    const chassis = (sizes || []).filter((s: any) => s.equipmentTypeId === 1)
    const toOpt = (s: any) => ({ label: s.sizeType, value: s.sizeEquipmentId, relatedSizes: s.EqSizeRelationships })
    return [container.map(toOpt), chassis.map(toOpt)]
  }

  const { current, lookups, loading: requestLoading } = useSelector(
    (state: RootState) => state.equipmentRequest,
  )
  const sizeOptions = useMemo(() => getEquipmentSizeOptions(lookups.sizes), [lookups.sizes])
  const [requirements, setRequirements] = useState<any>([])
  const [switches, setSwitches] = useState<[boolean, boolean, boolean]>([false, false, false])

  function buildValueMapByLabel(source: any[], target: any[]): Map<number, number> {
    const targetByLabel = new Map<string, number>()
    for (const item of target) {
      targetByLabel.set(item.label.trim().toLowerCase(), item.value)
    }
    const result = new Map<number, number>()
    for (const item of source) {
      const sourceId = Number(item.value)
      const targetId = targetByLabel.get(item.label.trim().toLowerCase())
      if (!Number.isNaN(sourceId) && targetId !== undefined) {
        result.set(sourceId, targetId)
      }
    }
    return result
  }

  useEffect(() => {
    if (!sizeOptions?.[0]) return

    const containerMap = buildValueMapByLabel(safeContainerTypes, sizeOptions[0])
    const existingByTrip = new Map((current?.requirements ?? []).map((r: any) => [r.tripId, r]))

    const createDefaultRequirement = (trip: any, containerSizeId: any) => {
      const containerSizeData: any = lookups.sizes.find((s: any) => s.sizeEquipmentId === containerSizeId)
      return {
        tripId: trip.trip_id,
        equipmentClientContainer: 0,
        equipmentClientChassis: 0,
        equipmentClientGenset: 0,
        containerSizeId,
        chassisSizeId: null,
        genset: containerSizeData?.fridge,
        containerlabel: '',
        chassislabel: '',
        gensetlabel: '',
        triplabel: '',
      }
    }

    const nextRequirements = trips.map((trip: any) => {
      const containerSizeId = containerMap.get(trip.container_type_id as any) ?? null
      const existing = existingByTrip.get(trip.trip_id)
      return existing ? { ...existing, containerSizeId } : createDefaultRequirement(trip, containerSizeId)
    })

    setRequirements(nextRequirements)

    const first = current?.requirements?.[0]
    if (first) {
      setSwitches([
        first.equipmentClientContainer === 1,
        first.equipmentClientChassis === 1,
        first.equipmentClientGenset === 1,
      ])
    }
  }, [current, safeContainerTypes, sizeOptions, lookups.sizes])

  const containerTypeIdsByTrip = useMemo(
    () =>
      Object.fromEntries(
        (trips ?? []).map((trip: any) => [String(trip.trip_id), trip.container_type_id]),
      ),
    [trips],
  )

  const handleChangeRequirement = (field: string, index: number, v: any) => {
    const newRequirements = structuredClone(requirements)
    newRequirements[index][field] = v === '' ? null : v

    if (field === 'containerSizeId') {
      newRequirements[index].chassisSizeId = null
      newRequirements[index].equipmentClientContainer = switches[0] ? 1 : 0
      const genset = (lookups.sizes.find((o: any) => Number(o.sizeEquipmentId) === Number(v)) as any)?.fridge
      newRequirements[index].genset = genset
    }

    if (field === 'genset') {
      newRequirements[index][field] = v === 'yes' ? 1 : 0
    }

    setRequirements(newRequirements)
  }

  useEffect(() => {
    if (!sizeOptions?.[0]) return
    const newReqs = structuredClone(requirements)
    const map = buildValueMapByLabel(safeContainerTypes, sizeOptions[0])
    newReqs.forEach((req: any, index: number) => {
      const cont_size_1 = req.containerSizeId
      const cont_size_2 = map.get(containerTypeIdsByTrip[req.tripId] as any)
      if (cont_size_1 !== cont_size_2) {
        handleChangeRequirement('containerSizeId', index, map.get(containerTypeIdsByTrip[req.tripId] as any))
      }
    })
  }, [containerTypeIdsByTrip])

  useEffect(() => {
    const newReqs = structuredClone(requirements)
    newReqs.forEach((req: any) => {
      req.equipmentClientContainer = switches[0] ? 1 : 0
      req.equipmentClientChassis = switches[1] ? 1 : 0
      req.equipmentClientGenset = req.genset === 1 && switches[2] ? 1 : 0
    })
    setRequirements(newReqs)
  }, [switches])

  const onSwitchChange = (index: number, checked: boolean) => {
    if (!Array.isArray(requirements)) return
    let next = structuredClone(requirements)
    const ownerKey = EQUIPMENT_OWNER_KEYS_ARRAY[index]
    const sizeKey = EQUIPMENT_SIZE_ID_KEYS_ARRAY[index]

    next = next.map((r: any) => {
      if (checked) {
        const hasSize =
          (r as any)[sizeKey] != null &&
          (r as any)[sizeKey] !== 0 &&
          !Number.isNaN(Number((r as any)[sizeKey]))
        ;(r as any)[ownerKey] = hasSize ? 1 : 0
      } else {
        ;(r as any)[ownerKey] = 0
      }
      return r
    })

    const nextSwitches = [...switches] as [boolean, boolean, boolean]
    nextSwitches[index] = checked
    setSwitches(nextSwitches)
    setRequirements(next)
  }

  const isEditWO = Number.isFinite(data.work_order_id) && data.work_order_id !== null

  const submitRequest = async (payload: any, action_type: string) => {
    if (action_type === 'create') {
      await dispatch(saveEquipmentRequest(payload as any))
        .unwrap()
        .then((resp: any) => {
          if (resp?.requestDetails?.workOrderId) {
            dispatch(bootstrapWorkOrderEquipmentRequestEdit({ id: resp?.requestDetails?.workOrderId ?? undefined }))
          }
        })
        .catch(() => null)
    }

    if (action_type === 'update') {
      await dispatch(updateEquipmentRequest(payload as any))
        .unwrap()
        .then((resp: any) => {
          if (resp?.requestDetails?.workOrderId) {
            dispatch(bootstrapWorkOrderEquipmentRequestEdit({ id: resp?.requestDetails?.workOrderId ?? undefined }))
          }
        })
        .catch(() => null)
    }
  }

  const handleSubmitRequest = () => {
    let payload = null
    let action_type = ''
    if (current?.requestDetails?.equipmentRequestId) {
      payload = structuredClone(current)
      payload.requirements = requirements
      action_type = 'update'
    } else {
      payload = {
        requestDetails: {
          equipmentRequestId: null,
          clientId: data?.client_id,
          workOrderId: data?.work_order_id,
          requestTypeId: 1526,
          referenceNumberBooking: data?.ref_number,
          consignee: null,
          vesselCode: null,
          voyage: null,
          comments: null,
        },
        requirements,
      }
      action_type = 'create'
    }
    submitRequest(payload, action_type)
  }
  // #endregion Equipment Request

  return (
    <CForm>
      <CCard className="mb-3">
        <CCardHeader className="truck-section-header">
          <div>
            <div className="section-kicker text-uppercase fw-semibold">Details</div>
            <div className="section-title fw-bold">Work Order Information</div>
            <small className="text-body-secondary">Reference number, client, and cargo details.</small>
          </div>
        </CCardHeader>
        <CCardBody>
          {errors.general && <CAlert color="danger">{errors.general}</CAlert>}
          <CRow className="g-3">
            <CCol md={6}>
              <CFormInput
                label="Reference Number *"
                name="ref_number"
                value={data.ref_number || ''}
                invalid={Boolean(errors.ref_number)}
                onChange={(e) => onChangeField('ref_number', e.target.value)}
                disabled={loading || locked}
              />
              {errors.ref_number && <CFormFeedback invalid>{errors.ref_number}</CFormFeedback>}
            </CCol>
            {data.work_order_id && (
              <CCol md={6}>
                <CFormInput
                  label="Work Order ID"
                  value={data.work_order_id}
                  readOnly
                  disabled
                />
              </CCol>
            )}
          </CRow>

          <CRow className="g-3 mt-1">
            <CCol md={6}>
              {viewMode ? (
                <CFormInput label="Client" value={clientValue?.label || '—'} readOnly />
              ) : (
                <CMultiSelect
                  key={`client_${data.client_id}`}
                  label="Client *"
                  value={data.client_id ? String(data.client_id) : ''}
                  options={safeClients}
                  onChange={(options: any) => {
                    const val = Array.isArray(options) ? options[0]?.value : options?.value
                    onChangeField('client_id', val ? Number(val) : '')
                  }}
                  invalid={Boolean(errors.client_id)}
                  disabled={loading || locked}
                  multiple={false}
                  placeholder="Select a Client"
                  clearSearchOnSelect
                  virtualScroller={shouldVirtualScroll(safeClients)}
                  dropdownStyle={{ overflowY: 'auto' }}
                />
              )}
              {errors.client_id && <CFormFeedback invalid>{errors.client_id}</CFormFeedback>}
            </CCol>
            <CCol md={6}>
              {viewMode ? (
                <CFormInput label="Cargo Type" value={cargoValue?.label || '—'} readOnly />
              ) : (
                <CMultiSelect
                  key={`cargo_${data.cargo_id}`}
                  label="Cargo Type *"
                  value={data.cargo_id ? String(data.cargo_id) : ''}
                  options={safeCargoTypes}
                  onChange={(options: any) => {
                    const val = Array.isArray(options) ? options[0]?.value : options?.value
                    onChangeField('cargo_id', val ? Number(val) : '')
                  }}
                  invalid={Boolean(errors.cargo_id)}
                  disabled={loading || locked}
                  multiple={false}
                  placeholder="Select cargo type"
                  clearSearchOnSelect
                  virtualScroller={shouldVirtualScroll(safeCargoTypes)}
                  dropdownStyle={{ overflowY: 'auto' }}
                />
              )}
              {errors.cargo_id && <CFormFeedback invalid>{errors.cargo_id}</CFormFeedback>}
            </CCol>
          </CRow>

          <CRow className="g-3 mt-1">
            <CCol md={6}>
              <CFormSwitch
                id="customs"
                label="Transit to Customs"
                checked={!!data.customs}
                onChange={(e) => onChangeField('customs', e.target.checked)}
                disabled={loading || locked}
              />
            </CCol>
            <CCol md={6}>
              <CFormSwitch
                id="active"
                label={String(data.active) === 'Yes' || data.active === true ? 'Active' : 'Inactive'}
                checked={String(data.active) === 'Yes' || data.active === true || data.active === 1}
                onChange={(e) => onChangeField('active', e.target.checked ? 'Yes' : 'No')}
                disabled={loading || locked}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {invoiceSummary && (
        <CCard className="mb-3">
          <CCardHeader className="truck-section-header">
            <div>
              <div className="section-kicker text-uppercase fw-semibold">Summary</div>
              <div className="section-title fw-bold">Invoice Details</div>
              <small className="text-body-secondary">Financial summary and distance calculations.</small>
            </div>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={4}>
                <div className="text-body-secondary small">Invoice Total Price (N/tax, N/other Charges)</div>
                <div className="fw-semibold">{invoiceSummary.totalPrice ?? '—'}</div>
              </CCol>
              <CCol md={4}>
                <div className="text-body-secondary small">Invoice Other Charges</div>
                <div className="fw-semibold">{invoiceSummary.otherCharges ?? '—'}</div>
              </CCol>
              <CCol md={4}>
                <div className="text-body-secondary small">Invoice Total Km</div>
                <div className="fw-semibold">{invoiceSummary.totalKm ?? '—'}</div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      )}

      <CCard className="mb-3">
        <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
          <div>
            <div className="section-kicker text-uppercase fw-semibold">Logistics</div>
            <div className="section-title fw-bold">Locations & Dates</div>
            <small className="text-body-secondary">Manage pick up, delivery, and return locations.</small>
          </div>
          <CFormSwitch
            id="is_return_trip"
            label="Return Trip"
            checked={!!data.is_return}
            onChange={onToggleReturn}
            disabled={loading || locked}
          />
        </CCardHeader>
        <CCardBody>
          {/* Leg A - Pick Up or Delivery */}
          <CCard className="mb-3 border">
            <CCardBody>
              <h6 className="mb-3">{getLegLabel('a')}</h6>
              <CRow className="g-3">
                <CCol md={6}>
                  {viewMode ? (
                    <CFormInput label={`${getLegLabel('a')} City`} value={(data as any).city_a_name || '—'} readOnly />
                  ) : (
                    <CMultiSelect
                      key={`city_a_${data.city_a_id}`}
                      label={`${getLegLabel('a')} City *`}
                      value={data.city_a_id ? String(data.city_a_id) : ''}
                      options={getCityOptionsForLeg('a')}
                      onChange={(options: any) => {
                        const selected = Array.isArray(options) ? options[0] : options
                        const val = selected?.value
                        const label = selected?.label || ''
                        onChangeField('city_a_id', val ? Number(val) : '')
                        onChangeField('city_a_name', label)
                      }}
                      invalid={Boolean(errors.city_a_id)}
                      disabled={loading || locked || isCityDisabled('a')}
                      multiple={false}
                      placeholder={getCityPlaceholder('a')}
                      clearSearchOnSelect
                      virtualScroller={shouldVirtualScroll(getCityOptionsForLeg('a'))}
                      dropdownStyle={{ overflowY: 'auto' }}
                    />
                  )}
                  {errors.city_a_id && <CFormFeedback invalid>{errors.city_a_id}</CFormFeedback>}
                </CCol>
                <CCol md={6}>
                  {viewMode ? (
                    <CFormInput label="City Location" value={(data as any).location_a_name || '—'} readOnly />
                  ) : (
                    <CMultiSelect
                      key={`loc_a_${data.location_a_id}`}
                      label="City Location *"
                      value={data.location_a_id ? String(data.location_a_id) : ''}
                      options={getLocationOptions(data.city_a_id || '', data.location_a_name, data.location_a_id)}
                      onChange={(options: any) => {
                        const selected = Array.isArray(options) ? options[0] : options
                        const val = selected?.value
                        const label = selected?.label || ''
                        onChangeField('location_a_id', val ? Number(val) : '')
                        onChangeField('location_a_name', label)
                      }}
                      invalid={Boolean(errors.location_a_id)}
                      disabled={loading || locked || !data.city_a_id}
                      multiple={false}
                      placeholder={getLocationPlaceholder('a', data.city_a_id)}
                      clearSearchOnSelect
                      virtualScroller={shouldVirtualScroll(
                        getLocationOptions(data.city_a_id || '', data.location_a_name, data.location_a_id)
                      )}
                      dropdownStyle={{ overflowY: 'auto' }}
                    />
                  )}
                  {errors.location_a_id && <CFormFeedback invalid className="d-block">{errors.location_a_id}</CFormFeedback>}
                  {renderCoordinateWarning('a')}
                </CCol>
              </CRow>
              <CRow className="g-3 mt-2">
                <CCol md={6}>
                  {viewMode ? (
                    <CFormInput
                      label="Exp. Date"
                      value={parseDate(data.date_a as number | null)?.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) || '—'}
                      readOnly
                    />
                  ) : (
                    <>
                      <label className="form-label">Exp. Date *</label>
                      <CDatePicker
                        locale="en-US"
                        timepicker
                        date={parseDate(data.date_a as number | null)}
                        onDateChange={(date) => onChangeField('date_a', toUnix(date))}
                        className={errors.date_a ? 'is-invalid' : ''}
                        disabled={loading || locked}
                      />
                      {errors.date_a && <div className="invalid-feedback d-block">{errors.date_a}</div>}
                    </>
                  )}
                </CCol>
                <CCol md={6}>
                  <label className="form-label">Address</label>
                  <div className="address-display">
                    {getAddressForLeg('a') || '—'}
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          {/* Leg B - Delivery or Return To */}
          <CCard className="mb-3 border">
            <CCardBody>
              <h6 className="mb-3">{getLegLabel('b')}</h6>
              <CRow className="g-3">
                <CCol md={6}>
                  {viewMode ? (
                    <CFormInput label={`${getLegLabel('b')} City`} value={(data as any).city_b_name || '—'} readOnly />
                  ) : (
                    <CMultiSelect
                      key={`city_b_${data.city_b_id}`}
                      label={`${getLegLabel('b')} City *`}
                      value={data.city_b_id ? String(data.city_b_id) : ''}
                      options={getCityOptionsForLeg('b')}
                      onChange={(options: any) => {
                        const selected = Array.isArray(options) ? options[0] : options
                        const val = selected?.value
                        const label = selected?.label || ''
                        onChangeField('city_b_id', val ? Number(val) : '')
                        onChangeField('city_b_name', label)
                      }}
                      invalid={Boolean(errors.city_b_id)}
                      disabled={loading || locked || isCityDisabled('b')}
                      multiple={false}
                      placeholder={getCityPlaceholder('b')}
                      clearSearchOnSelect
                      virtualScroller={shouldVirtualScroll(getCityOptionsForLeg('b'))}
                      dropdownStyle={{ overflowY: 'auto' }}
                    />
                  )}
                  {errors.city_b_id && <CFormFeedback invalid>{errors.city_b_id}</CFormFeedback>}
                </CCol>
                <CCol md={6}>
                  {viewMode ? (
                    <CFormInput label="City Location" value={(data as any).location_b_name || '—'} readOnly />
                  ) : (
                    <CMultiSelect
                      key={`loc_b_${data.location_b_id}`}
                      label="City Location *"
                      value={data.location_b_id ? String(data.location_b_id) : ''}
                      options={getLocationOptions(data.city_b_id || '', data.location_b_name, data.location_b_id)}
                      onChange={(options: any) => {
                        const selected = Array.isArray(options) ? options[0] : options
                        const val = selected?.value
                        const label = selected?.label || ''
                        onChangeField('location_b_id', val ? Number(val) : '')
                        onChangeField('location_b_name', label)
                      }}
                      invalid={Boolean(errors.location_b_id)}
                      disabled={loading || locked || !data.city_b_id}
                      multiple={false}
                      placeholder={getLocationPlaceholder('b', data.city_b_id)}
                      clearSearchOnSelect
                      virtualScroller={shouldVirtualScroll(
                        getLocationOptions(data.city_b_id || '', data.location_b_name, data.location_b_id)
                      )}
                      dropdownStyle={{ overflowY: 'auto' }}
                    />
                  )}
                  {errors.location_b_id && <CFormFeedback invalid className="d-block">{errors.location_b_id}</CFormFeedback>}
                  {renderCoordinateWarning('b')}
                </CCol>
              </CRow>
              <CRow className="g-3 mt-2">
                <CCol md={6}>
                  {viewMode ? (
                    <CFormInput
                      label="Exp. Date"
                      value={parseDate(data.date_b as number | null)?.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) || '—'}
                      readOnly
                    />
                  ) : (
                    <>
                      <label className="form-label">Exp. Date *</label>
                      <CDatePicker
                        locale="en-US"
                        timepicker
                        date={parseDate(data.date_b as number | null)}
                        onDateChange={(date) => onChangeField('date_b', toUnix(date))}
                        className={errors.date_b ? 'is-invalid' : ''}
                        disabled={loading || locked}
                      />
                      {errors.date_b && <div className="invalid-feedback d-block">{errors.date_b}</div>}
                    </>
                  )}
                </CCol>
                <CCol md={6}>
                  <label className="form-label">Address</label>
                  <div className="address-display">
                    {getAddressForLeg('b') || '—'}
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          {/* Leg C - Return To (conditional) */}
          {data.is_return && (
            <CCard className="mb-3 border">
              <CCardBody>
                <h6 className="mb-3">{getLegLabel('c')}</h6>
                <CRow className="g-3">
                  <CCol md={6}>
                    {viewMode ? (
                      <CFormInput label={`${getLegLabel('c')} City`} value={(data as any).city_c_name || '—'} readOnly />
                    ) : (
                      <CMultiSelect
                        key={`city_c_${data.city_c_id}`}
                        label={`${getLegLabel('c')} City *`}
                        value={data.city_c_id ? String(data.city_c_id) : ''}
                        options={getCityOptionsForLeg('c')}
                        onChange={(options: any) => {
                          const selected = Array.isArray(options) ? options[0] : options
                          const val = selected?.value
                          const label = selected?.label || ''
                          onChangeField('city_c_id', val ? Number(val) : '')
                          onChangeField('city_c_name', label)
                        }}
                        invalid={Boolean(errors.city_c_id)}
                        disabled={loading || locked || isCityDisabled('c')}
                        multiple={false}
                        placeholder={getCityPlaceholder('c')}
                        clearSearchOnSelect
                        virtualScroller={shouldVirtualScroll(getCityOptionsForLeg('c'))}
                        dropdownStyle={{ overflowY: 'auto' }}
                      />
                    )}
                    {errors.city_c_id && <CFormFeedback invalid>{errors.city_c_id}</CFormFeedback>}
                  </CCol>
                  <CCol md={6}>
                    {viewMode ? (
                      <CFormInput label="City Location" value={(data as any).location_c_name || '—'} readOnly />
                    ) : (
                      <CMultiSelect
                        key={`loc_c_${data.location_c_id}`}
                        label="City Location *"
                        value={data.location_c_id ? String(data.location_c_id) : ''}
                        options={getLocationOptions(data.city_c_id || '', data.location_c_name, data.location_c_id)}
                        onChange={(options: any) => {
                          const selected = Array.isArray(options) ? options[0] : options
                          const val = selected?.value
                          const label = selected?.label || ''
                          onChangeField('location_c_id', val ? Number(val) : '')
                          onChangeField('location_c_name', label)
                        }}
                        invalid={Boolean(errors.location_c_id)}
                        disabled={loading || locked || !data.city_c_id}
                        multiple={false}
                        placeholder={getLocationPlaceholder('c', data.city_c_id)}
                        clearSearchOnSelect
                        virtualScroller={shouldVirtualScroll(
                          getLocationOptions(data.city_c_id || '', data.location_c_name, data.location_c_id)
                        )}
                        dropdownStyle={{ overflowY: 'auto' }}
                      />
                    )}
                    {errors.location_c_id && <CFormFeedback invalid className="d-block">{errors.location_c_id}</CFormFeedback>}
                    {renderCoordinateWarning('c')}
                  </CCol>
                </CRow>
                <CRow className="g-3 mt-2">
                  <CCol md={6} className="offset-md-6">
                    <label className="form-label">Address</label>
                    <div className="address-display">
                    {getAddressForLeg('c') || '—'}
                    </div>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          )}
        </CCardBody>
      </CCard>

      <CCard className="mb-3">
        <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
          <div>
            <div className="section-kicker text-uppercase fw-semibold">Operations</div>
            <div className="section-title fw-bold">Trips ({trips.length})</div>
            <small className="text-body-secondary">Manage individual trips and container details.</small>
          </div>
          <CButton color="primary" size="sm" className="text-white" onClick={onAddTrip} disabled={loading || locked}>
            <CIcon icon={cilPlus} className="me-2" />
            Add Trip
          </CButton>
        </CCardHeader>
        <CCardBody className="p-0">
          <TripTable
            trips={trips}
            containerTypes={safeContainerTypes}
            inventoryOptions={inventoryOptions}
            errors={errors}
            loading={loading}
            locked={locked}
            viewMode={viewMode}
            onChangeField={onChangeField}
            onRemoveTrip={onRemoveTrip}
            onSendTripEmail={onSendTripEmail}
          />
        </CCardBody>
      </CCard>

      <CCard className="mb-3">
        <CCardFooter className="d-flex justify-content-between">
          <CButton color="secondary" variant="ghost" onClick={onCancel} disabled={loading}>
            {viewMode ? 'Back' : 'Cancel'}
          </CButton>
          {!viewMode && (
            <CButton color="success" className="text-white" onClick={onSubmit} disabled={loading}>
              <CIcon icon={cilCheckCircle} className="me-2" />
              Save Work Order
            </CButton>
          )}
        </CCardFooter>
      </CCard>

      {isEditWO && (
        <CCard className="mb-3">
          <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
            <div>
              <div className="section-kicker text-uppercase fw-semibold">Equipment Request</div>
              <div className="section-title fw-bold">Trips ({trips.length})</div>
              <small className="text-body-secondary">Make an equipment request for each trip.</small>
              {current?.requestDetails?.equipmentRequestId && (
                <div>
                  <br />
                  <div className="section-kicker text-uppercase fw-semibold">SAVED AS</div>
                  <Link
                    to={`/depot-main/equipment-request/${current?.requestDetails?.equipmentRequestId}`}
                    className="text-decoration-none"
                  >
                    <p className="text-primary">EQUIPMENT REQUEST #{current?.requestDetails?.equipmentRequestId}</p>
                  </Link>
                </div>
              )}
            </div>
          </CCardHeader>
          <CCardBody>
            <div>
              <Switches
                value={switches}
                onChange={onSwitchChange}
                isTripRequest={false}
                isView={viewMode}
              />
            </div>
            <RequestTable
              rows={requirements || []}
              current={current}
              isTripRequest={true}
              sizeOptions={sizeOptions}
              trips={trips as any}
              onCellChange={() => {}}
              onDeleteRow={() => {}}
              errors={''}
              isView={viewMode}
              onChange={handleChangeRequirement}
            />
            <CCardFooter className="d-flex justify-content-between">
              <CButton color="secondary" variant="ghost" onClick={onCancel} disabled={loading}>
                {viewMode ? 'Back' : 'Cancel'}
              </CButton>
              {!viewMode && (
                <CButton
                  color="success"
                  className="text-white"
                  onClick={() => handleSubmitRequest()}
                  disabled={requestLoading.saving || loading}
                >
                  {requestLoading.saving ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilSave} className="me-2" />
                      Save Request
                    </>
                  )}
                </CButton>
              )}
            </CCardFooter>
          </CCardBody>
        </CCard>
      )}
    </CForm>
  )
}

export default WorkOrderForm
