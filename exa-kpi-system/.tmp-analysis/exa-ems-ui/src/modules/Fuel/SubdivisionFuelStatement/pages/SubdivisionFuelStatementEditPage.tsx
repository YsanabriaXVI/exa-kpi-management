import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CBadge, CCard, CCardBody, CCardHeader, CButton,
  CRow, CCol, CFormTextarea, CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilArrowLeft, cilPlus, cilSave } from '@coreui/icons'
import PageHero from '../../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../../store'
import { MODULE_SUBDIVISION_FUEL_STATEMENT } from '../../../../constants/modules'
import { permissionService, UPDATE } from '../../../../services/auth/permission.service'
import ErrorMessageModal from '../../../../components/ErrorMessageModal'
import BuilderForm from '../components/BuilderForm'
import PaymentInfoBox from '../components/PaymentInfoBox'
import PreviewTable from '../components/PreviewTable'
import AddFuelOrderModal from '../components/AddFuelOrderModal'
import {
  fetchSubdivisionFuelStatement,
  addSubdivisionFuelStatement,
  saveSubdivisionFuelStatement,
  loadLinkedStatements,
  loadPreviewInvoiceLines,
  loadAdditionalInvoiceLines,
  resetStatuses,
  clearCurrent,
  setDefaultStatement,
  selectSubdivFuelStmtCurrent,
  selectSubdivFuelStmtPreviewLines,
  selectSubdivFuelStmtAdditionalLines,
  selectSubdivFuelStmtLinkedStatements,
  selectSubdivFuelStmtErrors,
  selectSubdivFuelStmtStatuses,
  selectSubdivFuelStmtLoadingCurrent,
  selectSubdivFuelStmtSaving,
} from '../store/subdivisionFuelStatement.slice'
import { fetchAllGasStores, selectAllGasStores } from '../../GasSupplier/store/gasSupplier.slice'
import { loadWeeks } from '../../../Weeks/store/weeksSlice'
import { subdivisionFuelStatementApi } from '../api/subdivisionFuelStatement.api'
import type { InvoiceLine } from '../types/subdivisionFuelStatement.types'

