// src/modules/EquipmentSize/components/EquipmentSizeForm.tsx

import React from 'react'
import {
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormText,
  CRow,
  CMultiSelect,
  CFormSwitch,
} from '@coreui/react-pro'

type Option = { label: string; value: string }

export type EquipmentSizeFormValue = {
  equipmentTypeId?: string | number
  sizeType?: string
  description?: string
  axieId?: string | number
  extendable?: number | boolean
  fridge?: number | boolean
  relatedSizes?: string[]
  isoCode1?: string
  isoCode2?: string
  isoCode3?: string
  isoCode4?: string
  isoCode5?: string
  isoCode6?: string
  isoCode7?: string
  isoCode8?: string
  isoCode9?: string
  isoCode10?: string
}

type Props = {
  value: EquipmentSizeFormValue
  disabled?: boolean

  errors: Record<string, string>
  touched: Record<string, boolean>

  equipmentTypeOptions: Option[]
  axlesOptions: Option[]

  isChassis: (equipmentTypeId?: string | number) => boolean
  isContainer: (equipmentTypeId?: string | number) => boolean
  setField: (field: keyof EquipmentSizeFormValue, value: any) => void
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>

  hasError: (field: keyof EquipmentSizeFormValue) => boolean
  sizeOptions: Option[]
}

