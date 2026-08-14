import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CCol,
  CFormLabel,
  CFormSelect,
  CFormInput,
  CRow,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
} from '@coreui/react-pro'

import type { AppDispatch } from '../../../../store'
import type { FuelOrderForm } from '../types/fuelOrder.types'
import {
  searchEquipment,
  loadEquipmentAndDrivers,
  clearEquipmentDetail,
  searchMechanics,
  selectFuelOrderEquipmentDetail,
  selectFuelOrderDriverOptions,
  selectFuelOrderFuelTypes,
  selectFuelOrderFuelRecipients,
  selectFuelOrderResourceCategories,
  selectFuelOrderSuggested,
  selectFuelOrderEquipmentSearch,
  selectFuelOrderSearchingEquipment,
  selectFuelOrderSettings,
  selectFuelOrderMechanicOptions,
} from '../store/fuelOrder.slice'

interface Props {
  value: FuelOrderForm
  disabled: boolean
  errors: Record<string, string>
  setField: (field: keyof FuelOrderForm, value: any) => void
  hasError: (field: keyof FuelOrderForm) => boolean
  tripDetail?: any
  subdivisionsList?: any[]
}

const formatEquipmentLabel = (item: any, equipmentType: number): string => {
  if (item.label) return item.label
  switch (equipmentType) {
    case 1:
      return `Truck: ${item.assetsid} | Plate: ${item.truck_plate ?? 'N/A'}`
    case 2:
      return `${item.assetsid} | Serial: ${item.serial_no ?? 'N/A'} | Model: ${item.model ?? 'N/A'}`
    case 3:
      return `${item.assetsid} | Plate/Series: ${item.personal_identification ?? 'N/A'}`
    default:
      return String(item.assetsid ?? item.name ?? item.id)
  }
}

