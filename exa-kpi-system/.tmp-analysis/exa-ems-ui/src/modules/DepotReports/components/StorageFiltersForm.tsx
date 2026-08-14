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

const FiltersForm: React.FC<any> = ({ 
  filters,
  clientOptions, 
  reportTypeOptions, 
  depotOptions, 
  equipmentTypeOptions,
  onChange,
  onChangeMulti,
  errors
  }) => {

  const normalizeMulti = (selected: any): number[] => {
    if (!Array.isArray(selected)) return []

    if (selected.length > 0 && typeof selected[0] === 'object') {
      return (selected as any[]).map((x) => x.value)
    }

    return selected as number[]
  }

  const isContainer = filters?.equipmentTypeId === '2';

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
                <br />
                <CMultiSelect
                  name="equipmentTypeId"
                  label="Equipment Types"
                  size="md"
                  multiple={false}
                  //key={`clients-${multiResetKey}`}  
                  options={equipmentTypeOptions}
                  value={filters?.equipmentTypeId}
                  onChange={(e) => onChange(e, "equipmentTypeId")}
                  //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
                  invalid={!!errors?.equipmentTypeId}
                  feedbackInvalid={errors?.equipmentTypeId}
                />
                <br />
                {isContainer && 
                  <CMultiSelect
                    name="loaded"
                    label="Cargo"
                    size="md"
                    //key={`clients-${multiResetKey}`}  
                    options={[{value: 1, label: 'Loaded'}, {value: 2, label: 'Empty'}]}
                    //value={filters.depots ?? []}
                    onChange={(vals) => onChangeMulti("loaded", normalizeMulti(vals))}
                    //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
                    //invalid={!!errors?.depots}
                    //feedbackInvalid={errors?.depots}
                  /> }
            </CCol>
            <CCol md={6}>
                <CMultiSelect
                    name="depotIds"
                    label="Depots"
                    size="md"
                    onChange={(vals) => onChangeMulti("depotIds", normalizeMulti(vals))}
                    //value={filters.statementType}
                    options={depotOptions}
                    //disabled={isEditDisabled || viewMode}
                    //invalid={!!errors?.statementType}
                    //feedbackInvalid={errors?.statementType}
                />
                <br />
                <CMultiSelect
                  name="clientIds"
                  label="Clients"
                  size="md"
                  //key={`clients-${multiResetKey}`}  
                  options={clientOptions}
                  //value={filters.depots ?? []}
                  onChange={(vals) => onChangeMulti("clientIds", normalizeMulti(vals))}
                  //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
                  //invalid={!!errors?.depots}
                  //feedbackInvalid={errors?.depots}
                />
            </CCol>
            </CRow>
          </CCardBody>

  )
}

export default FiltersForm
