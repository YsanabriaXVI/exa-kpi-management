/**
 * Report Builder Step 3: Entity Filters
 */

import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardFooter,
  CButton,
  CFormLabel,
  CFormSwitch,
  CRow,
  CCol,
  CMultiSelect,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilArrowLeft, cilCloudDownload } from '@coreui/icons'
import type { ReportBuilderWizardData, ReportEntityLists } from '../types'

interface Step3Props {
  data: ReportBuilderWizardData
  errors: Record<string, string>
  entityLists: ReportEntityLists
  onChange: (e: any) => void
  onGenerate: () => void
  onPrev: () => void
  onExport: () => void
  loading: boolean
  exporting: boolean
}

const SECTION_CLIENTS = 'clients'
const SECTION_SUBDIVISIONS = 'subdivisions'
const SECTION_DRIVERS = 'drivers'
const SECTION_TRUCKS = 'trucks'
const SECTION_ROUTES = 'routes'
const SECTION_LOCATIONS = 'locations'

const ReportBuilderStep3: React.FC<Step3Props> = ({
  data,
  errors,
  entityLists,
  onChange,
  onGenerate,
  onPrev,
  onExport,
  loading,
  exporting,
}) => {
  const sections = data.sections || []

  const handleEntityChange = (sectionName: string, selected: any[]) => {
    const entityIds = selected.map((item) => parseInt(item.value))
    onChange({ target: { name: sectionName, value: entityIds } })
  }

  const handleSelectAll = (sectionName: string, checked: boolean) => {
    onChange({ target: { name: `${sectionName}_all`, checked } })
  }

  const renderEntitySelector = (
    sectionName: string,
    label: string,
    options: any[] = [],
  ) => {
    if (!sections.includes(sectionName)) return null

    const selectAllFieldName = `${sectionName}_all`
    const isSelectAll = (data as any)[selectAllFieldName]
    const selectedValues = (data as any)[sectionName] || []

    const multiSelectOptions = options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      selected: selectedValues.includes(parseInt(opt.value)),
    }))

    return (
      <CRow className="mb-3" key={sectionName}>
        <CCol md={3}>
          <CFormLabel>{label} *</CFormLabel>
        </CCol>
        <CCol md={9}>
          <div className="mb-2">
            <CFormSwitch
              label={`Select All ${label}`}
              checked={isSelectAll}
              onChange={(e) => handleSelectAll(sectionName, e.target.checked)}
              disabled={loading}
            />
          </div>
          <CMultiSelect
            options={multiSelectOptions}
            onChange={(selected) => handleEntityChange(sectionName, selected)}
            placeholder={`Select ${label.toLowerCase()}...`}
            disabled={isSelectAll || loading}
            search
          />
          {errors[sectionName] && (
            <div className="text-danger small mt-1">{errors[sectionName]}</div>
          )}
        </CCol>
      </CRow>
    )
  }

  if (!entityLists) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" />
          <p className="mt-2 text-muted">Loading available entities...</p>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard>
      <CCardHeader>
        <strong>Filter Report Data - Step 3 of 3</strong>
      </CCardHeader>
      <CCardBody>
        {sections.length === 0 && (
          <div className="alert alert-info">
            Please go back and select at least one section to continue.
          </div>
        )}

        {renderEntitySelector(SECTION_CLIENTS, 'Clients', entityLists.clients)}
        {renderEntitySelector(SECTION_SUBDIVISIONS, 'Subdivisions', entityLists.subdivisions)}
        {renderEntitySelector(SECTION_DRIVERS, 'Drivers', entityLists.drivers)}
        {renderEntitySelector(SECTION_TRUCKS, 'Trucks', entityLists.trucks)}
        {renderEntitySelector(SECTION_ROUTES, 'Routes', entityLists.routes)}
        {renderEntitySelector(SECTION_LOCATIONS, 'Locations', entityLists.locations)}
      </CCardBody>
      <CCardFooter className="d-flex justify-content-between">
        <CButton color="secondary" variant="outline" onClick={onPrev} disabled={loading}>
          <CIcon icon={cilArrowLeft} className="me-1" />
          Back
        </CButton>
        <div>
          <CButton
            color="warning"
            className="me-2"
            onClick={onExport}
            disabled={exporting || loading}
          >
            <CIcon icon={cilCloudDownload} className="me-1" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </CButton>
          <CButton color="success" onClick={onGenerate} disabled={loading} className="text-white">
            <CIcon icon={cilCheckCircle} className="me-1" />
            {loading ? 'Generating...' : 'Generate Report'}
          </CButton>
        </div>
      </CCardFooter>
    </CCard>
  )
}

export default ReportBuilderStep3