const SubdivisionFuelStatementEditPage: React.FC = () => {
  const { fuelStatementId } = useParams<{ fuelStatementId: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const isCreate = fuelStatementId === 'new'

  const statement = useSelector(selectSubdivFuelStmtCurrent)
  const previewLines = useSelector(selectSubdivFuelStmtPreviewLines)
  const additionalLines = useSelector(selectSubdivFuelStmtAdditionalLines)
  const linkedStatementsList = useSelector(selectSubdivFuelStmtLinkedStatements)
  const errors = useSelector(selectSubdivFuelStmtErrors)
  const statuses = useSelector(selectSubdivFuelStmtStatuses)
  const loadingCurrent = useSelector(selectSubdivFuelStmtLoadingCurrent)
  const saving = useSelector(selectSubdivFuelStmtSaving)

  const subdivisionsList = useSelector((s: RootState) => (s.auth as any)?.details?.details?.subdivisions ?? [])
  const gasStationsList = useSelector(selectAllGasStores)
  const allWeeks = useSelector((s: RootState) => (s as any).weeks?.weeks ?? [])
  const weeksList = useMemo(() => allWeeks.filter((w: any) => w.active === 1), [allWeeks])

  const canUpdate = permissionService.checkPermission(MODULE_SUBDIVISION_FUEL_STATEMENT, UPDATE)

  const [data, setData] = useState<any>(null)
  const [searchResults, setSearchResults] = useState(false)
  const [statementsAvailable, setStatementsAvailable] = useState(false)
  const [modalInvoiceLines, setModalInvoiceLines] = useState<InvoiceLine[]>([])
  const [addedInvoices, setAddedInvoices] = useState<InvoiceLine[]>([])
  const [deletedInvoiceIds, setDeletedInvoiceIds] = useState<number[]>([])
  const [showModal, setShowModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const subdivisionOptions = subdivisionsList.map((s: any) => ({
    value: s.subdivision_id,
    label: s.name,
  }))
  const gasStationsOptions = gasStationsList.map((s: any) => ({
    value: s.gasStationsId ?? s.gasSupplierid,
    label: s.name,
  }))
  const weekOptions = weeksList.map((w: any) => ({
    value: w.id ?? w.week_id,
    label: w.name ?? `W${w.week_no} - ${w.week_year}`,
  }))
  const linkedStatementOptions = linkedStatementsList.map((s: any) => ({
    value: s.value ?? s,
    label: s.label ?? s,
  }))

  useEffect(() => {
    dispatch(fetchAllGasStores())
    dispatch(loadWeeks())

    if (isCreate) {
      dispatch(setDefaultStatement())
    } else {
      const id = Number(fuelStatementId)
      if (id) dispatch(fetchSubdivisionFuelStatement(id))
    }

    return () => {
      dispatch(clearCurrent())
      dispatch(resetStatuses())
    }
  }, [dispatch, fuelStatementId, isCreate])

  useEffect(() => {
    if (statement) {
      setData({ ...statement })
      if (!isCreate && statement.invoiceLines?.length > 0) {
        const rawWeekIds = (statement.weekIds ?? []).map((w: any) =>
          typeof w === 'object' ? w.value : Number(w),
        )
        const params = {
          subdivisionId: statement.subdivisionId,
          gasSupplierIds: statement.gasSupplierIds ?? [],
          weekIds: rawWeekIds,
          statementIds: statement.statementIds ?? [],
          personalizedTrips: statement.personalizedTrips ?? 'no',
        }
        dispatch(loadAdditionalInvoiceLines(params))
      }
    }
  }, [statement, isCreate, dispatch])

  useEffect(() => {
    if (previewLines.length > 0) {
      setData((prev: any) => prev ? { ...prev, invoiceLines: previewLines } : prev)
      setSearchResults(true)
    }
  }, [previewLines])

  useEffect(() => {
    setModalInvoiceLines(additionalLines)
  }, [additionalLines])

  useEffect(() => {
    setStatementsAvailable(linkedStatementsList.length > 0)
  }, [linkedStatementsList])

  useEffect(() => {
    if (statuses.added || statuses.updated) {
      const toast = (window as any).exaToast
      toast?.success?.('Success', statuses.added ? 'Statement was created successfully' : 'Statement was updated successfully')
      navigate('/fuel/subdivision-fuel-statement')
    }
  }, [statuses.added, statuses.updated, navigate])

  useEffect(() => {
    if (errors && typeof errors === 'object' && 'message' in errors) {
      setErrorMessage(errors.message ?? 'An error occurred')
    } else if (typeof errors === 'string') {
      setErrorMessage(errors)
    }
  }, [errors])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target
    setData((prev: any) => {
      if (!prev) return prev
      const updated = { ...prev }
      if (name === 'comments') {
        updated.comments = value
      } else if (name === 'personalizedTrips') {
        updated.personalizedTrips = value
        updated.invoiceLines = []
        setSearchResults(false)
      } else if (name === 'paymentStatus') {
        updated.deducted = value === 'DEDUCTED' ? 1 : 0
      } else if (name === 'subdivisionId') {
        updated.subdivisionId = value ? Number(value) : null
        updated.invoiceLines = []
        setSearchResults(false)
        if (value && updated.gasSupplierIds?.length) {
          dispatch(loadLinkedStatements({
            subdivisionId: Number(value),
            gasSupplierIds: updated.gasSupplierIds,
          }))
        }
      } else {
        updated[name] = value === '' ? null : Number(value)
      }
      return updated
    })
  }, [dispatch])

  const handleChangeMulti = useCallback((field: string, values: number[]) => {
    setData((prev: any) => {
      if (!prev) return prev
      const updated = { ...prev, [field]: values }

      if (field === 'gasSupplierIds' && values.length && prev.subdivisionId) {
        dispatch(loadLinkedStatements({ subdivisionId: prev.subdivisionId, gasSupplierIds: values }))
      }
      if (field === 'gasSupplierIds' && !values.length) {
        updated.statementIds = []
        setStatementsAvailable(false)
      }
      if (field !== 'weekIds') {
        updated.invoiceLines = []
        setSearchResults(false)
      }
      return updated
    })
  }, [dispatch])

  const handleSelectAll = useCallback((field: string, options: any[], checked: boolean) => {
    const values = checked ? options.map((o) => o.value) : []
    handleChangeMulti(field, values)
  }, [handleChangeMulti])

  const handleSearch = useCallback(() => {
    if (!data) return
    const errs: any = {}
    if (!data.subdivisionId) errs.subdivisionId = true
    if (!data.weekIds?.length) errs.weekIds = true
    if (Object.keys(errs).length) {
      setValidationErrors(errs)
      return
    }
    setValidationErrors(null)
    dispatch(loadPreviewInvoiceLines(data))
  }, [data, dispatch])

  const handleSave = useCallback(() => {
    if (!data) return
    const toast = (window as any).exaToast

    if (!data.subdivisionId) {
      toast?.error?.('Validation Error', 'Subdivision is required.')
      return
    }
    if (isCreate && (!data.weekIds || data.weekIds.length === 0)) {
      toast?.error?.('Validation Error', 'At least one week must be selected.')
      return
    }
    if (!data.invoiceLines?.length) {
      setErrorMessage('Unable to save empty statement!')
      return
    }

    const hasInvalidAmounts = data.invoiceLines.some(
      (line: InvoiceLine) => line.lempTotal == null || isNaN(Number(line.lempTotal)),
    )
    if (hasInvalidAmounts) {
      toast?.error?.('Validation Error', 'All invoice lines must have valid amounts.')
      return
    }

    setErrorMessage(null)

    if (isCreate) {
      dispatch(addSubdivisionFuelStatement(data))
    } else {
      dispatch(saveSubdivisionFuelStatement({
        id: data.fuelStatementId,
        data: { deletedInvoiceIds, addedInvoices, deducted: data.deducted },
      }))
    }
  }, [data, isCreate, dispatch, deletedInvoiceIds, addedInvoices])

  const handleRemoveRows = useCallback((ids: string[]) => {
    setData((prev: any) => {
      if (!prev) return prev
      const removedRows = prev.invoiceLines.filter((r: InvoiceLine) => ids.includes(r.id))
      const newDeletedIds = removedRows
        .map((r: any) => r.invoiceLineId)
        .filter((id: any) => id != null)
      const removedModalRows = removedRows.filter((r: any) => r.invoiceLineId == null)

      setDeletedInvoiceIds((prev) => [...prev, ...newDeletedIds])
      setAddedInvoices((prev) => prev.filter((a) => !removedModalRows.some((r: any) => r.id === a.id)))
      setModalInvoiceLines((prev) => [...prev, ...removedModalRows])

      return {
        ...prev,
        invoiceLines: prev.invoiceLines.filter((r: InvoiceLine) => !ids.includes(r.id)),
      }
    })
  }, [])

  const handleAddInvoiceLines = useCallback((lines: InvoiceLine[]) => {
    if (!lines.length) return
    setData((prev: any) => ({
      ...prev,
      invoiceLines: [...lines, ...(prev?.invoiceLines ?? [])],
    }))
    setModalInvoiceLines((prev) => prev.filter((r) => !lines.some((l) => l.id === r.id)))
    setAddedInvoices((prev) => [...prev, ...lines])
  }, [])

  const handleDownloadPdf = useCallback(async () => {
    if (!data?.fuelStatementId) return
    try {
      const blob = await subdivisionFuelStatementApi.downloadPdf(data.fuelStatementId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `subdivision_fuel_statement_${data.fuelStatementId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }, [data?.fuelStatementId])

  const handleDownloadXlsx = useCallback(async () => {
    if (!data?.fuelStatementId) return
    try {
      const blob = await subdivisionFuelStatementApi.downloadXlsx(data.fuelStatementId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `subdivision_fuel_statement_${data.fuelStatementId}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }, [data?.fuelStatementId])

  const deducted = data?.deducted === 1

  if (loadingCurrent && !isCreate) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  const invoiceLines = data?.invoiceLines ?? []
  const foTotalLps = invoiceLines.reduce((s: number, r: any) => s + (r.lempTotal ?? 0), 0)
  const foTotalDollar = invoiceLines.reduce((s: number, r: any) => s + (r.dollarTotal ?? 0), 0)
  const gsTotalLps = invoiceLines.reduce((s: number, r: any) => s + (r.gsReceiptLempTotal ?? 0), 0)
  const gsTotalDollar = invoiceLines.reduce((s: number, r: any) => s + (r.gsReceiptDollarTotal ?? 0), 0)

  const subdivisionName = subdivisionOptions.find((o: any) => Number(o.value) === data?.subdivisionId)?.label ?? ''
  const gasSupplierNames = (data?.gasSupplierIds ?? [])
    .map((id: number) => gasStationsOptions.find((o: any) => Number(o.value) === id)?.label)
    .filter(Boolean)
  const weekNames = (data?.weekIds ?? [])
    .map((w: any) => (typeof w === 'object' ? w.label : w))
    .filter(Boolean)

  if (isCreate) {
    return (
      <>
        <PageHero
          kicker="FUEL"
          title="Create Subdivision Fuel Statement"
          subtitle="Search fuel orders and build a new statement."
          actions={
            <CButton color="secondary" variant="outline" onClick={() => navigate('/fuel/subdivision-fuel-statement')}>
              <CIcon icon={cilArrowLeft} className="me-1" /> Back to List
            </CButton>
          }
        />

        <CCard className="shadow-sm border-0 mb-4">
          <CCardBody>
            <BuilderForm
              data={data}
              subdivisionOptions={subdivisionOptions}
              gasStationsOptions={gasStationsOptions}
              weekOptions={weekOptions}
              linkedStatementOptions={linkedStatementOptions}
              statementsAvailable={statementsAvailable}
              onChange={handleChange}
              onChangeMulti={handleChangeMulti}
              onSelectAll={handleSelectAll}
              onSearch={handleSearch}
              errors={validationErrors}
            />
          </CCardBody>
        </CCard>

        {searchResults && data && (
          <>
            <CCard className="shadow-sm border-0 mb-4">
              <CCardHeader><strong>Invoice Lines</strong></CCardHeader>
              <CCardBody>
                <PreviewTable
                  rows={invoiceLines}
                  deducted={deducted}
                  isCreatePage
                  onRemoveRows={handleRemoveRows}
                />
              </CCardBody>
            </CCard>

            <CCard className="shadow-sm border-0 mb-4">
              <CCardBody>
                <CFormTextarea
                  placeholder="Add Comments..."
                  rows={3}
                  value={data?.comments ?? ''}
                  onChange={(e) => setData((prev: any) => prev ? { ...prev, comments: e.target.value } : prev)}
                />
              </CCardBody>
            </CCard>
          </>
        )}

        {/* Action Bar */}
        <CCard className="shadow-sm border-0">
          <CCardBody className="d-flex justify-content-between align-items-center">
            <CButton color="secondary" variant="outline" onClick={() => navigate('/fuel/subdivision-fuel-statement')}>
              Cancel
            </CButton>
            <CButton color="primary" onClick={handleSave} disabled={saving}>
              {saving ? <CSpinner size="sm" className="me-1" /> : <CIcon icon={cilSave} className="me-1" />}
              Save Statement
            </CButton>
          </CCardBody>
        </CCard>

        <ErrorMessageModal
          visible={!!errorMessage}
          message={errorMessage ?? ''}
          onClose={() => setErrorMessage(null)}
        />
      </>
    )
  }

  // ── EDIT MODE ──
  return (
    <>
      <PageHero
        kicker="FUEL"
        title={`Fuel Statement #${data?.fuelStatementId ?? fuelStatementId}`}
        subtitle={subdivisionName || 'Subdivision Fuel Statement'}
        highlights={[
          { label: 'Invoices', value: String(invoiceLines.length), color: 'primary' },
          { label: 'FO Total $', value: `$${foTotalDollar.toFixed(2)}`, color: 'info' },
          { label: 'Status', value: deducted ? 'Deducted' : 'Not Deducted', color: deducted ? 'success' : 'warning' },
        ]}
        actions={
          <div className="d-flex gap-2">
            <CButton color="danger" variant="outline" size="sm" onClick={handleDownloadPdf}>
              <CIcon icon={cilCloudDownload} size="sm" className="me-1" /> PDF
            </CButton>
            <CButton color="success" variant="outline" size="sm" onClick={handleDownloadXlsx}>
              <CIcon icon={cilCloudDownload} size="sm" className="me-1" /> XLSX
            </CButton>
            <CButton color="secondary" variant="outline" size="sm" onClick={() => navigate('/fuel/subdivision-fuel-statement')}>
              <CIcon icon={cilArrowLeft} size="sm" className="me-1" /> Back
            </CButton>
          </div>
        }
      />

      {/* Statement Information */}
      <CCard className="shadow-sm border-0 mb-4">
        <CCardHeader><strong>Statement Information</strong></CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6} lg={3} className="mb-3">
              <div className="text-body-secondary small mb-1">Subdivision</div>
              <div className="fw-semibold">{subdivisionName || '—'}</div>
            </CCol>
            <CCol md={6} lg={3} className="mb-3">
              <div className="text-body-secondary small mb-1">Gas Suppliers</div>
              <div>{gasSupplierNames.length > 0 ? gasSupplierNames.map((n: string, i: number) => (
                <CBadge key={i} color="light" textColor="dark" className="me-1 mb-1">{n}</CBadge>
              )) : '—'}</div>
            </CCol>
            <CCol md={6} lg={3} className="mb-3">
              <div className="text-body-secondary small mb-1">Weeks</div>
              <div>{weekNames.length > 0 ? weekNames.map((w: string, i: number) => (
                <CBadge key={i} color="info" textColor="white" className="me-1 mb-1">{w}</CBadge>
              )) : '—'}</div>
            </CCol>
            <CCol md={6} lg={3} className="mb-3">
              <div className="text-body-secondary small mb-1">Payment Status</div>
              <PaymentInfoBox data={data} onChange={handleChange as any} />
            </CCol>
          </CRow>
          {data?.comments && (
            <CRow>
              <CCol>
                <div className="text-body-secondary small mb-1">Notes</div>
                <div className="bg-light p-2 rounded" style={{ fontSize: '0.9rem' }}>{data.comments}</div>
              </CCol>
            </CRow>
          )}
        </CCardBody>
      </CCard>

      {/* Financial Summary */}
      <CCard className="shadow-sm border-0 mb-4">
        <CCardBody>
          <CRow className="text-center">
            <CCol>
              <div className="text-body-secondary small">FO Total Lps</div>
              <div className="fs-5 fw-bold text-primary">L {foTotalLps.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </CCol>
            <CCol>
              <div className="text-body-secondary small">GS Receipt Total Lps</div>
              <div className="fs-5 fw-bold">L {gsTotalLps.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </CCol>
            <CCol>
              <div className="text-body-secondary small">FO Total $</div>
              <div className="fs-5 fw-bold text-success">$ {foTotalDollar.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </CCol>
            <CCol>
              <div className="text-body-secondary small">GS Receipt Total $</div>
              <div className="fs-5 fw-bold">$ {gsTotalDollar.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </CCol>
            <CCol>
              <div className="text-body-secondary small">Total Invoices</div>
              <div className="fs-5 fw-bold">{invoiceLines.length}</div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Invoice Lines */}
      <CCard className="shadow-sm border-0 mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <strong>Invoice Lines</strong>
            <CBadge color="primary" shape="rounded-pill">{invoiceLines.length}</CBadge>
          </div>
          {canUpdate && !deducted && (
            <CButton color="info" size="sm" onClick={() => setShowModal(true)}>
              <CIcon icon={cilPlus} size="sm" className="me-1" /> Add Fuel Order
            </CButton>
          )}
        </CCardHeader>
        <CCardBody>
          <PreviewTable
            rows={invoiceLines}
            deducted={deducted}
            isCreatePage={false}
            onRemoveRows={handleRemoveRows}
          />
        </CCardBody>
      </CCard>

      {/* Action Bar */}
      <CCard className="shadow-sm border-0">
        <CCardBody className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <CBadge color={deducted ? 'success' : 'warning'} shape="rounded-pill" className="px-3 py-2">
              {deducted ? 'Deducted' : 'Not Deducted'}
            </CBadge>
            <span className="text-body-secondary">Statement #{data?.fuelStatementId}</span>
          </div>
          <div className="d-flex gap-2">
            <CButton color="secondary" variant="outline" onClick={() => navigate('/fuel/subdivision-fuel-statement')}>
              Cancel
            </CButton>
            <CButton color="primary" onClick={handleSave} disabled={saving}>
              {saving ? <CSpinner size="sm" className="me-1" /> : <CIcon icon={cilSave} className="me-1" />}
              Save Changes
            </CButton>
          </div>
        </CCardBody>
      </CCard>

      <AddFuelOrderModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        invoiceLines={modalInvoiceLines}
        onAdd={handleAddInvoiceLines}
      />

      <ErrorMessageModal
        visible={!!errorMessage}
        message={errorMessage ?? ''}
        onClose={() => setErrorMessage(null)}
      />
    </>
  )
}

export default SubdivisionFuelStatementEditPage
