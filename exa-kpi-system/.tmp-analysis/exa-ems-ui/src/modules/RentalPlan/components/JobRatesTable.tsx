// src/modules/RentalPlan/components/JobRatesTable.tsx

import React, { useMemo, useState, useCallback } from 'react'
import { CButton, CFormInput, CMultiSelect, CCard, CCardHeader, CCardBody } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilPlus, cilFilterX, cilSortDescending, cilSortAscending } from '@coreui/icons'

import type { JobRateRow } from '../types/rentalPlan.types'

type Option = { value: number; label: string }

type Props = {
  value: JobRateRow[]
  disabled?: boolean
  jobOptions: Option[]
  rowErrors?: Array<Record<string, string>>
  onChange: (next: JobRateRow[]) => void
  onCoerceRate: (raw: any) => number | null
}

const DROPDOWN_OPTIONS_STYLE: React.CSSProperties = {
  maxHeight: 220,
  overflowY: 'auto',
  zIndex: 2000,
}

const JobRatesTable: React.FC<Props> = ({
  value,
  disabled = false,
  jobOptions,
  rowErrors = [],
  onChange,
  onCoerceRate,
}) => {
  const [searchValue, setSearchValue] = useState('')
  const [filterJob, setFilterJob] = useState('')
  const [filterRate, setFilterRate] = useState('')
  const [sortField, setSortField] = useState<'job' | 'rate' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const hasFilters =
    searchValue.trim() !== '' || filterJob.trim() !== '' || filterRate.trim() !== ''

  const clearFilters = () => {
    setSearchValue('')
    setFilterJob('')
    setFilterRate('')
  }

  const jobOptionsForSelect = useMemo(
    () => jobOptions.map((o) => ({ value: String(o.value), label: o.label })),
    [jobOptions],
  )

  const setRow = (index: number, patch: Partial<JobRateRow>) => {
    const next = [...value]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const addRow = () => {
    onChange([...value, { jobId: null, jobRate: null }])
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const tableItems = useMemo(() => {
    return value.map((r, idx) => ({
      row: r,
      idx,
      rowNumber: idx + 1,
      jobLabel: jobOptions.find((o) => o.value === r.jobId)?.label ?? '',
    }))
  }, [value, jobOptions])

  const filteredItems = useMemo(() => {
    const global = searchValue.toLowerCase()

    let items = tableItems.filter((item) => {
      const jobLabel = item.jobLabel.toLowerCase()
      const rateStr = item.row.jobRate != null ? String(item.row.jobRate) : ''

      const globalMatch = !global || jobLabel.includes(global) || rateStr.includes(global)

      const jobMatch = !filterJob || jobLabel.includes(filterJob.toLowerCase())

      const rateMatch = !filterRate || rateStr.includes(filterRate)

      return globalMatch && jobMatch && rateMatch
    })

    if (sortField) {
      items = [...items].sort((a, b) => {
        let v1: any
        let v2: any

        if (sortField === 'job') {
          v1 = a.jobLabel
          v2 = b.jobLabel
        } else {
          v1 = a.row.jobRate ?? 0
          v2 = b.row.jobRate ?? 0
        }

        if (v1 < v2) return sortDir === 'asc' ? -1 : 1
        if (v1 > v2) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }

    return items
  }, [tableItems, searchValue, filterJob, filterRate, sortField, sortDir])

  const toggleSort = (field: 'job' | 'rate') => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir('asc')
      return
    }

    setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>Job Rates</strong>

        {hasFilters && (
          <CButton size="sm" color="danger" variant="ghost" onClick={clearFilters}>
            <CIcon icon={cilFilterX} />
          </CButton>
        )}
      </CCardHeader>

      <CCardBody className="p-0">
        {/* Global search */}

        <div className="p-3 border-bottom">
          <input
            className="form-control"
            placeholder="Search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ maxWidth: 260 }}
          />
        </div>

        <table
          className="table table-hover table-striped align-middle mb-0"
          style={{ width: '100%', tableLayout: 'fixed' }}
        >
          <colgroup>
            <col /* style={{ width: '60px' }} */ />
            <col /* style={{ width: '60%' }} */ />
            <col /* style={{ width: '180px' }} */ />
            <col /* style={{ width: '70px' }} */ />
          </colgroup>

          <thead>
            <tr>
              <th className="text-center">#</th>

              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleSort('job')}
              >
                <div className="d-flex align-items-center gap-1">
                  Job
                  {sortField === 'job' ? (
                    <CIcon
                      icon={sortDir === 'asc' ? cilSortAscending : cilSortDescending}
                      size="sm"
                    />
                  ) : (
                    <CIcon icon={cilSortAscending} className="text-body-secondary opacity-50" />
                  )}
                </div>
              </th>

              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleSort('rate')}
              >
                <div className="d-flex align-items-center gap-1">
                  Rate
                  {sortField === 'rate' ? (
                    <CIcon
                      icon={sortDir === 'asc' ? cilSortAscending : cilSortDescending}
                      size="sm"
                    />
                  ) : (
                    <CIcon icon={cilSortAscending} className="text-body-secondary opacity-50" />
                  )}
                </div>
              </th>

              <th />
            </tr>

            <tr>
              <th />

              <th>
                <input
                  className="form-control form-control-sm"
                  placeholder="Filter job"
                  value={filterJob}
                  onChange={(e) => setFilterJob(e.target.value)}
                />
              </th>

              <th>
                <input
                  className="form-control form-control-sm"
                  placeholder="Filter rate"
                  value={filterRate}
                  onChange={(e) => setFilterRate(e.target.value)}
                />
              </th>

              <th />
            </tr>
          </thead>

          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-body-secondary">
                  <em>No rows match the filters.</em>
                </td>
              </tr>
            ) : (
              filteredItems.map(({ row, idx, rowNumber, jobLabel }) => {
                const jobErr = rowErrors?.[idx]?.jobId
                const rateErr = rowErrors?.[idx]?.jobRate

                const selectValue = row.jobId != null ? [String(row.jobId)] : []

                return (
                  <tr key={idx}>
                    <td className="text-center fw-semibold text-body-secondary">{rowNumber}</td>

                    <td style={{ position: 'relative', overflow: 'visible' }}>
                      <CMultiSelect
                        options={jobOptionsForSelect.map((o) => ({
                          label: o.label,
                          value: o.value,
                        }))}
                        multiple={false}
                        search
                        virtualScroller
                        visibleItems={7}
                        placeholder="Pick a Job"
                        value={row.jobId != null ? [String(row.jobId)] : []}
                        onChange={(selected) => {
                          const raw = selected?.[0]?.value ?? ''
                          const nextVal = raw ? Number(raw) : null
                          setRow(idx, { jobId: nextVal })
                        }}
                      />

                      {jobErr && <div className="invalid-feedback d-block mt-1">{jobErr}</div>}
                    </td>

                    <td>
                      <CFormInput
                        value={row.jobRate ?? ''}
                        disabled={disabled}
                        invalid={!!rateErr}
                        placeholder="0.00"
                        onChange={(e) =>
                          setRow(idx, {
                            jobRate: onCoerceRate(e.target.value),
                          })
                        }
                      />

                      {rateErr && <div className="invalid-feedback d-block mt-1">{rateErr}</div>}
                    </td>

                    <td className="text-center">
                      <CButton
                        size="sm"
                        color="danger"
                        variant="ghost"
                        disabled={disabled}
                        onClick={() => removeRow(idx)}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="text-center py-3">
          <CButton color="primary" variant="outline" size="sm" disabled={disabled} onClick={addRow}>
            <CIcon icon={cilPlus} className="me-2" />
            Add Job Rate
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default JobRatesTable
