import React from 'react'
import { CRow, CCol, CFormLabel, CFormInput, CFormTextarea } from '@coreui/react-pro'

interface DetailsBoxProps {
  data: any
  subdivisionOptions: { value: number | string; label: string }[]
  gasStationsOptions: { value: number | string; label: string }[]
}

const DetailsBox: React.FC<DetailsBoxProps> = ({ data, subdivisionOptions, gasStationsOptions }) => {
  if (!data) return null

  const subdivisionName = subdivisionOptions.find((o) => Number(o.value) === data.subdivisionId)?.label ?? ''
  const gasSupplierNames = (data.gasSupplierIds ?? [])
    .map((id: number) => gasStationsOptions.find((o) => Number(o.value) === id)?.label)
    .filter(Boolean)
    .join(', ')
  const linkedStatementNames = (data.linkedStatements ?? [])
    .map((s: any) => s.label ?? s)
    .join(', ')
  const weekNames = (data.weekIds ?? [])
    .map((w: any) => (typeof w === 'object' ? w.label : w))
    .join(', ')

  return (
    <div className="mb-3">
      <h6>Statement Details</h6>
      <CRow className="mb-2">
        <CCol sm={4}><CFormLabel className="text-body-secondary">Subdivision</CFormLabel></CCol>
        <CCol sm={8}><CFormInput value={subdivisionName} disabled /></CCol>
      </CRow>
      <CRow className="mb-2">
        <CCol sm={4}><CFormLabel className="text-body-secondary">Subdivision Statements</CFormLabel></CCol>
        <CCol sm={8}><CFormInput value={linkedStatementNames} disabled /></CCol>
      </CRow>
      <CRow className="mb-2">
        <CCol sm={4}><CFormLabel className="text-body-secondary">Includes Personalized Trips</CFormLabel></CCol>
        <CCol sm={8}><CFormInput value={data.personalizedTrips === 'yes' ? 'Yes' : 'No'} disabled /></CCol>
      </CRow>
      <CRow className="mb-2">
        <CCol sm={4}><CFormLabel className="text-body-secondary">Gas Suppliers</CFormLabel></CCol>
        <CCol sm={8}><CFormInput value={gasSupplierNames} disabled /></CCol>
      </CRow>
      <CRow className="mb-2">
        <CCol sm={4}><CFormLabel className="text-body-secondary">Weeks</CFormLabel></CCol>
        <CCol sm={8}><CFormInput value={weekNames} disabled /></CCol>
      </CRow>
      {data.comments && (
        <CRow className="mb-2">
          <CCol sm={4}><CFormLabel className="text-body-secondary">Notes</CFormLabel></CCol>
          <CCol sm={8}><CFormTextarea value={data.comments} disabled /></CCol>
        </CRow>
      )}
    </div>
  )
}

export default DetailsBox
