import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CDateRangePicker,
  CForm,
  CFormFeedback,
  CFormSwitch,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilX } from '@coreui/icons'
import type { Week } from '../types'
import { ACTIVE_STATUS_ID, DEFAULT_ACTIVE, DEFAULT_STATUS_ID, INACTIVE_STATUS_ID, START_YEAR } from '../constants'

interface WeekFormProps {
  initialValues: Week | null
  loading: boolean
  error?: string | null
  isEdit: boolean
  onSubmit: (week: Week) => void
  onCancel: () => void
}

const parseDate = (value: any): Date | null => {
  if (!value && value !== 0) return null
  if (value instanceof Date) return value
  if (typeof value === 'number') {
    const ms = value > 1_000_000_000_000 ? value : value * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'string') {
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
      const ms = numeric > 1_000_000_000_000 ? numeric : numeric * 1000
      const d = new Date(ms)
      if (!Number.isNaN(d.getTime())) return d
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

const formatDate = (date: Date | null): string | null => {
  if (!date) return null
  const pad = (num: number) => String(num).padStart(2, '0')
  // Use UTC methods to avoid timezone shifts when storing dates
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

const formatDisplayDate = (date: Date | null): string | null => {
  if (!date) return null
  return date.toLocaleDateString('en-US')
}

const buildDefaultWeek = (): Week => ({
  week_no: undefined,
  week_year: new Date().getFullYear(),
  start_date: null,
  end_date: null,
  active: DEFAULT_ACTIVE,
  status: DEFAULT_STATUS_ID,
})

const WeekForm: React.FC<WeekFormProps> = ({ initialValues, loading, error, isEdit, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Week>(initialValues || buildDefaultWeek())
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialValues) {
      setFormData({
        ...initialValues,
        week_year: initialValues.week_year ?? new Date().getFullYear(),
        active: initialValues.active ?? DEFAULT_ACTIVE,
        status: initialValues.status ?? DEFAULT_STATUS_ID,
      })
    } else {
      setFormData(buildDefaultWeek())
    }
  }, [initialValues])

  const yearsOptions = useMemo(() => {
    const current = new Date().getFullYear()
    const end = current + 3
    const years: number[] = []
    for (let y = START_YEAR; y <= end; y++) {
      years.push(y)
    }
    return years
  }, [])

  const weekOptions = useMemo(() => Array.from({ length: 52 }, (_, i) => i + 1), [])

  const handleChange = (field: keyof Week, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleRangeChange = (start: Date | string | null, end: Date | string | null) => {
    const startDate = parseDate(start)
    const endDate = parseDate(end)
    setFormData((prev) => ({
      ...prev,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      start_date_display: formatDisplayDate(startDate),
      end_date_display: formatDisplayDate(endDate),
    }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!formData.week_no) {
      nextErrors.week_no = 'Week number is required'
    }
    if (!formData.week_year) {
      nextErrors.week_year = 'Year is required'
    }
    const start = parseDate(formData.start_date)
    const end = parseDate(formData.end_date)
    if (!start) {
      nextErrors.start_date = 'Start date is required'
    }
    if (!end) {
      nextErrors.end_date = 'End date is required'
    }
    if (start && end && end < start) {
      nextErrors.end_date = 'End date must be after start date'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const start = parseDate(formData.start_date)
    const end = parseDate(formData.end_date)
    onSubmit({
      ...formData,
      week_no: Number(formData.week_no),
      week_year: Number(formData.week_year),
      start_date: formatDate(start),
      end_date: formatDate(end),
      start_date_display: formatDisplayDate(start),
      end_date_display: formatDisplayDate(end),
      active: Number(formData.active ?? ACTIVE_STATUS_ID),
      status: Number(formData.status ?? DEFAULT_STATUS_ID),
    })
  }

  const startDateValue = parseDate(formData.start_date)
  const endDateValue = parseDate(formData.end_date)

  return (
    <CCard>
      <CCardHeader className="attribute-card-header">
        <div className="attribute-card-title">{isEdit ? 'Edit Week' : 'Add Week'}</div>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger">{error}</CAlert>}
        <CForm>
          <CRow className="g-3">
            <CCol md={6}>
              <CMultiSelect
                label="Week Number *"
                placeholder="Select week"
                options={weekOptions.map((n) => ({ label: `Week ${n}`, value: String(n) }))}
                value={formData.week_no != null ? String(formData.week_no) : ''}
                onChange={(selected) => {
                  const value = Array.isArray(selected) ? selected[0]?.value : selected?.value
                  handleChange('week_no', value ? Number(value) : undefined)
                }}
                invalid={Boolean(errors.week_no)}
                disabled={loading}
                multiple={false}
                clearSearchOnSelect
                selectionType="tags"
              />
              {errors.week_no && <CFormFeedback invalid>{errors.week_no}</CFormFeedback>}
            </CCol>
            <CCol md={6}>
              <CMultiSelect
                label="Year *"
                placeholder="Select year"
                options={yearsOptions.map((year) => ({ label: String(year), value: String(year) }))}
                value={formData.week_year != null ? String(formData.week_year) : ''}
                onChange={(selected) => {
                  const value = Array.isArray(selected) ? selected[0]?.value : selected?.value
                  handleChange('week_year', value ? Number(value) : undefined)
                }}
                invalid={Boolean(errors.week_year)}
                disabled={loading}
                multiple={false}
                clearSearchOnSelect
                selectionType="tags"
              />
              {errors.week_year && <CFormFeedback invalid>{errors.week_year}</CFormFeedback>}
            </CCol>
          </CRow>

          <CRow className="g-3 mt-1">
            <CCol md={12}>
              <label className="form-label">Date Range *</label>
              <CDateRangePicker
                locale="en-US"
                startDate={startDateValue ?? undefined}
                endDate={endDateValue ?? undefined}
                onStartDateChange={(date) => handleRangeChange(date, formData.end_date ? parseDate(formData.end_date) : endDateValue)}
                onEndDateChange={(date) => handleRangeChange(formData.start_date ? parseDate(formData.start_date) : startDateValue, date)}
                inputDateFormat={(date) => formatDate(parseDate(date)) || ''}
                inputPlaceholder={['Start date', 'End date']}
                cleaner
              />
              {(errors.start_date || errors.end_date) && (
                <div className="invalid-feedback d-block">{errors.start_date || errors.end_date}</div>
              )}
            </CCol>
          </CRow>

          <CRow className="g-3 mt-1">
            <CCol md={6} className="d-flex align-items-center">
              <CFormSwitch
                id="week-active"
                label={Number(formData.active ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID ? 'Active' : 'Inactive'}
                checked={Number(formData.active ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID}
                onChange={(e) => handleChange('active', e.target.checked ? ACTIVE_STATUS_ID : INACTIVE_STATUS_ID)}
                disabled={loading}
                className="attribute-toggle mb-0"
              />
            </CCol>
          </CRow>
        </CForm>
      </CCardBody>
      <CCardFooter className="attribute-form-footer d-flex justify-content-between align-items-center">
        <CButton color="secondary" variant="ghost" onClick={onCancel} disabled={loading}>
          <CIcon icon={cilX} className="me-2" />
          Cancel
        </CButton>
        <div className="d-flex gap-2">
          <CButton color="success" className="text-white" onClick={handleSubmit} disabled={loading}>
            <CIcon icon={cilSave} className="me-2" />
            {isEdit ? 'Save Changes' : 'Save Week'}
          </CButton>
        </div>
      </CCardFooter>
    </CCard>
  )
}

export default WeekForm
