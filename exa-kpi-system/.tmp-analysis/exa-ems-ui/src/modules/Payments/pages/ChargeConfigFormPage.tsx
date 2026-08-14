import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CFormSwitch,
  CFormTextarea,
  CMultiSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCalculator, cilLockLocked, cilPencil, cilPlus, cilPrint, cilTrash } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import { loadClients } from '../../Assets/Clients/store/clients.slice'
import { loadSubdivisions } from '../../Assets/Subdivisions/store/subdivisions.slice'
import { loadDrivers } from '../../Assets/Drivers/store/drivers.slice'
import { loadTrucks } from '../../Assets/Trucks/store/trucks.slice'
import { fetchSuppliers } from '../../Fuel/GasSupplier/store/gasSupplier.slice'
import type { RootState, AppDispatch } from '../../../store'
import { attributesAPI } from '../../Attributes/api/attributes.api'
import FormDirtyGuard from '../components/FormDirtyGuard'
import ChargeConfigAuditTrailCard from '../components/ChargeConfigAuditTrailCard'
import InstallmentSummaryCard from '../components/InstallmentSummaryCard'
import RestructureChargeConfigModal from '../components/RestructureChargeConfigModal'
import {
  useGetChargeConfigByIdQuery,
  useCreateChargeConfigMutation,
  useUpdateChargeConfigMutation,
  useGetChargeConfigInstallmentsQuery,
  useGetInstallmentSummaryQuery,
  useGetExchangeRatesQuery,
} from '../api/paymentCoreApi'
import type {
  AppliesToType,
  CalculationBase,
  CalculationType,
  CreateChargeConfigInput,
  FrequencyType,
  UpdateChargeConfigInput,
} from '../types.v2'

const ALL_APPLIES_TO: AppliesToType[] = ['SUBDIVISION', 'TRUCK', 'DRIVER', 'SUBDIVISION_TRUCK', 'SUBDIVISION_DRIVER', 'CLIENT', 'GAS_SUPPLIER']
const ALL_CALC_TYPES: CalculationType[] = ['PERCENT', 'FIXED_AMOUNT']
const ALL_CALC_BASES: CalculationBase[] = ['KMS', 'TOTAL_STATEMENT_USD', 'TOTAL_STATEMENT_KMS', 'CLIENT_STATEMENT_USD', 'CLIENT_STATEMENT_KMS', 'TRIPS']
const ALL_FREQUENCIES: FrequencyType[] = ['WEEKLY', 'MONTHLY', 'ANNUALLY']
const SCOPE_ENTITY_TYPES = ['CLIENT', 'SUBDIVISION', 'TRUCK', 'DRIVER', 'GAS_SUPPLIER', 'INTERNAL_SUPPLIER'] as const

const INSTALLMENT_PAGE_SIZES = [10, 25, 50, 100]
type DisplayCurrency = 'USD' | 'HNL' | 'GTQ'
const CURRENCY_PREFIX: Record<DisplayCurrency, string> = { USD: '$', HNL: 'L', GTQ: 'Q' }

const buildPageList = (current: number, total: number, maxLength = 5) => {
  if (total <= 0) return [1]
  const safeMax = Math.max(1, maxLength)
  const half = Math.floor(safeMax / 2)
  let start = Math.max(1, current - half)
  const end = Math.min(total, start + safeMax - 1)
  if (end - start + 1 < safeMax) {
    start = Math.max(1, end - safeMax + 1)
  }
  const pages: number[] = []
  for (let page = start; page <= end; page += 1) pages.push(page)
  return pages
}

const APPLIES_TO_SCOPE_MAP: Record<string, string[]> = {
  CLIENT: ['CLIENT'],
  SUBDIVISION: ['SUBDIVISION'],
  DRIVER: ['DRIVER'],
  TRUCK: ['TRUCK'],
  SUBDIVISION_TRUCK: ['SUBDIVISION', 'TRUCK'],
  SUBDIVISION_DRIVER: ['SUBDIVISION', 'DRIVER'],
  GAS_SUPPLIER: ['GAS_SUPPLIER'],
}

interface ScopeRow {
  key: number
  entityType: string
  entityIds: string[]   // supports multi-select; backend still stores one row per entityId
  allEntities: boolean
}

