import React from 'react'
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
  CMultiSelect,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilMap } from '@coreui/icons'
import type { TripDetails, TripTrackPoint, SelectOption } from '../types'
import {
  TRACK_POINT_PICK_UP,
  TRACK_POINT_CUSTOMS,
  TRACK_POINT_DELIVER,
  TRACK_POINT_RETRUN_TO,
} from '../utils/tripTransformers'

interface TripTrackFormProps {
  trip: TripDetails | null
  auditorStatusOptions: SelectOption[]
  activeOptions: SelectOption[]
  tripStatusOptions: SelectOption[]
  onChange: (event: { target: { name: string; value: any } }) => void
  onTimeChange: (field: string, value: number | null) => void
  disabled?: boolean
}

const toDateTimeLocal = (value?: number | string | null) => {
  if (!value && value !== 0) return ''
  const dateValue = typeof value === 'number' ? value * 1000 : Number(value) * 1000
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

const fromDateTimeLocal = (value: string): number | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor(date.getTime() / 1000)
}



// Refined labels based on legacy usage in render
const getLabel = (field: string, type: string) => {
  if (type === TRACK_POINT_DELIVER && field === 'container_lv_dl_date') return 'Leaves' // Legacy UI shows "Leaves" in the screenshot for the second field usually, but legacy code map says "Time in Transit...". Let's stick to "Leaves" for consistency with other blocks if it's a date field, or use the specific legacy label if requested. User said "use the same legacy wording".
  // Actually, looking at the legacy screenshot descriptions and code:
  // Pick Up: Arrives (truck_ar_pk_date), Leaves (truck_lv_pk_date)
  // Deliver: Arrives (container_ar_dl_date), Leaves (container_lv_dl_date)
  // The legacy code `labels` object maps `container_lv_dl_date` to 'Time in Transit to delivery location', which seems odd for a date field label.
  // However, in the legacy `PointTrack` component: `label={labels[props.settings.leavesProp]}`.
  // So for Deliver, leavesProp is `container_lv_dl_date`, so label is "Time in Transit to delivery location".
  // But wait, `container_lv_dl_date` is a timestamp. "Time in Transit" sounds like a duration.
  // Let's look at the user request: "Container arrives at delivery location --- 2hours (Time in Transit to delivery location)".
  // This implies the duration is the "Time in Transit".
  // The legacy code might have a confusing variable name or I'm misinterpreting.
  // Let's use descriptive labels for the date fields: "Arrives", "Leaves" (or specific events like "Truck arrives...").
  // And put the duration next to it.

  if (field === 'truck_ar_pk_date') return 'Truck arrives at pick-up location'
  if (field === 'truck_lv_pk_date') return 'Truck leaves pick-up location'
  if (field === 'container_ar_dl_date') return 'Container arrives at delivery location'
  if (field === 'container_lv_dl_date') return 'Container leaves delivery location' // Adjusted for clarity, legacy might be confusing
  if (field === 'container_ar_cus_date') return 'Container arrives at customs'
  if (field === 'container_lv_cus_date') return 'Container leaves customs'
  if (field === 'truck_ar_pr_date') return 'Truck arrives at drop-off location'
  if (field === 'truck_lv_pr_date') return 'Truck leaves drop-off location'
  return 'Date'
}

const formatDuration = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-'
  
  const numValue = Number(value)
  if (Number.isNaN(numValue)) return String(value)

  const isNegative = numValue < 0
  const absValue = Math.abs(numValue)
  const hours = Math.floor(absValue)
  const minutes = Math.round((absValue - hours) * 60)

  return `${isNegative ? '-' : ''}${hours} Hour ${minutes} Minutes`
}

const pointTitle: Record<string, string> = {
  TRACK_POINT_PICK_UP: 'Pick Up Information',
  TRACK_POINT_CUSTOMS: 'Customs Information',
  TRACK_POINT_DELIVER: 'Deliver Information',
  TRACK_POINT_RETRUN_TO: 'Return To Information',
}

