import React, { useMemo } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CMultiSelect,
  CButton,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'
import type { FuelLimitRule, AttributeItem, PlateOption } from '../types/fuelOrderSettings.types'

interface FuelLimitRuleBoxProps {
  rule: FuelLimitRule
  index: number
  periodOptions: AttributeItem[]
  plateOptions: PlateOption[]
  disabled: boolean
  onChangeField: (index: number, field: string, value: any) => void
  onChangePlates: (index: number, values: number[]) => void
  onDelete: (index: number) => void
}

const FuelLimitRuleBox: React.FC<FuelLimitRuleBoxProps> = ({
  rule,
  index,
  periodOptions,
  plateOptions,
  disabled,
  onChangeField,
  onChangePlates,
  onDelete,
}) => {
  const takenIds = rule.takenIds ?? []

  const filteredPlateMultiOptions = useMemo(() => {
    const takenSet = new Set(takenIds)
    return plateOptions
      .filter((p) => !takenSet.has(p.asset_id))
      .map((p) => ({
        value: p.asset_id,
        label: p.plate ?? p.name ?? `Asset ${p.asset_id}`,
        selected: (rule.assetIds ?? []).includes(p.asset_id),
      }))
  }, [plateOptions, takenIds, rule.assetIds])

  return (
    <CCol sm={12} xl={4}>
      <CCard className="mb-3">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Fuel Limit Rule {index + 1}</strong>
          {!disabled && (
            <CButton
              color="danger"
              variant="ghost"
              size="sm"
              onClick={() => onDelete(index)}
            >
              <CIcon icon={cilTrash} />
            </CButton>
          )}
        </CCardHeader>
        <CCardBody>
          <CFormSelect
            label="Period"
            className="mb-3"
            disabled={disabled}
            value={rule.period ?? ''}
            onChange={(e) => onChangeField(index, 'period', Number(e.target.value) || null)}
          >
            <option value="">Select Period</option>
            {periodOptions.map((p) => (
              <option key={p.attribute_item_id} value={p.attribute_item_id}>
                {p.name}
              </option>
            ))}
          </CFormSelect>

          <CMultiSelect
            label="Applies for Units..."
            className="mb-3"
            options={filteredPlateMultiOptions}
            disabled={disabled}
            onChange={(items: any[]) => onChangePlates(index, items.map((i) => Number(i.value)))}
            placeholder="Pick Plates"
            search
            selectAll
            selectionType="tags"
          />

          <CFormInput
            type="number"
            label="Fuel Limit Lts"
            disabled={disabled}
            value={rule.fuelLimitLtrs ?? ''}
            min={0}
            max={99999}
            step={0.1}
            onChange={(e) => onChangeField(index, 'fuelLimitLtrs', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default FuelLimitRuleBox
