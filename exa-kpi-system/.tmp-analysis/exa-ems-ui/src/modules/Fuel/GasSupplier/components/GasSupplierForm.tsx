import React, { useMemo, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CFormSwitch,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import type { RootState } from '../../../../store'

export interface GasSupplierFormValue {
  name: string
  address: string
  email: string
  phone: string
  creditDays: string
  countryId: number
  departmentId: number
  cityId: number
  status: number
  active: number
  subdivisions?: number[]
}

interface SubdivisionOption {
  value: number
  label: string
}

interface GasSupplierFormProps {
  value: GasSupplierFormValue
  disabled: boolean
  errors: Record<string, string>
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setField: (field: keyof GasSupplierFormValue, value: any) => void
  hasError: (field: keyof GasSupplierFormValue) => boolean
  subdivisionOptions?: SubdivisionOption[]
  onSubdivisionsChange?: (values: number[]) => void
  onSubmit?: () => void
  onReset?: () => void
  filterVariantCities?: boolean
}

const GasSupplierFormComponent: React.FC<GasSupplierFormProps> = ({
  value,
  disabled,
  errors,
  setTouched,
  setField,
  hasError,
  subdivisionOptions,
  onSubdivisionsChange,
  onSubmit,
  onReset,
  filterVariantCities = false,
}) => {
  const [shaking, setShaking] = useState<'department' | 'city' | null>(null)

  const triggerShake = useCallback((field: 'department' | 'city') => {
    setShaking(field)
    setTimeout(() => setShaking(null), 1000)
  }, [])

  const locationData = useSelector(
    (s: RootState) => (s as any).locationitems?.data,
  )

  const countries: any[] = locationData?.countries ?? []

  const allDepartments: any[] = useMemo(
    () => locationData?.departments ?? [],
    [locationData],
  )
  const allCities: any[] = useMemo(() => {
    const cities = locationData?.cities ?? []
    if (!filterVariantCities) return cities
    return cities.filter(
      (c: any) => c.variant == null && c.variantid == null && c.variant_id == null,
    )
  }, [locationData, filterVariantCities])

  const filteredDepartments = useMemo(() => {
    if (value.countryId) {
      return allDepartments.filter(
        (d: any) => d.country?.country_id === Number(value.countryId),
      )
    }
    return allDepartments
  }, [value.countryId, allDepartments])

  const filteredCities = useMemo(() => {
    if (value.departmentId) {
      return allCities.filter(
        (c: any) => c.department?.department_id === Number(value.departmentId),
      )
    }
    return allCities
  }, [value.departmentId, allCities])

  const handleBlur = (field: keyof GasSupplierFormValue) =>
    setTouched((prev) => ({ ...prev, [field]: true }))

  const subdivisionMultiOptions = useMemo(
    () =>
      (subdivisionOptions ?? []).map((opt) => ({
        value: opt.value,
        label: opt.label,
        selected: (value.subdivisions ?? []).includes(opt.value),
      })),
    [subdivisionOptions, value.subdivisions],
  )

  const handleSubdivisionMultiChange = (selected: any[]) => {
    onSubdivisionsChange?.(selected.map((s) => Number(s.value)))
  }

  return (
    <>
    <style>{`
      @keyframes gs-shake {
        0%   { transform: translateX(0); }
        20%  { transform: translateX(-6px); }
        40%  { transform: translateX(6px); }
        60%  { transform: translateX(-4px); }
        80%  { transform: translateX(4px); }
        100% { transform: translateX(0); }
      }
    `}</style>
    <CForm onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}>
      <CRow className="g-3">
        <CCol md={6}>
          <CFormInput
            label="Trade Name"
            value={value.name ?? ''}
            disabled={disabled}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            invalid={hasError('name')}
            feedbackInvalid={errors.name}
          />
        </CCol>
        <CCol md={6}>
          <CFormInput
            label="Address"
            value={value.address ?? ''}
            disabled={disabled}
            onChange={(e) => setField('address', e.target.value)}
            onBlur={() => handleBlur('address')}
            invalid={hasError('address')}
            feedbackInvalid={errors.address}
          />
        </CCol>
        <CCol md={4}>
          <CFormInput
            label="Email"
            type="email"
            value={value.email ?? ''}
            disabled={disabled}
            onChange={(e) => setField('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            invalid={hasError('email')}
            feedbackInvalid={errors.email}
          />
        </CCol>
        <CCol md={4}>
          <CFormInput
            label="Phone"
            value={value.phone ?? ''}
            disabled={disabled}
            onChange={(e) => setField('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            invalid={hasError('phone')}
            feedbackInvalid={errors.phone}
          />
        </CCol>
        <CCol md={4}>
          <CFormInput
            label="Credit Days"
            type="number"
            value={value.creditDays ?? ''}
            disabled={disabled}
            onChange={(e) => setField('creditDays', e.target.value)}
            onBlur={() => handleBlur('creditDays')}
            invalid={hasError('creditDays')}
            feedbackInvalid={errors.creditDays}
          />
        </CCol>
        <CCol md={4}>
          <CFormSelect
            label="Country"
            value={value.countryId ?? ''}
            disabled={disabled}
            onChange={(e) => {
              setField('countryId', Number(e.target.value))
              setField('departmentId', 0)
              setField('cityId', 0)
            }}
            onBlur={() => handleBlur('countryId')}
            invalid={hasError('countryId')}
            feedbackInvalid={errors.countryId}
          >
            <option value="">Select Country</option>
            {countries.map((c: any) => (
              <option key={c.country_id} value={c.country_id}>
                {c.name}
              </option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol md={4}>
          <div style={{ position: 'relative' }}>
            <CFormSelect
              label="Department"
              value={value.departmentId ?? ''}
              disabled={disabled || !value.countryId}
              onChange={(e) => {
                setField('departmentId', Number(e.target.value))
                setField('cityId', 0)
              }}
              onBlur={() => handleBlur('departmentId')}
              invalid={hasError('departmentId')}
              feedbackInvalid={errors.departmentId}
            >
              <option value="">Select Department</option>
              {filteredDepartments.map((d: any) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name}
                </option>
              ))}
            </CFormSelect>
            {!disabled && !value.countryId && (
              <div
                onClick={() => triggerShake('department')}
                style={{
                  position: 'absolute',
                  inset: 0,
                  marginTop: '1.5rem',
                  cursor: 'not-allowed',
                  borderRadius: '0.375rem',
                  zIndex: 2,
                }}
              />
            )}
            {!disabled && !value.countryId && shaking === 'department' && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% - 1.4rem)',
                left: 0,
                right: 0,
                background: 'var(--cui-warning)',
                color: '#000',
                fontSize: '0.78rem',
                fontWeight: 500,
                padding: '0.3rem 0.6rem',
                borderRadius: '0.375rem',
                zIndex: 10,
                animation: 'gs-shake 0.45s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                whiteSpace: 'nowrap',
              }}>
                ⚠ Select a country first
              </div>
            )}
          </div>
        </CCol>
        <CCol md={4}>
          <div style={{ position: 'relative' }}>
            <CFormSelect
              label="City"
              value={value.cityId ?? ''}
              disabled={disabled || !value.departmentId}
              onChange={(e) => setField('cityId', Number(e.target.value))}
              onBlur={() => handleBlur('cityId')}
              invalid={hasError('cityId')}
              feedbackInvalid={errors.cityId}
            >
              <option value="">Select City</option>
              {filteredCities.map((c: any) => (
                <option key={c.city_id} value={c.city_id}>
                  {c.name}
                </option>
              ))}
            </CFormSelect>
            {!disabled && !value.departmentId && (
              <div
                onClick={() => triggerShake('city')}
                style={{
                  position: 'absolute',
                  inset: 0,
                  marginTop: '1.5rem',
                  cursor: 'not-allowed',
                  borderRadius: '0.375rem',
                  zIndex: 2,
                }}
              />
            )}
            {!disabled && !value.departmentId && shaking === 'city' && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% - 1.4rem)',
                left: 0,
                right: 0,
                background: 'var(--cui-warning)',
                color: '#000',
                fontSize: '0.78rem',
                fontWeight: 500,
                padding: '0.3rem 0.6rem',
                borderRadius: '0.375rem',
                zIndex: 10,
                animation: 'gs-shake 0.45s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                whiteSpace: 'nowrap',
              }}>
                ⚠ Select a department first
              </div>
            )}
          </div>
        </CCol>
        <CCol md={3}>
          <CFormSwitch
            label="Active"
            checked={value.active === 1}
            disabled={disabled}
            onChange={(e) =>
              setField('active', e.target.checked ? 1 : 0)
            }
          />
        </CCol>
        {subdivisionOptions && subdivisionOptions.length > 0 && (
          <CCol md={9}>
            <CMultiSelect
              label="Subdivisions"
              options={subdivisionMultiOptions}
              disabled={disabled}
              onChange={handleSubdivisionMultiChange}
              placeholder="Select subdivisions..."
              search
              selectionType="tags"
              optionsMaxHeight={330}
            />
          </CCol>
        )}
        {onReset && !disabled && (
          <CCol xs={12} className="mt-2">
            <CButton color="secondary" variant="outline" size="sm" type="button" onClick={onReset}>
              Reset
            </CButton>
          </CCol>
        )}
      </CRow>
    </CForm>
    </>
  )
}

export default GasSupplierFormComponent
