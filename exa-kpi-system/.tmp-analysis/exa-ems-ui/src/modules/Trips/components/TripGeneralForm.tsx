import React from 'react'
import {
  CBadge,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormInput,
  CFormLabel,
  CMultiSelect,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSettings } from '@coreui/icons'
import type { TripDetails, Asset, InventoryItem } from '../types'
import { formatDateTime } from '../utils/tripTransformers'

interface TripGeneralFormProps {
  trip: TripDetails | null
  inventoryOptions: InventoryItem[]
  chassisOptions: Asset[]
  gensetOptions: Asset[]
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  locked?: boolean
  viewMode?: boolean
}

const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20

const getInventoryLabel = (inventory: InventoryItem) => {
  const parts = [
    inventory.truck || inventory.name,
    inventory.driver_name ? `/${inventory.driver_name}` : '',
    inventory.availability ? ` (${inventory.availability})` : '',
  ]
  return parts.filter(Boolean).join('')
}

const getInventoryDisplayFromTrip = (trip: TripDetails, inventoryOptions: InventoryItem[] = []) => {
  const inventoryId = trip.inventoryId || trip.inventory?.asset_id

  const inventoryFromOptions = inventoryId
    ? inventoryOptions.find((item) => Number(item.asset_id) === Number(inventoryId))
    : null

  const driverLabel = (() => {
    if (!trip.driver) return ''
    const full = `${trip.driver.first_name || ''} ${trip.driver.last_name || ''}`.replace(/\s+/g, ' ').trim()
    return full ? `/${full}` : ''
  })()

  if (inventoryFromOptions) {
    const truck = inventoryFromOptions.truck || inventoryFromOptions.name || ''
    const constructed = `${truck}${driverLabel}`.trim()
    if (constructed) return constructed
  }

  if (trip.assigned_inventory) {
    return trip.assigned_inventory
  }

  if (trip.inventory?.name) {
    const base = trip.inventory.name
    return driverLabel ? `${base}${driverLabel}` : base
  }

  if (trip.inventory) {
    const label = getInventoryLabel(trip.inventory)
    if (label) return `${label}${driverLabel}`
  }

  if (inventoryId) {
    return `Inventory #${inventoryId}`
  }

  return '—'
}

