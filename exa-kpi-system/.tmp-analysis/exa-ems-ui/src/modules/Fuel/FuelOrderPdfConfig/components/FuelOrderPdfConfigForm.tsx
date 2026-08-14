import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSwitch,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import type { RootState } from '../../../../store'

export interface FuelOrderPdfConfigFormValue {
  configName: string
  subdivisionIds: number[]
  fuelPriceEnabled: boolean
  importEnabled: boolean
  totalEnabled: boolean
}

interface FuelOrderPdfConfigFormProps {
  value: FuelOrderPdfConfigFormValue
  disabled: boolean
  errors: Record<string, string>
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setField: <K extends keyof FuelOrderPdfConfigFormValue>(field: K, val: FuelOrderPdfConfigFormValue[K]) => void
  hasError: (field: keyof FuelOrderPdfConfigFormValue) => boolean
}

const FuelOrderPdfConfigForm: React.FC<FuelOrderPdfConfigFormProps> = ({
  value,
  disabled,
  errors,
  setTouched,
  setField,
  hasError,
}) => {
  const subdivisionsList = useSelector(
    (s: RootState) => (s.auth as any)?.details?.details?.subdivisions ?? [],
  )

  const subdivisionOptions = useMemo(
    () =>
      subdivisionsList.map((s: any) => ({
        value: s.subdivision_id,
        label: s.name,
        selected: (value.subdivisionIds ?? []).includes(s.subdivision_id),
      })),
    [subdivisionsList, value.subdivisionIds],
  )

  return (
    <CRow className="g-3">
      <CCol md={5}>
        <CForm>
          <div className="mb-4">
            <CFormInput
              type="text"
              label="Config Name"
              size="lg"
              disabled={disabled}
              value={value.configName ?? ''}
              onChange={(e) => setField('configName', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, configName: true }))}
              invalid={hasError('configName')}
              feedbackInvalid={errors.configName}
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Subdivisions</CFormLabel>
            <CMultiSelect
              className="pdf-subdivision-select"
              options={subdivisionOptions}
              placeholder="Select subdivisions..."
              disabled={disabled}
              onChange={(selected: any[]) =>
                setField('subdivisionIds', selected.map((s) => Number(s.value)))
              }
            />
          </div>
        </CForm>
      </CCol>

      <CCol md={7}>
        <CCard>
          <CCardHeader>
            <strong>PDF Sections</strong>
          </CCardHeader>
          <CCardBody className="d-flex flex-column gap-3">
            <CFormSwitch
              label="Show Fuel Price"
              disabled={disabled}
              checked={value.fuelPriceEnabled ?? false}
              onChange={(e) => setField('fuelPriceEnabled', e.target.checked)}
            />
            <CFormSwitch
              label="Show Import"
              disabled={disabled}
              checked={value.importEnabled ?? false}
              onChange={(e) => setField('importEnabled', e.target.checked)}
            />
            <CFormSwitch
              label="Show Total"
              disabled={disabled}
              checked={value.totalEnabled ?? false}
              onChange={(e) => setField('totalEnabled', e.target.checked)}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default FuelOrderPdfConfigForm
