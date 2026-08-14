import { CCard, CCardBody, CRow, CCol } from '@coreui/react-pro'

function StorageReportSummary({ equipmentLabel, recordsNum } : { equipmentLabel: string, recordsNum: number }) {
  return (
   
    <CCol>
        <CCard>
        <CCardBody>
            {equipmentLabel} found: {recordsNum}
        </CCardBody>
        </CCard>
    </CCol>
  )
}

export default StorageReportSummary;