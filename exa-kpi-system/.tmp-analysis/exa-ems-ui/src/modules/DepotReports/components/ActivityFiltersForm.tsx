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
  gateTypeOptions,
  requestTypeOptions,
  equipmentTypeOptions,
  onChange,
  onChangeMulti,
  onPickDate,
  errors
  }) => {

  const normalizeMulti = (selected: any): number[] => {
    if (!Array.isArray(selected)) return []

    if (selected.length > 0 && typeof selected[0] === 'object') {
      return (selected as any[]).map((x) => x.value)
    }

    return selected as number[]
  }

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
                  name="sortBy"
                  label="Sort Records By"
                  size="md"
                  multiple={false}
                  onChange={(e) => onChange(e, 'sortBy')}
                  value={filters?.sortBy}
                  options={[{value: 'gate', label: 'Gate'}, {value: 'equipment', label: 'Equipment'}]}
                  //disabled={isEditDisabled || viewMode}
                  invalid={!!errors?.sortBy}
                  feedbackInvalid={errors?.sortBy}
                />
                <br />
                { filters?.sortBy === 'equipment' && 
                <><CMultiSelect
                    name="ownerIds"
                    label="Equipment Owners"
                    size="md"
                    //key={`clients-${multiResetKey}`}  
                    options={clientOptions}
                    //value={filters.depots ?? []}
                    onChange={(vals) => onChangeMulti("ownerIds", normalizeMulti(vals))}
                    //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
                    //invalid={!!errors?.depots}
                    //feedbackInvalid={errors?.depots}
                  />
                  <div className="text-muted">* Choose client EXA for owned equipment</div>
                <br /></>}
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
            </CCol>
            <CCol md={6}>
                <CMultiSelect
                    name="gateTypeIds"
                    label="Gate Types"
                    size="md"
                    //key={`clients-${multiResetKey}`}  
                    options={gateTypeOptions}
                    //value={filters.depots ?? []}
                    onChange={(vals) => onChangeMulti("gateTypeIds", normalizeMulti(vals))}
                    //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
                    //invalid={!!errors?.depots}
                    //feedbackInvalid={errors?.depots}
                  /> 
                <br />
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

                <CFormInput
                    label="Start Date"
                    type="date"
                    name="startDate"
                    value={filters?.startDateString}
                    onChange={onPickDate}
                    invalid={!!errors?.startDate}
                    feedbackInvalid={errors?.startDate}
                />
                <br />

                <CFormInput
                    label="End Date"
                    type="date"
                    name="endDate"
                    value={filters?.endDateString}
                    onChange={onPickDate}
                    invalid={!!errors?.endDate}
                    feedbackInvalid={errors?.endDate}
                />

            </CCol>
            </CRow>
          </CCardBody>

  )
}

export default FiltersForm
