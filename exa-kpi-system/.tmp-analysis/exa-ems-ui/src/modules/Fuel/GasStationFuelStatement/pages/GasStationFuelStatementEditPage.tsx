import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CCard, CCardBody, CCardHeader, CCardFooter, CButton,
  CRow, CCol, CFormTextarea, CSpinner, CFormSelect, CFormLabel, CFormInput,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../../store'
import { MODULE_SUPPLIER_FUEL_STATEMENT } from '../../../../constants/modules'
import { permissionService, UPDATE, UPDATE_STATUS } from '../../../../services/auth/permission.service'
import ErrorMessageModal from '../../../../components/ErrorMessageModal'
import PreviewTable from '../components/PreviewTable'
import AddFuelOrderModal from '../components/AddFuelOrderModal'
import {
  fetchGasStationFuelStatement,
  addGasStationFuelStatement,
  saveGasStationFuelStatement,
  loadGSPreviewInvoiceLines,
  loadGSAdditionalInvoiceLines,
  downloadGSFuelStatementPdf,
  downloadGSFuelStatementXlsx,
  resetStatuses,
  clearCurrent,
  setDefaultStatement,
  selectGSFuelStmtCurrent,
  selectGSFuelStmtPreviewLines,
  selectGSFuelStmtAdditionalLines,
  selectGSFuelStmtErrors,
  selectGSFuelStmtStatuses,
  selectGSFuelStmtLoadingCurrent,
  selectGSFuelStmtSaving,
} from '../store/gasStationFuelStatement.slice'
import { fetchAllGasStores, selectAllGasStores } from '../../GasSupplier/store/gasSupplier.slice'
import { loadWeeks } from '../../../Weeks/store/weeksSlice'
import type { InvoiceLine } from '../types/gasStationFuelStatement.types'

const dropdownStyles = {
  position: 'absolute' as const,
  top: '100%',
  left: 0,
  right: 0,
  zIndex: 1055,
  maxHeight: '320px',
  overflowY: 'auto' as const,
  background: 'var(--cui-body-bg)',
  border: '1px solid var(--cui-border-color)',
  borderRadius: '0.375rem',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  marginTop: '2px',
}

