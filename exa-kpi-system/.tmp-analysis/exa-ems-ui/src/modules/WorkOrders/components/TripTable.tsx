import React from 'react'
import { Link } from 'react-router-dom'
import {
  CButton,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
  CFormInput,
  CMultiSelect,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilEnvelopeClosed } from '@coreui/icons'
import type { WorkOrderTrip } from '../types'

export interface Option {
  value: string | number
  label: string
}

interface TripTableProps {
  trips: WorkOrderTrip[]
  containerTypes: Option[]
  inventoryOptions: Option[]
  errors: Record<string, string>
  loading: boolean
  locked: boolean
  viewMode?: boolean
  onChangeField: (field: string, value: any) => void
  onRemoveTrip: (index: number) => void
  onSendTripEmail?: (tripId: number) => void
}

const TripTable: React.FC<TripTableProps> = ({
  trips,
  containerTypes,
  inventoryOptions,
  errors,
  loading,
  locked,
  viewMode = false,
  onChangeField,
  onRemoveTrip,
  onSendTripEmail,
}) => {
  const getOptionLabel = (value: any, options: Option[]): string => {
    if (!value) return '—'
    const found = options.find(o => String(o.value) === String(value))
    return found?.label || String(value)
  }
  const formatCurrency = (value: any) => {
    const num = Number(value)
    if (isNaN(num)) return '$0.00'
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  }

  const getTripTotal = (trip: WorkOrderTrip) => {
    const price = Number(trip.price) || 0
    const others = Number(trip.others) || 0
    return price + others
  }

  const getInventoryLabel = (inventoryId: any) => {
    if (!inventoryId) return ''
    const inv = inventoryOptions.find((opt) => String(opt.value) === String(inventoryId))
    return inv?.label || ''
  }

  const getContainerTypeLabel = (containerTypeId: any) => {
    if (!containerTypeId) return ''
    const ct = containerTypes.find((opt) => String(opt.value) === String(containerTypeId))
    return ct?.label || ''
  }

  // Calculate totals
  const totals = trips.reduce(
    (acc, trip) => {
      acc.km += Number(trip.km) || 0
      acc.price += Number(trip.price) || 0
      acc.others += Number(trip.others) || 0
      acc.total += getTripTotal(trip)
      return acc
    },
    { km: 0, price: 0, others: 0, total: 0 }
  )

  return (
    <div className="trip-table-wrapper">
      <div className="trip-table-container">
        <CTable
          small
          className="trip-table"
          style={{ fontSize: '0.875rem' }}
        >
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell style={{ width: '60px', textAlign: 'center' }}>ID</CTableHeaderCell>
            <CTableHeaderCell style={{ width: '60px', textAlign: 'center' }}>KM</CTableHeaderCell>
            <CTableHeaderCell style={{ width: '90px', textAlign: 'right' }}>Price</CTableHeaderCell>
            <CTableHeaderCell style={{ width: '90px', textAlign: 'right' }}>Others</CTableHeaderCell>
            <CTableHeaderCell style={{ width: '100px', textAlign: 'right' }}>Total</CTableHeaderCell>
            <CTableHeaderCell style={{ minWidth: '140px' }}>Container Ref *</CTableHeaderCell>
            <CTableHeaderCell style={{ minWidth: '180px' }}>Truck/Driver</CTableHeaderCell>
            <CTableHeaderCell style={{ minWidth: '120px' }}>Cargo Type</CTableHeaderCell>
            <CTableHeaderCell style={{ width: '140px', textAlign: 'center' }}>
              Email Subdivision
            </CTableHeaderCell>
            <CTableHeaderCell style={{ width: '60px', textAlign: 'center' }}>
              Actions
            </CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {trips.map((trip, idx) => {
            const isLocked = !!trip.payment || !!trip.invoice || (!!trip.close_trip_date && trip.close_trip_date !== '')
            const tripTotal = getTripTotal(trip)

            return (
              <CTableRow key={idx}>
                {/* ID */}
                <CTableDataCell style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  {trip.trip_id ? (
                    <Link
                      to={`/operations/trips/${trip.trip_id}`}
                      className="text-decoration-none font-weight-bold"
                    >
                      <strong className="text-primary">{trip.trip_id}</strong>
                    </Link>
                  ) : (
                    <strong className="text-primary">—</strong>
                  )}
                  {isLocked && (
                    <div className="mt-1">
                      <CBadge color="dark" size="sm" shape="rounded-pill">
                        Locked
                      </CBadge>
                    </div>
                  )}
                </CTableDataCell>

                {/* KM */}
                <CTableDataCell style={{ verticalAlign: 'middle' }}>
                  <CFormInput
                    type="number"
                    size="sm"
                    value={trip.km ?? ''}
                    onChange={(e) =>
                      onChangeField(`trips.${idx}.km`, e.target.value ? Number(e.target.value) : null)
                    }
                    disabled={true}
                    style={{ textAlign: 'center', minWidth: '60px' }}
                  />
                </CTableDataCell>

                {/* Price */}
                <CTableDataCell style={{ verticalAlign: 'middle' }}>
                  <CFormInput
                    type="text"
                    size="sm"
                    value={formatCurrency(trip.price) ?? '$0.00'}
                    onChange={(e) =>
                      onChangeField(`trips.${idx}.price`, e.target.value ? Number(e.target.value) : null)
                    }
                    disabled={true}
                    style={{ textAlign: 'right', minWidth: '90px' }}
                  />
                </CTableDataCell>

                {/* Others */}
                <CTableDataCell style={{ verticalAlign: 'middle' }}>
                  <CFormInput
                    type="text"
                    size="sm"
                    value={formatCurrency(trip.others) ?? '$0.00'}
                    onChange={(e) =>
                      onChangeField(`trips.${idx}.others`, e.target.value ? Number(e.target.value) : null)
                    }
                    disabled={true}
                    style={{ textAlign: 'right', minWidth: '90px' }}
                  />
                </CTableDataCell>

                {/* Total */}
                <CTableDataCell
                  style={{
                    textAlign: 'right',
                    verticalAlign: 'middle',
                    fontWeight: 'bold',
                    color: 'var(--cui-success, #2eb85c)',
                  }}
                >
                  {formatCurrency(tripTotal)}
                </CTableDataCell>

                {/* Container Ref */}
                <CTableDataCell style={{ verticalAlign: 'middle' }}>
                  <CFormInput
                    size="sm"
                    value={trip.container_ref || ''}
                    onChange={(e) => onChangeField(`trips.${idx}.container_ref`, e.target.value)}
                    disabled={loading || isLocked}
                    invalid={Boolean(errors[`trips.${idx}.container_ref`])}
                    style={{ minWidth: '140px' }}
                  />
                  {errors[`trips.${idx}.container_ref`] && (
                    <small className="text-danger">{errors[`trips.${idx}.container_ref`]}</small>
                  )}
                </CTableDataCell>

                {/* Truck/Driver (Inventory) */}
                <CTableDataCell style={{ verticalAlign: 'middle' }}>
                  {viewMode ? (
                    <CFormInput size="sm" value={getOptionLabel(trip.inventory, inventoryOptions)} readOnly style={{ minWidth: '180px' }} />
                  ) : (
                    <CMultiSelect
                      key={`inv_${idx}_${trip.inventory}_${inventoryOptions.length}`}
                      size="sm"
                      value={trip.inventory ? String(trip.inventory) : ''}
                      options={inventoryOptions}
                      onChange={(options: any) => {
                        const val = Array.isArray(options) ? options[0]?.value : options?.value
                        onChangeField(`trips.${idx}.inventory`, val ? Number(val) : null)
                      }}
                      disabled={loading || isLocked}
                      multiple={false}
                      placeholder="Select Truck/Driver"
                      clearSearchOnSelect
                      optionsStyle="text"
                      style={{ minWidth: '180px' }}
                    />
                  )}
                </CTableDataCell>

                {/* Cargo Type (Container Type) */}
                <CTableDataCell style={{ verticalAlign: 'middle' }}>
                  {viewMode ? (
                    <CFormInput size="sm" value={getOptionLabel(trip.container_type_id, containerTypes)} readOnly style={{ minWidth: '120px' }} />
                  ) : (
                    <CMultiSelect
                      key={`cont_type_${idx}_${trip.container_type_id}_${containerTypes.length}`}
                      size="sm"
                      value={trip.container_type_id ? String(trip.container_type_id) : ''}
                      options={containerTypes}
                      onChange={(options: any) => {
                        const val = Array.isArray(options) ? options[0]?.value : options?.value
                        onChangeField(`trips.${idx}.container_type_id`, val ? Number(val) : '')
                      }}
                      disabled={loading || isLocked}
                      multiple={false}
                      placeholder="Select Type"
                      clearSearchOnSelect
                      optionsStyle="text"
                      style={{ minWidth: '120px' }}
                    />
                  )}
                </CTableDataCell>

                {/* Email Subdivision */}
                <CTableDataCell style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  {trip.trip_id && onSendTripEmail ? (
                    <CButton
                      color="info"
                      size="sm"
                      onClick={() => onSendTripEmail(trip.trip_id!)}
                      disabled={loading}
                      className="text-white"
                    >
                      <CIcon icon={cilEnvelopeClosed} size="sm" className="me-1" />
                      Send Trip
                    </CButton>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </CTableDataCell>

                {/* Actions */}
                <CTableDataCell style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <CButton
                    color="danger"
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveTrip(idx)}
                    disabled={loading || isLocked}
                    title="Remove Trip"
                  >
                    <CIcon icon={cilTrash} size="sm" />
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            )
          })}

          {/* Totals Row */}
          {trips.length > 0 && (
            <CTableRow className="totals-row">
              <CTableDataCell style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                <strong>TOTAL</strong>
              </CTableDataCell>
              <CTableDataCell style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                <strong>{totals.km.toFixed(0)}</strong>
              </CTableDataCell>
              <CTableDataCell style={{ textAlign: 'right', verticalAlign: 'middle', paddingRight: '0.75rem' }}>
                <strong>{formatCurrency(totals.price)}</strong>
              </CTableDataCell>
              <CTableDataCell style={{ textAlign: 'right', verticalAlign: 'middle', paddingRight: '0.75rem' }}>
                <strong>{formatCurrency(totals.others)}</strong>
              </CTableDataCell>
              <CTableDataCell style={{ textAlign: 'right', verticalAlign: 'middle', paddingRight: '0.75rem', color: 'var(--cui-success, #2eb85c)', fontSize: '1rem' }}>
                <strong>{formatCurrency(totals.total)}</strong>
              </CTableDataCell>
              <CTableDataCell colSpan={5}></CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>

        {trips.length === 0 && (
          <div className="text-center text-muted py-4">
            <p>No trips added yet. Click "Add Trip" to create one.</p>
          </div>
        )}
      </div>

      <style>{`
        .trip-table-wrapper {
          width: 100%;
          margin-bottom: 1rem;
          position: relative;
        }

        .trip-table-container {
          background: var(--cui-body-bg);
          border-radius: 10px;
          border: 1px solid var(--cui-border-color, #e0e0e0);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
          /* Use higher level overflow (page scroll) instead of local scroll to avoid clipping dropdowns */
          overflow: visible; 
        }
        
        .trip-table {
          margin-bottom: 0;
          border-collapse: separate;
          border-spacing: 0;
          background: var(--cui-body-bg);
          color: var(--cui-body-color, #212529);
          /* Ensure table itself doesn't clip */
          overflow: visible;
        }

        /* Critical: Ensure table cells don't clip content */
        .trip-table td, 
        .trip-table th {
          overflow: visible !important; 
          position: static; /* Allow children to position relative to viewport/container */
        }

        /* Make sure dropdown container is relative for positioning */
        .trip-table .form-multi-select {
          position: relative;
        }

        /* Force dropdown menu to be on top */
        .form-multi-select-options,
        .form-multi-select-dropdown {
          overflow-y: auto;

          z-index: 9999 !important;
          /* Ensure it has a background */
          background: var(--cui-body-bg, #fff);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
      </div>
  )
}

export default TripTable
