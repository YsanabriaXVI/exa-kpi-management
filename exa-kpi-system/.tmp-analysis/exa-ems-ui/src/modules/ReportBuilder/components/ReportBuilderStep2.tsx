/**
 * Report Builder Step 2: Sections Selection
 */

import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardFooter,
  CButton,
  CFormLabel,
  CRow,
  CCol,
  CMultiSelect,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilArrowLeft } from '@coreui/icons'
import type { ReportBuilderWizardData, ReportSection } from '../types'

interface Step2Props {
  data: ReportBuilderWizardData
  errors: Record<string, string>
  sections: ReportSection[]
  onChange: (e: any) => void
  onNext: () => void
  onPrev: () => void
  loading: boolean
}

const ReportBuilderStep2: React.FC<Step2Props> = ({
  data,
  errors,
  sections,
  onChange,
  onNext,
  onPrev,
  loading,
}) => {
  const handleSectionsChange = (selected: any[]) => {
    const sectionValues = selected.map((item) => item.value)
    onChange({ target: { name: 'sections', value: sectionValues } })
  }

  const sectionOptions = sections.map((section) => ({
    value: section.value,
    label: section.label,
    selected: data.sections?.includes(section.value) || false,
  }))

  return (
    <CCard>
      <CCardHeader>
        <strong>Select Report Sections - Step 2 of 3</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>Sections *</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CMultiSelect
              options={sectionOptions}
              onChange={handleSectionsChange}
              placeholder="Select report sections..."
              search
              selectAll={data.multi}
              selectAllLabel="Select all sections"
            />
            <div className="form-text">
              {data.multi
                ? 'You can select multiple sections for comparison'
                : 'Single section mode - select one section only'}
            </div>
            {errors.sections && <div className="text-danger small mt-1">{errors.sections}</div>}
          </CCol>
        </CRow>
      </CCardBody>
      <CCardFooter className="d-flex justify-content-between">
        <CButton color="secondary" variant="outline" onClick={onPrev} disabled={loading}>
          <CIcon icon={cilArrowLeft} className="me-1" />
          Back
        </CButton>
        <CButton color="primary" onClick={onNext} disabled={loading} className="text-white">
          <CIcon icon={cilCheckCircle} className="me-1" />
          Next
        </CButton>
      </CCardFooter>
    </CCard>
  )
}

export default ReportBuilderStep2

