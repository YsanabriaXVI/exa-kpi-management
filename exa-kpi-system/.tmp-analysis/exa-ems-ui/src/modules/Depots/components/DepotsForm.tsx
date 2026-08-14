// src/modules/Depots/components/DepotsForm.tsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormText,
  CRow,
  CMultiSelect
} from '@coreui/react-pro'

export type DepotsFormValues = {
  depotId?: number
  depotName: string
  depotCode: string
  location: string // legacy: el form guarda location como string (id)
  active: string // legacy: parseInt(form.active)
}

type LocationOption = { value: string; label: string }

type Props = {
  value: DepotsFormValues
  onChange: (next: DepotsFormValues) => void
  onSubmit: () => void
  disabled?: boolean

  // Si aún no tienes módulo de locations, lo dejamos inyectable
  locationOptions?: LocationOption[]
}

const isEmpty = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

const DepotsForm: React.FC<Props> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  locationOptions = [],
}) => {
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({})

  useEffect(() => {
    // Si el form recibe un depot sin location/active, set defaults visuales
    if (isEmpty(value.active)) {
      onChange({ ...value, active: '1' })
    }
    // location: no seteamos default automático porque depende del negocio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (isEmpty(value.depotName)) e.depotName = 'Depot Name is required'
    if (isEmpty(value.depotCode)) e.depotCode = 'Depot Code is required'
    if (isEmpty(value.location)) e.location = 'Location is required'
    if (isEmpty(value.active)) e.active = 'Active is required'
    return e
  }, [value])

  const hasError = (key: keyof DepotsFormValues) => Boolean(touched[key as string] && errors[key as string])

  const canSubmit = Object.keys(errors).length === 0

  const setField = <K extends keyof DepotsFormValues>(key: K, v: DepotsFormValues[K]) => {
    onChange({ ...value, [key]: v })
  }

  return (
    <CForm
      onSubmit={(e) => {
        e.preventDefault()
        setTouched({ depotName: true, depotCode: true, location: true, active: true })
        if (canSubmit) onSubmit()
      }}
    >
      <CRow className="g-3">
        <CCol md={6}>
          <CFormLabel>Depot Name</CFormLabel>
          <CFormInput
            value={value.depotName}
            disabled={disabled}
            invalid={hasError('depotName')}
            onBlur={() => setTouched((t) => ({ ...t, depotName: true }))}
            onChange={(e) => setField('depotName', e.target.value)}
            placeholder="Enter depot name"
          />
          {hasError('depotName') && <CFormText className="text-danger">{errors.depotName}</CFormText>}
        </CCol>

        <CCol md={6}>
          <CFormLabel>Depot Code</CFormLabel>
          <CFormInput
            value={value.depotCode}
            disabled={disabled}
            invalid={hasError('depotCode')}
            onBlur={() => setTouched((t) => ({ ...t, depotCode: true }))}
            onChange={(e) => setField('depotCode', e.target.value)}
            placeholder="Enter depot code"
          />
          {hasError('depotCode') && <CFormText className="text-danger">{errors.depotCode}</CFormText>}
        </CCol>

        <CCol md={6}>
          <CMultiSelect
            id="location"
            label="Location"
            size="lg"
            options={locationOptions.map((o) => ({ label: o.label, value: o.value }))}
            multiple={false}
            placeholder="Pick Location"
            search

            // ✅ evita que el dropdown crezca infinito
            virtualScroller
            visibleItems={8}

            className={hasError('location') ? 'is-invalid' : undefined}
            value={value.location ? [value.location] : []}
            onChange={(selected) => {
              const selectedValue = selected?.[0]?.value ?? ''
              setField('location', selectedValue)
              setTouched((t) => ({ ...t, location: true }))
            }}
          />
          {hasError('location') && (
            <div className="invalid-feedback d-block">{errors.location}</div>
          )}
        </CCol>


        <CCol md={6}>
          <CMultiSelect
            id="active"
            label="Active"
            size="lg"
            options={[
              { label: 'Active', value: '1' },
              { label: 'Inactive', value: '0' },
            ]}
            multiple={false}
            placeholder="Pick Status"
            search={false}
            className={hasError('active') ? 'is-invalid' : undefined}
            value={value.active ? [value.active] : []}
            onBlur={() => setTouched((t) => ({ ...t, active: true }))}
            onChange={(selected) => {
              const selectedValue = selected?.[0]?.value ?? ''
              setField('active', selectedValue)
              setTouched((t) => ({ ...t, active: true }))
            }}
          />

          {hasError('active') && (
            <div className="invalid-feedback d-block">{errors.active}</div>
          )}
        </CCol>

      </CRow>
    </CForm>
  )
}

export default DepotsForm