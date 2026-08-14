import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CCol,
  CFormLabel,
  CFormSelect,
  CFormInput,
  CRow,
  CSpinner,
} from '@coreui/react-pro'

import type { AppDispatch, RootState } from '../../../../store'
import type { FuelOrderForm } from '../types/fuelOrder.types'
import {
  searchTrips,
  loadTripDetail,
  clearTripDetail,
  updateFuelOrderForm,
  selectFuelOrderTripSearch,
  selectFuelOrderSearchingTrips,
} from '../store/fuelOrder.slice'
import { fetchAllGasStores, selectAllGasStores } from '../../GasSupplier/store/gasSupplier.slice'
import { permissionService } from '../../../../services/auth/permission.service'
import { MODULE_FUEL_ORDERS } from '../../../../constants/modules'

interface Props {
  value: FuelOrderForm
  disabled: boolean
  errors: Record<string, string>
  orderTypes: any[]
  settings: any
  setField: (field: keyof FuelOrderForm, value: any) => void
  hasError: (field: keyof FuelOrderForm) => boolean
  isNew?: boolean
  originalTripsid?: number | null
}

const TRIP_REQUIRED_ORDER_TYPES = [961, 963, 1588]
const VIEW_ALL_SUBDIVISIONS = 'View All Subdivisions'

const formatTripLabel = (item: any): string => {
  if (item.label) return item.label
  const parts: string[] = []
  if (item.tripsid) parts.push(String(item.tripsid))
  if (item.workorderid) parts.push(`WO: ${item.workorderid}`)
  if (item.InventoryAssigned) parts.push(item.InventoryAssigned)
  if (!parts.length && item.plate) parts.push(item.plate)
  if (!parts.length && item.referenceNumber) parts.push(item.referenceNumber)
  return parts.join(' | ') || String(item.value ?? item.tripsid ?? '')
}

