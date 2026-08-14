/**
 * Single Field Date Range Picker
 * A custom wrapper that displays date range as a single unified field
 * with quick presets and custom range selection
 */

import React, { useState, useEffect } from 'react'
import { CFormInput, CDropdown, CDropdownToggle, CDropdownMenu } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCalendar } from '@coreui/icons'
import './SingleFieldDateRangePicker.scss'

interface SingleFieldDateRangePickerProps {
  startDate?: Date | null
  endDate?: Date | null
  onChange: (startDate: Date | null, endDate: Date | null) => void
  disabled?: boolean
  placeholder?: string
  error?: string
}

const SingleFieldDateRangePicker: React.FC<SingleFieldDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  disabled = false,
  placeholder = 'Click to select date range',
  error,
}) => {
  const [visible, setVisible] = useState(false)
  const [tempStartDate, setTempStartDate] = useState<string>('')
  const [tempEndDate, setTempEndDate] = useState<string>('')
  const [tempStartTime, setTempStartTime] = useState<string>('00:00')
  const [tempEndTime, setTempEndTime] = useState<string>('23:59')

  useEffect(() => {
    if (startDate) {
      setTempStartDate(formatDateForInput(startDate))
      setTempStartTime(formatTimeForInput(startDate))
    }
    if (endDate) {
      setTempEndDate(formatDateForInput(endDate))
      setTempEndTime(formatTimeForInput(endDate))
    }
  }, [startDate, endDate])

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatTimeForInput = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const formatDisplayValue = (): string => {
    if (!startDate || !endDate) return ''
    
    const formatDate = (date: Date) => {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    return `${formatDate(startDate)}  →  ${formatDate(endDate)}`
  }

  const applyQuickRange = (days: number, isYesterday = false) => {
    const end = new Date()
    const start = new Date()
    
    if (isYesterday) {
      start.setDate(start.getDate() - 1)
      end.setDate(end.getDate() - 1)
    } else if (days > 0) {
      start.setDate(start.getDate() - days)
    }
    
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    onChange(start, end)
    setVisible(false)
  }

  const applyThisMonth = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    onChange(start, end)
    setVisible(false)
  }

  const applyLastMonth = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    onChange(start, end)
    setVisible(false)
  }

  const applyCustomRange = () => {
    if (!tempStartDate || !tempEndDate) return

    const [startHours, startMinutes] = tempStartTime.split(':').map(Number)
    const [endHours, endMinutes] = tempEndTime.split(':').map(Number)

    const start = new Date(tempStartDate)
    start.setHours(startHours, startMinutes, 0, 0)

    const end = new Date(tempEndDate)
    end.setHours(endHours, endMinutes, 0, 0)

    onChange(start, end)
    setVisible(false)
  }

  const clearRange = () => {
    onChange(null, null)
    setTempStartDate('')
    setTempEndDate('')
    setTempStartTime('00:00')
    setTempEndTime('23:59')
  }

  return (
    <div className="single-field-date-range-picker">
      <CDropdown visible={visible} onShow={() => setVisible(true)} onHide={() => setVisible(false)}>
        <CDropdownToggle
          custom
          as="div"
          className="dropdown-toggle"
          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          <div className="position-relative">
            <CFormInput
              value={formatDisplayValue()}
              placeholder={placeholder}
              disabled={disabled}
              readOnly
              className={error ? 'is-invalid' : ''}
              style={{ 
                cursor: disabled ? 'not-allowed' : 'pointer', 
                paddingRight: '2.5rem',
                paddingLeft: '1rem',
                minWidth: '600px' // Force width here to ensure it applies
              }}
            />
            <div
              className="calendar-icon"
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CIcon icon={cilCalendar} size="lg" />
            </div>
          </div>
        </CDropdownToggle>

        <CDropdownMenu className="date-range-dropdown-menu p-3" style={{ minWidth: '560px', maxWidth: '600px' }}>
          <div className="row g-0">
            {/* Quick Ranges */}
            <div className="col-4 pe-3 border-end">
              <div className="section-label">Quick Ranges</div>
              <div className="d-grid gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-quick-range text-start"
                  onClick={() => applyQuickRange(0)}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-quick-range text-start"
                  onClick={() => applyQuickRange(0, true)}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-quick-range text-start"
                  onClick={() => applyQuickRange(6)}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-quick-range text-start"
                  onClick={() => applyQuickRange(29)}
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-quick-range text-start"
                  onClick={applyThisMonth}
                >
                  This Month
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-quick-range text-start"
                  onClick={applyLastMonth}
                >
                  Last Month
                </button>
              </div>
            </div>

            {/* Custom Range */}
            <div className="col-8 ps-3">
              <div className="section-label">Custom Range</div>
              
              <div className="mb-3">
                <label className="form-label small mb-1">Start Date</label>
                <div className="row g-2">
                  <div className="col-7">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                    />
                  </div>
                  <div className="col-5">
                    <input
                      type="time"
                      className="form-control form-control-sm"
                      value={tempStartTime}
                      onChange={(e) => setTempStartTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1">End Date</label>
                <div className="row g-2">
                  <div className="col-7">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                    />
                  </div>
                  <div className="col-5">
                    <input
                      type="time"
                      className="form-control form-control-sm"
                      value={tempEndTime}
                      onChange={(e) => setTempEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 justify-content-end pt-2">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={clearRange}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary text-white"
                  onClick={applyCustomRange}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </CDropdownMenu>
      </CDropdown>
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  )
}

export default SingleFieldDateRangePicker