const FuelQuantitySection: React.FC<Props> = ({
  value,
  disabled,
  errors,
  setField,
  hasError,
  tripDetail,
  subdivisionsList = [],
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const equipmentDetail = useSelector(selectFuelOrderEquipmentDetail)
  const driverOptions = useSelector(selectFuelOrderDriverOptions)
  const fuelTypes = useSelector(selectFuelOrderFuelTypes)
  const containerTypes = useSelector(selectFuelOrderFuelRecipients)
  const resourceCategories = useSelector(selectFuelOrderResourceCategories)
  const suggested = useSelector(selectFuelOrderSuggested)
  const equipmentSearchResults = useSelector(selectFuelOrderEquipmentSearch)
  const searchingEquipment = useSelector(selectFuelOrderSearchingEquipment)
  const settings = useSelector(selectFuelOrderSettings)

  const mechanicOptions = useSelector(selectFuelOrderMechanicOptions)

  const [equipmentQuery, setEquipmentQuery] = useState('')
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false)
  const [mechanicQuery, setMechanicQuery] = useState('')
  const [showMechanicDropdown, setShowMechanicDropdown] = useState(false)

  // Gap 9: Genset only available when trip container type is 183 or 184
  const equipmentTypeOptions = useMemo(() => {
    const options: { value: number; label: string }[] = [
      { value: 1, label: 'Truck' },
      { value: 3, label: 'Other Asset' },
    ]
    const containertypeid = tripDetail?.containertypeid ?? tripDetail?.containerTypeId
    if (containertypeid === 183 || containertypeid === 184) {
      options.splice(1, 0, { value: 2, label: 'Genset' })
    }
    return options
  }, [tripDetail])

  // Gap 12: Equipment locked when trip exists and type is truck, or type is genset
  const isEquipmentLocked =
    disabled ||
    !value.equipmentType ||
    value.equipmentType === 2 ||
    (value.equipmentType === 1 && !!value.tripsid && Number(value.tripsid) > 0)

  // Gap 12: Driver locked when trip exists and type is truck
  const isDriverLocked =
    disabled ||
    (value.equipmentType === 1 && !!value.tripsid && Number(value.tripsid) > 0)

  const handleEquipmentSearch = useCallback(
    (q: string) => {
      if (value.equipmentId) {
        setField('equipmentId', null)
        dispatch(clearEquipmentDetail())
      }
      setEquipmentQuery(q)
      if (q.length >= 2 && value.equipmentType) {
        dispatch(searchEquipment({ equipmentType: value.equipmentType, query: q }))
        setShowEquipmentDropdown(true)
      } else {
        setShowEquipmentDropdown(false)
      }
    },
    [dispatch, value.equipmentType, value.equipmentId, setField],
  )

  const handleEquipmentSelect = useCallback(
    (item: any) => {
      const eqId = item.value ?? item.assetsid ?? item.id
      setField('equipmentId', Number(eqId))
      setEquipmentQuery(formatEquipmentLabel(item, value.equipmentType ?? 1))
      setShowEquipmentDropdown(false)

      if (value.equipmentType) {
        dispatch(
          loadEquipmentAndDrivers({
            equipmentType: value.equipmentType,
            equipmentId: Number(eqId),
          }),
        )
      }
    },
    [dispatch, setField, value.equipmentType],
  )

  const handleMechanicSearch = useCallback(
    (q: string) => {
      setMechanicQuery(q)
      if (q.length >= 2) {
        dispatch(searchMechanics({ searchText: q, subdivisionId: value.subdivisionId ?? undefined }))
        setShowMechanicDropdown(true)
      } else {
        setShowMechanicDropdown(false)
      }
    },
    [dispatch, value.subdivisionId],
  )

  const handleMechanicSelect = useCallback(
    (item: any) => {
      setField('responsibleId', Number(item.value))
      setMechanicQuery(item.label)
      setShowMechanicDropdown(false)
    },
    [setField],
  )

  useEffect(() => {
    if (!value.equipmentType) {
      dispatch(clearEquipmentDetail())
      setEquipmentQuery('')
    }
  }, [dispatch, value.equipmentType])

  useEffect(() => {
    if (value.equipmentId && equipmentDetail && !equipmentQuery) {
      const plate =
        equipmentDetail.plate ??
        (equipmentDetail as any)?.truck_plate ??
        (equipmentDetail as any)?.serial_no ??
        (equipmentDetail as any)?.personal_identification
      if (plate) {
        setEquipmentQuery(`${value.equipmentId} | ${plate}`)
      } else {
        setEquipmentQuery(String(value.equipmentId))
      }
    }
  }, [value.equipmentId, equipmentDetail])

  const isGenset = value.equipmentType === 2
  const measureLabel = isGenset ? 'Horometer' : 'Odometer'

  const GAL_TO_LTR = 3.785411784

  const suggestedRange = (() => {
    const suggestedVal = Number(suggested ?? value.suggested)
    if (!suggestedVal || suggestedVal <= 0) return null
    const variationMin = Number(settings?.fuelVariationMin) || 0
    const variationMax = Number(settings?.fuelVariationMax) || 0
    if (!variationMin && !variationMax) return null
    const min = suggestedVal - (suggestedVal * variationMin / 100)
    const max = suggestedVal + (suggestedVal * variationMax / 100)
    return {
      minLtr: min.toFixed(2),
      maxLtr: max.toFixed(2),
      minGal: (min / GAL_TO_LTR).toFixed(2),
      maxGal: (max / GAL_TO_LTR).toFixed(2),
      variationMin,
      variationMax,
    }
  })()

  const getDriverLabel = (d: any): string => {
    if (d.label) return d.label
    if (d.name) return d.name
    const first = d.firstName ?? d.first_name ?? ''
    const last = d.lastName ?? d.last_name ?? ''
    return `${first} ${last}`.trim() || `Driver ${d.value ?? d.driverId ?? ''}`
  }

  const getDriverValue = (d: any): string => {
    return String(d.value ?? d.driverId ?? d.assetsid ?? d.id ?? '')
  }

  // Gap 23: Equipment detail display per type
  const renderEquipmentDetail = () => {
    if (!equipmentDetail) return null
    const eqType = value.equipmentType
    const detail = equipmentDetail as any

    if (eqType === 1) {
      return (
        <div className="bg-body-secondary p-2 rounded small">
          <strong>Equipment:</strong>{' '}
          {detail.truck_plate ?? detail.plate ? `Plate: ${detail.truck_plate ?? detail.plate}` : ''}
          {detail.chassis ? ` | Chassis: ${detail.chassis}` : ''}
          {detail.subdivisionName ?? detail.subdivision ? ` | Subdivision: ${detail.subdivisionName ?? detail.subdivision}` : ''}
          {detail.vehicle_type ? ` | Type: ${detail.vehicle_type}` : ''}
          {detail.color ? ` (${detail.color})` : ''}
          {detail.model ? ` | ${detail.model}` : ''}
          {detail.year ? ` (${detail.year})` : ''}
        </div>
      )
    }
    if (eqType === 2) {
      return (
        <div className="bg-body-secondary p-2 rounded small">
          <strong>Equipment:</strong>{' '}
          {detail.serial_no ? `Serial: ${detail.serial_no}` : ''}
          {detail.brand_engine ? ` | Engine: ${detail.brand_engine}` : ''}
          {detail.equipment_owner ? ` | Owner: ${detail.equipment_owner}` : ''}
          {detail.color ? ` (${detail.color})` : ''}
          {detail.model ? ` | ${detail.model}` : ''}
          {detail.year ? ` (${detail.year})` : ''}
        </div>
      )
    }
    return (
      <div className="bg-body-secondary p-2 rounded small">
        <strong>Equipment:</strong>{' '}
        {detail.brand ? `Brand: ${detail.brand}` : ''}
        {detail.vehicle_type ? ` | Type: ${detail.vehicle_type}` : ''}
        {detail.subdivisionName ?? detail.subdivision ? ` | Subdivision: ${detail.subdivisionName ?? detail.subdivision}` : ''}
        {detail.color ? ` (${detail.color})` : ''}
        {detail.model ? ` | ${detail.model}` : ''}
        {detail.year ? ` (${detail.year})` : ''}
      </div>
    )
  }

  // Gap 28: Hide section until gas station and order type are selected and attribute lists are loaded
  const hasRequiredData =
    Number(value.gasStationsId) > 0 &&
    !!value.orderType &&
    fuelTypes.length > 0 &&
    containerTypes.length > 0

  if (!hasRequiredData) return null

  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>Fuel Quantity & Equipment</strong>
        {/* Gap 24: Display settings name */}
        <small className="text-body-secondary">
          {settings?.name ? settings.name : 'No Settings Available'}
        </small>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>Schedule Date *</CFormLabel>
            <CFormInput
              type="datetime-local"
              value={
                value.dateSchedule
                  ? new Date(value.dateSchedule).toISOString().slice(0, 16)
                  : ''
              }
              disabled={disabled}
              invalid={hasError('dateSchedule')}
              onChange={(e) => setField('dateSchedule', e.target.value || null)}
            />
            {hasError('dateSchedule') && (
              <div className="invalid-feedback d-block">{errors.dateSchedule}</div>
            )}
          </CCol>
          <CCol md={3}>
            <CFormLabel>Expiration Date *</CFormLabel>
            <CFormInput
              type="datetime-local"
              value={
                value.expirationDate
                  ? new Date(value.expirationDate).toISOString().slice(0, 16)
                  : ''
              }
              disabled={disabled}
              invalid={hasError('expirationDate')}
              onChange={(e) =>
                setField('expirationDate', e.target.value || null)
              }
            />
            {hasError('expirationDate') && (
              <div className="invalid-feedback d-block">{errors.expirationDate}</div>
            )}
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={4}>
            <CFormLabel>Equipment Type *</CFormLabel>
            <CFormSelect
              value={value.equipmentType ?? ''}
              disabled={disabled}
              invalid={hasError('equipmentType')}
              onChange={(e) => {
                const newType = Number(e.target.value) || null
                setField('equipmentType', newType)
                setField('equipmentId', null)
                setEquipmentQuery('')
                dispatch(clearEquipmentDetail())
              }}
            >
              <option value="">Select equipment type...</option>
              {equipmentTypeOptions.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={4}>
            <CFormLabel>
              {value.equipmentType === 1
                ? 'Truck ID'
                : value.equipmentType === 2
                  ? 'Genset ID'
                  : 'Asset ID'}
            </CFormLabel>
            <div className="position-relative">
              <CFormInput
                value={equipmentQuery}
                disabled={isEquipmentLocked}
                placeholder={
                  value.equipmentType === 1
                    ? 'Search by plate, ID...'
                    : value.equipmentType === 2
                      ? 'Search by serial, ID...'
                      : value.equipmentType === 3
                        ? 'Search by plate/series...'
                        : 'Select equipment type first'
                }
                onChange={(e) => handleEquipmentSearch(e.target.value)}
                onFocus={() => {
                  if (value.equipmentId) {
                    setField('equipmentId', null)
                    dispatch(clearEquipmentDetail())
                    setEquipmentQuery('')
                    return
                  }
                  if (equipmentSearchResults.length > 0 && equipmentQuery.length >= 2) {
                    setShowEquipmentDropdown(true)
                  }
                }}
                onBlur={() => setTimeout(() => setShowEquipmentDropdown(false), 200)}
              />
              {searchingEquipment && (
                <CSpinner
                  size="sm"
                  className="position-absolute"
                  style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
              )}
              {showEquipmentDropdown && equipmentSearchResults.length > 0 && (
                <div
                  className="position-absolute bg-body border shadow-sm w-100"
                  style={{ zIndex: 1050, maxHeight: '200px', overflowY: 'auto' }}
                >
                  {equipmentSearchResults.map((item: any, idx: number) => (
                    <div
                      key={item.value ?? item.assetsid ?? item.id ?? idx}
                      className="px-3 py-2"
                      style={{ cursor: 'pointer' }}
                      onMouseDown={() => handleEquipmentSelect(item)}
                    >
                      {formatEquipmentLabel(item, value.equipmentType ?? 1)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CCol>
          <CCol md={4}>
            <CFormLabel>{value.orderType === 962 ? 'Mechanic' : 'Driver/Responsible'}</CFormLabel>
            {value.orderType === 962 ? (
              <div className="position-relative">
                <CFormInput
                  value={mechanicQuery}
                  disabled={disabled}
                  placeholder="Search mechanic..."
                  onChange={(e) => handleMechanicSearch(e.target.value)}
                  onFocus={() => {
                    if (mechanicOptions.length > 0 && mechanicQuery.length >= 2) {
                      setShowMechanicDropdown(true)
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowMechanicDropdown(false), 200)}
                />
                {showMechanicDropdown && mechanicOptions.length > 0 && (
                  <div
                    className="position-absolute bg-body border shadow-sm w-100"
                    style={{ zIndex: 1050, maxHeight: '200px', overflowY: 'auto' }}
                  >
                    {mechanicOptions.map((item: any, idx: number) => (
                      <div
                        key={item.value ?? idx}
                        className="px-3 py-2"
                        style={{ cursor: 'pointer' }}
                        onMouseDown={() => handleMechanicSelect(item)}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <CFormSelect
                value={value.responsibleId ?? ''}
                disabled={isDriverLocked}
                onChange={(e) =>
                  setField('responsibleId', Number(e.target.value) || null)
                }
              >
                <option value="">Select...</option>
                {driverOptions.map((d: any) => (
                  <option key={getDriverValue(d)} value={getDriverValue(d)}>
                    {getDriverLabel(d)}
                  </option>
                ))}
              </CFormSelect>
            )}
          </CCol>
        </CRow>

        {equipmentDetail && (
          <CRow className="mb-3">
            <CCol>{renderEquipmentDetail()}</CCol>
          </CRow>
        )}

        <CRow className="mb-3">
          <CCol md={4}>
            <CFormLabel>Subdivision</CFormLabel>
            <CFormSelect
              value={value.subdivisionId ?? ''}
              disabled
            >
              <option value="">—</option>
              {subdivisionsList.map((s: any) => (
                <option key={s.subdivision_id} value={s.subdivision_id}>
                  {s.name}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          {value.equipmentType === 3 && (
            <CCol md={4}>
              <CFormLabel>Resource Category *</CFormLabel>
              <CFormSelect
                value={value.resourceCategory ?? ''}
                disabled
                invalid={hasError('resourceCategory')}
                onChange={(e) =>
                  setField('resourceCategory', Number(e.target.value) || null)
                }
              >
                <option value="">Select...</option>
                {resourceCategories.map((rc: any) => (
                  <option key={rc.attributeItemId} value={rc.attributeItemId}>
                    {rc.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          )}
          <CCol md={4}>
            <CFormLabel>{measureLabel} *</CFormLabel>
            <CFormInput
              type="number"
              value={value.measure ?? ''}
              disabled={disabled}
              invalid={hasError('measure')}
              onChange={(e) =>
                setField('measure', Number(e.target.value) || null)
              }
            />
            {hasError('measure') && (
              <div className="invalid-feedback d-block">{errors.measure}</div>
            )}
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>Fuel Type *</CFormLabel>
            <CFormSelect
              value={value.fuelType ?? ''}
              disabled
              invalid={hasError('fuelType')}
            >
              <option value="">Select...</option>
              {fuelTypes.map((ft: any) => (
                <option key={ft.attributeItemId} value={ft.attributeItemId}>
                  {ft.name}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={3}>
            <CFormLabel>Fuel Recipient *</CFormLabel>
            <CFormSelect
              value={value.typeContainer ?? ''}
              disabled={disabled}
              onChange={(e) => setField('typeContainer', Number(e.target.value) || null)}
              invalid={hasError('typeContainer')}
            >
              <option value="">Select...</option>
              {containerTypes.map((ct: any) => (
                <option key={ct.attributeItemId} value={ct.attributeItemId}>
                  {ct.name}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>
              Suggested Fuel{' '}
              {suggested != null && (
                <span className="text-muted">({suggested} Ltr)</span>
              )}
            </CFormLabel>
            <CFormInput
              type="number"
              value={value.suggested ?? suggested ?? ''}
              disabled
              className="bg-body-secondary"
            />
            {suggestedRange && (
              <small className="text-body-secondary d-block">
                Allowed: {suggestedRange.minLtr} – {suggestedRange.maxLtr} Ltr
                ({suggestedRange.minGal} – {suggestedRange.maxGal} Gal)
                {suggestedRange.variationMin > 0 && ` (-${suggestedRange.variationMin}%`}
                {suggestedRange.variationMax > 0 && ` / +${suggestedRange.variationMax}%)`}
              </small>
            )}
          </CCol>
          <CCol md={2}>
            <CFormLabel>Fuel Tank (Ltr) *</CFormLabel>
            <CFormInput
              type="number"
              step="0.01"
              value={value.fuelTankLiters ?? ''}
              disabled={disabled}
              invalid={hasError('fuelTank')}
              onChange={(e) => {
                const ltr = Number(e.target.value) || 0
                setField('fuelTankLiters', ltr)
                setField('fuelTank', +(ltr / GAL_TO_LTR).toFixed(2))
              }}
            />
            {errors.fuelTank && (
              <div className="invalid-feedback d-block">{errors.fuelTank}</div>
            )}
          </CCol>
          <CCol md={2}>
            <CFormLabel>Fuel Tank (Gal)</CFormLabel>
            <CFormInput
              type="number"
              step="0.01"
              value={value.fuelTank ?? ''}
              disabled
              className="bg-body-secondary"
            />
          </CCol>
          <CCol md={3}>
            <CFormLabel>Fuel Request (Ltr) *</CFormLabel>
            <CFormInput
              type="number"
              step="0.01"
              value={value.fuelRequestLiters ?? ''}
              disabled={disabled}
              invalid={hasError('fuelRequest')}
              onChange={(e) => {
                const ltr = Number(e.target.value) || 0
                setField('fuelRequestLiters', ltr)
                setField('fuelRequest', +(ltr / GAL_TO_LTR).toFixed(2))
              }}
            />
            {errors.fuelRequest && (
              <div className="invalid-feedback d-block">{errors.fuelRequest}</div>
            )}
          </CCol>
          <CCol md={2}>
            <CFormLabel>Fuel Request (Gal)</CFormLabel>
            <CFormInput
              type="number"
              step="0.01"
              value={value.fuelRequest ?? ''}
              disabled
              className="bg-body-secondary"
            />
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default FuelQuantitySection
