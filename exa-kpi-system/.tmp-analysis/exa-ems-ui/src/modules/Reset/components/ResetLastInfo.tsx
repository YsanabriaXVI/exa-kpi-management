// components/ResetLastInfo.tsx

import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
} from '@coreui/react-pro'
import React from 'react'

interface Props {
  lastReset?: {
    id: number
    date: string
    ecm: number
    gallons: number
    gallonsInTank: number
    litersInTank: number
  }
}

const display = (value: any) => {
  if (value === null || value === undefined || value === '') return '----'
  return value
}

const ResetLastInfo: React.FC<Props> = ({ lastReset }) => {
  return (
    <CCard className="mb-3">
      <CCardHeader>
        <strong>Last Reset Information</strong>
      </CCardHeader>

      <CCardBody className="md-3">
        <CRow className="text-center mb-5">
          <CCol md={3}>
            <CFormLabel className="text-muted small">RESET ID</CFormLabel>
            <div>
              <strong>{display(lastReset.id)}</strong>
            </div>
          </CCol>
          <CCol md={3}>
            <CFormLabel className="text-muted small">DATE</CFormLabel>
            <div>
              <strong>{display(lastReset.date)}</strong>
            </div>
          </CCol>
          <CCol md={3}>
            <CFormLabel className="text-muted small">KMS ECM</CFormLabel>
            <div>
              <strong>{display(lastReset.ecm)}</strong>
            </div>
          </CCol>
          <CCol md={3}>
            <CFormLabel className="text-muted small">GALLONS ECM</CFormLabel>
            <div>
              <strong>{display(lastReset.gallons)}</strong>
            </div>
          </CCol>
        </CRow>

        <CRow className="text-center mb-4">
          <CCol md={3}>
            <CFormLabel className="text-muted small">GALLONS IN TANK</CFormLabel>
            <div>
              <strong>{display(lastReset.gallonsInTank)}</strong>
            </div>
          </CCol>
          <CCol md={3}>
            <CFormLabel className="text-muted small">LITERS IN TANK</CFormLabel>
            <div>
              <strong>{display(lastReset.litersInTank)}</strong>
            </div>
          </CCol>
          <CCol md={3}>
            <CFormLabel className="text-muted small">GPS GALLONS IN TANK</CFormLabel>
            <div>
              <strong>{display(lastReset.gallonsInTank)}</strong>
            </div>
          </CCol>
          <CCol md={3}>
            <CFormLabel className="text-muted small">GPS LITERS IN TANK</CFormLabel>
            <div>
              <strong>{display(lastReset.litersInTank)}</strong>
            </div>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default ResetLastInfo