const TripGeneralForm: React.FC<TripGeneralFormProps> = ({
  trip,
  inventoryOptions,
  chassisOptions,
  gensetOptions,
  onChange,
  locked = false,
  viewMode = false,
}) => {
  if (!trip) return null
  const isClosed = Boolean(trip.isClosedTrip || trip.close_trip_date) || locked

  const formatDisplayDate = (...values: (number | string | null | undefined)[]) => {
    for (const value of values) {
      const formatted = formatDateTime(value)
      if (formatted) return formatted
    }
    return '—'
  }

  const selectedInventoryOption = trip.inventoryId
    ? inventoryOptions.find((item) => Number(item.asset_id) === Number(trip.inventoryId))
    : undefined
  const inventoryDisplay = getInventoryDisplayFromTrip(trip, inventoryOptions)

  const infoFields = [
    { label: 'Trip No.', value: trip.trip_id },
    { label: 'Trip Pick Up Date', value: formatDisplayDate(trip.truck_lvpk_date, trip.truck_lv_pk_date) },
    { label: 'Trip Completed Date', value: formatDisplayDate(trip.close_trip_date) },
    { label: 'Trip Created', value: formatDisplayDate(trip.create_date) },
    { label: 'Pick-Up Exp Date', value: formatDisplayDate(trip.pick_up_exp_date, trip.work_order?.pick_up_date_time) },
    { label: 'Deliver Exp Date', value: formatDisplayDate(trip.deliver_exp_date, trip.work_order?.deliver_date_time) },
    { label: 'Work Order Reference Number', value: trip.work_order?.ref_number || trip.work_order_ref },
    { label: 'Work Order', value: trip.work_order?.work_order_id || trip.work_order_id },
    { label: 'Work Order Date', value: formatDisplayDate(trip.work_order?.create_date, trip.work_order_date) },
    { label: 'Client', value: trip.work_order?.client?.name || trip.client },
    { label: 'Subdivision', value: typeof trip.subdivision === 'object' ? trip.subdivision?.name : trip.subdivision },
    { label: 'Type of Cargo', value: trip.work_order?.cargo_type || trip.cargo_type || '—' },
    { label: 'Container Reference', value: trip.container_ref || '—' },
  ]

  const routeParts = [
    trip.work_order?.city_a?.name || trip.pick_up,
    trip.work_order?.city_b?.name || trip.delivery,
    trip.work_order?.city_c?.name || trip.return_to,
  ].filter(Boolean)

  return (
    <>
      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex align-items-center">
          <CIcon icon={cilSettings} className="me-2 text-primary" />
          <strong>General Information</strong>
        </CCardHeader>
      <CCardBody>
        <CRow className="mb-3">
          {infoFields.map((field) => (
            <CCol key={field.label} sm={6} md={4} xl={3} className="mb-3">
              <div className="text-body-secondary small">{field.label}</div>
              <div className="fw-semibold">{field.value || '—'}</div>
            </CCol>
          ))}
          <CCol sm={6} md={4} xl={3} className="mb-3">
            <div className="text-body-secondary small">Route</div>
            <div className="fw-semibold">{routeParts.join(' - ') || '—'}</div>
          </CCol>
          <CCol sm={6} md={4} xl={3} className="mb-3">
            {isClosed ? (
              <>
                <CFormLabel className="text-body-secondary small">Inventory Assigned</CFormLabel>
                <div className="fw-semibold">{inventoryDisplay}</div>
              </>
            ) : (
              <CMultiSelect
                label={<span className="text-body-secondary small">Inventory Assigned</span>}
                options={inventoryOptions.map((item) => ({
                  value: String(item.asset_id),
                  label: getInventoryLabel(item),
                }))}
                value={trip.inventoryId ? [String(trip.inventoryId)] : []}
                onChange={(options: any) => {
                  const val = Array.isArray(options) ? options[0]?.value : options?.value
                  onChange({
                    target: {
                      name: 'inventoryId',
                      value: val,
                    },
                  } as any)
                }}
                disabled={isClosed}
                multiple={false}
                placeholder="Select inventory"
                clearSearchOnSelect
                dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                virtualScroller={shouldVirtualScroll(inventoryOptions)}
              />
            )}
          </CCol>
        </CRow>

        <hr />

        <CRow className="g-3">
          <CCol xs={12} lg={6}>
            <CRow className="g-3">
              <CCol xl={4}>
                {viewMode ? (
                  <CFormInput
                    label="AE Chassis"
                    value={trip.chassis?.chassis_no || trip.chassis?.plate || (trip.chassis as any)?.name || '—'}
                    readOnly
                  />
                ) : (
                  <CMultiSelect
                    label="AE Chassis"
                    options={chassisOptions.map((item) => ({
                      value: String(item.id),
                      label: item.chassis_no || item.plate || item.name || 'Unknown',
                    }))}
                    value={trip.chassisId ? String(trip.chassisId) : ''}
                    onChange={(options: any) => {
                      const val = Array.isArray(options) ? options[0]?.value : options?.value
                      onChange({
                        target: {
                          name: 'chassisId',
                          value: val,
                        },
                      } as any)
                    }}
                    disabled={isClosed}
                    multiple={false}
                    placeholder="Pick a chassis"
                    clearSearchOnSelect
                    dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                    virtualScroller={shouldVirtualScroll(chassisOptions)}
                  />
                )}
              </CCol>
              <CCol xl={4}>
                <CFormInput
                  label="KM Initial"
                  name="km_initial"
                  type="number"
                  value={trip.km_initial ?? ''}
                  onChange={onChange}
                  disabled={isClosed}
                  className="bg-body text-body"
                />
              </CCol>
              <CCol xl={4}>
                <CFormInput
                  label="KM Final"
                  name="km_final"
                  type="number"
                  value={trip.km_final ?? ''}
                  onChange={onChange}
                  disabled={isClosed}
                  className="bg-body text-body"
                />
              </CCol>
            </CRow>
          </CCol>
          <CCol xs={12} lg={6}>
            <CRow className="g-3">
              <CCol xl={4}>
                {viewMode ? (
                  <CFormInput
                    label="AE Genset"
                    value={trip.genset?.genset_no || (trip.genset as any)?.name || '—'}
                    readOnly
                  />
                ) : (
                  <CMultiSelect
                    label="AE Genset"
                    options={gensetOptions.map((item) => ({
                      value: String(item.id),
                      label: item.genset_no || item.name || 'Unknown',
                    }))}
                    value={trip.gensetId ? String(trip.gensetId) : ''}
                    onChange={(options: any) => {
                      const val = Array.isArray(options) ? options[0]?.value : options?.value
                      onChange({
                        target: {
                          name: 'gensetId',
                          value: val,
                        },
                      } as any)
                    }}
                    disabled={isClosed}
                    multiple={false}
                    placeholder="Pick a genset"
                    clearSearchOnSelect
                    dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                    virtualScroller={shouldVirtualScroll(gensetOptions)}
                  />
                )}
              </CCol>
              <CCol xl={4}>
                <CFormInput
                  label="Hours Initial"
                  name="hour_initial"
                  type="number"
                  value={trip.hour_initial ?? ''}
                  onChange={onChange}
                  disabled={isClosed}
                  className="bg-body text-body"
                />
              </CCol>
              <CCol xl={4}>
                <CFormInput
                  label="Hours Final"
                  name="hour_final"
                  type="number"
                  value={trip.hour_final ?? ''}
                  onChange={onChange}
                  disabled={isClosed}
                  className="bg-body text-body"
                />
              </CCol>
            </CRow>
          </CCol>
        </CRow>

        <hr />

        <div className="bg-body-secondary rounded-3 p-3 mb-3">
          <CRow className="g-3">
            <CCol sm={6}>
              <div className="text-body-secondary small mb-1">
                Pick-Up:{' '}
                <CBadge color="primary" className="fw-normal ms-1">
                  {formatDisplayDate(trip.truck_lvpk_date, trip.truck_lv_pk_date)}
                </CBadge>
              </div>
              <CFormInput
                label="Boleta (EIR)"
                name="pick_up_boleta"
                value={trip.pick_up_boleta ?? ''}
                onChange={onChange}
                disabled={isClosed}
                className="bg-body text-body"
              />
            </CCol>
            <CCol sm={6}>
              <div className="text-body-secondary small mb-1">
                Delivery:{' '}
                <CBadge color="success" className="fw-normal ms-1">
                  {formatDisplayDate(trip.container_lv_dl_date, trip.close_trip_date)}
                </CBadge>
              </div>
              <CFormInput
                label="Boleta (EIR)"
                name="delivery_boleta"
                value={trip.delivery_boleta ?? ''}
                onChange={onChange}
                disabled={isClosed}
                className="bg-body text-body"
              />
            </CCol>
          </CRow>
        </div>
      </CCardBody>
    </CCard>

    <CCard className="mb-4 shadow-sm">
      <CCardHeader className="d-flex align-items-center">
        <strong>Financial Information</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="justify-content-center text-center">
          <CCol xs={12} md={5} className="mb-3 mb-md-0">
            <div className="text-body-secondary small text-uppercase">Invoice #</div>
            <div className="fw-bold fs-4">
              {trip.invoice ? `#${trip.invoice}` : <span className="text-muted">—</span>}
            </div>
          </CCol>
          <CCol xs={12} md={5}>
            <div className="text-body-secondary small text-uppercase">Payment #</div>
            <div className="d-flex justify-content-center">
              {trip.payment ? (
                <span className="fw-bold fs-4">{`#${trip.payment}`}</span>
              ) : (
                <CBadge color="warning" className="px-4 py-2 text-uppercase">
                  Payment Pending
                </CBadge>
              )}
            </div>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
    </>
  )
}

export default TripGeneralForm
