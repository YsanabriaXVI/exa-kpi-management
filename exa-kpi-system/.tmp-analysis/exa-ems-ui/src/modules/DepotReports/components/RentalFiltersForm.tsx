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
  containerSizeOptions,
  chassisSizeOptions,
  gensetTypeOptions,
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

  const isChassis = filters?.equipmentTypeIds?.includes('1');
  const isContainer = filters?.equipmentTypeIds?.includes('2');
  const isGenset = filters?.equipmentTypeIds?.includes('3');

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
                  name="equipmentTypeIds"
                  label="Equipment Types"
                  size="md"
                  //key={`clients-${multiResetKey}`}  
                  options={equipmentTypeOptions}
                  value={filters?.equipmentTypeIds}
                  onChange={(vals) => onChangeMulti("equipmentTypeIds", normalizeMulti(vals))}
                  //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
                  invalid={!!errors?.equipmentTypeIds}
                  feedbackInvalid={errors?.equipmentTypeIds}
                />
                <br />
                { isContainer && 
                <>
                <CMultiSelect
                  name="containerSizeIds"
                  label="Container Sizes"
                  size="md"
                  //multiple={false}
                  //key={`clients-${multiResetKey}`}  
                  options={containerSizeOptions}
                  value={filters?.containerSizeIds}
                  onChange={(vals) => onChangeMulti("containerSizeIds", normalizeMulti(vals))}
                  //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
                  invalid={!!errors?.containerSizeIds}
                  feedbackInvalid={errors?.containerSizeIds}
                />
                <br />
                </>}
                
                { isChassis && 
                <>
                <CMultiSelect
                  name="chassisSizeIds"
                  label="Chassis Sizes"
                  size="md"
                  //multiple={false}
                  //key={`clients-${multiResetKey}`}  
                  options={chassisSizeOptions}
                  value={filters?.chassisSizeIds}
                  onChange={(vals) => onChangeMulti("chassisSizeIds", normalizeMulti(vals))}
                  //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
                  invalid={!!errors?.chassisSizeIds}
                  feedbackInvalid={errors?.chassisSizeIds}
                />
                <br />
                </>}

                { isGenset && 
                <>
                <CMultiSelect
                  name="gensetTypeIds"
                  label="Genset Types"
                  size="md"
                  //multiple={false}
                  //key={`clients-${multiResetKey}`}  
                  options={gensetTypeOptions}
                  value={filters?.gensetTypeIds}
                  onChange={(vals) => onChangeMulti("gensetTypeIds", normalizeMulti(vals))}
                  //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
                  invalid={!!errors?.gensetTypeIds}
                  feedbackInvalid={errors?.gensetTypeIds}
                />
                <br /></>}
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