const GasStoreFormSection: React.FC<Props> = ({
  value,
  disabled,
  errors,
  orderTypes,
  settings,
  setField,
  hasError,
  isNew = false,
  originalTripsid,
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const gasStores = useSelector(selectAllGasStores)
  const tripSearchResults = useSelector(selectFuelOrderTripSearch)
  const searchingTrips = useSelector(selectFuelOrderSearchingTrips)
  const clientsList = useSelector((s: RootState) => (s.auth as any)?.details?.details?.clients ?? [])
  const subdivisionsList = useSelector(
    (s: RootState) => (s.auth as any)?.details?.details?.subdivisions ?? [],
  )

  const clientOptions = useMemo(
    () => clientsList.map((c: any) => ({ value: c.client_id, label: c.name })),
    [clientsList],
  )

  const isOrderType1588 = Number(value.orderType) === 1588

  const [tripQuery, setTripQuery] = useState('')
  const [showTripDropdown, setShowTripDropdown] = useState(false)
  const tripSearchDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const currentSearchRef = useRef<any>(null)

  useEffect(() => {
    dispatch(fetchAllGasStores())
  }, [dispatch])

  useEffect(() => {
    if (value.tripsid && !tripQuery) {
      setTripQuery(String(value.tripsid))
    }
  }, [value.tripsid])

  const isTripRequired =
    TRIP_REQUIRED_ORDER_TYPES.includes(Number(value.orderType)) ||
    settings?.tripRequired === 1

  const isTripFieldEditable = useMemo(() => {
    if (isNew) return !isOrderType1588
    if (isOrderType1588 && !originalTripsid) return true
    return !disabled
  }, [disabled, isNew, isOrderType1588, originalTripsid])

  // Gap 18: Filter gas stores by user subdivision access
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

  const filteredGasStores = useMemo(() => {
    if (canViewAllSubdivisions || allowedSubdivisionIds.length === 0) return gasStores
    return gasStores.filter((store: any) => {
      const storeSubId = Number(store.subdivisionId ?? store.subdivision_id)
      if (!storeSubId) return true
      return allowedSubdivisionIds.includes(storeSubId)
    })
  }, [gasStores, canViewAllSubdivisions, allowedSubdivisionIds])

  // Gap 16: Gas store label with city/department
  const formatGasStoreLabel = (store: any): string => {
    const parts = [store.name]
    const cityName = store.cityName ?? store.city?.name
    if (cityName) parts.push(cityName)
    const deptName = store.departmentName ?? store.department?.name
    if (deptName) parts.push(deptName)
    return parts.join(' | ')
  }

  const handleTripSearch = useCallback(
    (q: string) => {
      if (value.tripsid) {
        setField('tripsid', null)
        dispatch(clearTripDetail())
      }
      setTripQuery(q)
      if (tripSearchDebounceRef.current) clearTimeout(tripSearchDebounceRef.current)
      if (q.length >= 2) {
        setShowTripDropdown(true)
        tripSearchDebounceRef.current = setTimeout(() => {
          if (currentSearchRef.current?.abort) currentSearchRef.current.abort()
          const orderType = value.orderType ?? undefined
          const manualParams =
            Number(orderType) === 1588
              ? {
                  fromCityId: (value as any).fromCityId ?? undefined,
                  toCityId: (value as any).toCityId ?? undefined,
                  subdivisionId: value.subdivisionId ?? undefined,
                  responsibleId: value.responsibleId ?? undefined,
                  clientId: (value as any).clientId ?? undefined,
                }
              : undefined
          currentSearchRef.current = dispatch(searchTrips({ query: q, orderType, manualParams }))
        }, 300)
      } else {
        setShowTripDropdown(false)
      }
    },
    [dispatch, value.orderType, value.subdivisionId, value.responsibleId, value.tripsid, setField],
  )

  const handleTripSelect = useCallback(
    (item: any) => {
      const tripId = Number(item.value ?? item.tripsid)
      setField('tripsid', tripId)
      setTripQuery(formatTripLabel(item))
      setShowTripDropdown(false)
      if (tripId) dispatch(loadTripDetail(tripId))
    },
    [dispatch, setField],
  )

  return (
    <>
      <CRow className="mb-3">
        <CCol md={6}>
          <CFormLabel>Gas Station *</CFormLabel>
          <CFormSelect
            value={value.gasStationsId ?? ''}
            disabled={disabled}
            invalid={hasError('gasStationsId')}
            onChange={(e) => {
              const id = Number(e.target.value)
              setField('gasStationsId', id || null)
              const store = gasStores.find(
                (s: any) => s.gasStationsId === id,
              )
              if (store) {
                setField('gasStationsParentId', store.gasStationsParentId)
              }
            }}
          >
            <option value="">Select gas station...</option>
            {filteredGasStores.map((store: any) => (
              <option key={store.gasStationsId} value={store.gasStationsId}>
                {formatGasStoreLabel(store)}
              </option>
            ))}
          </CFormSelect>
          {errors.gasStationsId && (
            <div className="invalid-feedback d-block">{errors.gasStationsId}</div>
          )}
        </CCol>
        <CCol md={6}>
          <CFormLabel>Order Type *</CFormLabel>
          <CFormSelect
            value={value.orderType ?? ''}
            disabled={disabled}
            invalid={hasError('orderType')}
            onChange={(e) => {
              const newOrderType = Number(e.target.value) || null
              setField('orderType', newOrderType)
              // Gap 17: Reset routeLegs on orderType change
              dispatch(updateFuelOrderForm({ routeLegs: [] }))
            }}
          >
            <option value="">Select order type...</option>
            {orderTypes.map((ot: any) => (
              <option key={ot.attributeItemId} value={ot.attributeItemId}>
                {ot.name}
              </option>
            ))}
          </CFormSelect>
          {errors.orderType && (
            <div className="invalid-feedback d-block">{errors.orderType}</div>
          )}
        </CCol>
      </CRow>

      {isOrderType1588 && (
        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel>Client *</CFormLabel>
            <CFormSelect
              value={(value as any).clientId ?? ''}
              disabled={disabled}
              onChange={(e) => setField('clientId' as any, Number(e.target.value) || null)}
            >
              <option value="">Select client...</option>
              {clientOptions.map((c: any) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>
      )}

      {isTripRequired && (
        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel>Trip ID {isTripRequired ? '*' : ''}</CFormLabel>
            <div className="position-relative">
              <CFormInput
                value={tripQuery}
                disabled={!isTripFieldEditable}
                invalid={hasError('tripsid')}
                placeholder="Search trip by ID, plate..."
                onChange={(e) => handleTripSearch(e.target.value)}
                onFocus={() => {
                  if (value.tripsid) {
                    setField('tripsid', null)
                    dispatch(clearTripDetail())
                    setTripQuery('')
                    return
                  }
                  if (tripSearchResults.length > 0 && tripQuery.length >= 2) {
                    setShowTripDropdown(true)
                  }
                }}
                onBlur={() => setTimeout(() => setShowTripDropdown(false), 200)}
              />
              {searchingTrips && (
                <CSpinner
                  size="sm"
                  className="position-absolute"
                  style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
              )}
              {showTripDropdown && tripSearchResults.length > 0 && (
                <div
                  className="position-absolute bg-white border shadow-sm w-100"
                  style={{ zIndex: 1050, maxHeight: '200px', overflowY: 'auto' }}
                >
                  {tripSearchResults.map((trip: any, idx: number) => (
                    <div
                      key={trip.value ?? trip.tripsid ?? idx}
                      className="px-3 py-2"
                      style={{ cursor: 'pointer' }}
                      onMouseDown={() => handleTripSelect(trip)}
                    >
                      {formatTripLabel(trip)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.tripsid && (
              <div className="invalid-feedback d-block">{errors.tripsid}</div>
            )}
          </CCol>
        </CRow>
      )}
    </>
  )
}

export default GasStoreFormSection
