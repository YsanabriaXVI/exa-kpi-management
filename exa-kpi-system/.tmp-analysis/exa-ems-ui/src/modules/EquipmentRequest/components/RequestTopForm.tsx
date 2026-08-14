import React from 'react'
import {
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react-pro'
import { AttributeItem, Client } from '../types'

type ErrorsMap = Record<string, string>

type Props = {
  clients: Client[]
  requestTypes: AttributeItem[]
  value: {
    requestTypeId: number | null
    clientId: number | null
    referenceNumberBooking: string | null
    workOrderId: number | null
    consignee?: string | null
    vesselCode?: string | null
    voyage?: string | null
    comments?: string | null
  }
  errors: ErrorsMap
  onChange: (name: string, value: string) => void
  isView: boolean
  isTripRequest?: boolean
  isEdit: boolean
}

function fieldError(errors: ErrorsMap, path: string): string | undefined {
  return errors[path]
}

export function RequestTopForm({ clients, requestTypes, value, errors, onChange, isView, isTripRequest, isEdit }: Props) {
  return (
    <CRow className="g-3">
      <CCol xs={12} xl={6}>
        <div>
          <CFormLabel>Request Type</CFormLabel>
          <CFormSelect
            value={value.requestTypeId ?? ''}
            invalid={!!fieldError(errors, 'requestDetails.requestTypeId')}
            onChange={(e) => onChange('requestTypeId', e.target.value)}
            disabled={isView || isTripRequest}
          >
            <option value="">Select Request Type...</option>
            {requestTypes.map((rt) => (
              <option key={rt.attributeItemId} value={rt.attributeItemId}>
                {rt.name}
              </option>
            ))}
          </CFormSelect>
          {fieldError(errors, 'requestDetails.requestTypeId') && (
            <div className="invalid-feedback d-block">{fieldError(errors, 'requestDetails.requestTypeId')}</div>
          )}
        </div>

        <div className="mt-3">
          <CFormLabel>Request Reference Number/Booking</CFormLabel>
          <CFormInput
            value={value.referenceNumberBooking ?? ''}
            invalid={!!fieldError(errors, 'requestDetails.referenceNumberBooking')}
            onChange={(e) => onChange('referenceNumberBooking', e.target.value)}
            disabled={isView}
          />
          {fieldError(errors, 'requestDetails.referenceNumberBooking') && (
            <div className="invalid-feedback d-block">{fieldError(errors, 'requestDetails.referenceNumberBooking')}</div>
          )}
        </div>

        <div className="mt-3">
          <CFormLabel>Client</CFormLabel>
          <CFormSelect
            value={value.clientId ?? ''}
            invalid={!!fieldError(errors, 'requestDetails.clientId')}
            onChange={(e) => onChange('clientId', e.target.value)}
            disabled={isTripRequest || isView}
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.client_id} value={c.client_id}>
                {c.name}
              </option>
            ))}
          </CFormSelect>
          {fieldError(errors, 'requestDetails.clientId') && (
            <div className="invalid-feedback d-block">{fieldError(errors, 'requestDetails.clientId')}</div>
          )}
        </div>

        <div className="mt-3">
          <CFormLabel>Vessel Code</CFormLabel>
          <CFormInput value={value.vesselCode ?? ''} onChange={(e) => onChange('vesselCode', e.target.value)} disabled={isView}/>
        </div>
      </CCol>

      <CCol xs={12} xl={6}>
        <div>
          <CFormLabel>Work Order ID</CFormLabel>
          <CFormInput
            value={value.workOrderId ?? ''}
            onChange={(e) => onChange('workOrderId', e.target.value)}
            disabled={isView || (isTripRequest && isEdit)}
          />
        </div>

        <div className="mt-3">
          <CFormLabel>Consignee</CFormLabel>
          <CFormInput value={value.consignee ?? ''} onChange={(e) => onChange('consignee', e.target.value)} disabled={isView}/>
        </div>

        <div className="mt-3">
          <CFormLabel>Voyage</CFormLabel>
          <CFormInput value={value.voyage ?? ''} onChange={(e) => onChange('voyage', e.target.value)} disabled={isView}/>
        </div>

        <div className="mt-3">
          <CFormLabel>Comments</CFormLabel>
          <CFormInput value={value.comments ?? ''} onChange={(e) => onChange('comments', e.target.value)} disabled={isView}/>
        </div>
      </CCol>
    </CRow>
  )
}
