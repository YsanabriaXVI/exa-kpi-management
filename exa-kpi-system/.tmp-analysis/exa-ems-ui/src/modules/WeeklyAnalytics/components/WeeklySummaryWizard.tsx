/**
 * Weekly Summary Wizard Component
 * Form for configuring and generating weekly analytics reports
 */

import React, { useState, useEffect } from 'react'
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
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle } from '@coreui/icons'
import type { Week, Client, Subdivision, WeeklyAnalyticsFilter } from '../types'

interface WeeklySummaryWizardProps {
  weeks: Week[] | null
  clients: Client[]
  subdivisions: Subdivision[]
  onSubmit: (filter: WeeklyAnalyticsFilter) => void
  loading: boolean
}

const WeeklySummaryWizard: React.FC<WeeklySummaryWizardProps> = ({
  weeks,
  clients,
  subdivisions,
  onSubmit,
  loading,
}) => {
  const [filter, setFilter] = useState<WeeklyAnalyticsFilter>({
    weeks: null,
    subdivisions: null,
    clients: null,
    all_clients: false,
    all_subdivisions: false,
    active_checkbox: 0,
    active_km: 0,
    active_trucks: 0,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Convert data to multiselect options
  const weekOptions = weeks
    ? weeks.map((week) => ({
        value: week.week_id.toString(),
        label: `${week.week_year} - W ${week.week_no}`,
        selected: filter.weeks?.includes(week.week_id) || false,
      }))
    : []

  const activeClients = clients.filter((c) => {
    const val = c.active ?? c.status
    return Number(val) === 1 || val === true || val === 'true'
  })
  const clientOptions = activeClients.map((client) => ({
    value: String(client.client_id),
    label: client.name,
    selected: filter.clients?.includes(client.client_id as number) || false,
  }))

  const activeSubdivisions = subdivisions.filter((s) => {
    const val = s.active ?? s.status
    return Number(val) === 1 || val === true || val === 'true'
  })
  const subdivisionOptions = activeSubdivisions.map((subdivision) => ({
    value: String(subdivision.subdivision_id),
    label: subdivision.name,
    selected: filter.subdivisions?.includes(subdivision.subdivision_id as number) || false,
  }))

  const handleWeeksChange = (selected: any[]) => {
    const weekIds = selected.map((item) => parseInt(item.value))
    setFilter({ ...filter, weeks: weekIds.length > 0 ? weekIds : null })
    if (weekIds.length > 0) {
      const newErrors = { ...errors }
      delete newErrors.weeks
      setErrors(newErrors)
    }
  }

  const handleClientsChange = (selected: any[]) => {
    if (!filter.all_clients) {
      const clientIds = selected.map((item) => parseInt(item.value))
      setFilter({ ...filter, clients: clientIds.length > 0 ? clientIds : null })
      if (clientIds.length > 0) {
        const newErrors = { ...errors }
        delete newErrors.clients
        setErrors(newErrors)
      }
    }
  }

  const handleSubdivisionsChange = (selected: any[]) => {
    if (!filter.all_subdivisions) {
      const subdivisionIds = selected.map((item) => parseInt(item.value))
      setFilter({
        ...filter,
        subdivisions: subdivisionIds.length > 0 ? subdivisionIds : null,
      })
      if (subdivisionIds.length > 0) {
        const newErrors = { ...errors }
        delete newErrors.subdivisions
        setErrors(newErrors)
      }
    }
  }

  const handleSelectAllClients = (checked: boolean) => {
    if (checked) {
      const allClientIds = activeClients.map((c) => c.client_id)
      setFilter({ ...filter, all_clients: true, clients: allClientIds })
      const newErrors = { ...errors }
      delete newErrors.clients
      setErrors(newErrors)
    } else {
      setFilter({ ...filter, all_clients: false, clients: null })
    }
  }

  const handleSelectAllSubdivisions = (checked: boolean) => {
    if (checked) {
      const allSubdivisionIds = activeSubdivisions.map((s) => s.subdivision_id)
      setFilter({ ...filter, all_subdivisions: true, subdivisions: allSubdivisionIds })
      const newErrors = { ...errors }
      delete newErrors.subdivisions
      setErrors(newErrors)
    } else {
      setFilter({ ...filter, all_subdivisions: false, subdivisions: null })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!filter.weeks || filter.weeks.length === 0) {
      newErrors.weeks = 'Please select at least one week'
    }
    if (!filter.clients || filter.clients.length === 0) {
      newErrors.clients = 'Please select at least one client'
    }
    if (!filter.subdivisions || filter.subdivisions.length === 0) {
      newErrors.subdivisions = 'Please select at least one subdivision'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(filter)
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <CIcon icon={cilCheckCircle} className="me-2" />
        <strong>Weekly Summary Configuration</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>Weeks *</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CMultiSelect
              options={weekOptions}
              onChange={handleWeeksChange}
              placeholder={weeks ? 'Select weeks...' : 'Loading weeks...'}
              disabled={!weeks || loading}
              search
              selectAll
              selectAllLabel="Select all weeks"
              virtualScroller
            />
            {errors.weeks && <div className="text-danger small mt-1">{errors.weeks}</div>}
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>Subdivisions *</CFormLabel>
          </CCol>
          <CCol md={9}>
            <div className="mb-2">
              <CFormSwitch
                label="Select All Subdivisions"
                checked={filter.all_subdivisions}
                onChange={(e) => handleSelectAllSubdivisions(e.target.checked)}
                disabled={loading}
              />
            </div>
            <CMultiSelect
              options={subdivisionOptions}
              onChange={handleSubdivisionsChange}
              placeholder="Select subdivisions..."
              disabled={filter.all_subdivisions || loading}
              search
              virtualScroller
            />
            {errors.subdivisions && (
              <div className="text-danger small mt-1">{errors.subdivisions}</div>
            )}
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>Clients *</CFormLabel>
          </CCol>
          <CCol md={9}>
            <div className="mb-2">
              <CFormSwitch
                label="Select All Clients"
                checked={filter.all_clients}
                onChange={(e) => handleSelectAllClients(e.target.checked)}
                disabled={loading}
              />
            </div>
            <CMultiSelect
              options={clientOptions}
              onChange={handleClientsChange}
              placeholder="Select clients..."
              disabled={filter.all_clients || loading}
              search
              virtualScroller
            />
            {errors.clients && <div className="text-danger small mt-1">{errors.clients}</div>}
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel>Display Options</CFormLabel>
          </CCol>
          <CCol md={9}>
            <div className="mb-2">
              <CFormSwitch
                label="Display Only Active Clients/Subdivisions"
                checked={filter.active_checkbox === 1}
                onChange={(e) =>
                  setFilter({ ...filter, active_checkbox: e.target.checked ? 1 : 0 })
                }
                disabled={loading}
              />
            </div>
            <div className="mb-2">
              <CFormSwitch
                label="Display Km"
                checked={filter.active_km === 1}
                onChange={(e) => setFilter({ ...filter, active_km: e.target.checked ? 1 : 0 })}
                disabled={loading}
              />
            </div>
            <div className="mb-2">
              <CFormSwitch
                label="Display Active Trucks"
                checked={filter.active_trucks === 1}
                onChange={(e) =>
                  setFilter({ ...filter, active_trucks: e.target.checked ? 1 : 0 })
                }
                disabled={loading}
              />
            </div>
          </CCol>
        </CRow>
      </CCardBody>
      <CCardFooter className="d-flex justify-content-end">
        <CButton
          color="primary"
          onClick={handleSubmit}
          disabled={!weeks || loading}
          className="text-white"
        >
          <CIcon icon={cilCheckCircle} className="me-1" />
          {loading ? 'Generating...' : 'Generate Report'}
        </CButton>
      </CCardFooter>
    </CCard>
  )
}

export default WeeklySummaryWizard

