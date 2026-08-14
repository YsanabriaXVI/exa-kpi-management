/**
 * Report Builder Step 1: Date Range & Configuration
 */

import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardFooter,
  CButton,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CRow,
  CCol,
  CMultiSelect,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle } from '@coreui/icons'
import type { ReportBuilderWizardData } from '../types'
import SingleFieldDateRangePicker from './SingleFieldDateRangePicker'

interface Step1Props {
  data: ReportBuilderWizardData
  errors: Record<string, string>
  onChange: (e: any) => void
  onNext: () => void
  loading: boolean
}

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const DATA_TYPE_OPTIONS = [
  { value: 'invoice_km', label: 'Invoiced Kms', selected: false },
  { value: 'invoice_usd', label: 'Invoiced USD', selected: false },
  { value: 'invoice_lps', label: 'Invoiced Lps.', selected: false },
  { value: 'invoice_trips', label: 'Invoiced trips', selected: false },
  { value: 'paid_invoice_km', label: 'Paid Invoiced Kms', selected: false },
  { value: 'paid_invoice_usd', label: 'Paid Invoiced USD', selected: false },
  { value: 'paid_invoice_lps', label: 'Paid Invoiced Lps.', selected: false },
  { value: 'paid_invoice_trips', label: 'Paid Invoiced trips', selected: false },
  { value: 'statement_km', label: 'Received statement Kms', selected: false },
  { value: 'statement_usd', label: 'Received statement USD', selected: false },
  { value: 'statement_lps', label: 'Received statement Lps.', selected: false },
  { value: 'statement_trips', label: 'Received statement trips', selected: false },
  { value: 'paid_statement_km', label: 'Paid statement Kms', selected: false },
  { value: 'paid_statement_usd', label: 'Paid statement USD', selected: false },
  { value: 'paid_statement_lps', label: 'Paid statement Lps.', selected: false },
  { value: 'paid_statement_trips', label: 'Paid statement trips', selected: false },
]

const dropdownStyle: React.CSSProperties = { maxHeight: 260, overflowY: 'auto' }
const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20

const ReportBuilderStep1: React.FC<Step1Props> = ({ data, errors, onChange, onNext, loading }) => {
  const handleDateRangeChange = (startDate: Date | null, endDate: Date | null) => {
    // Convert to unix timestamps
    const startTimestamp = startDate ? Math.floor(startDate.getTime() / 1000) : undefined
    const endTimestamp = endDate ? Math.floor(endDate.getTime() / 1000) : undefined
    
    // Update both dates
    onChange({ target: { name: 'start_date', value: startTimestamp } })
    onChange({ target: { name: 'end_date', value: endTimestamp } })
  }

  const handleDataTypesChange = (selected: any[]) => {
    const dataTypes = selected.map((item) => item.value)
    onChange({ target: { name: 'data_types', value: dataTypes } })
  }

  const dataTypeOptionsWithSelection = DATA_TYPE_OPTIONS.map((option) => ({
    ...option,
    selected: data.data_types?.includes(option.value) || false,
  }))

  return (
    <CCard>
      <CCardHeader>
        <strong>Report Configuration - Step 1 of 3</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>Date Range *</CFormLabel>
          </CCol>
          <CCol md={9}>
            <SingleFieldDateRangePicker
              startDate={data.start_date ? new Date(data.start_date * 1000) : null}
              endDate={data.end_date ? new Date(data.end_date * 1000) : null}
              onChange={handleDateRangeChange}
              disabled={loading}
              placeholder="Click to select date range with time..."
              error={errors.start_date || errors.end_date}
            />
            <div className="form-text mt-2">
              💡 Click the field to open the date picker. Choose a quick range or set custom dates with times.
            </div>
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel htmlFor="period">Period</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CMultiSelect
              id="period"
              options={PERIOD_OPTIONS.map((opt) => ({ ...opt, selected: data.period === opt.value }))}
              value={data.period}
              onChange={(selected: any) => {
                const opt = Array.isArray(selected) ? selected[0] : selected
                onChange({ target: { name: 'period', value: opt?.value ?? '' } })
              }}
              multiple={false}
              selectionType="text"
              placeholder="Select period"
              clearSearchOnSelect
              dropdownStyle={dropdownStyle}
              virtualScroller={shouldVirtualScroll(PERIOD_OPTIONS)}
            />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>Data Types *</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CMultiSelect
              options={dataTypeOptionsWithSelection}
              onChange={handleDataTypesChange}
              placeholder="Select data types..."
              search
              selectAll
              selectAllLabel="Select all data types"
              dropdownStyle={dropdownStyle}
              virtualScroller={shouldVirtualScroll(dataTypeOptionsWithSelection)}
            />
            {errors.data_types && (
              <div className="text-danger small mt-1">{errors.data_types}</div>
            )}
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel htmlFor="axis">Data Type Axis</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CMultiSelect
              id="axis"
              options={[
                { value: 'y', label: 'Y - Axis', selected: data.axis === 'y' },
                { value: 'x', label: 'X - Axis', selected: data.axis === 'x' },
              ]}
              value={data.axis}
              onChange={(selected: any) => {
                const opt = Array.isArray(selected) ? selected[0] : selected
                onChange({ target: { name: 'axis', value: opt?.value ?? 'y' } })
              }}
              multiple={false}
              selectionType="text"
              placeholder="Select axis"
              clearSearchOnSelect
              dropdownStyle={dropdownStyle}
              virtualScroller
            />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>Multi Report</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CFormSwitch
              id="multi"
              checked={data.multi}
              onChange={(e) => onChange({ target: { name: 'multi', value: e.target.checked } })}
              label="Enable multiple sections in report"
            />
          </CCol>
        </CRow>
      </CCardBody>
      <CCardFooter className="d-flex justify-content-end">
        <CButton color="primary" onClick={onNext} disabled={loading} className="text-white">
          <CIcon icon={cilCheckCircle} className="me-1" />
          Next
        </CButton>
      </CCardFooter>
    </CCard>
  )
}

export default ReportBuilderStep1
