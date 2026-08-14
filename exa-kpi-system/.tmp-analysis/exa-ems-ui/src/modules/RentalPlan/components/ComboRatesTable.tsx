// src/modules/RentalPlan/components/ComboRatesTable.tsx

import React, { useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormInput,
  CMultiSelect,
  CCard,
  CCardHeader,
  CCardBody,
} from '@coreui/react-pro'

import ErrorMessageModal from 'src/components/ErrorMessageModal'

import CIcon from '@coreui/icons-react'
import {
  cilTrash,
  cilPlus,
  cilWarning,
  cilFilterX,
  cilSortAscending,
  cilSortDescending,
} from '@coreui/icons'

import type { ComboRateRow } from '../types/rentalPlan.types'

type Option = { value: number; label: string }

type Props = {
  value: ComboRateRow[]
  disabled?: boolean

  chassisSizeOptions: Option[]
  containerSizeOptions: Option[]
  gensetOptions: Option[]
  billingPeriodOptions: Option[]

  comboTableError?: string | null
  rowErrors?: Array<Record<string, string>>

  onChange: (next: ComboRateRow[]) => void
  onCoerceRate: (raw: any) => number | null
  isEdit: boolean
}

const ComboRatesTable: React.FC<Props> = ({
  value,
  disabled = false,
  chassisSizeOptions,
  containerSizeOptions,
  gensetOptions,
  billingPeriodOptions,
  comboTableError = null,
  rowErrors = [],
  onChange,
  onCoerceRate,
  isEdit
}) => {
  const [searchValue, setSearchValue] = useState('')
  const [filterContainer, setFilterContainer] = useState('')
  const [filterChassis, setFilterChassis] = useState('')
  const [filterGenset, setFilterGenset] = useState('')
  const [filterRate, setFilterRate] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('')
  const [sortField, setSortField] = useState<
    'container' | 'chassis' | 'genset' | 'rate' | 'period' | null
  >(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const hasFilters =
    searchValue.trim() !== '' ||
    filterContainer.trim() !== '' ||
    filterChassis.trim() !== '' ||
    filterGenset.trim() !== '' ||
    filterRate.trim() !== '' ||
    filterPeriod.trim() !== ''

  const clearFilters = () => {
    setSearchValue('')
    setFilterContainer('')
    setFilterChassis('')
    setFilterGenset('')
    setFilterRate('')
    setFilterPeriod('')
  }

  const containerOptionsStr = useMemo(
    () => containerSizeOptions.map((o) => ({ value: String(o.value), label: o.label })),
    [containerSizeOptions],
  )

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const chassisOptionsStr = useMemo(
    () => chassisSizeOptions.map((o) => ({ value: String(o.value), label: o.label })),
    [chassisSizeOptions],
  )

  const gensetOptionsStr = useMemo(
    () => gensetOptions.map((o) => ({ value: String(o.value), label: o.label })),
    [gensetOptions],
  )

  const periodOptionsStr = useMemo(
    () => billingPeriodOptions.map((o) => ({ value: String(o.value), label: o.label })),
    [billingPeriodOptions],
  )

  const setRow = (index: number, patch: Partial<ComboRateRow>) => {
    const next = [...value]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const addRow = () => {
    onChange([
      ...value,
      {
        chassisSizeId: null,
        containerSizeId: null,
        gensetTypeId: null,
        rate: null,
        period: null,
      },
    ])
  }

  const removeRow = () => {
    setErrorMessage(
      'Cannot remove combo that is already stored! Consider disabling current plan and creating a new one.',
    )
    setShowErrorModal(true)
  }

  const toggleSort = (field: any) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir('asc')
      return
    }

    setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
  }

  const hasEquipment = (row: ComboRateRow) => {
    return row.containerSizeId != null || row.chassisSizeId != null || row.gensetTypeId != null
  }

  const tableItems = useMemo(() => {
    return value.map((r, idx) => ({
      row: r,
      idx,
      rowNumber: idx + 1,
      containerLabel: containerSizeOptions.find((o) => o.value === r.containerSizeId)?.label ?? '',
      chassisLabel: chassisSizeOptions.find((o) => o.value === r.chassisSizeId)?.label ?? '',
      gensetLabel: gensetOptions.find((o) => o.value === r.gensetTypeId)?.label ?? '',
      periodLabel: billingPeriodOptions.find((o) => o.value === r.period)?.label ?? '',
    }))
  }, [value, containerSizeOptions, chassisSizeOptions, gensetOptions, billingPeriodOptions])

  const filteredItems = useMemo(() => {
    const global = searchValue.toLowerCase()

    let items = tableItems.filter((item) => {
      const container = item.containerLabel.toLowerCase()
      const chassis = item.chassisLabel.toLowerCase()
      const genset = item.gensetLabel.toLowerCase()
      const period = item.periodLabel.toLowerCase()
      const rate = String(item.row.rate ?? '')

      const globalMatch =
        !global ||
        container.includes(global) ||
        chassis.includes(global) ||
        genset.includes(global) ||
        period.includes(global) ||
        rate.includes(global)

      const containerMatch = !filterContainer || container.includes(filterContainer.toLowerCase())

      const chassisMatch = !filterChassis || chassis.includes(filterChassis.toLowerCase())

      const gensetMatch = !filterGenset || genset.includes(filterGenset.toLowerCase())

      const rateMatch = !filterRate || rate.includes(filterRate)

      const periodMatch = !filterPeriod || period.includes(filterPeriod.toLowerCase())

      return (
        globalMatch && containerMatch && chassisMatch && gensetMatch && rateMatch && periodMatch
      )
    })

    /* sorting */

    if (sortField) {
      items = [...items].sort((a, b) => {
        let v1: any
        let v2: any

        if (sortField === 'container') {
          v1 = a.containerLabel
          v2 = b.containerLabel
        }

        if (sortField === 'chassis') {
          v1 = a.chassisLabel
          v2 = b.chassisLabel
        }

        if (sortField === 'genset') {
          v1 = a.gensetLabel
          v2 = b.gensetLabel
        }

        if (sortField === 'rate') {
          v1 = a.row.rate ?? 0
          v2 = b.row.rate ?? 0
        }

        if (sortField === 'period') {
          v1 = a.periodLabel
          v2 = b.periodLabel
        }

        if (v1 < v2) return sortDir === 'asc' ? -1 : 1
        if (v1 > v2) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }

    return items
  }, [
    tableItems,
    searchValue,
    filterContainer,
    filterChassis,
    filterGenset,
    filterRate,
    filterPeriod,
    sortField,
    sortDir,
  ])

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Rental Rates</strong>

          {hasFilters && (
            <CButton size="sm" color="danger" variant="ghost" onClick={clearFilters}>
              <CIcon icon={cilFilterX} />
            </CButton>
          )}
        </CCardHeader>

        <CCardBody className="p-0">
          {comboTableError && (
            <CAlert color="danger" className="m-3 d-flex align-items-center gap-2">
              <CIcon icon={cilWarning} />
              {comboTableError}
            </CAlert>
          )}

          {/* Global Search */}

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
              <col /* style={{ width: '52px' }} */ />
              <col /* style={{ width: '18%' }} */ />
              <col /* style={{ width: '18%' }} */ />
              <col /* style={{ width: '18%' }} */ />
              <col /* style={{ width: '140px' }} */ />
              <col /* style={{ width: '18%' }} */ />
              <col /* style={{ width: '64px' }} */ />
            </colgroup>

            <thead>
              <tr>
                <th className="text-center">#</th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleSort('container')}
                >
                  <div className="d-flex align-items-center gap-1">
                    Container
                    {sortField === 'container' ? (
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
                  onClick={() => toggleSort('chassis')}
                >
                  <div className="d-flex align-items-center gap-1">
                    Chassis
                    {sortField === 'chassis' ? (
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
                  onClick={() => toggleSort('genset')}
                >
                  <div className="d-flex align-items-center gap-1">
                    Genset
                    {sortField === 'genset' ? (
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
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleSort('period')}
                >
                  <div className="d-flex align-items-center gap-1">
                    Period
                    {sortField === 'period' ? (
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
                    placeholder="Filter container"
                    value={filterContainer}
                    onChange={(e) => setFilterContainer(e.target.value)}
                  />
                </th>

                <th>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Filter chassis"
                    value={filterChassis}
                    onChange={(e) => setFilterChassis(e.target.value)}
                  />
                </th>

                <th>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Filter genset"
                    value={filterGenset}
                    onChange={(e) => setFilterGenset(e.target.value)}
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

                <th>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Filter period"
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                  />
                </th>

                <th />
              </tr>
            </thead>

            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-body-secondary">
                    <em>No rows match the filters.</em>
                  </td>
                </tr>
              ) : (
                filteredItems.map(({ row, idx, rowNumber }) => {
                  const rateErr = rowErrors?.[idx]?.rate
                  const periodErr = rowErrors?.[idx]?.period

                  const equipmentError =
                    !hasEquipment(row) && (row.rate != null || row.period != null)
                      ? 'Select Container, Chassis or Genset'
                      : null
                  return (
                    <tr key={idx}>
                      <td className="text-center fw-semibold text-body-secondary">{rowNumber}</td>

                      <td style={{ position: 'relative', overflow: 'visible' }}>
                        <CMultiSelect
                          options={containerOptionsStr.map((o) => ({
                            label: o.label,
                            value: o.value,
                          }))}
                          multiple={false}
                          search
                          visibleItems={7}
                          placeholder={isEdit ? '': 'Pick a Container'}
                          value={row.containerSizeId != null ? [String(row.containerSizeId)] : []}
                          onChange={(selected) => {
                            const raw = selected?.[0]?.value ?? ''
                            const nextVal = raw ? Number(raw) : null
                            setRow(idx, { containerSizeId: nextVal })
                          }}
                        />

                        {equipmentError && (
                          <div className="invalid-feedback d-block mt-1">{equipmentError}</div>
                        )}
                      </td>

                      <td style={{ position: 'relative', overflow: 'visible' }}>
                        <CMultiSelect
                          options={chassisOptionsStr.map((o) => ({
                            label: o.label,
                            value: o.value,
                          }))}
                          multiple={false}
                          search
                          virtualScroller
                          visibleItems={7}
                          placeholder={isEdit ? '': 'Pick a Chassis'}
                          value={row.chassisSizeId != null ? [String(row.chassisSizeId)] : []}
                          onChange={(selected) => {
                            const raw = selected?.[0]?.value ?? ''
                            const nextVal = raw ? Number(raw) : null
                            setRow(idx, { chassisSizeId: nextVal })
                          }}
                        />

                        {equipmentError && (
                          <div className="invalid-feedback d-block mt-1">{equipmentError}</div>
                        )}
                      </td>

                      <td style={{ position: 'relative', overflow: 'visible' }}>
                        <CMultiSelect
                          options={gensetOptionsStr.map((o) => ({
                            label: o.label,
                            value: o.value,
                          }))}
                          multiple={false}
                          search
                          visibleItems={7}
                          placeholder={isEdit ? '': 'Pick a Genset'}
                          value={row.gensetTypeId != null ? [String(row.gensetTypeId)] : []}
                          onChange={(selected) => {
                            const raw = selected?.[0]?.value ?? ''
                            const nextVal = raw ? Number(raw) : null
                            setRow(idx, { gensetTypeId: nextVal })
                          }}
                        />

                        {equipmentError && (
                          <div className="invalid-feedback d-block mt-1">{equipmentError}</div>
                        )}
                      </td>

                      <td>
                        <CFormInput
                          value={row.rate ?? ''}
                          disabled={disabled}
                          invalid={!!rateErr}
                          placeholder="0.00"
                          onChange={(e) =>
                            setRow(idx, {
                              rate: onCoerceRate(e.target.value),
                            })
                          }
                        />

                        {rateErr && <div className="invalid-feedback d-block mt-1">{rateErr}</div>}
                      </td>

                      <td style={{ position: 'relative', overflow: 'visible' }}>
                        <CMultiSelect
                          options={periodOptionsStr.map((o) => ({
                            label: o.label,
                            value: o.value,
                          }))}
                          multiple={false}
                          search
                          visibleItems={7}
                          placeholder="Pick a Period"
                          value={row.period != null ? [String(row.period)] : []}
                          onChange={(selected) => {
                            const raw = selected?.[0]?.value ?? ''
                            const nextVal = raw ? Number(raw) : null
                            setRow(idx, { period: nextVal })
                          }}
                        />

                        {periodErr && (
                          <div className="invalid-feedback d-block mt-1">{periodErr}</div>
                        )}
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
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={addRow}
            >
              <CIcon icon={cilPlus} className="me-2" />
              Add Combo Rate
            </CButton>
          </div>
        </CCardBody>
      </CCard>
      <ErrorMessageModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        errorMessage={errorMessage}
      />
    </>
  )
}

export default ComboRatesTable