const ChargeConfigFormPage: React.FC = () => {
  const { t } = useTranslation('payments')
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isViewMode = searchParams.get('mode') === 'view'
  const isEdit = Boolean(id)

  // Load entity lists for scope dropdowns
  const clientsState = useSelector((state: RootState) => (state as any).clients || {})
  const subdivisionsState = useSelector((state: RootState) => (state as any).subdivisions || {})
  const driversState = useSelector((state: RootState) => (state as any).drivers || {})
  const trucksState = useSelector((state: RootState) => (state as any).trucks || {})
  const gasSupplierState = useSelector((state: RootState) => (state as any).gasSupplier || {})

  useEffect(() => {
    dispatch(loadClients())
    dispatch(loadSubdivisions())
    dispatch(loadDrivers())
    dispatch(loadTrucks())
    dispatch(fetchSuppliers())
  }, [dispatch])

  const { data: existing, isLoading: isLoadingExisting } = useGetChargeConfigByIdQuery(id!, { skip: !id })
  const [createConfig, { isLoading: isCreating }] = useCreateChargeConfigMutation()
  const [updateConfig, { isLoading: isUpdating }] = useUpdateChargeConfigMutation()
  const isSaving = isCreating || isUpdating
  const hasActiveCharges = isEdit && (existing?.data?.paymentChargeCount ?? 0) > 0

  // Installment pagination (persisted list — Block B)
  const [installmentPage, setInstallmentPage] = useState(1)
  const [installmentPageSize, setInstallmentPageSize] = useState(10)

  // Installment preview pagination (client-side — Block A)
  const [previewPage, setPreviewPage] = useState(1)
  const [previewPageSize, setPreviewPageSize] = useState(10)

  // Installments for flexible configs in edit mode
  const { data: installmentsData, isLoading: isLoadingInstallments } = useGetChargeConfigInstallmentsQuery(
    { configId: id!, page: installmentPage, pageSize: installmentPageSize },
    { skip: !isEdit || !id },
  )
  const installments = installmentsData?.data ?? []
  const installmentMeta = installmentsData?.meta

  // Installment summary (used for lock detection across all pages)
  const { data: summaryData } = useGetInstallmentSummaryQuery(id!, {
    skip: !isEdit || !id,
  })

  // Currency conversion
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD')

  // General info
  const [name, setName] = useState('')
  const [nameEs, setNameEs] = useState('')
  const [description, setDescription] = useState('')
  const [entryType, setEntryType] = useState<'DEBIT' | 'CREDIT'>('DEBIT')
  const [appliesTo, setAppliesTo] = useState<AppliesToType>('SUBDIVISION')
  const [costType, setCostType] = useState<'INCLUDED' | 'OTHER_INCLUDED' | 'NOT_INCLUDED'>('NOT_INCLUDED')
  const [isAdjustment, setIsAdjustment] = useState(false)
  const [isMandatory, setIsMandatory] = useState(false)

  // Category (restored — sourced from attribute group 93). Drives the named
  // line/column in the payment breakdown & report.
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryOptions, setCategoryOptions] = useState<{ value: number; label: string }[]>([])

  useEffect(() => {
    attributesAPI.getAttributeItems(93)
      .then((items) => {
        setCategoryOptions(
          (items || []).map((i: any) => ({ value: i.attribute_item_id, label: i.name }))
        )
      })
      .catch(() => setCategoryOptions([]))
  }, [])

  // Charge type
  const [chargeType, setChargeType] = useState<'CALCULATED' | 'FLEXIBLE'>('CALCULATED')

  // Calculated rule
  const [calculationType, setCalculationType] = useState<CalculationType>('PERCENT')
  const [calculationBase, setCalculationBase] = useState<CalculationBase>('KMS')
  const [calcValue, setCalcValue] = useState('')
  const [calcPeriod, setCalcPeriod] = useState<FrequencyType>('MONTHLY')
  const [calcStartDate, setCalcStartDate] = useState('')
  const [calcEndDate, setCalcEndDate] = useState('')
  const [calcCurrency, setCalcCurrency] = useState<'USD' | 'HNL'>('USD')

  // Flexible rule
  const [flexTotalValue, setFlexTotalValue] = useState('')
  const [flexInstallmentCount, setFlexInstallmentCount] = useState('')
  const [flexFrequency, setFlexFrequency] = useState<FrequencyType>('MONTHLY')
  const [flexStartDate, setFlexStartDate] = useState('')
  const [flexCurrency, setFlexCurrency] = useState<'USD' | 'HNL'>('USD')
  // Legacy-loan onboarding: number of installments to mark as already paid at creation.
  // Create-only — hidden/disabled in edit mode because the decision is immutable once committed.
  const [flexInitialPaidCount, setFlexInitialPaidCount] = useState('')

  // Scopes
  const [internalSuppliers, setInternalSuppliers] = useState<{ value: string; label: string; subdivision_id: number | null }[]>([])
  const [showAllSuppliers, setShowAllSuppliers] = useState(false)
  const [scopes, setScopes] = useState<ScopeRow[]>([])
  const [scopeKeyCounter, setScopeKeyCounter] = useState(0)

  // Bulk create mode (create only, TRUCK/DRIVER appliesTo)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkEntityIds, setBulkEntityIds] = useState<string[]>([])
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null)

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Restructure modal state (Option 2 — flexible-schedule reshape)
  const [restructureOpen, setRestructureOpen] = useState(false)

  // Lock detection: use summary to check across ALL installments, not just current page
  const hasDeductedInstallments = (summaryData?.data?.paidCount ?? 0) > 0
  const hasAnyInstallments = (summaryData?.data?.installmentCount ?? 0) > 0
  const isLocked = isEdit && chargeType === 'FLEXIBLE' && hasDeductedInstallments
  // Scopes use a broader lock: once ANY installments exist (including NOT_PAID), the
  // scope can't change because the installments were generated against the current scope
  // configuration. Restructure changes the schedule but not the scope.
  const isScopeLocked = isEdit && chargeType === 'FLEXIBLE' && hasAnyInstallments
  const isReadOnly = isViewMode

  // Currency conversion for installment display
  const configCurrency = chargeType === 'FLEXIBLE' ? flexCurrency : 'USD'
  const needsRate = configCurrency !== displayCurrency
  const { data: ratesData } = useGetExchangeRatesQuery(undefined, {
    skip: !needsRate,
  })
  const exchangeRate = displayCurrency !== 'USD'
    ? ratesData?.data?.rates?.[displayCurrency] ?? undefined
    : configCurrency !== 'USD'
      ? ratesData?.data?.rates?.[configCurrency] ?? undefined
      : undefined
  const fmtAmount = (value: number | null | undefined) => {
    if (value == null) return '—'
    let converted = value
    if (configCurrency !== displayCurrency && exchangeRate) {
      converted = configCurrency === 'USD' ? value * exchangeRate : value / exchangeRate
    }
    return `${CURRENCY_PREFIX[displayCurrency]} ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Dirty tracking for FormDirtyGuard
  const [isDirty, setIsDirty] = useState(false)
  const [formInitialized, setFormInitialized] = useState(false)

  // Populate form on edit
  useEffect(() => {
    if (!existing?.data) return
    const d = existing.data
    setName(d.name)
    setNameEs(d.nameEs ?? '')
    setDescription(d.description ?? '')
    setEntryType(d.entryType)
    setAppliesTo(d.appliesTo)
    setCostType(d.costType)
    setCategoryId(d.categoryId ?? null)
    setCategoryName(d.categoryName ?? '')
    setIsAdjustment(d.adjustment)
    setIsMandatory(d.mandatory)
    setChargeType(d.chargeType === 'calculated' ? 'CALCULATED' : 'FLEXIBLE')

    if (d.calculatedConfig) {
      setCalculationType(d.calculatedConfig.calculationType)
      setCalculationBase(d.calculatedConfig.calculationBase)
      setCalcValue(String(d.calculatedConfig.value))
      setCalcPeriod(d.calculatedConfig.period)
      setCalcStartDate(d.calculatedConfig.startDate?.slice(0, 10) ?? '')
      setCalcEndDate(d.calculatedConfig.endDate?.slice(0, 10) ?? '')
      setCalcCurrency((d.calculatedConfig as any).currency ?? 'USD')
    }

    if (d.flexibleConfig) {
      setFlexTotalValue(String(d.flexibleConfig.totalValue))
      setFlexInstallmentCount(String(d.flexibleConfig.installmentCount))
      setFlexFrequency(d.flexibleConfig.frequency)
      setFlexStartDate(d.flexibleConfig.startDate?.slice(0, 10) ?? '')
      const fc = d.flexibleConfig.currency ?? 'USD'
      setFlexCurrency(fc)
      setDisplayCurrency(fc)
    }

    if (d.scopes?.length) {
      // Group backend scope rows by entityType so each entity type shows one
      // multi-select row with all its entityIds pre-selected. The backend
      // stores one row per entityId; the UI merges them for a cleaner UX.
      const grouped = new Map<string, ScopeRow>()
      d.scopes.forEach((s, i) => {
        const existing = grouped.get(s.entityType)
        if (existing) {
          if (s.entityId) existing.entityIds.push(s.entityId)
          if (s.allEntities) existing.allEntities = true
        } else {
          grouped.set(s.entityType, {
            key: i,
            entityType: s.entityType,
            entityIds: s.entityId ? [s.entityId] : [],
            allEntities: s.allEntities,
          })
        }
      })
      const rows = Array.from(grouped.values())
      setScopes(rows)
      setScopeKeyCounter(rows.length)
    }
  }, [existing])

  // Mark form initialized after first render / data load
  useEffect(() => {
    if (!isEdit || existing?.data) {
      const timer = setTimeout(() => setFormInitialized(true), 100)
      return () => clearTimeout(timer)
    }
  }, [isEdit, existing])

  // Load internal suppliers from PHP API
  useEffect(() => {
    const loadInternalSuppliers = async () => {
      try {
        const token = localStorage.getItem('token') || ''
        const resp = await fetch(
          `${(window as any).__RUNTIME_CONFIG__?.REACT_APP_API_URL || process.env.REACT_APP_API_URL || ''}/attributes/136/items`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (resp.ok) {
          const data = await resp.json()
          const items = data?.attribute_items || data?.data?.attribute_items || data?.items || []
          setInternalSuppliers(
            items.map((item: any) => ({
              value: String(item.attribute_item_id ?? item.id ?? ''),
              label: item.name || item.value || `Item #${item.attribute_item_id ?? item.id}`,
              subdivision_id: item.subdivision_id != null ? Number(item.subdivision_id) : null,
            }))
          )
        }
      } catch {
        // silent — internal supplier dropdown will just be empty
      }
    }
    loadInternalSuppliers()
  }, [])

  // Track dirty state after form is initialized
  useEffect(() => {
    if (formInitialized) setIsDirty(true)
  }, [name, nameEs, description, entryType, appliesTo, costType, categoryId, categoryName, isAdjustment, isMandatory,
      chargeType, calculationType, calculationBase, calcValue, calcPeriod, calcStartDate,
      calcEndDate, calcCurrency, flexTotalValue, flexInstallmentCount, flexFrequency, flexStartDate, flexInitialPaidCount, scopes])

  // Installment preview
  const installmentPreview = useMemo(() => {
    if (chargeType !== 'FLEXIBLE') return []
    const total = parseFloat(flexTotalValue)
    const count = parseInt(flexInstallmentCount, 10)
    if (!total || !count || count < 1 || !flexStartDate) return []

    // Legacy-loan onboarding: clamp [0, count] so the preview always matches
    // what the backend will actually create, even mid-typing.
    const initialPaid = Math.max(
      0,
      Math.min(count, parseInt(flexInitialPaidCount, 10) || 0),
    )
    const perInstallment = Math.round((total / count) * 100) / 100
    const rows: { num: number; date: string; amount: number; isInitialPaid: boolean }[] = []
    const start = new Date(flexStartDate + 'T00:00:00')

    for (let i = 0; i < count; i++) {
      const d = new Date(start)
      if (flexFrequency === 'WEEKLY') {
        d.setDate(d.getDate() + i * 7)
      } else if (flexFrequency === 'ANNUALLY') {
        d.setFullYear(d.getFullYear() + i)
      } else {
        d.setMonth(d.getMonth() + i)
      }
      rows.push({
        num: i + 1,
        date: d.toLocaleDateString(),
        amount: i === count - 1 ? Math.round((total - perInstallment * (count - 1)) * 100) / 100 : perInstallment,
        isInitialPaid: i < initialPaid,
      })
    }
    return rows
  }, [chargeType, flexTotalValue, flexInstallmentCount, flexFrequency, flexStartDate, flexInitialPaidCount])

  const previewLastPage = Math.max(1, Math.ceil(installmentPreview.length / previewPageSize))

  // Snap previewPage back into range when the underlying preview shrinks
  // (e.g. user reduces installmentCount below the current page boundary)
  useEffect(() => {
    if (previewPage > previewLastPage) setPreviewPage(1)
  }, [previewLastPage, previewPage])

  const pagedPreview = useMemo(() => {
    const start = (previewPage - 1) * previewPageSize
    return installmentPreview.slice(start, start + previewPageSize)
  }, [installmentPreview, previewPage, previewPageSize])

  const allowedScopeEntityTypes = useMemo(() => {
    return APPLIES_TO_SCOPE_MAP[appliesTo] ?? SCOPE_ENTITY_TYPES.slice()
  }, [appliesTo])

  // Clear invalid scopes when appliesTo changes
  useEffect(() => {
    if (!formInitialized) return
    const allowed = APPLIES_TO_SCOPE_MAP[appliesTo] ?? (SCOPE_ENTITY_TYPES as unknown as string[])
    setScopes((prev) => prev.filter((s) => !s.entityType || allowed.includes(s.entityType)))
  }, [appliesTo, formInitialized])

  const bulkAppliesTo = ['TRUCK', 'SUBDIVISION_TRUCK', 'DRIVER', 'SUBDIVISION_DRIVER'].includes(appliesTo)
  useEffect(() => {
    if (!bulkAppliesTo) { setBulkMode(false); setBulkEntityIds([]) }
  }, [bulkAppliesTo])

  // Build lookup maps for cross-referencing entities
  const subdivisionNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of subdivisionsState.list || []) {
      map[String(s.subdivision_id ?? s.id ?? '')] = s.name || ''
    }
    return map
  }, [subdivisionsState.list])

  const driverNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of driversState.list || []) {
      const attrs = d.attributes || {}
      const firstName = d.first_name || attrs['21'] || ''
      const lastName = d.last_name || attrs['22'] || ''
      const name = `${firstName} ${lastName}`.trim()
      if (name) map[String(d.asset_id ?? d.id ?? '')] = name
    }
    return map
  }, [driversState.list])

  const truckPlateMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of trucksState.list || []) {
      const attrs = t.attributes || {}
      const plate = t.truck_plate || attrs['8'] || ''
      if (plate) map[String(t.asset_id ?? t.id ?? '')] = plate
    }
    return map
  }, [trucksState.list])

  const subdivisionIdByNameOrId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of subdivisionsState.list || []) {
      const id = String(s.subdivision_id ?? s.id ?? '')
      if (!id) continue
      map[id] = id
      const name = s.name || ''
      if (name) map[name] = id
    }
    return map
  }, [subdivisionsState.list])

  const truckSubdivisionMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of trucksState.list || []) {
      const attrs = t.attributes || {}
      const raw = String(t.subdivision || attrs['13'] || '')
      const subId = subdivisionIdByNameOrId[raw]
      if (subId) map[String(t.asset_id ?? t.id ?? '')] = subId
    }
    return map
  }, [trucksState.list, subdivisionIdByNameOrId])

  const driverSubdivisionMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of driversState.list || []) {
      const attrs = d.attributes || {}
      const raw = String(d.subdivision || attrs['25'] || '')
      const subId = subdivisionIdByNameOrId[raw]
      if (subId) map[String(d.asset_id ?? d.id ?? '')] = subId
    }
    return map
  }, [driversState.list, subdivisionIdByNameOrId])

  // Subdivisions currently chosen as SUBDIVISION scopes — used to default-filter
  // the internal-supplier options to the relevant subdivisions.
  const selectedSubdivisionIds = useMemo(() => {
    const set = new Set<string>()
    for (const s of scopes) {
      if (s.entityType === 'SUBDIVISION' && !s.allEntities) {
        for (const id of s.entityIds) set.add(String(id))
      }
    }
    return set
  }, [scopes])

  // Already-selected internal suppliers must never be hidden by the filter.
  const selectedInternalSupplierIds = useMemo(() => {
    const set = new Set<string>()
    for (const s of scopes) {
      if (s.entityType === 'INTERNAL_SUPPLIER') {
        for (const id of s.entityIds) set.add(String(id))
      }
    }
    return set
  }, [scopes])

  // Group internal suppliers by subdivision name and (by default) filter to the
  // subdivisions chosen in SUBDIVISION scopes; a "Show all" toggle bypasses it.
  const internalSupplierOptions = useMemo(() => {
    const grouped = internalSuppliers.map((s) => ({
      ...s,
      groupName:
        s.subdivision_id != null
          ? subdivisionNameMap[String(s.subdivision_id)] || `Subdivision #${s.subdivision_id}`
          : 'Unassigned',
    }))
    const shouldFilter = selectedSubdivisionIds.size > 0 && !showAllSuppliers
    const filtered = shouldFilter
      ? grouped.filter(
          (s) =>
            (s.subdivision_id != null && selectedSubdivisionIds.has(String(s.subdivision_id))) ||
            selectedInternalSupplierIds.has(s.value),
        )
      : grouped
    return [...filtered]
      .sort((a, b) => a.groupName.localeCompare(b.groupName) || a.label.localeCompare(b.label))
      .map((s) => ({ value: s.value, label: `${s.groupName} | ${s.label}` }))
  }, [internalSuppliers, subdivisionNameMap, selectedSubdivisionIds, selectedInternalSupplierIds, showAllSuppliers])

  const entityOptionsMap = useMemo(() => ({
    CLIENT: (clientsState.list || []).map((c: any) => ({
      value: String(c.client_id ?? c.id ?? ''),
      label: c.name || `Client #${c.client_id ?? c.id}`,
    })),
    SUBDIVISION: (subdivisionsState.list || []).map((s: any) => ({
      value: String(s.subdivision_id ?? s.id ?? ''),
      label: s.name || `Subdivision #${s.subdivision_id ?? s.id}`,
    })),
    DRIVER: (driversState.list || []).map((d: any) => {
      const attrs = d.attributes || {}
      const firstName = d.first_name || attrs['21'] || ''
      const lastName = d.last_name || attrs['22'] || ''
      const fullName = `${firstName} ${lastName}`.trim()
      const parts = [fullName || `Driver #${d.asset_id ?? d.id}`]
      const truckId = d.truck_assigned || attrs['27'] || ''
      if (truckId && truckPlateMap[String(truckId)]) parts.push(truckPlateMap[String(truckId)])
      const subVal = d.subdivision || attrs['25'] || ''
      if (subVal) parts.push(subdivisionNameMap[String(subVal)] || String(subVal))
      return {
        value: String(d.asset_id ?? d.id ?? ''),
        label: parts.join(' | '),
      }
    }),
    TRUCK: (trucksState.list || []).map((t: any) => {
      const attrs = t.attributes || {}
      const plate = t.truck_plate || attrs['8'] || ''
      const parts = [plate || `Truck #${t.asset_id ?? t.id}`]
      const driverId = t.driver_assigned || attrs['53'] || ''
      if (driverId && driverNameMap[String(driverId)]) parts.push(driverNameMap[String(driverId)])
      const subVal = t.subdivision || attrs['13'] || ''
      if (subVal) parts.push(subdivisionNameMap[String(subVal)] || String(subVal))
      return {
        value: String(t.asset_id ?? t.id ?? ''),
        label: parts.join(' | '),
      }
    }),
    GAS_SUPPLIER: (gasSupplierState.list || []).map((g: any) => ({
      value: String(g.gasStationsParentId ?? g.id ?? ''),
      label: g.name || `Supplier #${g.gasStationsParentId ?? g.id}`,
    })),
    INTERNAL_SUPPLIER: internalSupplierOptions,
  }), [clientsState.list, subdivisionsState.list, driversState.list, trucksState.list, gasSupplierState.list, internalSupplierOptions, subdivisionNameMap, driverNameMap, truckPlateMap])

  const bulkEntityType = ['TRUCK', 'SUBDIVISION_TRUCK'].includes(appliesTo) ? 'TRUCK' : 'DRIVER'
  const bulkEntityOptions = bulkMode ? (entityOptionsMap[bulkEntityType] || []) : []
  const bulkPreviewNames = useMemo(() => {
    if (!bulkMode || bulkEntityIds.length === 0) return []
    const nameBase = name.trim() || '...'
    return bulkEntityIds.map((eid) => {
      const label = bulkEntityType === 'TRUCK'
        ? (truckPlateMap[eid] || eid)
        : (driverNameMap[eid] || eid)
      return `${nameBase} ${label}`
    })
  }, [bulkMode, bulkEntityIds, name, bulkEntityType, truckPlateMap, driverNameMap])

  const addScope = () => {
    setScopes((prev) => [...prev, { key: scopeKeyCounter, entityType: '', entityIds: [], allEntities: false }])
    setScopeKeyCounter((c) => c + 1)
  }

  const removeScope = (key: number) => {
    setScopes((prev) => prev.filter((s) => s.key !== key))
  }

  const updateScope = (key: number, field: keyof ScopeRow, value: string | string[] | boolean) => {
    setScopes((prev) => prev.map((s) => {
      if (s.key !== key) return s
      if (field === 'entityType') return { ...s, entityType: value as string, entityIds: [] }
      return { ...s, [field]: value }
    }))
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    const req = t('validation.required')
    const mandatoryReq = t('chargeConfig.validation.mandatoryFieldRequired', { defaultValue: 'Required for mandatory charges' })
    if (!name.trim()) errs.name = req
    if (!entryType) errs.entryType = req
    if (!appliesTo) errs.appliesTo = req

    if (chargeType === 'CALCULATED') {
      if (!calculationType) errs.calculationType = isMandatory ? mandatoryReq : req
      if (calculationType !== 'FIXED_AMOUNT' && !calculationBase) errs.calculationBase = isMandatory ? mandatoryReq : req
      const v = parseFloat(calcValue)
      if (!v || v <= 0) errs.calcValue = t('validation.mustBePositive', { field: t('chargeConfig.form.value') })
      if (!calcStartDate) errs.calcStartDate = isMandatory ? mandatoryReq : req
    }

    if (chargeType === 'FLEXIBLE') {
      const tv = parseFloat(flexTotalValue)
      if (!tv || tv <= 0) errs.flexTotalValue = t('validation.mustBePositive', { field: t('chargeConfig.form.totalValue') })
      const ic = parseInt(flexInstallmentCount, 10)
      if (!ic || ic < 1) errs.flexInstallmentCount = isMandatory
        ? t('chargeConfig.validation.mandatoryInstallments', { defaultValue: 'Mandatory charges require at least 1 installment' })
        : t('validation.mustBePositive', { field: t('chargeConfig.form.installmentCount') })
      if (!flexFrequency) errs.flexFrequency = isMandatory ? mandatoryReq : req
      if (!flexStartDate) errs.flexStartDate = isMandatory ? mandatoryReq : req

      // Legacy-loan onboarding: optional, but must be a non-negative integer
      // not exceeding installmentCount. Only validated on create (the field is
      // hidden in edit mode).
      if (!isEdit && flexInitialPaidCount) {
        const ipc = parseInt(flexInitialPaidCount, 10)
        if (Number.isNaN(ipc) || ipc < 0 || !Number.isInteger(Number(flexInitialPaidCount))) {
          errs.flexInitialPaidCount = t('chargeConfig.validation.initialPaidCountInteger', {
            defaultValue: 'Must be a non-negative integer',
          })
        } else if (ic && ipc > ic) {
          errs.flexInitialPaidCount = t('chargeConfig.validation.initialPaidCountExceedsTotal', {
            defaultValue: 'Cannot exceed installment count',
          })
        }
      }
    }

    // When mandatory, enforce that the charge rule section is complete
    if (isMandatory) {
      if (chargeType === 'FLEXIBLE') {
        const tv = parseFloat(flexTotalValue)
        const ic = parseInt(flexInstallmentCount, 10)
        if (!tv || tv <= 0 || !ic || ic < 1 || !flexFrequency || !flexStartDate) {
          errs.mandatoryRule = t('chargeConfig.validation.mandatoryIncomplete', {
            defaultValue: 'Mandatory charges require a complete installment definition (total value, installment count, frequency, and start date)',
          })
        }
      }
      if (chargeType === 'CALCULATED') {
        const v = parseFloat(calcValue)
        const needsBase = calculationType !== 'FIXED_AMOUNT'
        if (!calculationType || (needsBase && !calculationBase) || !v || v <= 0 || !calcStartDate) {
          errs.mandatoryRule = t('chargeConfig.validation.mandatoryIncomplete', {
            defaultValue: 'Mandatory charges require a complete rule definition (calculation type, base, value, and start date)',
          })
        }
      }
    }

    if (bulkMode) {
      if (bulkEntityIds.length === 0) errs.bulkEntities = req
    } else {
      for (const scope of scopes) {
        if (!scope.entityType) { errs[`scope_${scope.key}_type`] = req; break }
        if (!scope.allEntities && scope.entityIds.length === 0) { errs[`scope_${scope.key}_id`] = req; break }
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    const base: CreateChargeConfigInput = {
      name: name.trim(),
      ...(nameEs.trim() ? { nameEs: nameEs.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      entry: entryType,
      appliesToType: appliesTo,
      chargeType,
      costType,
      categoryId: categoryId ?? null,
      categoryName: categoryName || null,
      isAdjustment,
      isMandatory,
      ...(chargeType === 'CALCULATED' ? {
        calculatedRule: {
          calculationType,
          calculationBase,
          value: parseFloat(calcValue),
          period: calcPeriod,
          startDate: calcStartDate,
          ...(calcEndDate ? { endDate: calcEndDate } : {}),
          currency: calcCurrency,
        },
      } : {}),
      ...(chargeType === 'FLEXIBLE' ? {
        flexibleRule: {
          totalValue: parseFloat(flexTotalValue),
          installmentCount: parseInt(flexInstallmentCount, 10),
          frequency: flexFrequency,
          startDate: flexStartDate,
          currency: flexCurrency,
          // Legacy-loan onboarding — only send when > 0 and only on create
          // (the field is hidden in edit mode and the backend PUT guard
          // rejects any flexibleRule update anyway).
          ...(!isEdit && parseInt(flexInitialPaidCount, 10) > 0
            ? { initialPaidCount: parseInt(flexInitialPaidCount, 10) }
            : {}),
        },
      } : {}),
      ...(scopes.length ? {
        scopes: (() => {
          type ScopeEntry = { entityType: string; entityId?: string; allEntities?: boolean }
          const flat: ScopeEntry[] = scopes.flatMap((s) => {
            if (s.allEntities) {
              return [{ entityType: s.entityType, allEntities: true }]
            }
            if (s.entityIds.length === 0) {
              return [{ entityType: s.entityType }]
            }
            return s.entityIds.map((eid) => ({
              entityType: s.entityType,
              entityId: eid,
            }))
          })
          const existingSubIds = new Set(
            flat.filter((r) => r.entityType === 'SUBDIVISION' && r.entityId).map((r) => r.entityId),
          )
          const injected: ScopeEntry[] = []
          for (const row of flat) {
            if (row.entityType === 'TRUCK' && row.entityId) {
              const subId = truckSubdivisionMap[row.entityId]
              if (subId && !existingSubIds.has(subId)) {
                injected.push({ entityType: 'SUBDIVISION', entityId: subId })
                existingSubIds.add(subId)
              }
            } else if (row.entityType === 'DRIVER' && row.entityId) {
              const subId = driverSubdivisionMap[row.entityId]
              if (subId && !existingSubIds.has(subId)) {
                injected.push({ entityType: 'SUBDIVISION', entityId: subId })
                existingSubIds.add(subId)
              }
            }
          }
          return [...flat, ...injected]
        })(),
      } : {}),
    }

    if (bulkMode && bulkEntityIds.length > 0) {
      const created: string[] = []
      const failed: string[] = []
      const subMap = bulkEntityType === 'TRUCK' ? truckSubdivisionMap : driverSubdivisionMap
      const labelMap = bulkEntityType === 'TRUCK' ? truckPlateMap : driverNameMap
      for (let i = 0; i < bulkEntityIds.length; i++) {
        const eid = bulkEntityIds[i]
        const label = labelMap[eid] || eid
        const configName = `${name.trim()} ${label}`
        const entScopes: { entityType: string; entityId?: string }[] = [
          { entityType: bulkEntityType, entityId: eid },
        ]
        const subId = subMap[eid]
        if (subId) entScopes.push({ entityType: 'SUBDIVISION', entityId: subId })
        try {
          await createConfig({ ...base, name: configName, scopes: entScopes }).unwrap()
          created.push(configName)
        } catch {
          failed.push(configName)
        }
        setBulkProgress({ current: i + 1, total: bulkEntityIds.length })
      }
      setBulkProgress(null)
      if (failed.length === 0) {
        setIsDirty(false)
        navigate('/administrator/charge-configs')
      }
      return
    }

    try {
      if (isEdit && id) {
        const { chargeType: _ct, flexibleRule: _fr, calculatedRule: _cr, ...updateBody } = base
        await updateConfig({ id, body: updateBody as UpdateChargeConfigInput }).unwrap()
      } else {
        await createConfig(base).unwrap()
      }
      setIsDirty(false)
      navigate('/administrator/charge-configs')
    } catch {
      // handled by RTK Query
    }
  }

  if (isEdit && isLoadingExisting) {
    return (
      <div className="text-center py-5">
        <CSpinner />
      </div>
    )
  }

  const printConfigName = existing?.data?.name ?? name

  return (
    <>
      <style>{`
        @media print {
          .sidebar, .header, .footer, .breadcrumb, nav { display: none !important; }
          .body { margin: 0 !important; padding: 0 !important; }
          .wrapper { padding: 0 !important; }
          .container-lg { max-width: 100% !important; padding: 0 !important; }

          /* Hide everything except summary + table */
          .g-4 > * { display: none !important; }
          #installment-summary-card,
          #installment-table-card,
          #installment-summary-card *,
          #installment-table-card * { display: revert !important; }
          .g-4 > *:has(#installment-summary-card),
          .g-4 > *:has(#installment-table-card) { display: block !important; }

          /* Print header */
          #print-header { display: block !important; }
        }
        #print-header { display: none; }
      `}</style>
      <div id="print-header">
        <h3>{printConfigName}</h3>
        <p className="text-body-secondary">Installment Statement — Printed {new Date().toLocaleDateString()}</p>
        <hr />
      </div>
      <FormDirtyGuard isDirty={isDirty && !isReadOnly} />
      <PageHero
        kicker="Operations"
        icon={isViewMode ? cilLockLocked : cilCalculator}
        title={isViewMode ? `${t('chargeConfig.editConfig')} (View Only)` : isEdit ? t('chargeConfig.editConfig') : t('chargeConfig.newConfig')}
        subtitle={t('chargeConfig.subtitle')}
        actions={isViewMode && id ? (
          <CButton color="primary" className="text-white" size="sm" onClick={() => navigate(`/administrator/charge-configs/${id}`)}>
            <CIcon icon={cilPencil} className="me-1" />
            Switch to Edit
          </CButton>
        ) : undefined}
      />

      {isLocked && !isViewMode && (
        <CAlert color="warning" className="d-flex align-items-center mb-3">
          <CIcon icon={cilLockLocked} className="me-2 flex-shrink-0" />
          <div>
            <strong>Editing restricted.</strong> This charge configuration has installments that have been deducted.
            You can edit the name, description, and toggle settings, but scopes, frequency, dates, and amounts are locked.
            Pending installments can still be individually edited.
          </div>
        </CAlert>
      )}

      <CRow className="g-4">
        {/* A) General Info */}
        <CCol xs={12}>
          <CCard className="shadow-sm border-0">
            <CCardHeader><strong>{t('chargeConfig.form.generalInfo')}</strong></CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <label className="form-label">{t('chargeConfig.form.name')} *</label>
                  <CFormInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    invalid={!!errors.name}
                    feedbackInvalid={errors.name}
                    maxLength={255}
                    disabled={isReadOnly}
                  />
                </CCol>
                <CCol md={6}>
                  <label className="form-label">{t('chargeConfig.form.nameEs')}</label>
                  <CFormInput value={nameEs} onChange={(e) => setNameEs(e.target.value)} maxLength={255} disabled={isReadOnly} />
                </CCol>
                <CCol xs={12}>
                  <label className="form-label">{t('chargeConfig.form.description')}</label>
                  <CFormTextarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={isReadOnly} />
                </CCol>
                <CCol md={4}>
                  <label className="form-label">{t('chargeConfig.form.entryType')} *</label>
                  <CFormSelect
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as 'DEBIT' | 'CREDIT')}
                    invalid={!!errors.entryType}
                    disabled={isReadOnly || isLocked}
                  >
                    <option value="DEBIT">{t('chargeConfig.entry.DEBIT')}</option>
                    <option value="CREDIT">{t('chargeConfig.entry.CREDIT')}</option>
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <label className="form-label">{t('chargeConfig.form.appliesToType')} *</label>
                  <CFormSelect
                    value={appliesTo}
                    onChange={(e) => setAppliesTo(e.target.value as AppliesToType)}
                    invalid={!!errors.appliesTo}
                    disabled={isReadOnly || isLocked}
                  >
                    {ALL_APPLIES_TO.map((at) => (
                      <option key={at} value={at}>{t(`chargeConfig.appliesToType.${at}`)}</option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <label className="form-label">{t('chargeConfig.form.costType')}</label>
                  <CFormSelect
                    value={costType}
                    onChange={(e) => setCostType(e.target.value as 'INCLUDED' | 'OTHER_INCLUDED' | 'NOT_INCLUDED')}
                    disabled={isReadOnly || isLocked || hasActiveCharges}
                  >
                    <option value="INCLUDED">{t('chargeConfig.costTypeValue.INCLUDED')}</option>
                    <option value="OTHER_INCLUDED">{t('chargeConfig.costTypeValue.OTHER_INCLUDED', 'Other Included')}</option>
                    <option value="NOT_INCLUDED">{t('chargeConfig.costTypeValue.NOT_INCLUDED')}</option>
                  </CFormSelect>
                  {hasActiveCharges && (
                    <small className="text-body-secondary">
                      {t('chargeConfig.form.costTypeLocked', 'Cost Type is locked because this configuration has active payment charges.')}
                    </small>
                  )}
                </CCol>
                <CCol md={4}>
                  <label className="form-label">{t('chargeConfig.form.category', 'Category')}</label>
                  <CFormSelect
                    value={categoryId ?? ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null
                      setCategoryId(id)
                      const opt = categoryOptions.find((o) => o.value === id)
                      setCategoryName(opt?.label ?? '')
                    }}
                    disabled={isReadOnly || isLocked}
                  >
                    <option value="">-- {t('chargeConfig.form.noCategory', 'No Category')} --</option>
                    {categoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormSwitch
                    label={t('chargeConfig.form.isAdjustment')}
                    checked={isAdjustment}
                    onChange={(e) => setIsAdjustment(e.target.checked)}
                    disabled={isReadOnly}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormSwitch
                    label={t('chargeConfig.form.isMandatory')}
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                    disabled={isReadOnly}
                  />
                </CCol>
                {!isEdit && bulkAppliesTo && (
                  <CCol md={3}>
                    <CFormSwitch
                      label={t('chargeConfig.form.bulkMode', { defaultValue: 'Crear en lote' })}
                      checked={bulkMode}
                      onChange={(e) => { setBulkMode(e.target.checked); if (!e.target.checked) setBulkEntityIds([]) }}
                    />
                  </CCol>
                )}
                {isMandatory && (
                  <CCol xs={12}>
                    <CAlert color="info" className="mb-0 py-2">
                      <strong>{t('chargeConfig.validation.mandatoryNotice', { defaultValue: 'Mandatory charge:' })}</strong>{' '}
                      {chargeType === 'FLEXIBLE'
                        ? t('chargeConfig.validation.mandatoryFlexibleHint', { defaultValue: 'All installment fields (total value, installment count, frequency, and start date) are required for mandatory charges.' })
                        : t('chargeConfig.validation.mandatoryCalculatedHint', { defaultValue: 'All rule fields (calculation type, base, value, and start date) are required for mandatory charges.' })}
                    </CAlert>
                  </CCol>
                )}
                {errors.mandatoryRule && (
                  <CCol xs={12}>
                    <CAlert color="danger" className="mb-0 py-2">
                      {errors.mandatoryRule}
                    </CAlert>
                  </CCol>
                )}
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        {/* B) Charge Type */}
        <CCol xs={12}>
          <CCard className="shadow-sm border-0">
            <CCardHeader><strong>{t('chargeConfig.form.chargeType')}</strong></CCardHeader>
            <CCardBody>
              <CFormSelect
                value={chargeType}
                onChange={(e) => setChargeType(e.target.value as 'CALCULATED' | 'FLEXIBLE')}
                disabled={isEdit || isReadOnly}
                style={{ maxWidth: 300 }}
              >
                <option value="CALCULATED">{t('chargeConfig.chargeType.calculated')}</option>
                <option value="FLEXIBLE">{t('chargeConfig.chargeType.flexible')}</option>
              </CFormSelect>
            </CCardBody>
          </CCard>
        </CCol>

        {/* C) Calculated Rule */}
        {chargeType === 'CALCULATED' && (
          <CCol xs={12}>
            <CCard className="shadow-sm border-0">
              <CCardHeader><strong>{t('chargeConfig.form.calculatedRule')}</strong></CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol md={4}>
                    <label className="form-label">{t('chargeConfig.form.calculationType')} *</label>
                    <CFormSelect
                      value={calculationType}
                      onChange={(e) => setCalculationType(e.target.value as CalculationType)}
                      invalid={!!errors.calculationType}
                      disabled={isReadOnly}
                    >
                      {ALL_CALC_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{t(`chargeConfig.calculationType.${ct}`)}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <label className="form-label">
                      {t('chargeConfig.form.calculationBase')} {calculationType !== 'FIXED_AMOUNT' && '*'}
                    </label>
                    <CFormSelect
                      value={calculationType === 'FIXED_AMOUNT' ? '' : calculationBase}
                      onChange={(e) => setCalculationBase(e.target.value as CalculationBase)}
                      invalid={!!errors.calculationBase}
                      disabled={isReadOnly || calculationType === 'FIXED_AMOUNT'}
                    >
                      {calculationType === 'FIXED_AMOUNT' ? (
                        <option value="">N/A</option>
                      ) : (
                        ALL_CALC_BASES.map((cb) => (
                          <option key={cb} value={cb}>{t(`chargeConfig.calculationBase.${cb}`)}</option>
                        ))
                      )}
                    </CFormSelect>
                  </CCol>
                  <CCol md={2}>
                    <label className="form-label">{t('chargeConfig.form.value')} *</label>
                    <CFormInput
                      type="number"
                      step="any"
                      min="0"
                      value={calcValue}
                      onChange={(e) => setCalcValue(e.target.value)}
                      invalid={!!errors.calcValue}
                      feedbackInvalid={errors.calcValue}
                      disabled={isReadOnly}
                    />
                  </CCol>
                  <CCol md={2}>
                    <label className="form-label">{t('chargeConfig.form.currency', 'Currency')}</label>
                    <CFormSelect
                      value={calcCurrency}
                      onChange={(e) => setCalcCurrency(e.target.value as 'USD' | 'HNL')}
                      disabled={isReadOnly}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="HNL">HNL (L)</option>
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <label className="form-label">{t('chargeConfig.form.period')}</label>
                    <CFormSelect
                      value={calcPeriod}
                      onChange={(e) => setCalcPeriod(e.target.value as FrequencyType)}
                      disabled={isReadOnly}
                    >
                      {ALL_FREQUENCIES.map((f) => (
                        <option key={f} value={f}>{t(`chargeConfig.frequency.${f}`)}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <label className="form-label">{t('chargeConfig.form.startDate')} *</label>
                    <CFormInput
                      type="date"
                      value={calcStartDate}
                      onChange={(e) => setCalcStartDate(e.target.value)}
                      invalid={!!errors.calcStartDate}
                      feedbackInvalid={errors.calcStartDate}
                      disabled={isReadOnly}
                    />
                  </CCol>
                  <CCol md={4}>
                    <label className="form-label">{t('chargeConfig.form.endDate')}</label>
                    <CFormInput
                      type="date"
                      value={calcEndDate}
                      onChange={(e) => setCalcEndDate(e.target.value)}
                      disabled={isReadOnly}
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CCol>
        )}

        {/* D) Flexible Rule */}
        {chargeType === 'FLEXIBLE' && (
          <CCol xs={12}>
            <CCard className="shadow-sm border-0">
              <CCardHeader><strong>{t('chargeConfig.form.flexibleRule')}</strong></CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol md={2}>
                    <label className="form-label">{t('chargeConfig.form.totalValue')} *</label>
                    <CFormInput
                      type="number"
                      step="any"
                      min="0"
                      value={flexTotalValue}
                      onChange={(e) => setFlexTotalValue(e.target.value)}
                      invalid={!!errors.flexTotalValue}
                      feedbackInvalid={errors.flexTotalValue}
                      disabled={isReadOnly || isLocked}
                    />
                  </CCol>
                  <CCol md={2}>
                    <label className="form-label">{t('chargeConfig.form.installmentCount')} *</label>
                    <CFormInput
                      type="number"
                      min="1"
                      step="1"
                      value={flexInstallmentCount}
                      onChange={(e) => setFlexInstallmentCount(e.target.value)}
                      invalid={!!errors.flexInstallmentCount}
                      feedbackInvalid={errors.flexInstallmentCount}
                      disabled={isReadOnly || isLocked}
                    />
                  </CCol>
                  <CCol md={3}>
                    <label className="form-label">{t('chargeConfig.form.frequency')} *</label>
                    <CFormSelect
                      value={flexFrequency}
                      onChange={(e) => setFlexFrequency(e.target.value as FrequencyType)}
                      invalid={!!errors.flexFrequency}
                      disabled={isReadOnly || isLocked}
                    >
                      {ALL_FREQUENCIES.map((f) => (
                        <option key={f} value={f}>{t(`chargeConfig.frequency.${f}`)}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={3}>
                    <label className="form-label">{t('chargeConfig.form.startDate')} *</label>
                    <CFormInput
                      type="date"
                      value={flexStartDate}
                      onChange={(e) => setFlexStartDate(e.target.value)}
                      invalid={!!errors.flexStartDate}
                      feedbackInvalid={errors.flexStartDate}
                      disabled={isReadOnly || isLocked}
                    />
                  </CCol>
                  <CCol md={2}>
                    <label className="form-label">{t('chargeConfig.form.currency', 'Currency')}</label>
                    <CFormSelect
                      value={flexCurrency}
                      onChange={(e) => setFlexCurrency(e.target.value as 'USD' | 'HNL')}
                      disabled={isReadOnly || isLocked}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="HNL">HNL (L)</option>
                    </CFormSelect>
                  </CCol>
                </CRow>

                {/* Legacy-loan onboarding: already-paid installments (create-only) */}
                {!isEdit && (
                  <CRow className="g-3 mt-1">
                    <CCol md={6}>
                      <label className="form-label">
                        {t('chargeConfig.form.initialPaidCount')}
                        <CBadge color="info" className="ms-2">
                          {t('chargeConfig.form.legacyLabel')}
                        </CBadge>
                      </label>
                      <CFormInput
                        type="number"
                        min={0}
                        max={parseInt(flexInstallmentCount, 10) || undefined}
                        step={1}
                        value={flexInitialPaidCount}
                        onChange={(e) => setFlexInitialPaidCount(e.target.value)}
                        invalid={!!errors.flexInitialPaidCount}
                        feedbackInvalid={errors.flexInitialPaidCount}
                        placeholder="0"
                        disabled={isReadOnly || isLocked}
                        aria-describedby="initialPaidCountHelp"
                      />
                      <small id="initialPaidCountHelp" className="text-body-secondary">
                        {t('chargeConfig.form.initialPaidCountHelp')}
                      </small>
                    </CCol>
                    {parseInt(flexInitialPaidCount, 10) > 0 && (
                      <CCol md={12}>
                        <CAlert color="info" className="py-2 mb-0">
                          {t('chargeConfig.form.initialPaidCountNotice', {
                            n: parseInt(flexInitialPaidCount, 10),
                            total: parseInt(flexInstallmentCount, 10) || 0,
                          })}
                        </CAlert>
                      </CCol>
                    )}
                  </CRow>
                )}

                {/* Installment Preview */}
                {installmentPreview.length > 0 && (
                  <div className="mt-4">
                    <div className="d-flex align-items-center mb-2">
                      <h6 className="mb-0">{t('chargeConfig.installmentPreview.title')}</h6>
                      <CBadge color="secondary" className="ms-2">{installmentPreview.length}</CBadge>
                    </div>
                    <CTable small striped hover>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>{t('chargeConfig.installmentPreview.installment')}</CTableHeaderCell>
                          <CTableHeaderCell>{t('chargeConfig.installmentPreview.date')}</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">{t('chargeConfig.installmentPreview.amount')}</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {pagedPreview.map((row) => (
                          <CTableRow
                            key={row.num}
                            className={row.isInitialPaid ? 'table-secondary' : undefined}
                          >
                            <CTableDataCell>
                              #{row.num}
                              {row.isInitialPaid && (
                                <CBadge color="success" className="ms-2">
                                  {t('chargeConfig.installmentPreview.alreadyPaid')}
                                </CBadge>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>{row.date}</CTableDataCell>
                            <CTableDataCell className="text-end">{row.amount.toFixed(2)}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>

                    {/* Pagination controls — mirrors Block B */}
                    {previewLastPage > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <CPagination align="center" size="sm" className="mb-0">
                          <CPaginationItem
                            disabled={previewPage <= 1}
                            onClick={() => setPreviewPage(1)}
                          >
                            &laquo;
                          </CPaginationItem>
                          <CPaginationItem
                            disabled={previewPage <= 1}
                            onClick={() => setPreviewPage((p) => p - 1)}
                          >
                            &lsaquo;
                          </CPaginationItem>
                          {buildPageList(previewPage, previewLastPage).map((p) => (
                            <CPaginationItem
                              key={p}
                              active={p === previewPage}
                              onClick={() => setPreviewPage(p)}
                            >
                              {p}
                            </CPaginationItem>
                          ))}
                          <CPaginationItem
                            disabled={previewPage >= previewLastPage}
                            onClick={() => setPreviewPage((p) => p + 1)}
                          >
                            &rsaquo;
                          </CPaginationItem>
                          <CPaginationItem
                            disabled={previewPage >= previewLastPage}
                            onClick={() => setPreviewPage(previewLastPage)}
                          >
                            &raquo;
                          </CPaginationItem>
                        </CPagination>
                        <div className="d-flex align-items-center gap-2">
                          <small className="text-body-secondary">
                            Showing {pagedPreview.length} of {installmentPreview.length}
                          </small>
                          <CFormSelect
                            size="sm"
                            style={{ width: 'auto' }}
                            value={previewPageSize}
                            onChange={(e) => {
                              setPreviewPageSize(Number(e.target.value))
                              setPreviewPage(1)
                            }}
                          >
                            {INSTALLMENT_PAGE_SIZES.map((n) => (
                              <option key={n} value={n}>{n} / page</option>
                            ))}
                          </CFormSelect>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        )}

        {/* D2) Installment Summary + Table (edit mode only, flexible configs) */}
        {isEdit && chargeType === 'FLEXIBLE' && id && (
          <CCol xs={12}>
            <InstallmentSummaryCard chargeConfigId={id} currency={displayCurrency} exchangeRate={exchangeRate} />
          </CCol>
        )}

        {isEdit && chargeType === 'FLEXIBLE' && (
          <CCol xs={12}>
            <CCard className="shadow-sm border-0" id="installment-table-card">
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>{t('chargeConfig.installments.title')}</strong>
                  {(installmentMeta?.total ?? installments.length) > 0 && (
                    <CBadge color="secondary" className="ms-2">{installmentMeta?.total ?? installments.length}</CBadge>
                  )}
                </div>
                <div className="d-flex align-items-center gap-2">
                  <CFormSelect
                    size="sm"
                    style={{ width: 'auto' }}
                    value={displayCurrency}
                    onChange={(e) => setDisplayCurrency(e.target.value as DisplayCurrency)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="HNL">HNL (L)</option>
                    <option value="GTQ">GTQ (Q)</option>
                  </CFormSelect>
                  {exchangeRate && (
                    <small className="text-body-secondary">
                      1 USD = {exchangeRate.toFixed(2)} {displayCurrency}
                    </small>
                  )}
                  {installments.length > 0 && (
                    <CButton color="secondary" variant="ghost" size="sm" onClick={() => window.print()} title="Print statement">
                      <CIcon icon={cilPrint} />
                    </CButton>
                  )}
                  {!isReadOnly && id && (
                    <CButton
                      color="warning"
                      variant="outline"
                      size="sm"
                      onClick={() => setRestructureOpen(true)}
                      title="Restructure the schedule — keeps paid installments, reshapes the rest"
                    >
                      Restructure schedule
                    </CButton>
                  )}
                </div>
              </CCardHeader>
              <CCardBody>
                {isLoadingInstallments ? (
                  <div className="text-center py-3"><CSpinner size="sm" /></div>
                ) : installments.length === 0 ? (
                  <CAlert color="info" className="mb-0">{t('chargeConfig.installments.noInstallments')}</CAlert>
                ) : (
                  <>
                    <CTable small striped hover>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>#</CTableHeaderCell>
                          <CTableHeaderCell>{t('chargeConfig.installmentPreview.date')}</CTableHeaderCell>
                          <CTableHeaderCell>Applied Date</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">{t('chargeConfig.installmentPreview.amount')}</CTableHeaderCell>
                          <CTableHeaderCell>{t('columns.status')}</CTableHeaderCell>
                          <CTableHeaderCell>Payment</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {installments.map((inst: any) => (
                          <CTableRow key={inst.id}>
                            <CTableDataCell>{inst.sequenceNumber}</CTableDataCell>
                            <CTableDataCell>
                              {inst.scheduledDate
                                ? new Date(inst.scheduledDate).toLocaleDateString(undefined, { timeZone: 'UTC' })
                                : '—'}
                            </CTableDataCell>
                            <CTableDataCell>
                              {inst.appliedDate
                                ? new Date(inst.appliedDate).toLocaleDateString(undefined, { timeZone: 'UTC' })
                                : '—'}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">{fmtAmount(inst.value)}</CTableDataCell>
                            <CTableDataCell>
                              {/*
                                The backend's mapInstallment DTO translates the
                                raw InstallmentStatus enum into a *lifecycle*
                                status before sending it on the wire:
                                  NOT_PAID                       → PENDING
                                  DEDUCTED + open payment        → ASSIGNED
                                  DEDUCTED + closed/initial-paid → DEDUCTED
                                  CANCELLED                      → CANCELLED
                                See exa-payment-core/src/utils/dtos.ts. Match
                                against the lifecycle names here, not the raw
                                enum values, otherwise everything falls through
                                to red 'danger'.
                              */}
                              <CBadge color={
                                inst.status === 'PENDING' ? 'warning' :
                                inst.status === 'ASSIGNED' ? 'info' :
                                inst.status === 'DEDUCTED' ? 'success' :
                                inst.status === 'CANCELLED' ? 'secondary' :
                                'danger'
                              }>
                                {inst.status}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              {inst.paymentId ? (
                                <a href={`/operations/payments/${inst.paymentId}`}>
                                  #{inst.paymentNumber || inst.paymentId.slice(0, 8)}
                                </a>
                              ) : '—'}
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>

                    {/* Pagination controls */}
                    {installmentMeta && (installmentMeta.lastPage ?? 1) > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <CPagination align="center" size="sm" className="mb-0">
                          <CPaginationItem
                            disabled={installmentPage <= 1}
                            onClick={() => setInstallmentPage(1)}
                          >
                            &laquo;
                          </CPaginationItem>
                          <CPaginationItem
                            disabled={installmentPage <= 1}
                            onClick={() => setInstallmentPage((p) => p - 1)}
                          >
                            &lsaquo;
                          </CPaginationItem>
                          {buildPageList(installmentPage, installmentMeta.lastPage ?? 1).map((p) => (
                            <CPaginationItem
                              key={p}
                              active={p === installmentPage}
                              onClick={() => setInstallmentPage(p)}
                            >
                              {p}
                            </CPaginationItem>
                          ))}
                          <CPaginationItem
                            disabled={installmentPage >= (installmentMeta.lastPage ?? 1)}
                            onClick={() => setInstallmentPage((p) => p + 1)}
                          >
                            &rsaquo;
                          </CPaginationItem>
                          <CPaginationItem
                            disabled={installmentPage >= (installmentMeta.lastPage ?? 1)}
                            onClick={() => setInstallmentPage(installmentMeta.lastPage ?? 1)}
                          >
                            &raquo;
                          </CPaginationItem>
                        </CPagination>
                        <div className="d-flex align-items-center gap-2">
                          <small className="text-body-secondary">
                            Showing {installments.length} of {installmentMeta.total ?? 0}
                          </small>
                          <CFormSelect
                            size="sm"
                            style={{ width: 'auto' }}
                            value={installmentPageSize}
                            onChange={(e) => {
                              setInstallmentPageSize(Number(e.target.value))
                              setInstallmentPage(1)
                            }}
                          >
                            {INSTALLMENT_PAGE_SIZES.map((n) => (
                              <option key={n} value={n}>{n} / page</option>
                            ))}
                          </CFormSelect>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        )}

        {/* E-bulk) Bulk entity selection */}
        {bulkMode && (
          <CCol xs={12}>
            <CCard className="shadow-sm border-0">
              <CCardHeader>
                <strong>{t('chargeConfig.form.bulkSelect', { defaultValue: bulkEntityType === 'TRUCK' ? 'Seleccionar Camiones' : 'Seleccionar Conductores' })}</strong>
              </CCardHeader>
              <CCardBody>
                <CMultiSelect
                  options={bulkEntityOptions}
                  value={bulkEntityIds}
                  onChange={(selected: any) => setBulkEntityIds(selected.map((s: any) => typeof s === 'string' ? s : s.value))}
                  multiple
                  selectionType="tags"
                  virtualScroller
                  placeholder={t('chargeConfig.form.bulkPlaceholder', { defaultValue: 'Buscar y seleccionar...' })}
                />
                {errors.bulkEntities && <div className="text-danger small mt-1">{errors.bulkEntities}</div>}
                {bulkPreviewNames.length > 0 && (
                  <div className="mt-3 p-2 bg-light rounded small">
                    <strong>{t('chargeConfig.form.bulkPreview', { defaultValue: `Se crearán ${bulkPreviewNames.length} configuraciones:` })}</strong>
                    <ul className="mb-0 mt-1 ps-3">
                      {bulkPreviewNames.slice(0, 10).map((n) => <li key={n}>{n}</li>)}
                      {bulkPreviewNames.length > 10 && <li>...+{bulkPreviewNames.length - 10} más</li>}
                    </ul>
                  </div>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        )}

        {/* E) Scopes */}
        {!bulkMode && (<CCol xs={12}>
          <CCard className="shadow-sm border-0">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>{t('chargeConfig.form.scopes')}</strong>
              {!isReadOnly && !isScopeLocked && (
                <CButton color="primary" size="sm" onClick={addScope}>
                  <CIcon icon={cilPlus} className="me-1" />
                  {t('chargeConfig.form.addScope')}
                </CButton>
              )}
            </CCardHeader>
            <CCardBody>
              {scopes.length === 0 ? (
                <div className="text-body-secondary">{t('chargeConfig.form.noScopes')}</div>
              ) : (
                scopes.map((scope) => (
                  <CRow key={scope.key} className="g-2 mb-2 align-items-end">
                    <CCol md={3}>
                      <label className="form-label">{t('chargeConfig.form.scopeEntityType')}</label>
                      <CFormSelect
                        size="sm"
                        value={scope.entityType}
                        onChange={(e) => updateScope(scope.key, 'entityType', e.target.value)}
                        invalid={!!errors[`scope_${scope.key}_type`]}
                        disabled={isReadOnly || isScopeLocked}
                      >
                        <option value="">--</option>
                        {allowedScopeEntityTypes.map((et) => (
                          <option key={et} value={et}>{t(`chargeConfig.appliesToType.${et}`, et)}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={5}>
                      <label className="form-label">{t('chargeConfig.form.scopeEntityId')}</label>
                      {scope.entityType && entityOptionsMap[scope.entityType as keyof typeof entityOptionsMap]?.length > 0 ? (
                        <CMultiSelect
                          options={entityOptionsMap[scope.entityType as keyof typeof entityOptionsMap]}
                          value={scope.entityIds}
                          onChange={(selected: any) => {
                            const arr = Array.isArray(selected) ? selected : [selected]
                            updateScope(scope.key, 'entityIds', arr.map((o: any) => String(o.value)).filter(Boolean))
                          }}
                          multiple
                          selectionType="tags"
                          virtualScroller={entityOptionsMap[scope.entityType as keyof typeof entityOptionsMap].length > 20}
                          placeholder="-- Search --"
                          disabled={scope.allEntities || isReadOnly || isScopeLocked}
                        />
                      ) : (
                        <CFormInput
                          size="sm"
                          value={scope.entityIds.join(', ')}
                          onChange={(e) => updateScope(scope.key, 'entityIds', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}
                          disabled={scope.allEntities || isReadOnly || isScopeLocked}
                          invalid={!!errors[`scope_${scope.key}_id`]}
                        />
                      )}
                      {scope.entityType === 'INTERNAL_SUPPLIER' && selectedSubdivisionIds.size > 0 && (
                        <CFormSwitch
                          className="mt-1"
                          label={t('chargeConfig.form.showAllSuppliers', 'Show all suppliers')}
                          checked={showAllSuppliers}
                          onChange={(e) => setShowAllSuppliers(e.target.checked)}
                          disabled={isReadOnly || isScopeLocked}
                        />
                      )}
                    </CCol>
                    <CCol md={2}>
                      <CFormSwitch
                        label={t('chargeConfig.form.scopeAllEntities')}
                        checked={scope.allEntities}
                        onChange={(e) => updateScope(scope.key, 'allEntities', e.target.checked)}
                        disabled={isReadOnly || isScopeLocked}
                      />
                    </CCol>
                    {!isReadOnly && !isScopeLocked && (
                    <CCol md={1} className="text-end">
                      <CButton color="danger" variant="ghost" size="sm" onClick={() => removeScope(scope.key)} title={t('actions.delete')}>
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CCol>
                    )}
                  </CRow>
                ))
              )}
            </CCardBody>
          </CCard>
        </CCol>)}

        {/* Bulk progress overlay */}
        {bulkProgress && (
          <CCol xs={12}>
            <CAlert color="info" className="text-center">
              {t('chargeConfig.form.bulkCreating', { defaultValue: `Creando ${bulkProgress.current} de ${bulkProgress.total}...` })}
            </CAlert>
          </CCol>
        )}

        {/* F) Activity History (edit mode only) */}
        {isEdit && id && (
          <CCol xs={12}>
            <ChargeConfigAuditTrailCard chargeConfigId={id} />
          </CCol>
        )}

        {/* Actions */}
        {!isReadOnly && (
          <CCol xs={12} className="d-flex gap-2 mb-4">
            <CButton color="primary" className="text-white" disabled={isSaving} onClick={handleSubmit}>
              {isSaving ? <CSpinner size="sm" className="me-2" /> : null}
              {isSaving ? t('chargeConfig.form.saving') : t('chargeConfig.form.save')}
            </CButton>
            <CButton color="secondary" variant="ghost" onClick={() => navigate('/administrator/charge-configs')}>
              {t('chargeConfig.form.cancel')}
            </CButton>
          </CCol>
        )}
        {isReadOnly && (
          <CCol xs={12} className="d-flex gap-2 mb-4">
            <CButton color="secondary" variant="ghost" onClick={() => navigate('/administrator/charge-configs')}>
              Back to List
            </CButton>
          </CCol>
        )}
      </CRow>

      {/* Restructure modal (Option 2) — only meaningful in edit mode for flexible configs */}
      {isEdit && chargeType === 'FLEXIBLE' && id && (
        <RestructureChargeConfigModal
          visible={restructureOpen}
          onClose={() => setRestructureOpen(false)}
          onSuccess={() => setRestructureOpen(false)}
          configId={id}
          configName={name || 'Charge config'}
          currentTotalValue={parseFloat(flexTotalValue) || 0}
          paidCount={summaryData?.data?.paidCount ?? 0}
          paidAmount={Number(summaryData?.data?.paidAmount ?? 0)}
          updatedAt={existing?.data?.updatedAt ?? null}
        />
      )}
    </>
  )
}

export default ChargeConfigFormPage