const TripTrackForm: React.FC<TripTrackFormProps> = ({
  trip,
  auditorStatusOptions,
  activeOptions,
  tripStatusOptions,
  onChange,
  onTimeChange,
  disabled = false,
}) => {
  if (!trip) return null

const renderPoint = (track: TripTrackPoint, index: number) => {
    // Removed conditional hiding to match legacy behavior where panels are always visible for data entry
    // if (track.type === TRACK_POINT_RETRUN_TO && !trip.work_order?.is_return_trip) {
    //   return null
    // }

    const arriveField = track.type === TRACK_POINT_CUSTOMS ? 'container_ar_cus_date' : index === 0 ? 'truck_ar_pk_date' : track.type === TRACK_POINT_DELIVER ? 'container_ar_dl_date' : 'truck_ar_pr_date'
    const leaveField = track.type === TRACK_POINT_CUSTOMS ? 'container_lv_cus_date' : index === 0 ? 'truck_lv_pk_date' : track.type === TRACK_POINT_DELIVER ? 'container_lv_dl_date' : 'truck_lv_pr_date'
    
    const timeField =
      track.type === TRACK_POINT_CUSTOMS
        ? 'timer_customs'
        : track.type === TRACK_POINT_PICK_UP
          ? 'timer_pick_up'
          : track.type === TRACK_POINT_DELIVER
            ? 'timer_delivery'
            : 'timer_d_o_l'

    const timeLabel = 
      track.type === TRACK_POINT_CUSTOMS
        ? 'Time at Customs location'
        : track.type === TRACK_POINT_PICK_UP
          ? 'Time at Pick-up location'
          : track.type === TRACK_POINT_DELIVER
            ? 'Time at Delivery location'
            : 'Time at Drop off location'

    // Determine transit time field and label
    let transitField = ''
    let transitLabel = ''
    if (track.type === TRACK_POINT_DELIVER) {
      transitField = 'time_transit_delivery'
      transitLabel = 'Time in Transit to delivery location'
    } else if (track.type === TRACK_POINT_CUSTOMS) {
      transitField = 'time_transit_customs'
      transitLabel = 'Time in Transit to Customs Location'
    } else if (track.type === TRACK_POINT_RETRUN_TO) {
      transitField = 'timer_transit_d_o_l'
      transitLabel = 'Time in Transit to drop off location'
    }


    const durationValue = (trip as any)[timeField]
    const transitValue = transitField ? (trip as any)[transitField] : undefined

    // Removed hasContent check to ensure panels are always visible for data entry
    // const hasContent = ...
    // if (!hasContent && !track.cityName && !track.location && !track.address) {
    //   return null
    // }

    const renderDurationBlock = (value: any, label: string) => (
      <div className="p-2 bg-body border rounded small">
        <div className="fw-semibold text-primary">{formatDuration(value)}</div>
        <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
          {label}
        </div>
      </div>
    )

    return (
      <CCard key={`${track.type}-${index}`} className="mb-3 border-0 shadow-sm bg-body-tertiary">
        <CCardHeader className="bg-transparent border-0 pb-0">
          <h6 className="mb-0 fw-bold text-body-secondary text-uppercase">{pointTitle[track.type] || 'Trip Point'}</h6>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            {/* Arrives Row */}
            <CCol md={12}>
              <CRow className="align-items-end">
                <CCol md={8}>
                  <CFormLabel className="small text-body-secondary mb-1">{getLabel(arriveField, track.type)}</CFormLabel>
                  <CFormInput
                    type="datetime-local"
                    value={toDateTimeLocal((trip as any)[arriveField])}
                    onChange={(e) => onTimeChange(arriveField, fromDateTimeLocal(e.target.value))}
                    disabled={disabled}
                    className="bg-body text-body"
                  />
                </CCol>
                {transitField && (
                  <CCol md={4}>{renderDurationBlock(transitValue, transitLabel)}</CCol>
                )}
              </CRow>
            </CCol>

            {/* Leaves Row */}
            <CCol md={12}>
              <CRow className="align-items-end">
                <CCol md={8}>
                  <CFormLabel className="small text-body-secondary mb-1">{getLabel(leaveField, track.type)}</CFormLabel>
                  <CFormInput
                    type="datetime-local"
                    value={toDateTimeLocal((trip as any)[leaveField])}
                    onChange={(e) => onTimeChange(leaveField, fromDateTimeLocal(e.target.value))}
                    disabled={disabled}
                    className="bg-body text-body"
                  />
                </CCol>
                <CCol md={4}>{renderDurationBlock(durationValue, timeLabel)}</CCol>
              </CRow>
            </CCol>

            {track.type !== TRACK_POINT_CUSTOMS && (
              <CCol md={12}>
                <div className="d-flex gap-3 small mt-2">
                    <div>
                        <span className="fw-bold">City: </span>
                        <span>{track.cityName || '—'}</span>
                    </div>
                    {track.location && (
                        <>
                            <div>
                                <span className="fw-bold">Location Name: </span>
                                <span>{track.location}</span>
                            </div>
                            <div>
                                <span className="fw-bold">Location Address: </span>
                                <span>{track.address || '—'}</span>
                            </div>
                        </>
                    )}
                </div>
              </CCol>
            )}
          </CRow>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <>
    <CCard className="mb-4 shadow-sm">
      <CCardHeader className="d-flex align-items-center justify-content-between">
        <div>
          <CIcon icon={cilMap} className="me-2 text-danger" />
          <strong>Truck Trip Information</strong>
        </div>
        <div>
          <CBadge color={trip.isCustoms ? 'warning' : 'secondary'}>
            {trip.isCustoms ? 'With Customs' : 'Without Customs'}
          </CBadge>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-4">
          <CCol lg={7}>
            {trip.track?.map((track, index) => renderPoint(track, index))}
          </CCol>
          <CCol lg={5}>
            <div className="mb-3 p-3 bg-body-tertiary rounded border">
                <CFormLabel className="small text-body-secondary">Time waiting to be assigned</CFormLabel>
                <div className="fw-semibold fs-5">
                  {(() => {
                    const formatted = formatDuration(trip.time_to_be_assigned)
                    return formatted === '-' ? '0 Hours' : formatted
                  })()}
                </div>
            </div>
            
            <div className="mb-3 p-3 bg-body-tertiary rounded border">
                <CFormLabel className="small text-body-secondary">Time waiting to start trip</CFormLabel>
                <div className="fw-semibold fs-5">{formatDuration(trip.time_assigned)}</div>
            </div>

            <CMultiSelect
              className="mb-3"
              label="Auditor Status"
              options={auditorStatusOptions}
              value={trip.trip_open ?? ''}
              onChange={(options: any) => {
                const val = Array.isArray(options) ? options[0]?.value : options?.value
                onChange({ target: { name: 'trip_open', value: val } })
              }}
              disabled={disabled}
              multiple={false}
              optionsStyle="text"
            />
            <CMultiSelect
              className="mb-3"
              label="Active"
              options={activeOptions}
              value={trip.trip_active ?? ''}
              onChange={(options: any) => {
                const val = Array.isArray(options) ? options[0]?.value : options?.value
                onChange({ target: { name: 'trip_active', value: val } })
              }}
              disabled={disabled}
              multiple={false}
              optionsStyle="text"
            />
            <CMultiSelect
              className="mb-3"
              label="Status"
              options={tripStatusOptions}
              value={trip.trip_status ?? ''}
              onChange={(options: any) => {
                const val = Array.isArray(options) ? options[0]?.value : options?.value
                onChange({ target: { name: 'trip_status', value: val } })
              }}
              disabled
              multiple={false}
              optionsStyle="text"
            />
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>

    <CCard className="mb-4 shadow-sm">
        <CCardBody>
            <CRow>
                <CCol md={4}>
                    <div className="p-3 border rounded bg-body-tertiary h-100">
                        <div className="text-body-secondary small text-uppercase fw-bold mb-1">Total Trip Hours</div>
                        <div className="fs-4 fw-bold text-primary">{trip.total_trip_hours ? `${trip.total_trip_hours} Hours` : '0 Hours'}</div>
                    </div>
                </CCol>
                <CCol md={4}>
                    <div className="p-3 border rounded bg-body-tertiary h-100">
                        <div className="text-body-secondary small text-uppercase fw-bold mb-1">Total Days Trip</div>
                        <div className="fs-4 fw-bold text-primary">{trip.total_trip_days ? `${trip.total_trip_days} Days` : '0 Days'}</div>
                    </div>
                </CCol>
                <CCol md={4}>
                    <div className="p-3 border rounded bg-body-tertiary h-100">
                        <div className="text-body-secondary small text-uppercase fw-bold mb-1">Free Time</div>
                        <CFormInput
                            size="sm"
                            name="free_time"
                            value={trip.free_time ?? ''}
                            onChange={(e) => onChange(e)}
                            disabled={disabled}
                            className="mt-1 bg-body text-body"
                            placeholder="Enter free time"
                        />
                    </div>
                </CCol>
            </CRow>
        </CCardBody>
    </CCard>
    </>
  )
}

export default TripTrackForm
