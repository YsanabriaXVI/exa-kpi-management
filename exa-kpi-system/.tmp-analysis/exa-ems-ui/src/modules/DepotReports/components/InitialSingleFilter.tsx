import React from 'react'
import { 
    CRow, 
    CCol, 
    CButton, 
    CCard, 
    CCardBody, 
    CFormSwitch, 
    CMultiSelect, 
    CFormSelect, 
    CFormInput 
} from '@coreui/react-pro';

const InitialSingleFilter: React.FC<any> = ({ 
  filters,
  reportTypeOptions, 
  onChange,
  errors
  }) => {


  return (
    
          <CCardBody>
            <CRow>
            <CCol md={6}>
                <CMultiSelect
                  name="reportType"
                  label="Report Type"
                  size="md"
                  multiple={false}
                  onChange={(e) => onChange(e, 'reportType')}
                  value={filters?.reportType}
                  options={reportTypeOptions}
                  //disabled={isEditDisabled || viewMode}
                  invalid={!!errors?.reportType}
                  feedbackInvalid={errors?.reportType}
                />
              </CCol>
            </CRow>
            <br />
          </CCardBody>

  )
}

export default InitialSingleFilter
