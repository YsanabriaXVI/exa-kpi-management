import React, { useState, useRef, useEffect } from 'react'
import { CRow, CCol, CFormSelect, CFormLabel, CButton } from '@coreui/react-pro'

interface SelectOption {
  value: number | string
  label: string
}

interface BuilderFormProps {
  data: any
  subdivisionOptions: SelectOption[]
  gasStationsOptions: SelectOption[]
  weekOptions: SelectOption[]
  linkedStatementOptions: SelectOption[]
  statementsAvailable: boolean
  onChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void
  onChangeMulti: (field: string, values: number[]) => void
  onSelectAll: (field: string, options: SelectOption[], checked: boolean) => void
  onSearch: () => void
  errors: any
}

const MultiSelect: React.FC<{
  label: string
  name: string
  options: SelectOption[]
  selected: any[]
  onChange: (field: string, values: any[]) => void
  onSelectAll: (field: string, options: SelectOption[], checked: boolean) => void
  disabled?: boolean
}> = ({ label, name, options, selected, onChange, onSelectAll, disabled }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const allSelected = options.length > 0 && selected.length === options.length

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const toggleOption = (val: any) => {
    const strVal = String(val)
    const current = selected.map(String)
    if (current.includes(strVal)) {
      onChange(name, selected.filter((v) => String(v) !== strVal))
    } else {
      onChange(name, [...selected, Number(val) || val])
    }
  }

  const buttonLabel = selected.length === 0
    ? 'Select options...'
    : selected.length === options.length
      ? 'All selected'
      : `${selected.length} selected`

  return (
    <CRow className="mb-3">
      <CCol sm={3}><CFormLabel>{label}</CFormLabel></CCol>
      <CCol sm={9}>
        <div ref={ref} style={{ position: 'relative' }}>
          <button
            type="button"
            className="form-select text-start"
            style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.65 : 1 }}
            onClick={() => !disabled && setOpen((o) => !o)}
          >
            <span className={selected.length === 0 ? 'text-body-secondary' : ''}>{buttonLabel}</span>
          </button>
          {open && !disabled && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 1055,
                maxHeight: '320px',
                overflowY: 'auto',
                background: 'var(--cui-body-bg)',
                border: '1px solid var(--cui-border-color)',
                borderRadius: '0.375rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                marginTop: '2px',
              }}
            >
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--cui-border-color)', position: 'sticky', top: 0, background: 'var(--cui-body-bg)', zIndex: 1 }}>
                <input
                  ref={searchRef}
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div
                className="px-3 py-2 d-flex align-items-center gap-2"
                style={{ borderBottom: '1px solid var(--cui-border-color)', cursor: 'pointer' }}
                onClick={() => onSelectAll(name, options, !allSelected)}
              >
                <input type="checkbox" checked={allSelected} onChange={() => {}} style={{ cursor: 'pointer' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select All</span>
              </div>
              {filtered.length === 0 && (
                <div className="px-3 py-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>No results found</div>
              )}
              {filtered.map((opt) => {
                const checked = selected.map(String).includes(String(opt.value))
                return (
                  <div
                    key={opt.value}
                    className="px-3 py-2 d-flex align-items-center gap-2"
                    style={{
                      cursor: 'pointer',
                      background: checked ? 'rgba(57,159,255,0.08)' : 'transparent',
                      fontSize: '0.9rem',
                    }}
                    onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'var(--cui-tertiary-bg)' }}
                    onMouseLeave={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    onClick={() => toggleOption(opt.value)}
                  >
                    <input type="checkbox" checked={checked} onChange={() => {}} style={{ cursor: 'pointer' }} />
                    <span>{opt.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CCol>
    </CRow>
  )
}

const BoundedSelect: React.FC<{
  name: string
  value: string | number
  options: SelectOption[]
  placeholder: string
  onChange: (name: string, value: string | number) => void
  invalid?: boolean
}> = ({ name, value, options, placeholder, onChange, invalid }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = options.find((o) => String(o.value) === String(value))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`form-select text-start${invalid ? ' is-invalid' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? '' : 'text-body-secondary'}>{selected ? selected.label : placeholder}</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1055,
            maxHeight: '320px',
            overflowY: 'auto',
            background: 'var(--cui-body-bg)',
            border: '1px solid var(--cui-border-color)',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            marginTop: '2px',
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--cui-border-color)', position: 'sticky', top: 0, background: 'var(--cui-body-bg)', zIndex: 1 }}>
            <input
              ref={searchRef}
              type="text"
              className="form-control form-control-sm"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div
            className="px-3 py-2 text-body-secondary"
            style={{ cursor: 'pointer', fontSize: '0.9rem' }}
            onClick={() => { onChange(name, ''); setOpen(false); setSearch('') }}
          >
            {placeholder}
          </div>
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>No results found</div>
          )}
          {filtered.map((opt) => (
            <div
              key={opt.value}
              className="px-3 py-2"
              style={{
                cursor: 'pointer',
                background: String(opt.value) === String(value) ? 'var(--cui-primary)' : 'transparent',
                color: String(opt.value) === String(value) ? '#fff' : 'inherit',
                fontSize: '0.9rem',
              }}
              onMouseEnter={(e) => {
                if (String(opt.value) !== String(value))
                  (e.currentTarget as HTMLElement).style.background = 'var(--cui-tertiary-bg)'
              }}
              onMouseLeave={(e) => {
                if (String(opt.value) !== String(value))
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
              onClick={() => { onChange(name, opt.value); setOpen(false); setSearch('') }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const BuilderForm: React.FC<BuilderFormProps> = ({
  data, subdivisionOptions, gasStationsOptions, weekOptions,
  linkedStatementOptions, statementsAvailable, onChange, onChangeMulti,
  onSelectAll, onSearch, errors,
}) => {
  if (!data) return null

  return (
    <div className="mb-4">
      <CRow className="mb-3">
        <CCol sm={3}><CFormLabel>Subdivision</CFormLabel></CCol>
        <CCol sm={9}>
          <BoundedSelect
            name="subdivisionId"
            value={data.subdivisionId ?? ''}
            options={subdivisionOptions}
            placeholder="Select subdivision..."
            onChange={(name, val) => onChange({ target: { name, value: val } } as any)}
            invalid={!!errors?.subdivisionId}
          />
        </CCol>
      </CRow>

      <MultiSelect
        label="Gas Suppliers"
        name="gasSupplierIds"
        options={gasStationsOptions}
        selected={data.gasSupplierIds ?? []}
        onChange={onChangeMulti}
        onSelectAll={onSelectAll}
      />

      <MultiSelect
        label="Subdivision Statements"
        name="statementIds"
        options={linkedStatementOptions}
        selected={data.statementIds ?? []}
        onChange={onChangeMulti}
        onSelectAll={onSelectAll}
        disabled={!statementsAvailable}
      />

      <CRow className="mb-3">
        <CCol sm={3}><CFormLabel>Include Personalized Trips</CFormLabel></CCol>
        <CCol sm={9}>
          <BoundedSelect
            name="personalizedTrips"
            value={data.personalizedTrips || 'no'}
            options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
            placeholder="Select..."
            onChange={(name, val) => onChange({ target: { name, value: val } } as any)}
          />
        </CCol>
      </CRow>

      <MultiSelect
        label="Weeks"
        name="weekIds"
        options={weekOptions}
        selected={data.weekIds ?? []}
        onChange={onChangeMulti}
        onSelectAll={onSelectAll}
      />

      {errors?.weekIds && <div className="text-danger mb-2">At least one week is required</div>}

      <div className="d-flex justify-content-end">
        <CButton color="primary" onClick={onSearch}>Search</CButton>
      </div>
    </div>
  )
}

export default BuilderForm
