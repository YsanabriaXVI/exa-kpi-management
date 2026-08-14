import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormInput,
  CFormLabel,
  CAlert,
} from '@coreui/react-pro'

export default function ResetCurrentInfo({ data, updateCurrent, isValid }: any) {
  return (
    <CCard className="mb-3">
      <CCardHeader>
        <strong>Current Information</strong>
      </CCardHeader>
      <CCardBody className="md-3">
        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>KMS ECM</CFormLabel>
            <CFormInput
              value={data.currentInfo.kmsEcm}
              onChange={(e) => updateCurrent('kmsEcm', e.target.value)}
              disabled
            />
          </CCol>

          <CCol md={3}>
            <CFormLabel>Gallons ECM</CFormLabel>
            <CFormInput
              value={data.currentInfo.gallonsEcm}
              onChange={(e) => updateCurrent('gallonsEcm', e.target.value)}
              disabled
            />
          </CCol>

          <CCol md={3}>
            <CFormLabel>Gallons Tank</CFormLabel>
            <CFormInput
              value={data.currentInfo.gallonsInTank}
              onChange={(e) => updateCurrent('gallonsInTank', e.target.value)}
              disabled
            />
          </CCol>

          <CCol md={3}>
            <CFormLabel>Liters Tank</CFormLabel>
            <CFormInput
              value={data.currentInfo.litersInTank}
              onChange={(e) => updateCurrent('litersInTank', e.target.value)}
              disabled
            />
          </CCol>
        </CRow>
        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>GPS Gallons Tank</CFormLabel>
            <CFormInput
              value={data.currentInfo.gallonsInTank}
              onChange={(e) => updateCurrent('gallonsInTank', e.target.value)}
              disabled
            />
          </CCol>

          <CCol md={3}>
            <CFormLabel>GPS Liters Tank</CFormLabel>
            <CFormInput
              value={data.currentInfo.litersInTank}
              onChange={(e) => updateCurrent('litersInTank', e.target.value)}
              disabled
            />
          </CCol>
        </CRow>

        {/* {!isValid && (
          <CAlert color="danger" className="mt-3">
            Invalid current info
          </CAlert>
        )} */}
      </CCardBody>
    </CCard>
  )
}