const BoundedSelect: React.FC<{
  name: string; value: string | number; options: any[]
  placeholder: string; onChange: (name: string, value: any) => void; invalid?: boolean
}> = ({ name, value, options, placeholder, onChange, invalid }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => String(o.value) === String(value))

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className={`form-select text-start${invalid ? ' is-invalid' : ''}`}
        style={{ cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
        <span className={selected ? '' : 'text-body-secondary'}>{selected ? selected.label : placeholder}</span>
      </button>
      {open && (
        <div style={dropdownStyles}>
          <div className="px-3 py-2 text-body-secondary" style={{ cursor: 'pointer', fontSize: '0.9rem' }}
            onClick={() => { onChange(name, ''); setOpen(false) }}>{placeholder}</div>
          {options.map((opt) => (
            <div key={opt.value} className="px-3 py-2"
              style={{ cursor: 'pointer', background: String(opt.value) === String(value) ? 'var(--cui-primary)' : 'transparent', color: String(opt.value) === String(value) ? '#fff' : 'inherit', fontSize: '0.9rem' }}
              onMouseEnter={(e) => { if (String(opt.value) !== String(value)) (e.currentTarget as HTMLElement).style.background = 'var(--cui-tertiary-bg)' }}
              onMouseLeave={(e) => { if (String(opt.value) !== String(value)) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              onClick={() => { onChange(name, opt.value); setOpen(false) }}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const MultiSelect: React.FC<{
  label: string; name: string; options: any[]; selected: any[]
  onChange: (f: string, v: any[]) => void
  onSelectAll: (f: string, o: any[], c: boolean) => void
  disabled?: boolean
}> = ({ label, name, options, selected, onChange, onSelectAll, disabled }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const allSelected = options.length > 0 && selected.length === options.length

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleOption = (val: any) => {
    const strVal = String(val)
    if (selected.map(String).includes(strVal)) onChange(name, selected.filter((v) => String(v) !== strVal))
    else onChange(name, [...selected, Number(val) || val])
  }

  const buttonLabel = selected.length === 0 ? 'Select options...'
    : selected.length === options.length ? 'All selected'
    : `${selected.length} selected`

  return (
    <CRow className="mb-3">
      <CCol sm={3}><CFormLabel>{label}</CFormLabel></CCol>
      <CCol sm={9}>
        <div ref={ref} style={{ position: 'relative' }}>
          <button type="button" className="form-select text-start"
            style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.65 : 1 }}
            onClick={() => !disabled && setOpen((o) => !o)}>
            <span className={selected.length === 0 ? 'text-body-secondary' : ''}>{buttonLabel}</span>
          </button>
          {open && !disabled && (
            <div style={dropdownStyles}>
              <div className="px-3 py-2 d-flex align-items-center gap-2"
                style={{ borderBottom: '1px solid var(--cui-border-color)', cursor: 'pointer' }}
                onClick={() => onSelectAll(name, options, !allSelected)}>
                <input type="checkbox" checked={allSelected} onChange={() => {}} style={{ cursor: 'pointer' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select All</span>
              </div>
              {options.map((opt: any) => {
                const checked = selected.map(String).includes(String(opt.value))
                return (
                  <div key={opt.value} className="px-3 py-2 d-flex align-items-center gap-2"
                    style={{ cursor: 'pointer', background: checked ? 'rgba(57,159,255,0.08)' : 'transparent', fontSize: '0.9rem' }}
                    onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'var(--cui-tertiary-bg)' }}
                    onMouseLeave={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    onClick={() => toggleOption(opt.value)}>
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

const GasStationFuelStatementEditPage: React.FC = () => {
  const { fuelStatementId } = useParams<{ fuelStatementId: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const isCreate = fuelStatementId === 'new'

  const statement = useSelector(selectGSFuelStmtCurrent)
  const previewLines = useSelector(selectGSFuelStmtPreviewLines)
  const additionalLines = useSelector(selectGSFuelStmtAdditionalLines)
  const errors = useSelector(selectGSFuelStmtErrors)
  const statuses = useSelector(selectGSFuelStmtStatuses)
  const loadingCurrent = useSelector(selectGSFuelStmtLoadingCurrent)
  const saving = useSelector(selectGSFuelStmtSaving)

  const subdivisionsList = useSelector((s: RootState) => (s.auth as any)?.details?.details?.subdivisions ?? [])
  const gasStationsList = useSelector(selectAllGasStores)
  const allWeeks = useSelector((s: RootState) => (s as any).weeks?.weeks ?? [])
  const weeksList = useMemo(() => allWeeks.filter((w: any) => w.active === 1), [allWeeks])

  const canUpdate = permissionService.checkPermission(MODULE_SUPPLIER_FUEL_STATEMENT, UPDATE)

  const [data, setData] = useState<any>(null)
  const [searchResults, setSearchResults] = useState(false)
  const [modalInvoiceLines, setModalInvoiceLines] = useState<InvoiceLine[]>([])
  const [addedInvoices, setAddedInvoices] = useState<InvoiceLine[]>([])
  const [deletedInvoiceIds, setDeletedInvoiceIds] = useState<number[]>([])
  const [showModal, setShowModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const gasStationsOptions = gasStationsList.map((s: any) => ({
    value: s.gasStationsId ?? s.gasSupplierid, label: s.name,
  }))
  const subdivisionOptions = subdivisionsList.map((s: any) => ({
    value: s.subdivision_id, label: s.name,
  }))
  const weekOptions = weeksList.map((w: any) => ({
    value: w.id ?? w.week_id, label: w.name ?? `W${w.week_no} - ${w.week_year}`,
  }))

  useEffect(() => {
    dispatch(fetchAllGasStores())
    dispatch(loadWeeks())
    if (isCreate) {
      dispatch(setDefaultStatement())
    } else {
      const id = Number(fuelStatementId)
      if (id) dispatch(fetchGasStationFuelStatement(id))
    }
    return () => { dispatch(clearCurrent()); dispatch(resetStatuses()) }
  }, [dispatch, fuelStatementId, isCreate])

  useEffect(() => {
    if (statement) {
      setData({ ...statement })
    }
  }, [statement])

  useEffect(() => {
    if (hasSearched) {
      setData((prev: any) => prev ? { ...prev, invoiceLines: previewLines } : prev)
      setSearchResults(previewLines.length > 0)
    }
  }, [previewLines, hasSearched])

  useEffect(() => { setModalInvoiceLines(additionalLines) }, [additionalLines])

  useEffect(() => {
    if (statuses.added || statuses.updated) {
      const toast = (window as any).exaToast
      toast?.success?.('Success', statuses.added ? 'Statement was created successfully' : 'Statement was updated successfully')
      navigate('/fuel/gas-station-fuel-statement')
    }
  }, [statuses.added, statuses.updated, navigate])

  useEffect(() => {
    if (errors && typeof errors === 'object' && 'message' in errors) {
      setErrorMessage(errors.message ?? 'An error occurred')
    } else if (typeof errors === 'string') setErrorMessage(errors)
  }, [errors])

  const handleChange = useCallback((e: any) => {
    const { name, value } = e.target
    setData((prev: any) => {
      if (!prev) return prev
      const updated = { ...prev }
      if (name === 'comments') updated.comments = value
      else if (name === 'paymentStatus') updated.paid = value === 'PAID' ? 1 : 0
      else if (name === 'gasStationId') {
        updated.gasStationId = value ? Number(value) : null
        updated.invoiceLines = []
        setSearchResults(false)
      } else updated[name] = value === '' ? null : Number(value)
      return updated
    })
  }, [])

  const handleChangeMulti = useCallback((field: string, values: any[]) => {
    setData((prev: any) => {
      if (!prev) return prev
      const updated = { ...prev, [field]: values }
      if (field !== 'weekIds') { updated.invoiceLines = []; setSearchResults(false) }
      return updated
    })
  }, [])

  const handleSelectAll = useCallback((field: string, options: any[], checked: boolean) => {
    handleChangeMulti(field, checked ? options.map((o: any) => o.value) : [])
  }, [handleChangeMulti])

  const handleSearch = useCallback(() => {
    if (!data) return
    const errs: any = {}
    if (!data.gasStationId) errs.gasStationId = true
    if (!data.subdivisionIds?.length) errs.subdivisionIds = true
    if (!data.weekIds?.length) errs.weekIds = true
    if (Object.keys(errs).length) { setValidationErrors(errs); return }
    setValidationErrors(null)
    setHasSearched(true)
    dispatch(loadGSPreviewInvoiceLines({
      gasStationId: data.gasStationId,
      subdivisionIds: data.subdivisionIds,
      weekIds: data.weekIds,
    }))
  }, [data, dispatch])

  const handleSave = useCallback(() => {
    if (!data) return
    if (!data.invoiceLines?.length) { setErrorMessage('Unable to save empty statement!'); return }
    setErrorMessage(null)
    if (isCreate) dispatch(addGasStationFuelStatement(data))
    else dispatch(saveGasStationFuelStatement({
      id: data.fuelStatementId,
      data: { deletedInvoiceIds, addedInvoices, paid: data.paid },
    }))
  }, [data, isCreate, dispatch, deletedInvoiceIds, addedInvoices])

  const handleRemoveRows = useCallback((ids: string[]) => {
    setData((prev: any) => {
      if (!prev) return prev
      const removedRows = prev.invoiceLines.filter((r: InvoiceLine) => ids.includes(r.id))
      const newDeletedIds = removedRows.map((r: any) => r.invoiceLineId).filter((id: any) => id != null)
      const removedModalRows = removedRows.filter((r: any) => r.invoiceLineId == null)
      setDeletedInvoiceIds((p) => [...p, ...newDeletedIds])
      setAddedInvoices((p) => p.filter((a) => !removedModalRows.some((r: any) => r.id === a.id)))
      setModalInvoiceLines((p) => [...p, ...removedModalRows])
      return { ...prev, invoiceLines: prev.invoiceLines.filter((r: InvoiceLine) => !ids.includes(r.id)) }
    })
  }, [])

  const handleAddInvoiceLines = useCallback((lines: InvoiceLine[]) => {
    if (!lines.length) return
    setData((prev: any) => ({ ...prev, invoiceLines: [...lines, ...(prev?.invoiceLines ?? [])] }))
    setModalInvoiceLines((p) => p.filter((r) => !lines.some((l) => l.id === r.id)))
    setAddedInvoices((p) => [...p, ...lines])
  }, [])

  const paid = data?.paid === 1

  if (loadingCurrent && !isCreate) {
    return <div className="text-center py-5"><CSpinner color="primary" /></div>
  }

  const canUpdateStatus = permissionService.checkPermission(MODULE_SUPPLIER_FUEL_STATEMENT, UPDATE_STATUS)
  const gasStationName = gasStationsOptions.find((o: any) => Number(o.value) === data?.gasStationId)?.label ?? ''
  const subdivisionNames = (data?.subdivisionIds ?? []).map((id: number) => subdivisionOptions.find((o: any) => Number(o.value) === id)?.label).filter(Boolean).join(', ')
  const weekNames = (data?.weekIds ?? []).map((w: any) => typeof w === 'object' ? w.label : w).join(', ')

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>{isCreate ? 'Create' : 'Edit'} Gas Station Fuel Statement</strong>
        </CCardHeader>
        <CCardBody>
          {isCreate && data && (
            <div className="mb-4">
              <CRow className="mb-3">
                <CCol sm={3}><CFormLabel>Gas Station</CFormLabel></CCol>
                <CCol sm={9}>
                  <BoundedSelect
                    name="gasStationId"
                    value={data.gasStationId ?? ''}
                    options={gasStationsOptions}
                    placeholder="Select gas station..."
                    onChange={(name, val) => handleChange({ target: { name, value: val } } as any)}
                    invalid={!!validationErrors?.gasStationId}
                  />
                </CCol>
              </CRow>
              <MultiSelect label="Subdivisions" name="subdivisionIds" options={subdivisionOptions}
                selected={data.subdivisionIds ?? []} onChange={handleChangeMulti} onSelectAll={handleSelectAll} />
              {validationErrors?.subdivisionIds && <div className="text-danger mb-2">At least one subdivision required</div>}
              <MultiSelect label="Weeks" name="weekIds" options={weekOptions}
                selected={data.weekIds ?? []} onChange={handleChangeMulti} onSelectAll={handleSelectAll} />
              {validationErrors?.weekIds && <div className="text-danger mb-2">At least one week required</div>}
              <div className="d-flex justify-content-end">
                <CButton color="primary" onClick={handleSearch}>Search</CButton>
              </div>
            </div>
          )}

          {!isCreate && data && (
            <CRow>
              <CCol sm={12} xl={6}>
                <h6>Statement Details</h6>
                <CRow className="mb-2">
                  <CCol sm={4}><CFormLabel className="text-body-secondary">Gas Station</CFormLabel></CCol>
                  <CCol sm={8}><CFormInput value={gasStationName} disabled /></CCol>
                </CRow>
                <CRow className="mb-2">
                  <CCol sm={4}><CFormLabel className="text-body-secondary">Subdivisions</CFormLabel></CCol>
                  <CCol sm={8}><CFormInput value={subdivisionNames} disabled /></CCol>
                </CRow>
                <CRow className="mb-2">
                  <CCol sm={4}><CFormLabel className="text-body-secondary">Weeks</CFormLabel></CCol>
                  <CCol sm={8}><CFormInput value={weekNames} disabled /></CCol>
                </CRow>
                {data.comments && (
                  <CRow className="mb-2">
                    <CCol sm={4}><CFormLabel className="text-body-secondary">Notes</CFormLabel></CCol>
                    <CCol sm={8}><CFormInput value={data.comments} disabled /></CCol>
                  </CRow>
                )}
              </CCol>
              <CCol sm={12} xl={6}>
                <h6>Payment Information</h6>
                <CRow className="mb-2">
                  <CCol sm={4}><CFormLabel className="text-body-secondary">Payment Status</CFormLabel></CCol>
                  <CCol sm={8}>
                    <CFormSelect name="paymentStatus" value={paid ? 'PAID' : 'PENDING'}
                      onChange={handleChange} disabled={!canUpdateStatus}>
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                    </CFormSelect>
                  </CCol>
                </CRow>
              </CCol>
            </CRow>
          )}

          {(searchResults || !isCreate) && data && (
            <PreviewTable
              rows={data.invoiceLines ?? []}
              paid={paid}
              isCreatePage={isCreate}
              onRemoveRows={handleRemoveRows}
            />
          )}

          {isCreate && hasSearched && !searchResults && (
            <div className="alert alert-info text-center mt-3">
              No results found. Try adjusting your filters.
            </div>
          )}

          {isCreate && searchResults && (
            <CFormTextarea placeholder="Add Comments..." className="mt-3"
              value={data?.comments ?? ''}
              onChange={(e) => setData((prev: any) => prev ? { ...prev, comments: e.target.value } : prev)} />
          )}
        </CCardBody>
        <CCardFooter className="d-flex gap-2">
          <CButton color="primary" onClick={handleSave} disabled={saving}>
            {saving ? <CSpinner size="sm" /> : 'Save'}
          </CButton>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/fuel/gas-station-fuel-statement')}>
            Cancel
          </CButton>
          {!isCreate && canUpdate && !paid && (
            <CButton color="info" variant="outline" onClick={() => {
              if (data) {
                dispatch(loadGSAdditionalInvoiceLines({
                  gasStationId: data.gasStationId,
                  subdivisionIds: data.subdivisionIds,
                  weekIds: (data.weekIds ?? []).map((w: any) => typeof w === 'object' ? w.value : w),
                }))
              }
              setShowModal(true)
            }}>Add Fuel Order</CButton>
          )}
          {!isCreate && data?.fuelStatementId && (
            <>
              <CButton
                color="danger"
                variant="outline"
                onClick={() => dispatch(downloadGSFuelStatementPdf(data.fuelStatementId))}
              >
                <CIcon icon={cilCloudDownload} className="me-1" /> PDF
              </CButton>
              <CButton
                color="success"
                variant="outline"
                onClick={() => dispatch(downloadGSFuelStatementXlsx(data.fuelStatementId))}
              >
                <CIcon icon={cilCloudDownload} className="me-1" /> XLSX
              </CButton>
            </>
          )}
        </CCardFooter>
      </CCard>

      <AddFuelOrderModal visible={showModal} onClose={() => setShowModal(false)}
        invoiceLines={modalInvoiceLines} onAdd={handleAddInvoiceLines} />
      <ErrorMessageModal visible={!!errorMessage} message={errorMessage ?? ''} onClose={() => setErrorMessage(null)} />
    </>
  )
}

export default GasStationFuelStatementEditPage
