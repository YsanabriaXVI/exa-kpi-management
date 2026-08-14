// src/modules/TiresAssignment/components/TiresForm.tsx

import React from 'react'
import {
  CCardBody,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSwitch,
  CFormTextarea,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import type { SelectOption } from '../types/tiresAssignment.types'

interface TiresFormProps {
  header: any
  setHeader: React.Dispatch<React.SetStateAction<any>>
  isEdit: boolean
  errors?: Record<string, string>
  brandOptions?: SelectOption[]
  tireTypeOptions?: SelectOption[]
  assignedToOptions?: SelectOption[]
  positionOptions?: SelectOption[]
  categoryOptions?: SelectOption[]
  statusOptions?: SelectOption[]
  loadingOptions?: boolean
}

const TiresForm: React.FC<TiresFormProps> = ({
  header,
  setHeader,
  isEdit,
  errors = {},
  brandOptions = [],
  tireTypeOptions = [],
  assignedToOptions = [],
  positionOptions = [],
  categoryOptions = [],
  statusOptions = [],
  loadingOptions = false,
}) => {
  const updateField = (field: string, value: any) => {
    setHeader((prev: any) => ({
      ...prev,
      [field]: value,
    }))
  }

  const updateFields = (values: Record<string, any>) => {
    setHeader((prev: any) => ({
      ...prev,
      ...values,
    }))
  }

  const toSelectValue = (value: any) => {
    if (value === undefined || value === null || value === '') return []
    return [String(value)]
  }

  const getSelectedValue = (selected: any[]) => selected?.[0]?.value ?? ''
  const getSelectedLabel = (selected: any[]) => selected?.[0]?.label ?? ''

  return (
    <CCardBody>
      <div className="mb-4">
        <h6 className="text-uppercase text-muted fw-bold mb-3">Tire Identification</h6>

        <CRow className="g-3">
          <CCol xs={12} md={6} xl={4}>
            <CFormLabel htmlFor="serialNo">Serial No.</CFormLabel>
            <CFormInput
              id="serialNo"
              size="lg"
              value={header.serialNo ?? ''}
              disabled={isEdit}
              placeholder="EXA-YYMM####"
              invalid={Boolean(errors.serialNo)}
              feedbackInvalid={errors.serialNo}
              onChange={(e) => updateField('serialNo', e.target.value.toUpperCase())}
            />
          </CCol>

          <CCol xs={12} md={6} xl={4}>
            <CFormLabel>Brand</CFormLabel>
            <CMultiSelect
              size="lg"
              options={brandOptions}
              multiple={false}
              search
              disabled={loadingOptions}
              placeholder={loadingOptions ? 'Loading brands...' : 'Select brand'}
              value={toSelectValue(header.brand)}
              onChange={(selected) =>
                updateFields({
                  brand: getSelectedValue(selected),
                  brandId: getSelectedValue(selected),
                  brandName: getSelectedLabel(selected),
                })
              }
            />
            {errors.brand && <div className="invalid-feedback d-block">{errors.brand}</div>}
          </CCol>

          <CCol xs={12} md={6} xl={4}>
            <CFormLabel htmlFor="year">Year</CFormLabel>
            <CFormInput
              id="year"
              type="number"
              size="lg"
              value={header.year ?? ''}
              placeholder="YYYY"
              invalid={Boolean(errors.year)}
              feedbackInvalid={errors.year}
              onChange={(e) => updateField('year', e.target.value)}
            />
          </CCol>
        </CRow>
        <CRow className="g-3 mt-2">
          <CCol xs={12} md={6} xl={4}>
            <CFormLabel>Status</CFormLabel>
            <CMultiSelect
              size="lg"
              options={statusOptions}
              multiple={false}
              search
              disabled={loadingOptions}
              placeholder={loadingOptions ? 'Loading statuses...' : 'Select status'}
              value={toSelectValue(header.statusId)}
              onChange={(selected) => {
                updateFields({
                  statusId: getSelectedValue(selected),
                  statusName: getSelectedLabel(selected),
                })
              }}
            />
            {errors.statusId && <div className="invalid-feedback d-block">{errors.statusId}</div>}
          </CCol>
        </CRow>
      </div>

      <div className="mb-4">
        <h6 className="text-uppercase text-muted fw-bold mb-3">Classification</h6>

        <CRow className="g-3">
          <CCol xs={12} md={6} xl={4}>
            <CFormLabel>Tire Type</CFormLabel>
            <CMultiSelect
              size="lg"
              options={tireTypeOptions}
              multiple={false}
              search
              disabled={loadingOptions}
              placeholder={loadingOptions ? 'Loading tire types...' : 'Select tire type'}
              value={toSelectValue(header.tireTypeId)}
              onChange={(selected) =>
                updateFields({
                  tireTypeId: getSelectedValue(selected),
                  tireTypeName: getSelectedLabel(selected),
                })
              }
            />
            {errors.tireTypeId && (
              <div className="invalid-feedback d-block">{errors.tireTypeId}</div>
            )}
          </CCol>

          {categoryOptions.length > 0 && (
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel>Category</CFormLabel>
              <CMultiSelect
                size="lg"
                options={categoryOptions}
                multiple={false}
                search
                disabled={loadingOptions}
                placeholder={loadingOptions ? 'Loading categories...' : 'Select category'}
                value={toSelectValue(header.categoryId)}
                onChange={(selected) => updateField('categoryId', getSelectedValue(selected))}
              />
              {errors.categoryId && (
                <div className="invalid-feedback d-block">{errors.categoryId}</div>
              )}
            </CCol>
          )}

          <CCol xs={12} md={6} xl={4}>
            <CFormLabel htmlFor="depth">Depth</CFormLabel>
            <CFormInput
              id="depth"
              type="number"
              size="lg"
              value={header.depth ?? ''}
              placeholder="Enter depth"
              invalid={Boolean(errors.depth)}
              feedbackInvalid={errors.depth}
              onChange={(e) => updateField('depth', e.target.value)}
            />
          </CCol>
        </CRow>
      </div>

      <div className="mb-4">
        <h6 className="text-uppercase text-muted fw-bold mb-3">Assignment Reference</h6>

        <CRow className="g-3">
          <CCol xs={12} md={6} xl={4}>
            <CFormLabel>Assigned To</CFormLabel>
            <CMultiSelect
              size="lg"
              options={assignedToOptions}
              multiple={false}
              search
              disabled={loadingOptions}
              placeholder={loadingOptions ? 'Loading equipment...' : 'Select equipment / chassis'}
              value={toSelectValue(header.assignedToId)}
              onChange={(selected) => {
                const value = getSelectedValue(selected)
                updateFields({ assignedToId: value, chassisId: value })
              }}
            />
            {errors.assignedToId && (
              <div className="invalid-feedback d-block">{errors.assignedToId}</div>
            )}
          </CCol>

          <CCol xs={12} md={6} xl={4}>
            <CFormLabel>Position</CFormLabel>
            <CMultiSelect
              size="lg"
              options={positionOptions}
              multiple={false}
              search
              disabled={loadingOptions}
              placeholder={loadingOptions ? 'Loading positions...' : 'Select position'}
              value={toSelectValue(header.positionId)}
              onChange={(selected) => {
                const value = getSelectedValue(selected)
                updateFields({ positionId: value, axieId: value })
              }}
            />
            {errors.positionId && (
              <div className="invalid-feedback d-block">{errors.positionId}</div>
            )}
          </CCol>
        </CRow>
      </div>

      <div className="mb-4">
        <h6 className="text-uppercase text-muted fw-bold mb-3">Ownership</h6>

        <CRow className="g-3 align-items-center">
          <CCol xs={12} md={6} xl={4}>
            <div className="border rounded p-3 h-100">
              <CFormSwitch
                size="xl"
                label={header.owner ? 'Owner: Yes' : 'Owner: No'}
                checked={Boolean(header.owner)}
                onChange={(e) => updateField('owner', e.target.checked)}
              />
            </div>
          </CCol>
        </CRow>
      </div>

      <div>
        <h6 className="text-uppercase text-muted fw-bold mb-3">Remarks</h6>

        <CRow className="g-3">
          <CCol xs={12}>
            <CFormLabel htmlFor="observations">Remarks</CFormLabel>
            <CFormTextarea
              id="observations"
              rows={4}
              value={header.observations ?? ''}
              placeholder="Add notes or comments"
              invalid={Boolean(errors.observations)}
              feedbackInvalid={errors.observations}
              onChange={(e) => updateField('observations', e.target.value)}
            />
          </CCol>
        </CRow>
      </div>
    </CCardBody>
  )
}

export default TiresForm
