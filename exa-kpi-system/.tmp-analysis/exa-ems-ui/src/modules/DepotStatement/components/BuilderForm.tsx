import React from 'react';
import { CRow, CCol, CButton, CCard, CCardBody, CFormSwitch, CMultiSelect, CSpinner, CFormInput } from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle } from '@coreui/icons';
import '../styles/DepotDisplay.css';

interface Props {
  filters: any
  onCancel: () => void
  onChange: (eventArray: any[], field: any) => void
  onChangeInput: (e: any) => void
  onChangeMulti: (field: 'weeks' | 'depots' | 'services' | 'equipmentTypes', values: number[]) => void
  normalizeMulti: (selected: any) => number[]
  onPickDate: (e: any) => void
  clients: any
  statementType: string
  statementTypeOptions: any
  depotOptions: any
  weekOptions: any
  servicesOptions: any
  equipmentTypeOptions: any
  isValid: () => boolean
  handleContinue: () => void
  handleGenerate: () => void
  invoiceLines: any
  errors: any,
  isLoadingStorage: boolean,
  isLoadingRental: boolean
  
}

const BuilderFiltersForm: React.FC<Props> = (
  { 
    filters, 
    onCancel,
    onChange,
    onChangeInput,
    onChangeMulti,
    onPickDate,
    normalizeMulti,
    clients,
    statementType,
    depotOptions,
    weekOptions,
    servicesOptions,
    equipmentTypeOptions,
    isValid,
    handleContinue,
    handleGenerate,
    invoiceLines,
    statementTypeOptions,
    errors,
    isLoadingStorage,
    isLoadingRental,
  }
) => {

  console.log('filters in BuilderForm', filters);
  console.log('statementTypeOptions in BuilderForm', statementTypeOptions);
  const isLoading = isLoadingStorage || isLoadingRental;
  

  return (
    <CCard className="shadow-sm mb-4">
      <CCardBody>
        <CRow className="mb-3">
          <CCol md={6}>
            <CMultiSelect
              name="clientId"
              label="Client"
              size="md"
              multiple={false}
              onChange={(e) => onChange(e, 'clientId')}
              value={filters.clientId}
              options={clients as any}
              //disabled={isEditDisabled || viewMode}
              invalid={!!errors?.clientId}
              feedbackInvalid={errors?.clientId}
            />
          </CCol>

          <CCol md={6}>
            <CMultiSelect
              name="statementType"
              label="Statement Type"
              size="md"
              multiple={false}
              onChange={(e) => onChange(e, 'statementType')}
              value={filters.statementType}
              options={statementTypeOptions as any}
              //disabled={isEditDisabled || viewMode}
              invalid={!!errors?.statementType}
              feedbackInvalid={errors?.statementType}
            />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Exchange Rate"
              name="exchangeRate"
              size="md"
              required
              onChange={onChangeInput}
              value={filters.exchangeRate}
              invalid={!!errors?.exchangeRate}
              feedbackInvalid={errors?.exchangeRate}
              //disabled={errors?.exchangeRate}
            />
          </CCol>

          <CCol md={6} className="d-flex align-items-end">
            <CFormSwitch
              size="lg"
              label="Up to date"
              name="upToDate"
              checked={filters.upToDate}
              onChange={onChangeInput}
            />
          </CCol>
        </CRow>

        <hr />

        {/* PERIOD (solo si upToDate=false) */}
        {!filters.upToDate && (
          <CRow className="mb-3">
              <CCol md={6}>
                <CFormInput
                    label="Start Date"
                    type="date"
                    name="startDate"
                    value={filters?.startDateLabel}
                    onChange={onPickDate}
                    disabled={statementType === 'rental'}
                    invalid={!!errors?.startDate}
                    feedbackInvalid={errors?.startDate}
                  />
              </CCol>

            <CCol md={6}>
              <CFormInput
                label="End Date"
                type="date"
                name="endDate"
                value={filters?.endDateLabel}
                onChange={onPickDate}
                invalid={!!errors?.endDate}
                feedbackInvalid={errors?.endDate}
              />
            </CCol>
          </CRow>
        )}

        <hr />

        {/* SCOPE */}
        <CRow className="mb-3">
          <CCol md={6}>
            <CMultiSelect
              name="depots"
              label="Depots"
              size="md"
              //key={`clients-${multiResetKey}`}  
              options={depotOptions as any}
              value={filters.depots ?? []}
              onChange={(vals) => onChangeMulti("depots", normalizeMulti(vals))}
              //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
              invalid={!!errors?.depots}
              feedbackInvalid={errors?.depots}
            />
            <CFormSwitch
              size="lg"
              label="All Depots"
              name="all_depots"
              checked={filters.all_depots}
              onChange={onChangeInput}
            />
          </CCol>

          <CCol md={6}>
            <CMultiSelect
              name="weeks"
              label="Weeks"
              size="md"
              //key={`clients-${multiResetKey}`}  
              options={weekOptions as any}
              value={filters.weeks ?? []}
              onChange={(vals) => onChangeMulti("weeks", normalizeMulti(vals))}
              //disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
              invalid={!!errors?.weeks}
              feedbackInvalid={errors?.weeks}
            />
            <CFormSwitch
              size="lg"
              label="All Weeks"
              name="all_weeks"
              checked={filters.all_weeks}
              onChange={onChangeInput}
            />
          </CCol>
        </CRow>

        <CRow className="mb-4">
          <CCol md={6}>
            <CMultiSelect
              name="services"
              label="Services"
              size="md"
              //key={`clients-${multiResetKey}`}  
              options={servicesOptions as any}
              value={filters.services ?? []}
              onChange={(vals) => onChangeMulti("services", normalizeMulti(vals))}
              disabled={statementType === 'rental'}
              invalid={!!errors?.services}
              feedbackInvalid={errors?.services}
            />

            <CFormSwitch
              size="lg"
              label="All services"
              name="all_services"
              checked={filters.all_services}
              onChange={onChangeInput}
              disabled={statementType === 'rental'}
            />
          </CCol>

          <CCol md={6}>
            <CMultiSelect
              name="equipmentTypes"
              label="Equipment Types"
              size="md"
              //key={`clients-${multiResetKey}`}  
              options={equipmentTypeOptions as any}
              value={filters.equipmentTypes ?? []}
              onChange={(vals) => onChangeMulti("equipmentTypes", normalizeMulti(vals))}
              disabled={statementType === 'rental'}
              invalid={!!errors?.equipmentTypes}
              feedbackInvalid={errors?.equipmentTypes}
            />

            <CFormSwitch
              size="lg"
              label="All Equipment Types"
              name="all_equipment_types"
              checked={filters.all_equipment_types}
              onChange={onChangeInput}
              disabled={statementType === 'rental'}
            />
          </CCol>
        </CRow>

        {/* ACTIONS */}
        {!isLoading && 
        <div className="d-flex justify-content-end gap-2">
          <CButton color="primary" className="text-white" onClick={handleContinue}>
            Continue
            <CIcon icon={cilCheckCircle} className="ms-2" />
          </CButton>
        </div>}
        { isLoading && 
        <div className="loading-bar">
              <CSpinner size="lg" className="me-2" />
              <div>Loading Statement...</div>
        </div>}
      </CCardBody>
    </CCard>
  )
}

export default BuilderFiltersForm