const EquipmentSizeForm: React.FC<Props> = ({
  value,
  disabled,
  errors,
  touched,
  equipmentTypeOptions,
  axlesOptions,
  isChassis,
  isContainer,
  setField,
  setTouched,
  hasError,
  sizeOptions
}) => {
  console.log("Value: ", value)
  const equipmentTypeSelectValue =
    value.equipmentTypeId === undefined ||
    value.equipmentTypeId === null ||
    value.equipmentTypeId === ''
      ? []
      : [String(value.equipmentTypeId)]

  const axleSelectValue =
    value.axieId === undefined || value.axieId === null || value.axieId === ''
      ? []
      : [String(value.axieId)]

  const chassis = isChassis(value.equipmentTypeId)
  const container = isContainer(value.equipmentTypeId)

  const isoFields: (keyof EquipmentSizeFormValue)[] = [
    'isoCode1',
    'isoCode2',
    'isoCode3',
    'isoCode4',
    'isoCode5',
    'isoCode6',
    'isoCode7',
    'isoCode8',
    'isoCode9',
    'isoCode10',
  ]

  return (
    <CForm>
      <CRow className="g-3">
        {/* LEFT COLUMN */}
        <CCol md={6}>
          <CFormLabel>Equipment Type</CFormLabel>
          <CMultiSelect
            options={equipmentTypeOptions}
            multiple={false}
            search
            placeholder="Pick Equipment Type"
            disabled={disabled}
            className={hasError('equipmentTypeId') ? 'is-invalid' : undefined}
            value={equipmentTypeSelectValue}
            onBlur={() => setTouched((t) => ({ ...t, equipmentTypeId: true }))}
            onChange={(selected) => {
              const v = selected?.[0]?.value ?? ''
              setField('equipmentTypeId', v)
              setField('relatedSizes', [])
            }}
          />
          {hasError('equipmentTypeId') && (
            <CFormText className="text-danger">
              {errors.equipmentTypeId}
            </CFormText>
          )}

          <CFormLabel className="mt-3">Size</CFormLabel>
          <CFormInput
            value={value.sizeType ?? ''}
            disabled={disabled}
            invalid={hasError('sizeType')}
            onBlur={() => setTouched((t) => ({ ...t, sizeType: true }))}
            onChange={(e) => setField('sizeType', e.target.value)}
            placeholder="Size..."
          />
          {hasError('sizeType') && (
            <CFormText className="text-danger">{errors.sizeType}</CFormText>
          )}

          <CFormLabel className="mt-3">Description</CFormLabel>
          <CFormInput
            value={value.description ?? ''}
            disabled={disabled}
            invalid={hasError('description')}
            onBlur={() => setTouched((t) => ({ ...t, description: true }))}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Description..."
          />
          {hasError('description') && (
            <CFormText className="text-danger">{errors.description}</CFormText>
          )}

          {chassis && (
            <>
              <CFormLabel className="mt-3">Number of Axles</CFormLabel>
              <CMultiSelect
                options={axlesOptions}
                multiple={false}
                search
                placeholder="Pick Axles"
                disabled={disabled}
                className={hasError('axieId') ? 'is-invalid' : undefined}
                value={axleSelectValue}
                onBlur={() => setTouched((t) => ({ ...t, axieId: true }))}
                onChange={(selected) => {
                  const v = selected?.[0]?.value ?? ''
                  setField('axieId', v)
                }}
              />
              {hasError('axieId') && (
                <CFormText className="text-danger">{errors.axieId}</CFormText>
              )}

              <div className="mt-3">
                <CFormSwitch
                  label="Extendable"
                  size="lg"
                  checked={Boolean(value.extendable)}
                  disabled={disabled}
                  onChange={(e) => setField('extendable', e.target.checked ? 1 : 0)}
                />
              </div>
            </>
          )}
          {container && (
            <>
              <div className="mt-3">
                <CFormSwitch
                  label="fridge"
                  size="lg"
                  checked={Boolean(value.fridge)}
                  disabled={disabled}
                  onChange={(e) => setField('fridge', e.target.checked ? 1 : 0)}
                />
              </div>
            </>
          )}
          <br />
          <CMultiSelect
            name="relatedSizeIds"
            label="Related Sizes"
            size="md"
            //key={`depots-${multiResetKey}`}
            options={sizeOptions}
            value={value?.relatedSizes ?? []}
            onChange={(vals) => setField('relatedSizes', vals.map((v) => v.value))}
            //invalid={!!FEerrors?.depotIds}
            //feedbackInvalid={FEerrors?.depotIds}
            disabled={disabled}
          />
        </CCol>

        {/* RIGHT COLUMN – ISO CODES */}
        <CCol md={6}>
            <CRow className="g-3">
                {/* ISO 1 – 5 */}
                <CCol md={6}>
                {isoFields.slice(0, 5).map((field, idx) => (
                    <CRow key={field} className="align-items-center mb-2">
                    <CCol md={4}>
                        <CFormLabel className="mb-0">{`ISO Code ${idx + 1}`}</CFormLabel>
                    </CCol>
                    <CCol md={8}>
                        <CFormInput
                        value={(value[field] as string) ?? ''}
                        disabled={disabled}
                        invalid={hasError(field)}
                        onBlur={() => setTouched((t) => ({ ...t, [field]: true }))}
                        onChange={(e) =>
                            setField(field, e.target.value.toUpperCase())
                        }
                        />
                        {hasError(field) && (
                        <CFormText className="text-danger">
                            {errors[field]}
                        </CFormText>
                        )}
                    </CCol>
                    </CRow>
                ))}
                </CCol>

                {/* ISO 6 – 10 */}
                <CCol md={6}>
                {isoFields.slice(5, 10).map((field, idx) => (
                    <CRow key={field} className="align-items-center mb-2">
                    <CCol md={4}>
                        <CFormLabel className="mb-0">{`ISO Code ${idx + 6}`}</CFormLabel>
                    </CCol>
                    <CCol md={8}>
                        <CFormInput
                        value={(value[field] as string) ?? ''}
                        disabled={disabled}
                        invalid={hasError(field)}
                        onBlur={() => setTouched((t) => ({ ...t, [field]: true }))}
                        onChange={(e) =>
                            setField(field, e.target.value.toUpperCase())
                        }
                        />
                        {hasError(field) && (
                        <CFormText className="text-danger">
                            {errors[field]}
                        </CFormText>
                        )}
                    </CCol>
                    </CRow>
                ))}
                </CCol>
            </CRow>
        </CCol>


      </CRow>
    </CForm>
  )
}

export default EquipmentSizeForm