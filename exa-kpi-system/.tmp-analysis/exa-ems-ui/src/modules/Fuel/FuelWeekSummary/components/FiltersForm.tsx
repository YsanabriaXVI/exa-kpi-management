import React, { useMemo } from 'react'
import { CRow, CCol, CFormLabel, CButton, CCard, CCardBody, CCardFooter, CMultiSelect } from '@coreui/react-pro'
import type { AttributeOption } from '../types/fuelWeekSummary.types'

interface FilterSelectProps {
  label: string
  name: string
  options: AttributeOption[]
  selected: number[]
  onChange: (name: string, values: number[]) => void
  onSelectAll: (name: string, options: AttributeOption[], checked: boolean) => void
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  label, name, options, selected, onChange,
}) => {
  const multiOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        selected: selected.includes(opt.value),
      })),
    [options, selected],
  )

  return (
    <div className="mb-3">
      <CMultiSelect
        label={label}
        options={multiOptions}
        onChange={(selectedItems: any[]) => {
          onChange(name, selectedItems.map((item) => Number(item.value)))
        }}
        placeholder={`Select ${label.toLowerCase()}...`}
        search
        selectAll
        selectionType="tags"
        optionsMaxHeight={280}
      />
    </div>
  )
}

interface FiltersFormProps {
  filters: Record<string, number[]>
  weekOptions: AttributeOption[]
  gasStationOptions: AttributeOption[]
  subdivisionOptions: AttributeOption[]
  clientOptions: AttributeOption[]
  fuelStatementStatusOptions: AttributeOption[]
  supplierStatementStatusOptions: AttributeOption[]
  assetTypeOptions: AttributeOption[]
  orderTypeOptions: AttributeOption[]
  reconciliationStatusOptions: AttributeOption[]
  onChange: (name: string, values: number[]) => void
  onSelectAll: (name: string, options: AttributeOption[], checked: boolean) => void
  onGenerate: () => void
  hasFilters: boolean
}

const FiltersForm: React.FC<FiltersFormProps> = ({
  filters, weekOptions, gasStationOptions, subdivisionOptions, clientOptions,
  fuelStatementStatusOptions, supplierStatementStatusOptions,
  assetTypeOptions, orderTypeOptions, reconciliationStatusOptions,
  onChange, onSelectAll, onGenerate, hasFilters,
}) => (
  <CCard className="mb-3">
    <CCardBody>
      <CRow>
        <CCol sm={12} xl={6}>
          <FilterSelect label="Weeks" name="weekIds" options={weekOptions}
            selected={filters.weekIds ?? []} onChange={onChange} onSelectAll={onSelectAll} />
          <FilterSelect label="Gas Stations" name="gasSupplierIds" options={gasStationOptions}
            selected={filters.gasSupplierIds ?? []} onChange={onChange} onSelectAll={onSelectAll} />
          <FilterSelect label="Subdivisions" name="subdivisionIds" options={subdivisionOptions}
            selected={filters.subdivisionIds ?? []} onChange={onChange} onSelectAll={onSelectAll} />
          <FilterSelect label="Clients" name="clientIds" options={clientOptions}
            selected={filters.clientIds ?? []} onChange={onChange} onSelectAll={onSelectAll} />
        </CCol>
        <CCol sm={12} xl={6}>
          <FilterSelect label="Fuel Statement Status" name="fuelStatementStatusIds" options={fuelStatementStatusOptions}
            selected={filters.fuelStatementStatusIds ?? []} onChange={onChange} onSelectAll={onSelectAll} />
          <FilterSelect label="Gas Station Statement Status" name="supplierStatementStatusIds" options={supplierStatementStatusOptions}
            selected={filters.supplierStatementStatusIds ?? []} onChange={onChange} onSelectAll={onSelectAll} />
          <FilterSelect label="Asset Types" name="assetTypeIds" options={assetTypeOptions}
            selected={filters.assetTypeIds ?? []} onChange={onChange} onSelectAll={onSelectAll} />
          <FilterSelect label="Order Types" name="orderTypeIds" options={orderTypeOptions}
            selected={filters.orderTypeIds ?? []} onChange={onChange} onSelectAll={onSelectAll} />
          <FilterSelect label="Reconciliation Status" name="reconciliationStatusIds" options={reconciliationStatusOptions}
            selected={filters.reconciliationStatusIds ?? []} onChange={onChange} onSelectAll={onSelectAll} />
        </CCol>
      </CRow>
    </CCardBody>
    <CCardFooter className="d-flex justify-content-end">
      <CButton color="primary" onClick={onGenerate} disabled={!hasFilters}>
        Generate
      </CButton>
    </CCardFooter>
  </CCard>
)

export default FiltersForm
