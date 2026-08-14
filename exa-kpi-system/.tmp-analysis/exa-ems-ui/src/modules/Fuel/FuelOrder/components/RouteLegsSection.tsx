import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import type { FuelOrderForm, RouteLeg } from '../types/fuelOrder.types'
import {
  loadConnectedCities,
  selectFuelOrderConnectedCities,
} from '../store/fuelOrder.slice'
import { fuelOrderApi } from '../api/fuelOrder.api'

interface Props {
  value: FuelOrderForm
  disabled: boolean
  setField: (field: keyof FuelOrderForm, value: any) => void
}

const RouteLegsSection: React.FC<Props> = ({ value, disabled, setField }) => {
  const dispatch = useDispatch<AppDispatch>()
  const connectedCities = useSelector(selectFuelOrderConnectedCities)

  // GAP 10: Per-leg connected cities stored locally
  const [citiesPerLeg, setCitiesPerLeg] = useState<Record<number, any[]>>({})
  const activeLegIndexRef = useRef<number>(0)

  const legs = value.routeLegs ?? []

  const isEquipmentType1 = Number(value.equipmentType) === 1
  const isOrderType1588 = Number(value.orderType) === 1588

  const maxLegs = useMemo(() => {
    if (isEquipmentType1 && !isOrderType1588) return 1
    return 5
  }, [isEquipmentType1, isOrderType1588])

  const fromCityReadOnly = isEquipmentType1 && !isOrderType1588

  // When Redux connectedCities changes, store it for the active leg index
  useEffect(() => {
    if (connectedCities.length > 0) {
      setCitiesPerLeg((prev) => ({
        ...prev,
        [activeLegIndexRef.current]: connectedCities,
      }))
    }
  }, [connectedCities])

  const getCitiesForLeg = (index: number): any[] => {
    return citiesPerLeg[index] ?? connectedCities
  }

  const loadCitiesForLeg = useCallback(
    (cityId: number, legIndex: number) => {
      activeLegIndexRef.current = legIndex
      const subdivisionId = Number(value.subdivisionId) || undefined
      if (isOrderType1588) {
        fuelOrderApi.fetchAllCitiesForOrderType().then((cities) => {
          setCitiesPerLeg((prev) => ({ ...prev, [legIndex]: cities ?? [] }))
        }).catch(() => {})
      } else {
        dispatch(loadConnectedCities({ fromCityId: cityId, subdivisionId }))
      }
    },
    [dispatch, value.subdivisionId, isOrderType1588],
  )

  // Pre-load all cities for orderType 1588 so the dropdowns are ready immediately
  useEffect(() => {
    if (!isOrderType1588) return
    fuelOrderApi.fetchAllCitiesForOrderType().then((cities) => {
      setCitiesPerLeg((prev) => {
        const next = { ...prev }
        legs.forEach((_, i) => { if (!next[i]) next[i] = cities ?? [] })
        if (!next[0]) next[0] = cities ?? []
        return next
      })
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrderType1588])

  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (initialLoadDone.current || disabled || legs.length === 0) return
    initialLoadDone.current = true

    legs.forEach((leg, index) => {
      if (leg.fromCityId) {
        loadCitiesForLeg(leg.fromCityId, index)
      }
    })
  }, [legs, disabled, loadCitiesForLeg])

  const handleAddLeg = () => {
    if (legs.length >= maxLegs) return
    const lastLeg = legs[legs.length - 1]
    const newLeg: RouteLeg = {
      fromCityId: lastLeg?.toCityId ?? null,
      fromCityName: lastLeg?.toCityName ?? '',
      toCityId: null,
      toCityName: '',
    }
    const newIndex = legs.length
    setField('routeLegs', [...legs, newLeg])

    if (newLeg.fromCityId) {
      loadCitiesForLeg(newLeg.fromCityId, newIndex)
    } else if (isOrderType1588) {
      loadCitiesForLeg(0, newIndex)
    }
  }

  const handleRemoveLeg = (index: number) => {
    setField(
      'routeLegs',
      legs.filter((_, i) => i !== index),
    )
    setCitiesPerLeg((prev) => {
      const next: Record<number, any[]> = {}
      Object.keys(prev).forEach((k) => {
        const kn = Number(k)
        if (kn < index) next[kn] = prev[kn]
        else if (kn > index) next[kn - 1] = prev[kn]
      })
      return next
    })
  }

  const handleLegChange = useCallback(
    (index: number, field: keyof RouteLeg, val: any) => {
      const legCities = getCitiesForLeg(index)
      const updated = legs.map((leg, i) => {
        if (i !== index) return leg
        const updatedLeg = { ...leg, [field]: val }

        if (field === 'fromCityId' || field === 'toCityId') {
          const nameField = field === 'fromCityId' ? 'fromCityName' : 'toCityName'
          const city = legCities.find(
            (c: any) => (c.citieid ?? c.cityId) === Number(val),
          )
          updatedLeg[nameField] = city?.name ?? ''
        }

        return updatedLeg
      })

      if (field === 'toCityId' && index < updated.length - 1) {
        const city = legCities.find(
          (c: any) => (c.citieid ?? c.cityId) === Number(val),
        )
        updated[index + 1] = {
          ...updated[index + 1],
          fromCityId: Number(val) || null,
          fromCityName: city?.name ?? '',
        }
      }

      setField('routeLegs', updated)
    },
    [legs, setField, citiesPerLeg, connectedCities],
  )

  const handleFromCityChange = useCallback(
    (index: number, cityId: number) => {
      handleLegChange(index, 'fromCityId', cityId)
      if (cityId) loadCitiesForLeg(cityId, index)
    },
    [handleLegChange, loadCitiesForLeg],
  )

  const handleToCityChange = useCallback(
    (index: number, cityId: number | null) => {
      handleLegChange(index, 'toCityId', cityId)
      // Pre-load connected cities for the next leg
      if (cityId) loadCitiesForLeg(cityId, index + 1)
    },
    [handleLegChange, loadCitiesForLeg],
  )

  const shouldRender =
    isOrderType1588 ||
    (legs.length > 0) ||
    (
      String(value.equipmentType) === '3' &&
      !value.tripDetail &&
      value.settings?.suggestedAmountRequired === 1
    )

  if (!shouldRender) return null

  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>Route Legs</strong>
        {!disabled && legs.length < maxLegs && (
          <CButton color="primary" size="sm" onClick={handleAddLeg}>
            <CIcon icon={cilPlus} className="me-1" /> Add Leg
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        {legs.length === 0 && (
          <p className="text-muted mb-0">No route legs defined.</p>
        )}
        {legs.map((leg, index) => {
          const legCities = getCitiesForLeg(index)
          return (
            <CRow key={index} className="mb-2 align-items-end">
              <CCol md={5}>
                <label className="form-label small">
                  {index === 0 ? 'Origin City' : `From City`}
                </label>
                {disabled || (fromCityReadOnly && index === 0) || index > 0 ? (
                  <CFormInput
                    size="sm"
                    value={leg.fromCityName || `City #${leg.fromCityId ?? ''}`}
                    disabled
                  />
                ) : (
                  <CMultiSelect
                    multiple={false}
                    options={legCities.map((c: any) => ({
                      value: c.citieid ?? c.cityId,
                      label: c.name,
                      selected: (c.citieid ?? c.cityId) === leg.fromCityId,
                    }))}
                    disabled={disabled}
                    placeholder="Select from city..."
                    onChange={(selected: any[]) =>
                      handleFromCityChange(index, selected[0] ? Number(selected[0].value) : 0)
                    }
                  />
                )}
              </CCol>
              <CCol md={5}>
                <label className="form-label small">
                  {index === 0 ? 'Destination City' : `To City`}
                </label>
                {disabled ? (
                  <CFormInput
                    size="sm"
                    value={leg.toCityName || `City #${leg.toCityId ?? ''}`}
                    disabled
                  />
                ) : (
                  <CMultiSelect
                    multiple={false}
                    options={legCities.map((c: any) => ({
                      value: c.citieid ?? c.cityId,
                      label: c.name,
                      selected: (c.citieid ?? c.cityId) === leg.toCityId,
                    }))}
                    placeholder="Select to city..."
                    onChange={(selected: any[]) =>
                      handleToCityChange(index, selected[0] ? Number(selected[0].value) : null)
                    }
                  />
                )}
              </CCol>
              <CCol md={2}>
                {!disabled && index > 0 && (
                  <CButton
                    color="danger"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveLeg(index)}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                )}
              </CCol>
            </CRow>
          )
        })}
      </CCardBody>
    </CCard>
  )
}

export default RouteLegsSection
