import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCol,
  CFormLabel,
  CFormSelect,
  CMultiSelect,
  CRow,
  CSpinner,
  CWidgetStatsF,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilChartPie, cilCloudDownload, cilList, cilSpreadsheet } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import WeeklyReportTable from '../components/WeeklyReportTable'
import { useGetWeeklyReportQuery } from '../api/paymentCoreApi'
import { useEntityNames } from '../hooks/useEntityNames'
import { attributesAPI } from '../../Attributes/api/attributes.api'
import { loadWeeks } from '../../Weeks/store/weeksSlice'
import { exportToXlsx } from '../../../utils/exportToXlsx'
import type { RootState, AppDispatch } from '../../../store'
import type { PaymentStatus, WeeklyReportParams } from '../types.v2'

type Currency = 'USD' | 'LPS'

const ALL_STATUSES: PaymentStatus[] = ['DRAFT', 'OPEN', 'REVIEW', 'APPROVED', 'CLOSED', 'VOID']

const PaymentReportPage: React.FC = () => {
  const { t } = useTranslation('payments')
  const dispatch = useDispatch<AppDispatch>()

  // ── State ──
  const [selectedWeekIds, setSelectedWeekIds] = useState<number[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currency, setCurrency] = useState<Currency>('LPS')
  const [exportingXlsx, setExportingXlsx] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // ── Load weeks from Redux ──
  const weeksState = useSelector((state: RootState) => (state as any).weeks || {})
  useEffect(() => { dispatch(loadWeeks()) }, [dispatch])

  const weekOptions = useMemo(() => {
    const weeks = weeksState.weeks || []
    return weeks
      .filter((w: any) => w.active === 1)
      .sort((a: any, b: any) => (b.week_id ?? 0) - (a.week_id ?? 0))
      .map((w: any) => {
        const id = Number(w.week_id ?? w.id)
        const label = w.week_no ? `W${w.week_no} - ${w.week_year}` : String(id)
        return { value: id, text: label, label }
      })
  }, [weeksState.weeks])

  // ── Entity resolution ──
  const { subdivisionNameMap } = useEntityNames()

  const [internalSupplierMap, setInternalSupplierMap] = useState<Map<string, string>>(new Map())
  const [bankNameMap, setBankNameMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    attributesAPI.getAttributeItems(136).then((items) => {
      const map = new Map<string, string>()
      for (const item of items.filter((i) => i.status === 1)) {
        map.set(String(item.attribute_item_id ?? ''), item.name)
      }
      setInternalSupplierMap(map)
    }).catch(() => {})

    attributesAPI.getAttributeItems(94).then((items) => {
      const map = new Map<string, string>()
      for (const item of items.filter((i) => i.status === 1)) {
        map.set(item.name, item.name)
      }
      setBankNameMap(map)
    }).catch(() => {})
  }, [])

  // ── API query ──
  const queryParams: WeeklyReportParams | undefined = useMemo(() => {
    if (selectedWeekIds.length === 0) return undefined
    return {
      weekIds: selectedWeekIds.join(','),
      ...(statusFilter ? { status: statusFilter as PaymentStatus } : {}),
    }
  }, [selectedWeekIds, statusFilter])

  const { data: reportData, isLoading, isFetching } = useGetWeeklyReportQuery(
    queryParams ?? undefined,
    { skip: !queryParams },
  )

  const report = reportData?.data

  // ── Summary stats ──
  const stats = useMemo(() => {
    if (!report) return null
    const curField = currency === 'USD' ? 'totalDueUsd' : 'totalDueLps'
    const total = report.rows.reduce((sum, r) => sum + r[curField], 0)
    return { count: report.rows.length, total }
  }, [report, currency])

  // ── Excel export ──
  const handleExportExcel = async () => {
    if (!report) return
    setExportingXlsx(true)
    try {
      const cols = report.chargeColumns
      const creditF = currency === 'USD' ? 'creditUsd' : 'creditLps' as const
      const debitF = currency === 'USD' ? 'debitUsd' : 'debitLps' as const
      const stmtF = currency === 'USD' ? 'statementTotalUsd' : 'statementTotalLps' as const
      const dueF = currency === 'USD' ? 'totalDueUsd' : 'totalDueLps' as const

      const columns = [
        { key: 'subdivision', label: t('weeklyReport.subdivision') },
        { key: 'internalSupplier', label: t('weeklyReport.internalSupplier') },
        { key: 'bankAccount', label: t('weeklyReport.bankAccount') },
        { key: 'totalStatements', label: t('weeklyReport.totalStatements') },
        ...cols.credits.map((name) => ({ key: `credit_${name}`, label: name })),
        { key: 'totalStmtCredits', label: t('weeklyReport.totalStmtCredits') },
        ...cols.includedDebits.map((name) => ({ key: `debit_${name}`, label: name })),
        ...(cols.otherIncludedDebits ?? []).map((name) => ({ key: `oi_${name}`, label: name })),
        { key: 'totalDebits', label: t('weeklyReport.totalInclCosts', 'Total Incl. Costs') },
        { key: 'invoice', label: t('weeklyReport.invoice') },
        ...cols.notIncludedDebits.map((name) => ({ key: `ni_${name}`, label: name })),
        { key: 'toPay', label: `${t('weeklyReport.toPay')} ${currency}` },
      ]

      const rows = report.rows.map((row) => {
        const stmtVal = row[stmtF]
        const creditsSum = row.credits.reduce((s, c) => s + (c[creditF] ?? 0), 0)
        const inclDebitsSum = row.includedDebits.reduce((s, c) => s + (c[debitF] ?? 0), 0)
        const otherInclDebitsSum = (row.otherIncludedDebits ?? []).reduce((s, c) => s + (c[debitF] ?? 0), 0)

        const flat: Record<string, any> = {
          subdivision: row.subdivisionIds.map((id) => subdivisionNameMap.get(id) || id).join(', '),
          internalSupplier:
            row.internalSupplierNames && row.internalSupplierNames.length
              ? row.internalSupplierNames.join(', ')
              : row.internalSupplierIds.map((id) => internalSupplierMap.get(id) || id).join(', '),
          bankAccount: row.bankId || '',
          totalStatements: stmtVal,
          totalStmtCredits: stmtVal + creditsSum,
          totalDebits: -(inclDebitsSum + otherInclDebitsSum),
          invoice: `#${row.paymentNumber}`,
          toPay: row[dueF],
        }

        for (const name of cols.credits) {
          const c = row.credits.find((ch) => ch.typeName === name)
          flat[`credit_${name}`] = c ? (c[creditF] ?? 0) : 0
        }
        for (const name of cols.includedDebits) {
          const c = row.includedDebits.find((ch) => ch.typeName === name)
          flat[`debit_${name}`] = c ? (c[debitF] ?? 0) : 0
        }
        for (const name of (cols.otherIncludedDebits ?? [])) {
          const c = (row.otherIncludedDebits ?? []).find((ch) => ch.typeName === name)
          flat[`oi_${name}`] = c ? (c[debitF] ?? 0) : 0
        }
        for (const name of cols.notIncludedDebits) {
          const c = row.notIncludedDebits.find((ch) => ch.typeName === name)
          flat[`ni_${name}`] = c ? (c[debitF] ?? 0) : 0
        }

        return flat
      })

      const weekLabel = selectedWeekIds.length > 0
        ? selectedWeekIds.map((id) => {
            const opt = weekOptions.find((o: any) => o.value === id)
            return opt?.label || String(id)
          }).join('_')
        : 'all'

      await exportToXlsx({
        columns,
        rows,
        fileName: `Weekly_Payment_Report_${weekLabel}.xlsx`,
        sheetName: 'Payment Report',
      })
    } finally {
      setExportingXlsx(false)
    }
  }

  // ── PDF export ──
  const handleExportPdf = async () => {
    if (!report || selectedWeekIds.length === 0) return
    setExportingPdf(true)
    try {
      const stored = localStorage.getItem('exa_auth_token')
      const parsed = stored ? JSON.parse(stored) : null

      const subNames: Record<string, string> = {}
      for (const [id, name] of subdivisionNameMap) subNames[id] = name
      const supplierNames: Record<string, string> = {}
      for (const [id, name] of internalSupplierMap) supplierNames[id] = name
      const bankNamesObj: Record<string, string> = {}
      for (const [id, name] of bankNameMap) bankNamesObj[id] = name

      const sp = new URLSearchParams()
      sp.set('weekIds', selectedWeekIds.join(','))
      if (statusFilter) sp.set('status', statusFilter)
      sp.set('currency', currency)
      if (Object.keys(subNames).length) sp.set('subdivisionNames', JSON.stringify(subNames))
      if (Object.keys(supplierNames).length) sp.set('internalSupplierNames', JSON.stringify(supplierNames))
      if (Object.keys(bankNamesObj).length) sp.set('bankNames', JSON.stringify(bankNamesObj))

      const runtimeEnv = typeof window !== 'undefined'
        ? (window as unknown as { __ENV__?: { VITE_API_URL?: string } }).__ENV__?.VITE_API_URL
        : undefined
      const apiBase = (
        (runtimeEnv && !runtimeEnv.startsWith('$') ? runtimeEnv : null)
        || import.meta.env.VITE_API_URL
        || ''
      ).replace(/\/+$/, '')

      const pdfUrl = `${apiBase}/payment-core/payments/weekly-report/pdf?${sp.toString()}`

      const res = await fetch(pdfUrl, {
        headers: parsed?.access_token ? { Authorization: `Bearer ${parsed.access_token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Weekly_Payment_Report.pdf`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 200)
    } catch (err) {
      console.error('PDF export failed', err)
    } finally {
      setExportingPdf(false)
    }
  }

  // ── Render ──
  const hasWeeks = selectedWeekIds.length > 0
  const showLoading = isLoading || isFetching

  return (
    <>
      <PageHero
        kicker="Analytics &amp; Reports"
        icon={cilChartPie}
        title={t('weeklyReport.title')}
        subtitle={t('weeklyReport.subtitle')}
      />

      {/* Filters */}
      <CCard className="shadow-sm border-0 mb-3">
        <CCardBody>
          <CRow className="g-3 align-items-end">
            <CCol xs={12} md={5}>
              <CFormLabel className="fw-semibold">{t('weeklyReport.selectWeeks')}</CFormLabel>
              <CMultiSelect
                options={weekOptions}
                placeholder={t('weeklyReport.selectWeeks')}
                onChange={(selected: any[]) => {
                  setSelectedWeekIds(selected.map((s) => Number(s.value)))
                }}
                selectionType="tags"
                search
              />
            </CCol>
            <CCol xs={12} md={3}>
              <CFormLabel className="fw-semibold">{t('weeklyReport.selectStatus')}</CFormLabel>
              <CFormSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{t('weeklyReport.allStatuses')}</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`status.${s}`)}</option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={4} className="d-flex align-items-end gap-2">
              {/* Currency toggle */}
              <CButtonGroup>
                <CButton
                  color={currency === 'USD' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setCurrency('USD')}
                >
                  USD
                </CButton>
                <CButton
                  color={currency === 'LPS' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setCurrency('LPS')}
                >
                  LPS
                </CButton>
              </CButtonGroup>

              {/* Export buttons */}
              {report && report.rows.length > 0 && (
                <>
                  <CButton
                    color="success"
                    size="sm"
                    variant="outline"
                    onClick={handleExportExcel}
                    disabled={exportingXlsx}
                  >
                    <CIcon icon={cilSpreadsheet} className="me-1" />
                    {exportingXlsx ? t('weeklyReport.exporting') : t('weeklyReport.exportExcel')}
                  </CButton>
                  <CButton
                    color="danger"
                    size="sm"
                    variant="outline"
                    onClick={handleExportPdf}
                    disabled={exportingPdf}
                  >
                    <CIcon icon={cilCloudDownload} className="me-1" />
                    {exportingPdf ? t('weeklyReport.exporting') : t('weeklyReport.exportPdf')}
                  </CButton>
                </>
              )}
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Content */}
      {!hasWeeks ? (
        <CCard className="shadow-sm border-0">
          <CCardBody className="text-center text-body-secondary py-5">
            {t('weeklyReport.selectWeeksPrompt')}
          </CCardBody>
        </CCard>
      ) : showLoading ? (
        <div className="text-center py-5">
          <CSpinner color="primary" />
        </div>
      ) : report && report.rows.length > 0 ? (
        <>
          {/* Summary widgets */}
          <CRow className="g-3 mb-3">
            <CCol xs={12} md={4}>
              <CWidgetStatsF
                className="shadow-sm"
                color="primary"
                icon={<CIcon icon={cilList} height={24} />}
                title={t('report.totalPayments')}
                value={String(stats?.count ?? 0)}
              />
            </CCol>
            <CCol xs={12} md={4}>
              <CWidgetStatsF
                className="shadow-sm"
                color={currency === 'USD' ? 'success' : 'info'}
                icon={<CIcon icon={cilChartPie} height={24} />}
                title={`${t('weeklyReport.toPay')} ${currency}`}
                value={`${currency === 'USD' ? '$' : 'L'} ${(stats?.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
            </CCol>
          </CRow>

          {/* Report table */}
          <WeeklyReportTable
            data={report}
            currency={currency}
            subdivisionNameMap={subdivisionNameMap}
            internalSupplierMap={internalSupplierMap}
            bankNameMap={bankNameMap}
          />
        </>
      ) : (
        <CCard className="shadow-sm border-0">
          <CCardBody className="text-center text-body-secondary py-5">
            {t('weeklyReport.noData')}
          </CCardBody>
        </CCard>
      )}
    </>
  )
}

export default PaymentReportPage
