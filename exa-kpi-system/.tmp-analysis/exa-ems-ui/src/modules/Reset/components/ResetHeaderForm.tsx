import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CFormInput,
  CFormLabel,
  CMultiSelect,
  CCalendar,
  CDatePicker,
} from '@coreui/react-pro'

export default function ResetHeaderForm({ data, setData }: any) {

  const display = (value: any) => {
    if (value === null || value === undefined || value === '') return '----'
    return value
  }

  return (
    <CCardBody>
      <CRow className="align-items-center mb-3">
        {/* Plate */}
        <CCol md={1}>
          <CFormLabel className="mb-0">Plate / Serie No.</CFormLabel>
        </CCol>

        <CCol md={4}>
          {/* <CFormInput
            value={data.plate}
            onChange={(e) => setData({ ...data, plate: e.target.value })}
          /> */}
          <CMultiSelect options={[]}></CMultiSelect>
        </CCol>

        {/* Equipment Type */}
        <CCol md={2}>
          <CFormLabel className="mb-0">Equipment Type</CFormLabel>
        </CCol>

        <CCol md={4}>
          <div className="fw-bold">{display(setData.equipmentType)}</div>
        </CCol>
      </CRow>

      <CRow className="align-items-center mb-3">
        <CCol md={1}>
          <CFormLabel className="mb-0">Date From</CFormLabel>
        </CCol>

        <CCol md={4}>
          <CDatePicker></CDatePicker>
        </CCol>

        <CCol md={1}>
          <CFormLabel className="mb-0">Date To</CFormLabel>
        </CCol>

        <CCol md={4}>
          <CDatePicker></CDatePicker>
        </CCol>
      </CRow>
    </CCardBody>
  )
}
