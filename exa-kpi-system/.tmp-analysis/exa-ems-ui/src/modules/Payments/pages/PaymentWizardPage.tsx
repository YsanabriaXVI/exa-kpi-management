import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CMultiSelect,
  CPlaceholder,
  CRow,
  CSmartTable,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilLibrary,
  cilArrowLeft,
  cilArrowRight,
  cilCheckAlt,
  cilBuilding,
  cilPeople,
  cilDollar,
  cilPlus,
  cilTrash,
  cilBan,
  cilActionUndo,
  cilReload,
  cilLockLocked,
  cilCalculator,
  cilCloudDownload,
  cilPencil,
  cilSave,
  cilXCircle,
} from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import CurrencyDisplay from '../components/CurrencyDisplay'
import StatusBadge from '../components/StatusBadge'
import FormDirtyGuard from '../components/FormDirtyGuard'
import ConfirmDialog from '../../../components/ConfirmationModal'
import TotalsBreakdownCard from '../components/TotalsBreakdownCard'
import AuditTrailCard from '../components/AuditTrailCard'
import ChargePreviewModal from '../components/ChargePreviewModal'
import StatementDetailModal from '../components/StatementDetailModal'
import { useEntityNames } from '../hooks/useEntityNames'
import { useToast } from '../hooks/useToast'
import {
  useCreatePaymentMutation,
  useUpdatePaymentMutation,
  useGetPaymentByIdQuery,
  useGetAvailableStatementsQuery,
  useAddStatementsMutation,
  useRemoveStatementMutation,
  useDeletePaymentMutation,
  useOpenPaymentMutation,
  useSubmitPaymentMutation,
  useApprovePaymentMutation,
  useReturnPaymentMutation,
  useVoidPaymentMutation,
  useReopenPaymentMutation,
  useAddChargeMutation,
  useRemoveChargeMutation,
  useBulkRemoveChargesMutation,
  useCalculateChargesMutation,
  useClosePaymentMutation,
  useLazyGetStatementDetailQuery,
} from '../api/paymentCoreApi'
import { loadWeeks } from '../../Weeks/store/weeksSlice'
import { MODULE_PAYMENTS } from '../../../constants/modules'
import {
  permissionService,
  UPDATE,
  DELETE as DELETE_PERMISSION,
  APPROVE as APPROVE_PERMISSION,
} from '../../../services/auth/permission.service'
import type { RootState, AppDispatch } from '../../../store'
import type { PaymentType, PaymentStatus, CreatePaymentInput, CreateChargeInput, ClosePaymentInput, StatementListItem, StatementDetail, UpdatePaymentInput, CalculateChargesResponse } from '../types.v2'
import { attributesAPI } from '../../Attributes/api/attributes.api'
import { paymentsAssetsApi, mapTruckInternalSuppliers } from '../api/assetsApi'
import type { InternalSupplierItem, StatementInternalSupplierRow } from '../api/assetsApi'

type SelectOption = { value: string | number; label: string }

type ActionType = 'delete' | 'open' | 'submit' | 'approve' | 'return' | 'void' | 'reopen' | 'close' | 'removeStatement' | 'bulkRemoveStatements'

const SECTION_ORDER = ['ADJUSTMENT', 'INCLUDED_COST', 'FUEL_STATEMENT', 'OTHER_INCLUDED_COST', 'OTHER_CHARGE', 'MANDATORY_CHARGE'] as const
const SECTION_COLORS: Record<string, string> = {
  ADJUSTMENT: 'warning',
  INCLUDED_COST: 'info',
  FUEL_STATEMENT: 'dark',
  OTHER_INCLUDED_COST: 'dark',
  OTHER_CHARGE: 'secondary',
  MANDATORY_CHARGE: 'success',
}

interface PendingAction {
  type: ActionType
  paymentId: string
  paymentNumber?: string
  statementId?: string
  statementNumber?: string
  statementIds?: string[]
  count?: number
}

const PAYMENT_TYPES: { key: PaymentType; icon: any; color: string }[] = [
  { key: 'CLIENT_INVOICE', icon: cilBuilding, color: 'primary' },
  { key: 'SUBDIVISION_STATEMENT', icon: cilLibrary, color: 'info' },
  { key: 'DRIVER', icon: cilPeople, color: 'success' },
  { key: 'GAS_SUPPLIER', icon: cilDollar, color: 'dark' },
]

const actionIcon = (type: ActionType) => {
  switch (type) {
    case 'delete': return cilTrash
    case 'open': return cilArrowRight
    case 'submit': return cilArrowRight
    case 'approve': return cilCheckAlt
    case 'return': return cilActionUndo
    case 'void': return cilBan
    case 'reopen': return cilReload
    case 'close': return cilLockLocked
    case 'removeStatement': case 'bulkRemoveStatements': return cilTrash
  }
}

const actionColor = (type: ActionType) => {
  switch (type) {
    case 'delete': return 'danger'
    case 'open': return 'primary'
    case 'submit': return 'info'
    case 'approve': return 'success'
    case 'return': return 'warning'
    case 'void': return 'danger'
    case 'reopen': return 'primary'
    case 'close': return 'dark'
    case 'removeStatement': case 'bulkRemoveStatements': return 'danger'
  }
}

const PaymentWizardPage: React.FC = () => {
  const { t, i18n } = useTranslation('payments')
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { id: routeId } = useParams<{ id: string }>()
  const { addToast, ToasterComponent } = useToast()

  const isEditMode = Boolean(routeId)

  // ── Load existing payment when editing ──
  const {
    data: existingPaymentData,
    isLoading: isLoadingPayment,
  } = useGetPaymentByIdQuery(routeId!, { skip: !routeId })

  const existingPayment = existingPaymentData?.data

  // ── Wizard step (create mode) ──
  const [step, setStep] = useState(0)

  // ── Step 1 form state ──
  const [paymentType, setPaymentType] = useState<PaymentType | ''>('')
  const [datePreset, setDatePreset] = useState('')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [selectedSubdivisions, setSelectedSubdivisions] = useState<string[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([])
  const [exchangeRate, setExchangeRate] = useState<string>('')
  const [showKms, setShowKms] = useState(false)
  const [validationError, setValidationError] = useState('')

  // Derived: whether km columns are visible (create mode uses local state, edit mode uses persisted value)
  const effectiveShowKms = existingPayment ? (existingPayment.showKms ?? false) : showKms

  // ── Statement selection state ──
  const [createdPaymentId, setCreatedPaymentId] = useState<string | null>(routeId ?? null)
  const [selectedStatementIds, setSelectedStatementIds] = useState<Set<string>>(new Set())
  const [showAddStatements, setShowAddStatements] = useState(false)

  // ── Internal supplier state ──
  const [supplierItems, setSupplierItems] = useState<InternalSupplierItem[]>([])
  // legacy statement_id → its supplier rows (one per supplier; null id = unassigned trips)
  const [statementSupplierMap, setStatementSupplierMap] = useState<Map<number, StatementInternalSupplierRow[]>>(new Map())
  const [supplierLookupFailed, setSupplierLookupFailed] = useState(false)

  // ── Confirmation modal ──
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [voidReason, setVoidReason] = useState('')

  // ── Charge modal state ──
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [chargeForm, setChargeForm] = useState({ entryType: 'DEBIT' as 'DEBIT' | 'CREDIT', costType: 'NOT_INCLUDED' as 'INCLUDED' | 'OTHER_INCLUDED' | 'NOT_INCLUDED', categoryName: '', description: '', reference: '', amountUsd: '' })
  const [chargeFormError, setChargeFormError] = useState('')
  const [chargeCategoryOptions, setChargeCategoryOptions] = useState<{ value: string; label: string }[]>([])

  // ── Close/settlement modal state ──
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeForm, setCloseForm] = useState({ bankId: '', transferNumber: '', transferValue: '', transferDate: '', closeNotes: '' })
  const [closeFormError, setCloseFormError] = useState('')
  const [bankList, setBankList] = useState<{ value: string; label: string }[]>([])

  // ── Load bank list from PHP attributes API (attribute 94) ──
  useEffect(() => {
    attributesAPI.getAttributeItems(94).then((items) => {
      setBankList(items.filter((i) => i.status === 1).map((i) => ({ value: i.name, label: i.name })))
    }).catch(() => {})
  }, [])

  // ── Load charge categories (attribute 93) — same taxonomy as Config Charges ──
  useEffect(() => {
    attributesAPI.getAttributeItems(93).then((items) => {
      setChargeCategoryOptions((items || []).filter((i) => i.status === 1).map((i) => ({ value: i.name, label: i.name })))
    }).catch(() => setChargeCategoryOptions([]))
  }, [])

  // ── Load internal supplier items (attribute 136, carries subdivision_id) ──
  useEffect(() => {
    paymentsAssetsApi.getInternalSupplierItems().then(setSupplierItems).catch(() => setSupplierItems([]))
  }, [])

  // ── Multi-select linked statements ──
  const [selectedLinkedIds, setSelectedLinkedIds] = useState<Set<string>>(new Set())
  const [selectedChargeIds, setSelectedChargeIds] = useState<Set<string>>(new Set())

  // ── Confirm dialog state (for charge removal) ──
  const [chargeConfirm, setChargeConfirm] = useState<{
    visible: boolean
    title: string
    message: string
    confirmText: string
    onConfirm: () => void
  }>({ visible: false, title: '', message: '', confirmText: '', onConfirm: () => {} })

  const showChargeConfirm = (opts: { title: string; message: string; confirmText: string; onConfirm: () => void }) => {
    setChargeConfirm({ visible: true, ...opts })
  }

  const closeChargeConfirm = () => {
    setChargeConfirm((prev) => ({ ...prev, visible: false }))
  }

  // ── Permissions ──
  const canUpdate = permissionService.checkPermission(MODULE_PAYMENTS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_PAYMENTS, DELETE_PERMISSION)
  const canApprove = permissionService.checkPermission(MODULE_PAYMENTS, APPROVE_PERMISSION)

  // ── Entity name resolution (shared hook) ──
  const { clientNameMap, subdivisionNameMap, resolveUserName } = useEntityNames()

  // ── Redux entity data (for multi-select options) ──
  const clientsState = useSelector((state: RootState) => (state as any).clients || {})
  const subdivisionsState = useSelector((state: RootState) => (state as any).subdivisions || {})
  const weeksState = useSelector((state: RootState) => (state as any).weeks || {})

  React.useEffect(() => {
    dispatch(loadWeeks())
  }, [dispatch])

  // Clear stale selections when linked statements change
  const linkedStatementsLen = existingPayment?.statements?.length ?? 0
  React.useEffect(() => {
    setSelectedLinkedIds(new Set())
    setSelectedChargeIds(new Set())
  }, [linkedStatementsLen])

  const clientOptions: SelectOption[] = useMemo(
    () =>
      (clientsState.list || []).map((c: any) => ({
        value: String(c.client_id ?? c.id ?? ''),
        label: c.name || `Client #${c.client_id ?? c.id}`,
      })),
    [clientsState.list],
  )

  const subdivisionOptions: SelectOption[] = useMemo(
    () =>
      (subdivisionsState.list || []).map((s: any) => ({
        value: String(s.subdivision_id ?? s.id ?? ''),
        label: s.name || `Subdivision #${s.subdivision_id ?? s.id}`,
      })),
    [subdivisionsState.list],
  )

  // Internal supplier options scoped to the chosen subdivision(s): matching items
  // plus unmapped items (subdivision_id null) labeled "Unassigned".
  const buildSupplierOptions = useCallback(
    (subdivisionIds: string[]): SelectOption[] => {
      const subs = new Set(subdivisionIds.map(String))
      return supplierItems
        .filter((item) => item.subdivision_id == null || subs.has(String(item.subdivision_id)))
        .map((item) => ({
          value: item.value,
          label: item.subdivision_id == null ? `${item.label} (${t('supplier.unassigned', 'Unassigned')})` : item.label,
        }))
    },
    [supplierItems, t],
  )

  const supplierOptions = useMemo(
    () => buildSupplierOptions(selectedSubdivisions),
    [buildSupplierOptions, selectedSubdivisions],
  )

  // Set of supplier ids that are valid for a given subdivision selection (matching
  // subdivision + unmapped). Used to drop selections that no longer apply.
  const validSupplierIdsFor = useCallback(
    (subdivisionIds: string[]) => {
      const subs = new Set(subdivisionIds.map(String))
      return new Set(
        supplierItems
          .filter((item) => item.subdivision_id == null || subs.has(String(item.subdivision_id)))
          .map((item) => item.value),
      )
    },
    [supplierItems],
  )

  // Clear supplier selections that no longer belong when subdivisions change.
  useEffect(() => {
    if (supplierItems.length === 0) return
    const valid = validSupplierIdsFor(selectedSubdivisions)
    setSelectedSuppliers((prev) => {
      const next = prev.filter((id) => valid.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [selectedSubdivisions, supplierItems, validSupplierIdsFor])

  // Auto-populate exchange rate from subdivision when creating a subdivision payment.
  // The subdivision stores its own exchange_rate (HNL per USD) so the user doesn't
  // need to enter it manually. Uses the first selected subdivision's rate.
  useEffect(() => {
    if (paymentType !== 'SUBDIVISION_STATEMENT' || selectedSubdivisions.length === 0) return
    const list = subdivisionsState.list || []
    const match = list.find((s: any) =>
      selectedSubdivisions.includes(String(s.subdivision_id ?? s.id ?? '')),
    )
    const rate = match?.exchange_rate
    if (rate && Number(rate) > 0) {
      setExchangeRate(String(rate))
    }
  }, [paymentType, selectedSubdivisions, subdivisionsState.list])

  const weekOptions: SelectOption[] = useMemo(
    () =>
      (weeksState.weeks || []).map((wk: any) => ({
        value: Number(wk.week_id ?? wk.id ?? wk.value ?? 0),
        label:
          wk.week_name ||
          wk.name ||
          (wk.week_no ? `W${wk.week_no} - ${wk.week_year}` : String(wk.week_id)),
      })),
    [weeksState.weeks],
  )

  const weekNameById = useMemo(() => {
    const map: Record<number, string> = {}
    for (const o of weekOptions) {
      map[Number(o.value)] = String(o.label)
    }
    return map
  }, [weekOptions])

  // Auto-resolve weeks from date range (for SUBDIVISION_STATEMENT)
  const autoWeeks = useMemo(() => {
    if (!dateRangeStart || !dateRangeEnd) return []
    const from = new Date(dateRangeStart)
    const to = new Date(dateRangeEnd)
    return (weeksState.weeks || [])
      .filter((wk: any) => {
        const wkStart = new Date(wk.start_date)
        const wkEnd = new Date(wk.end_date)
        return wkStart <= to && wkEnd >= from
      })
      .map((wk: any) => Number(wk.week_id ?? wk.id))
  }, [dateRangeStart, dateRangeEnd, weeksState.weeks])

  // Date preset handler — computes date range from preset selection
  const handleDatePreset = useCallback((preset: string) => {
    setDatePreset(preset)
    if (!preset || preset === 'custom') {
      // custom: user picks manually, don't clear existing dates
      return
    }
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    let start: Date
    if (preset === 'all') {
      // "All" = wide range: 1 year back to today
      start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
    } else if (preset === '2w') {
      start = new Date(today.getTime() - 14 * 86400000)
    } else if (preset === '3w') {
      start = new Date(today.getTime() - 21 * 86400000)
    } else if (preset === '6m') {
      start = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
    } else if (preset === 'mtd') {
      start = new Date(today.getFullYear(), today.getMonth(), 1)
    } else {
      return
    }
    setDateRangeStart(fmt(start))
    setDateRangeEnd(fmt(today))
  }, [])

  // ── Mutations ──
  const [createPayment, { isLoading: isCreating }] = useCreatePaymentMutation()
  const [addStatements, { isLoading: isAddingStatements }] = useAddStatementsMutation()
  const [removeStatement, { isLoading: isRemovingStatement }] = useRemoveStatementMutation()
  const [deletePayment, { isLoading: isDeleting }] = useDeletePaymentMutation()
  const [openPayment, { isLoading: isOpening }] = useOpenPaymentMutation()
  const [submitPayment, { isLoading: isSubmitting }] = useSubmitPaymentMutation()
  const [approvePayment, { isLoading: isApproving }] = useApprovePaymentMutation()
  const [returnPayment, { isLoading: isReturning }] = useReturnPaymentMutation()
  const [voidPayment, { isLoading: isVoiding }] = useVoidPaymentMutation()
  const [reopenPayment, { isLoading: isReopening }] = useReopenPaymentMutation()
  const [addCharge, { isLoading: isAddingCharge }] = useAddChargeMutation()
  const [removeCharge, { isLoading: isRemovingCharge }] = useRemoveChargeMutation()
  const [bulkRemoveCharges, { isLoading: isBulkRemovingCharges }] = useBulkRemoveChargesMutation()
  const [calculateCharges, { isLoading: isCalculating }] = useCalculateChargesMutation()
  const [closePayment, { isLoading: isClosing }] = useClosePaymentMutation()
  const [updatePayment, { isLoading: isUpdatingPayment }] = useUpdatePaymentMutation()

  // ── Charge preview state ──
  const [showChargePreview, setShowChargePreview] = useState(false)
  const [previewData, setPreviewData] = useState<CalculateChargesResponse | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isApplyingCharges, setIsApplyingCharges] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [pdfCurrency, setPdfCurrency] = useState<'USD' | 'LPS' | 'BOTH'>('BOTH')

  // ── Statement detail modal state ──
  const [stmtDetailVisible, setStmtDetailVisible] = useState(false)
  const [stmtDetail, setStmtDetail] = useState<StatementDetail | null>(null)
  const [stmtDetailNames, setStmtDetailNames] = useState<{ client?: string; subdivision?: string }>({})
  const [fetchStatementDetail, { isFetching: isLoadingStmtDetail }] = useLazyGetStatementDetailQuery()

  // ── Inline metadata edit state ──
  const [isEditingMeta, setIsEditingMeta] = useState(false)
  const [editDateStart, setEditDateStart] = useState('')
  const [editDateEnd, setEditDateEnd] = useState('')
  const [editExchangeRate, setEditExchangeRate] = useState('')
  const [editShowKms, setEditShowKms] = useState(false)
  const [editWeeks, setEditWeeks] = useState<number[]>([])
  const [editClients, setEditClients] = useState<string[]>([])
  const [editSubdivisions, setEditSubdivisions] = useState<string[]>([])
  const [editSuppliers, setEditSuppliers] = useState<string[]>([])

  const editSupplierOptions = useMemo(
    () => buildSupplierOptions(editSubdivisions),
    [buildSupplierOptions, editSubdivisions],
  )

  // Clear edit-mode supplier selections that no longer belong when subdivisions change.
  useEffect(() => {
    if (supplierItems.length === 0) return
    const valid = validSupplierIdsFor(editSubdivisions)
    setEditSuppliers((prev) => {
      const next = prev.filter((id) => valid.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [editSubdivisions, supplierItems, validSupplierIdsFor])

  const isMutating = isDeleting || isSubmitting || isApproving || isReturning || isVoiding || isReopening || isRemovingStatement || isClosing

  // ── Available statements query ──
  const {
    data: statementsData,
    isLoading: isLoadingStatements,
    isError: statementsError,
  } = useGetAvailableStatementsQuery(createdPaymentId!, {
    skip: !createdPaymentId || (isEditMode && !showAddStatements),
  })

  const availableStatements = statementsData?.data ?? []

  // Legacy ids of the currently-available statements (stable key for the lookup effect).
  const availableLegacyIdsKey = useMemo(
    () =>
      availableStatements
        .map((s) => s.legacyId)
        .filter((id): id is number => id != null)
        .sort((a, b) => a - b)
        .join(','),
    [availableStatements],
  )

  // Fetch per-statement internal-supplier breakdown for the available statements.
  // Non-blocking: on failure we flag it and fall back to an unfiltered list.
  useEffect(() => {
    if (!availableLegacyIdsKey) {
      setStatementSupplierMap(new Map())
      setSupplierLookupFailed(false)
      return
    }
    let cancelled = false
    const ids = availableLegacyIdsKey.split(',')
    paymentsAssetsApi
      .getStatementInternalSuppliers(ids)
      .then((rows) => {
        if (cancelled) return
        const map = new Map<number, StatementInternalSupplierRow[]>()
        for (const row of rows) {
          const list = map.get(row.statement_id) ?? []
          list.push(row)
          map.set(row.statement_id, list)
        }
        setStatementSupplierMap(map)
        setSupplierLookupFailed(false)
      })
      .catch(() => {
        if (cancelled) return
        setStatementSupplierMap(new Map())
        setSupplierLookupFailed(true)
        addToast(
          t('errors.statementInternalSuppliers', {
            defaultValue: 'Could not load statement internal suppliers; showing all statements.',
          }),
          'warning',
        )
      })
    return () => {
      cancelled = true
    }
  }, [availableLegacyIdsKey, addToast, t])

  // The supplier selection that governs step-2 filtering: the in-progress
  // selection in create mode, the persisted selection in edit mode.
  const activeSupplierIds = useMemo(
    () => (isEditMode ? existingPayment?.internalSupplierIds ?? [] : selectedSuppliers),
    [isEditMode, existingPayment, selectedSuppliers],
  )

  const suppliersForStatement = useCallback(
    (item: StatementListItem): StatementInternalSupplierRow[] | undefined => {
      if (item.legacyId == null) return undefined
      return statementSupplierMap.get(item.legacyId)
    },
    [statementSupplierMap],
  )

  // A statement is shown when no supplier filter is active, the lookup failed, or
  // it has at least one trip row for a selected supplier.
  const visibleStatements = useMemo(() => {
    if (activeSupplierIds.length === 0 || supplierLookupFailed) return availableStatements
    const selected = new Set(activeSupplierIds.map(String))
    return availableStatements.filter((item) => {
      const rows = suppliersForStatement(item)
      if (!rows) return false
      return rows.some((r) => r.internal_supplier_id != null && selected.has(String(r.internal_supplier_id)))
    })
  }, [availableStatements, activeSupplierIds, supplierLookupFailed, suppliersForStatement])

  // A shown statement is "mixed" when it also carries trips for other suppliers or
  // unassigned trucks — its totals then include more than the selected supplier(s).
  const isMixedStatement = useCallback(
    (item: StatementListItem): boolean => {
      if (activeSupplierIds.length === 0 || supplierLookupFailed) return false
      const rows = suppliersForStatement(item)
      if (!rows) return false
      const selected = new Set(activeSupplierIds.map(String))
      return rows.some((r) => r.internal_supplier_id == null || !selected.has(String(r.internal_supplier_id)))
    },
    [activeSupplierIds, supplierLookupFailed, suppliersForStatement],
  )

  // ── Editable state ──
  const isEditable = existingPayment
    ? ['DRAFT', 'OPEN'].includes(existingPayment.status)
    : false

  // ── Actions available for current status ──
  const getActionsForStatus = useCallback((status: PaymentStatus): ActionType[] => {
    const actions: ActionType[] = []
    switch (status) {
      case 'DRAFT':
        if (canUpdate) actions.push('open')
        if (canDelete) actions.push('delete')
        break
      case 'OPEN':
        if (canUpdate) actions.push('submit')
        if (canDelete) actions.push('void')
        break
      case 'REVIEW':
        if (canApprove) actions.push('approve')
        if (canUpdate) actions.push('return')
        if (canDelete) actions.push('void')
        break
      case 'APPROVED':
        if (canUpdate) actions.push('close')
        if (canDelete) actions.push('void')
        break
      case 'CLOSED':
        if (canUpdate) actions.push('reopen')
        break
      case 'VOID':
        break
    }
    return actions
  }, [canUpdate, canDelete, canApprove])

  // ── Confirm action handler ──
  const handleConfirmAction = async () => {
    if (!pendingAction) return
    const { type, paymentId, statementId } = pendingAction
    try {
      switch (type) {
        case 'delete':
          await deletePayment(paymentId).unwrap()
          addToast(t('actions.delete') + ' — OK', 'success')
          navigate('/operations/payments')
          return
        case 'open': await openPayment(paymentId).unwrap(); break
        case 'submit': await submitPayment(paymentId).unwrap(); break
        case 'approve': await approvePayment(paymentId).unwrap(); break
        case 'return': await returnPayment(paymentId).unwrap(); break
        case 'void': await voidPayment({ id: paymentId, reason: voidReason || 'Voided' }).unwrap(); setVoidReason(''); break
        case 'reopen': await reopenPayment(paymentId).unwrap(); break
        case 'removeStatement':
          if (statementId) {
            await removeStatement({ paymentId, statementId }).unwrap()
          }
          break
        case 'bulkRemoveStatements':
          if (pendingAction.statementIds) {
            await Promise.all(
              pendingAction.statementIds.map((sid) =>
                removeStatement({ paymentId, statementId: sid }).unwrap()
              )
            )
            setSelectedLinkedIds(new Set())
          }
          break
      }
      addToast(t(`actions.${type === 'removeStatement' || type === 'bulkRemoveStatements' ? 'delete' : type}`) + ' — OK', 'success')
    } catch (err: any) {
      const msg = err?.data?.message || t('errors.actionFailed', { action: t(`actions.${type === 'removeStatement' || type === 'bulkRemoveStatements' ? 'delete' : type}`) })
      setValidationError(msg)
      addToast(msg, 'danger')
    } finally {
      setPendingAction(null)
    }
  }

  // ── Confirmation message ──
  const getConfirmMessage = (action: PendingAction): string => {
    if (action.type === 'bulkRemoveStatements') {
      return t('detail.confirmBulkRemove', { count: action.count })
    }
    if (action.type === 'removeStatement') {
      return t('detail.confirmRemoveStatement', { number: action.statementNumber || '' })
    }
    return t(`confirm.${action.type}`, { number: action.paymentNumber || '' })
  }

  // ── Validation (create mode) ──
  const validateStep1 = useCallback((): boolean => {
    if (!paymentType) {
      setValidationError(t('validation.isRequired', { field: t('fields.paymentType') }))
      return false
    }
    if (paymentType !== 'CLIENT_INVOICE' && (!dateRangeStart || !dateRangeEnd)) {
      setValidationError(t('validation.isRequired', { field: t('fields.dateRangeStart') + ' / ' + t('fields.dateRangeEnd') }))
      return false
    }
    if (!exchangeRate || Number(exchangeRate) <= 0) {
      setValidationError(t('validation.mustBePositive', { field: t('fields.exchangeRate') }))
      return false
    }
    if (paymentType === 'CLIENT_INVOICE' && selectedClients.length === 0) {
      setValidationError(t('validation.clientRequired'))
      return false
    }
    if (paymentType === 'CLIENT_INVOICE' && selectedWeeks.length === 0) {
      setValidationError(t('validation.isRequired', { field: t('fields.weeks') }))
      return false
    }
    if (paymentType === 'SUBDIVISION_STATEMENT' && selectedSubdivisions.length === 0) {
      setValidationError(t('validation.subdivisionRequired'))
      return false
    }
    setValidationError('')
    return true
  }, [paymentType, dateRangeStart, dateRangeEnd, exchangeRate, selectedSubdivisions, selectedClients, selectedWeeks, t])

  // ── Create payment → go to step 2 ──
  const handleNext = async () => {
    if (!validateStep1()) return
    try {
      const isSubdivision = paymentType === 'SUBDIVISION_STATEMENT'
      const isClientInvoice = paymentType === 'CLIENT_INVOICE'
      const body: CreatePaymentInput = {
        paymentType: paymentType as PaymentType,
        ...(!isClientInvoice && { dateRangeStart, dateRangeEnd }),
        showKms,
        exchangeRate: Number(exchangeRate),
        ...(isSubdivision ? { weekIds: autoWeeks } : {}),
      }
      if (selectedClients.length > 0) body.clientIds = selectedClients
      if (selectedSubdivisions.length > 0) body.subdivisionIds = selectedSubdivisions
      if (isSubdivision && selectedSuppliers.length > 0) body.internalSupplierIds = selectedSuppliers.map(String)
      if (!isSubdivision && selectedWeeks.length > 0) body.weekIds = selectedWeeks

      // Snapshot per-truck internal suppliers for subdivision-statement payments.
      // Non-blocking: if it fails, warn and create the payment without the field.
      if (isSubdivision && selectedSubdivisions.length > 0) {
        try {
          const rows = await paymentsAssetsApi.getTruckInternalSuppliers(selectedSubdivisions)
          body.truckInternalSuppliers = mapTruckInternalSuppliers(rows)
        } catch {
          addToast(
            t('errors.truckInternalSuppliers', {
              defaultValue: 'Could not load truck internal suppliers; continuing without them.',
            }),
            'warning',
          )
        }
      }

      const result = await createPayment(body).unwrap()
      setCreatedPaymentId(result.data.id)
      setStep(1)
    } catch (err: any) {
      setValidationError(err?.data?.message || t('errors.createPayment'))
    }
  }

  // ── Statement selection helpers ──
  const toggleStatement = (id: string) => {
    setSelectedStatementIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Select-all operates on the currently-visible (supplier-filtered) statements,
  // leaving any selections outside the current view untouched.
  const allVisibleSelected =
    visibleStatements.length > 0 && visibleStatements.every((s) => selectedStatementIds.has(s.id))

  const toggleAll = () => {
    setSelectedStatementIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        visibleStatements.forEach((s) => next.delete(s.id))
      } else {
        visibleStatements.forEach((s) => next.add(s.id))
      }
      return next
    })
  }

  const selectedTotals = useMemo(() => {
    let totalLps = 0
    let totalUsd = 0
    for (const s of availableStatements) {
      if (selectedStatementIds.has(s.id)) {
        totalLps += s.finalTotalLps
        totalUsd += s.finalTotalUsd
      }
    }
    return { count: selectedStatementIds.size, totalLps, totalUsd }
  }, [availableStatements, selectedStatementIds])

  // ── Finish: add statements → open payment detail (create mode) ──
  const handleFinish = async () => {
    if (!createdPaymentId) return
    if (selectedStatementIds.size > 0) {
      try {
        await addStatements({
          paymentId: createdPaymentId,
          statementIds: Array.from(selectedStatementIds),
        }).unwrap()
      } catch (err: any) {
        setValidationError(err?.data?.message || t('errors.addStatements'))
        return
      }
    }
    navigate(`/operations/payments/${createdPaymentId}`)
  }

  // ── Add statements in edit mode (stays on page) ──
  const handleAddStatementsEdit = async () => {
    if (!createdPaymentId || selectedStatementIds.size === 0) return
    try {
      await addStatements({
        paymentId: createdPaymentId,
        statementIds: Array.from(selectedStatementIds),
      }).unwrap()
      setSelectedStatementIds(new Set())
      setShowAddStatements(false)
      addToast(t('detail.addSelected') + ' — OK', 'success')
    } catch (err: any) {
      const msg = err?.data?.message || t('errors.addStatements')
      setValidationError(msg)
      addToast(msg, 'danger')
    }
  }

  // ── Add charge handler ──
  const handleAddCharge = async () => {
    if (!createdPaymentId) return
    if (!chargeForm.description.trim()) {
      setChargeFormError(t('validation.isRequired', { field: t('charges.form.description') }))
      return
    }
    const amount = Number(chargeForm.amountUsd)
    if (!amount || amount <= 0) {
      setChargeFormError(t('validation.mustBePositive', { field: t('charges.form.amountUsd') }))
      return
    }
    setChargeFormError('')
    try {
      const body: CreateChargeInput = {
        entryType: chargeForm.entryType,
        costType: chargeForm.costType,
        categoryName: chargeForm.categoryName || undefined,
        description: chargeForm.description.trim(),
        reference: chargeForm.reference.trim() || undefined,
        debit: chargeForm.entryType === 'DEBIT' ? amount : 0,
        credit: chargeForm.entryType === 'CREDIT' ? amount : 0,
      }
      await addCharge({ paymentId: createdPaymentId, body }).unwrap()
      setShowChargeModal(false)
      setChargeForm({ entryType: 'DEBIT', costType: 'NOT_INCLUDED', categoryName: '', description: '', reference: '', amountUsd: '' })
      addToast(t('charges.addCharge') + ' — OK', 'success')
    } catch (err: any) {
      setChargeFormError(err?.data?.message || t('errors.addCharge'))
    }
  }

  // ── Remove charge handler ──
  const handleRemoveCharge = (chargeId: string) => {
    if (!createdPaymentId) return
    showChargeConfirm({
      title: t('confirm.title'),
      message: t('charges.confirmRemove'),
      confirmText: t('actions.delete'),
      onConfirm: () => {
        removeCharge({ paymentId: createdPaymentId!, chargeId })
      },
    })
  }

  const toggleChargeSelection = (chargeId: string) => {
    setSelectedChargeIds(prev => {
      const next = new Set(prev)
      if (next.has(chargeId)) next.delete(chargeId)
      else next.add(chargeId)
      return next
    })
  }

  const toggleAllCharges = () => {
    if (selectedChargeIds.size === charges.length) {
      setSelectedChargeIds(new Set())
    } else {
      setSelectedChargeIds(new Set(charges.map(c => c.id)))
    }
  }

  const handleBulkRemoveCharges = async () => {
    if (!createdPaymentId || selectedChargeIds.size === 0) return
    showChargeConfirm({
      title: t('confirm.title'),
      message: t('charges.confirmBulkRemove', { count: selectedChargeIds.size }),
      confirmText: t('charges.removeSelected', { count: selectedChargeIds.size }),
      onConfirm: async () => {
        try {
          await bulkRemoveCharges({ paymentId: createdPaymentId!, chargeIds: Array.from(selectedChargeIds) }).unwrap()
          setSelectedChargeIds(new Set())
          addToast(t('charges.removeCharge') + ' — OK', 'success')
        } catch (err: any) {
          addToast(err?.data?.message || t('errors.actionFailed', { action: 'remove charges' }), 'danger')
        }
      },
    })
  }

  // ── Open statement detail modal ──
  const handleOpenStatementDetail = async (stmt: StatementListItem) => {
    if (!createdPaymentId) return
    setStmtDetail(null)
    setStmtDetailNames({
      client: stmt.clientId ? (clientNameMap.get(stmt.clientId) || undefined) : undefined,
      subdivision: stmt.subdivisionId ? (subdivisionNameMap.get(stmt.subdivisionId) || undefined) : undefined,
    })
    setStmtDetailVisible(true)
    try {
      const result = await fetchStatementDetail({ paymentId: createdPaymentId, statementId: stmt.id }).unwrap()
      setStmtDetail(result.data)
    } catch {
      // leave null — modal shows loading then nothing
    }
  }

  // ── Recalculate charges handler (with preview) ──
  const handleRecalculate = async () => {
    if (!createdPaymentId) return
    setIsLoadingPreview(true)
    setShowChargePreview(true)
    setPreviewData(null)
    try {
      const result = await calculateCharges({ paymentId: createdPaymentId, body: { preview: true } }).unwrap()
      setPreviewData(result.data)
    } catch (err: any) {
      setValidationError(err?.data?.message || t('errors.previewCharges'))
      setShowChargePreview(false)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleApplyCharges = async () => {
    if (!createdPaymentId) return
    setIsApplyingCharges(true)
    try {
      await calculateCharges({ paymentId: createdPaymentId, body: { replace: true } }).unwrap()
      setShowChargePreview(false)
      setPreviewData(null)
      addToast(t('charges.recalculate') + ' — OK', 'success')
    } catch (err: any) {
      const msg = err?.data?.message || t('errors.applyCharges')
      setValidationError(msg)
      addToast(msg, 'danger')
    } finally {
      setIsApplyingCharges(false)
    }
  }

  // ── Inline metadata edit handlers ──
  const startEditMeta = () => {
    if (!existingPayment) return
    setEditDateStart(existingPayment.dateRangeStart?.split('T')[0] ?? '')
    setEditDateEnd(existingPayment.dateRangeEnd?.split('T')[0] ?? '')
    setEditExchangeRate(String(existingPayment.exchangeRate ?? ''))
    setEditShowKms(existingPayment.showKms ?? false)
    setEditWeeks(existingPayment.weekIds ?? [])
    setEditClients(existingPayment.clientIds ?? [])
    setEditSubdivisions(existingPayment.subdivisionIds ?? [])
    setEditSuppliers(existingPayment.internalSupplierIds ?? [])
    setIsEditingMeta(true)
  }

  const handleSaveMeta = async () => {
    if (!existingPayment) return
    try {
      const body: UpdatePaymentInput = {}
      if (editDateStart !== existingPayment.dateRangeStart?.split('T')[0]) body.dateRangeStart = editDateStart
      if (editDateEnd !== existingPayment.dateRangeEnd?.split('T')[0]) body.dateRangeEnd = editDateEnd
      const rate = Number(editExchangeRate)
      if (rate && rate !== existingPayment.exchangeRate) body.exchangeRate = rate
      if (editShowKms !== existingPayment.showKms) body.showKms = editShowKms
      if (JSON.stringify(editWeeks) !== JSON.stringify(existingPayment.weekIds)) body.weekIds = editWeeks
      if (JSON.stringify(editClients) !== JSON.stringify(existingPayment.clientIds)) body.clientIds = editClients
      const subsChanged = JSON.stringify(editSubdivisions) !== JSON.stringify(existingPayment.subdivisionIds)
      if (subsChanged) body.subdivisionIds = editSubdivisions
      if (JSON.stringify(editSuppliers) !== JSON.stringify(existingPayment.internalSupplierIds ?? []))
        body.internalSupplierIds = editSuppliers.map(String)

      // Re-snapshot per-truck internal suppliers when subdivisions change on a
      // still-editable (DRAFT/OPEN) subdivision-statement payment. Non-blocking.
      if (
        subsChanged &&
        existingPayment.type === 'SUBDIVISION_STATEMENT' &&
        (existingPayment.status === 'DRAFT' || existingPayment.status === 'OPEN') &&
        editSubdivisions.length > 0
      ) {
        try {
          const rows = await paymentsAssetsApi.getTruckInternalSuppliers(editSubdivisions)
          body.truckInternalSuppliers = mapTruckInternalSuppliers(rows)
        } catch {
          addToast(
            t('errors.truckInternalSuppliers', {
              defaultValue: 'Could not load truck internal suppliers; continuing without them.',
            }),
            'warning',
          )
        }
      }

      if (Object.keys(body).length > 0) {
        await updatePayment({ id: existingPayment.id, body }).unwrap()
      }
      setIsEditingMeta(false)
      addToast(t('meta.save') + ' — OK', 'success')
    } catch (err: any) {
      const msg = err?.data?.message || t('errors.updatePayment')
      setValidationError(msg)
      addToast(msg, 'danger')
    }
  }

  // ── Close payment handler ──
  const handleClosePayment = async () => {
    if (!createdPaymentId) return
    if (!closeForm.bankId.trim()) { setCloseFormError(t('validation.isRequired', { field: t('settlement.bankId') })); return }
    if (!closeForm.transferNumber.trim()) { setCloseFormError(t('validation.isRequired', { field: t('settlement.transferNumber') })); return }
    const val = Number(closeForm.transferValue)
    if (!val || val <= 0) { setCloseFormError(t('validation.mustBePositive', { field: t('settlement.transferValue') })); return }
    if (!closeForm.transferDate) { setCloseFormError(t('validation.isRequired', { field: t('settlement.transferDate') })); return }
    setCloseFormError('')
    try {
      const body: ClosePaymentInput = {
        bankId: closeForm.bankId.trim(),
        transferNumber: closeForm.transferNumber.trim(),
        transferValue: val,
        transferDate: closeForm.transferDate,
        closeNotes: closeForm.closeNotes.trim() || undefined,
      }
      await closePayment({ paymentId: createdPaymentId, body }).unwrap()
      setShowCloseModal(false)
      setCloseForm({ bankId: '', transferNumber: '', transferValue: '', transferDate: '', closeNotes: '' })
      addToast(t('settlement.close') + ' — OK', 'success')
    } catch (err: any) {
      const msg = err?.data?.message || t('errors.closePayment')
      setCloseFormError(msg)
      addToast(msg, 'danger')
    }
  }

  // ── Export PDF handler ──
  const handleExportPdf = async (paymentId: string) => {
    setIsExportingPdf(true)
    try {
      const stored = localStorage.getItem('exa_auth_token')
      const parsed = stored ? JSON.parse(stored) : null

      // Build entity name maps for the PDF generator
      const subNames: Record<string, string> = {}
      for (const id of existingPayment?.subdivisionIds || []) {
        const name = subdivisionNameMap.get(id)
        if (name) subNames[id] = name
      }
      const cliNames: Record<string, string> = {}
      for (const id of existingPayment?.clientIds || []) {
        const name = clientNameMap.get(id)
        if (name) cliNames[id] = name
      }
      const usrNames: Record<string, string> = {}
      for (const uid of [existingPayment?.createdBy, existingPayment?.updatedBy].filter(Boolean) as string[]) {
        const name = resolveUserName(uid)
        if (name) usrNames[uid] = name
      }
      const params = new URLSearchParams()
      if (Object.keys(subNames).length) params.set('subdivisionNames', JSON.stringify(subNames))
      if (Object.keys(cliNames).length) params.set('clientNames', JSON.stringify(cliNames))
      if (Object.keys(usrNames).length) params.set('userNames', JSON.stringify(usrNames))
      if (pdfCurrency !== 'BOTH') params.set('currency', pdfCurrency)
      const qs = params.toString()
      const runtimeEnv = typeof window !== 'undefined'
        ? (window as unknown as { __ENV__?: { VITE_API_URL?: string } }).__ENV__?.VITE_API_URL
        : undefined
      const apiBase = (
        (runtimeEnv && !runtimeEnv.startsWith('$') ? runtimeEnv : null)
        || import.meta.env.VITE_API_URL
        || ''
      ).replace(/\/+$/, '')
      const pdfUrl = `${apiBase}/payment-core/payments/${paymentId}/pdf${qs ? `?${qs}` : ''}`

      const res = await fetch(pdfUrl, {
        headers: parsed?.access_token ? { Authorization: `Bearer ${parsed.access_token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payment-${existingPayment?.paymentNumber ?? paymentId}.pdf`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 200)
      addToast(t('actions.exportPdf') + ' — OK', 'success')
    } catch {
      addToast(t('actions.exportPdf') + ' — Failed', 'danger')
    } finally {
      setIsExportingPdf(false)
    }
  }

  // ── Available statements table config ──
  const statementColumns = [
    { key: 'select', label: '', _style: { width: '40px' }, filter: false, sorter: false },
    { key: 'statementNumber', label: t('statements.statementNumber') },
    { key: 'client', label: t('fields.clients') },
    { key: 'subdivision', label: t('fields.subdivisions') },
    { key: 'internalSuppliers', label: t('statements.internalSuppliers', 'Internal Suppliers'), filter: false, sorter: false },
    { key: 'weekId', label: t('statements.week') },
    { key: 'tripCount', label: t('statements.trips') },
    ...(effectiveShowKms ? [{ key: 'totalKm', label: t('statements.totalKm') }] : []),
    { key: 'finalTotalLps', label: t('statements.totalLps') },
    { key: 'finalTotalUsd', label: t('statements.totalUsd') },
    { key: 'status', label: t('columns.status') },
  ]

  // Distinct supplier names for a statement ("Unassigned" for null trips; "—" when
  // the statement has no legacy id or the lookup returned nothing).
  const renderStatementSuppliers = (item: StatementListItem) => {
    const rows = suppliersForStatement(item)
    if (!rows || rows.length === 0) return '—'
    const names = Array.from(
      new Set(rows.map((r) => r.internal_supplier_name || t('supplier.unassigned', 'Unassigned'))),
    )
    return names.join(', ')
  }

  const statementScopedColumns = {
    select: (item: StatementListItem) => (
      <td>
        <CFormCheck
          checked={selectedStatementIds.has(item.id)}
          onChange={() => toggleStatement(item.id)}
        />
      </td>
    ),
    internalSuppliers: (item: StatementListItem) => (
      <td>
        <div className="d-flex align-items-center gap-1 flex-wrap">
          <span>{renderStatementSuppliers(item)}</span>
          {isMixedStatement(item) && (
            <CBadge
              color="warning"
              shape="rounded-pill"
              title={t('statements.mixedSuppliersHint', "Mixed: includes other suppliers' trips")}
            >
              {t('statements.mixedSuppliers', 'mixed')}
            </CBadge>
          )}
        </div>
      </td>
    ),
    statementNumber: (item: StatementListItem) => (
      <td>
        <div className="d-flex align-items-center gap-1 flex-wrap">
          <CBadge color="primary" shape="rounded-pill">
            {item.legacyId || item.statementNumber || '—'}
          </CBadge>
          {item.legacyId && item.statementNumber && String(item.legacyId) !== item.statementNumber && (
            <small className="text-body-secondary">#{item.statementNumber}</small>
          )}
        </div>
      </td>
    ),
    client: (item: StatementListItem) => (
      <td>{item.clientId ? (clientNameMap.get(item.clientId) || clientNameMap.get(String(item.clientId)) || `#${item.clientId}`) : '—'}</td>
    ),
    subdivision: (item: StatementListItem) => (
      <td>{item.subdivisionId ? (subdivisionNameMap.get(item.subdivisionId) || `#${item.subdivisionId}`) : '—'}</td>
    ),
    finalTotalLps: (item: StatementListItem) => (
      <td><CurrencyDisplay value={item.finalTotalLps} currency="LPS" /></td>
    ),
    finalTotalUsd: (item: StatementListItem) => (
      <td><CurrencyDisplay value={item.finalTotalUsd} currency="USD" /></td>
    ),
    status: (item: StatementListItem) => (
      <td><CBadge color="info">{item.status}</CBadge></td>
    ),
  }

  // ── Which entity selects to show (create mode) ──
  const showSubdivisionsSelect =
    paymentType === 'SUBDIVISION_STATEMENT' ||
    paymentType === ''
  const showClientsSelect =
    paymentType === 'CLIENT_INVOICE' ||
    paymentType === ''
  const isUnsupportedType =
    paymentType === 'DRIVER' || paymentType === 'GAS_SUPPLIER'

  // ── Dirty state for FormDirtyGuard (create mode step 0 only) ──
  const isDirty = !isEditMode && step === 0 && (
    paymentType !== '' ||
    dateRangeStart !== '' ||
    dateRangeEnd !== '' ||
    selectedSubdivisions.length > 0 ||
    selectedClients.length > 0
  )

  // ── Loading state — skeleton ──
  if (isEditMode && isLoadingPayment) {
    return (
      <>
        <PageHero kicker="Operations" icon={cilLibrary} title={t('loading')} subtitle="" />
        {/* Header skeleton */}
        <CCard className="shadow-sm border-0 mb-3">
          <CCardHeader className="bg-transparent">
            <CPlaceholder animation="glow" xs={4}><CPlaceholder xs={4} /></CPlaceholder>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-3">
              {[1, 2, 3, 4].map((i) => (
                <CCol xs={6} md={3} key={i}>
                  <CPlaceholder animation="glow" xs={8}><CPlaceholder xs={8} /></CPlaceholder>
                  <CPlaceholder animation="glow" xs={6} className="mt-1"><CPlaceholder xs={6} /></CPlaceholder>
                </CCol>
              ))}
            </CRow>
          </CCardBody>
        </CCard>
        {/* Summary cards skeleton */}
        <CRow className="mb-3 g-3">
          {[1, 2, 3, 4].map((i) => (
            <CCol xs={6} md={3} key={i}>
              <CCard className="shadow-sm border-0">
                <CCardBody className="text-center py-3">
                  <CPlaceholder animation="glow" xs={6}><CPlaceholder xs={6} /></CPlaceholder>
                  <CPlaceholder animation="glow" xs={8} className="mt-2"><CPlaceholder xs={8} size="lg" /></CPlaceholder>
                </CCardBody>
              </CCard>
            </CCol>
          ))}
        </CRow>
        {/* Statements area skeleton */}
        <CCard className="shadow-sm border-0 mb-3">
          <CCardHeader className="bg-transparent">
            <CPlaceholder animation="glow" xs={3}><CPlaceholder xs={3} /></CPlaceholder>
          </CCardHeader>
          <CCardBody>
            <CPlaceholder animation="glow" xs={12}><CPlaceholder xs={12} size="lg" /></CPlaceholder>
            <CPlaceholder animation="glow" xs={12} className="mt-2"><CPlaceholder xs={12} size="lg" /></CPlaceholder>
            <CPlaceholder animation="glow" xs={8} className="mt-2"><CPlaceholder xs={8} size="lg" /></CPlaceholder>
          </CCardBody>
        </CCard>
      </>
    )
  }

  // ════════════════════════════════════════════════════
  // EDIT MODE — Invoice-style detail view
  // ════════════════════════════════════════════════════
  if (isEditMode && existingPayment) {
    const linkedStatements = existingPayment.statements || []
    const charges = existingPayment.charges || []
    const availableActions = getActionsForStatus(existingPayment.status)

    const linkedTotals = linkedStatements.reduce(
      (acc, s) => ({
        totalLps: acc.totalLps + (s.finalTotalLps || 0),
        totalUsd: acc.totalUsd + (s.finalTotalUsd || 0),
        totalKm: acc.totalKm + (s.totalKm || 0),
        tripCount: acc.tripCount + (s.tripCount || 0),
      }),
      { totalLps: 0, totalUsd: 0, totalKm: 0, tripCount: 0 },
    )

    const subdivisionNames = (existingPayment.subdivisionIds || [])
      .map((id) => subdivisionNameMap.get(id) || `Subdivision #${id}`)
    const clientNames = (existingPayment.clientIds || [])
      .map((id) => clientNameMap.get(id) || `Client #${id}`)

    // Split actions for toolbar layout
    const workflowActions = availableActions.filter((a) =>
      ['open', 'submit', 'approve', 'return', 'reopen', 'close'].includes(a),
    )
    const destructiveActions = availableActions.filter((a) =>
      ['delete', 'void'].includes(a),
    )

    // Group charges by section
    const chargesBySection = SECTION_ORDER
      .map((section) => ({
        section,
        items: charges
          .filter((c) => c.section === section)
          .sort((a, b) => (a.entryType === 'CREDIT' ? -1 : 0) - (b.entryType === 'CREDIT' ? -1 : 0)),
      }))
      .filter((g) => g.items.length > 0)

    const chargeTotals = charges.reduce(
      (acc, c) => ({
        debitUsd: acc.debitUsd + c.debitUsd,
        creditUsd: acc.creditUsd + c.creditUsd,
        debitLps: acc.debitLps + c.debitLps,
        creditLps: acc.creditLps + c.creditLps,
      }),
      { debitUsd: 0, creditUsd: 0, debitLps: 0, creditLps: 0 },
    )

    // Statement status color helper
    const stmtStatusColor = (status: string): string => {
      switch (status?.toUpperCase()) {
        case 'OPEN': return 'info'
        case 'READY': return 'success'
        case 'APPROVED': return 'success'
        case 'CLOSED': return 'secondary'
        case 'VOID': case 'VOIDED': return 'danger'
        case 'DRAFT': return 'warning'
        default: return 'secondary'
      }
    }

    // Linked statement toggle helpers
    const toggleLinked = (id: string) => {
      setSelectedLinkedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    const toggleAllLinked = () => {
      if (selectedLinkedIds.size === linkedStatements.length) {
        setSelectedLinkedIds(new Set())
      } else {
        setSelectedLinkedIds(new Set(linkedStatements.map((s) => s.id)))
      }
    }

    // Linked statements table columns (with checkbox for multi-select)
    const linkedColumns = [
      ...(isEditable ? [{ key: 'select', label: '', _style: { width: '40px' }, filter: false, sorter: false }] : []),
      { key: 'statementNumber', label: t('statements.statementNumber') },
      { key: 'client', label: t('fields.clients') },
      { key: 'subdivision', label: t('fields.subdivisions') },
      { key: 'weekId', label: t('statements.week') },
      { key: 'tripCount', label: t('statements.trips') },
      ...(effectiveShowKms ? [{ key: 'totalKm', label: t('statements.totalKm') }] : []),
      { key: 'finalTotalLps', label: t('statements.totalLps') },
      { key: 'finalTotalUsd', label: t('statements.totalUsd') },
      { key: 'status', label: t('columns.status') },
    ]

    const linkedFooter = [
      ...(isEditable ? [{ label: '', _props: {} }] : []),
      { label: '', _props: {} },
      { label: '', _props: {} },
      { label: '', _props: {} },
      { label: '', _props: {} },
      { label: `${t('statements.trips')}: ${linkedTotals.tripCount}`, _props: { className: 'fw-bold' } },
      ...(effectiveShowKms ? [{ label: `${t('statements.totalKm')}: ${linkedTotals.totalKm.toLocaleString()}`, _props: { className: 'fw-bold' } }] : []),
      { label: `${t('statements.totalLps')}: L ${linkedTotals.totalLps.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, _props: { className: 'fw-bold' } },
      { label: `${t('statements.totalUsd')}: $ ${linkedTotals.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, _props: { className: 'fw-bold' } },
      { label: '', _props: {} },
    ]

    const linkedScopedColumns: any = {
      ...(isEditable ? {
        select: (item: StatementListItem) => (
          <td>
            <CFormCheck
              checked={selectedLinkedIds.has(item.id)}
              onChange={() => toggleLinked(item.id)}
            />
          </td>
        ),
      } : {}),
      statementNumber: (item: StatementListItem) => (
        <td>
          <div className="d-flex align-items-center gap-1 flex-wrap">
            <CBadge
              color="primary"
              shape="rounded-pill"
              role="button"
              style={{ cursor: 'pointer' }}
              onClick={() => handleOpenStatementDetail(item)}
            >
              {item.legacyId || item.statementNumber || '—'}
            </CBadge>
            {item.legacyId && item.statementNumber && String(item.legacyId) !== item.statementNumber && (
              <small className="text-body-secondary">#{item.statementNumber}</small>
            )}
          </div>
        </td>
      ),
      client: (item: StatementListItem) => (
        <td>{item.clientId ? (clientNameMap.get(item.clientId) || clientNameMap.get(String(item.clientId)) || `#${item.clientId}`) : '—'}</td>
      ),
      subdivision: (item: StatementListItem) => (
        <td>{item.subdivisionId ? (subdivisionNameMap.get(item.subdivisionId) || `#${item.subdivisionId}`) : '—'}</td>
      ),
      finalTotalLps: (item: StatementListItem) => (
        <td><CurrencyDisplay value={item.finalTotalLps} currency="LPS" /></td>
      ),
      finalTotalUsd: (item: StatementListItem) => (
        <td><CurrencyDisplay value={item.finalTotalUsd} currency="USD" /></td>
      ),
      status: (item: StatementListItem) => (
        <td><CBadge color={stmtStatusColor(item.status)}>{item.status}</CBadge></td>
      ),
    }

    return (
      <>
        <ToasterComponent />
        <PageHero
          kicker="Operations"
          icon={cilLibrary}
          title={`${t('columns.paymentNumber')} ${existingPayment.paymentNumber}`}
          subtitle={t('subtitle')}
          actions={
            <CButton
              color="secondary"
              variant="ghost"
              onClick={() => navigate('/operations/payments')}
            >
              <CIcon icon={cilArrowLeft} className="me-1" />
              {t('wizard.back')}
            </CButton>
          }
        />

        {validationError && (
          <CAlert color="danger" dismissible onClose={() => setValidationError('')}>
            {validationError}
          </CAlert>
        )}

        {/* ─── Payment Information ─── */}
        <CCard className="shadow-sm border-0 mb-3">
          <CCardHeader className="bg-transparent d-flex justify-content-between align-items-center">
            <strong>{t('detail.paymentInfo')}</strong>
            {isEditable && canUpdate && !isEditingMeta && (
              <CButton color="primary" variant="ghost" size="sm" onClick={startEditMeta}>
                <CIcon icon={cilPencil} className="me-1" />
                {t('actions.edit')}
              </CButton>
            )}
            {isEditingMeta && (
              <div className="d-flex gap-2">
                <CButton
                  color="primary"
                  size="sm"
                  className="text-white"
                  disabled={isUpdatingPayment}
                  onClick={handleSaveMeta}
                >
                  {isUpdatingPayment ? <CSpinner size="sm" /> : <><CIcon icon={cilSave} className="me-1" />{t('meta.save')}</>}
                </CButton>
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  disabled={isUpdatingPayment}
                  onClick={() => setIsEditingMeta(false)}
                >
                  <CIcon icon={cilXCircle} className="me-1" />{t('meta.cancel')}
                </CButton>
              </div>
            )}
          </CCardHeader>
          <CCardBody>
            {isEditingMeta ? (
              <>
                <CRow className="g-3 mb-3">
                  <CCol xs={6} md={3}>
                    <small className="text-body-secondary d-block">{t('fields.paymentType')}</small>
                    <span className="fw-semibold">{t(`paymentType.${existingPayment.type}`)}</span>
                  </CCol>
                  <CCol xs={6} md={3}>
                    <small className="text-body-secondary d-block">{t('columns.status')}</small>
                    <StatusBadge status={existingPayment.status} />
                  </CCol>
                  <CCol xs={6} md={3}>
                    <CFormLabel className="text-body-secondary small mb-1">{t('fields.dateRangeStart')}</CFormLabel>
                    <CFormInput type="date" size="sm" value={editDateStart} onChange={(e) => setEditDateStart(e.target.value)} />
                  </CCol>
                  <CCol xs={6} md={3}>
                    <CFormLabel className="text-body-secondary small mb-1">{t('fields.dateRangeEnd')}</CFormLabel>
                    <CFormInput type="date" size="sm" value={editDateEnd} onChange={(e) => setEditDateEnd(e.target.value)} />
                  </CCol>
                </CRow>
                <CRow className="g-3 mb-3">
                  <CCol xs={12} md={4}>
                    <CFormLabel className="text-body-secondary small mb-1">{t('fields.weeks')}</CFormLabel>
                    <CMultiSelect
                      options={weekOptions}
                      value={editWeeks}
                      onChange={(selected: any[]) => setEditWeeks(selected.map((o) => Number(o.value ?? o)))}
                      placeholder={t('fields.weeks')}
                      selectionType="tags"
                      size="sm"
                    />
                  </CCol>
                  <CCol xs={6} md={4}>
                    <CFormLabel className="text-body-secondary small mb-1">{t('fields.exchangeRate')}</CFormLabel>
                    <CFormInput type="number" size="sm" min="0" step="0.01" value={editExchangeRate} onChange={(e) => setEditExchangeRate(e.target.value)} />
                  </CCol>
                  <CCol xs={6} md={4} className="d-flex align-items-end pb-2">
                    <CFormCheck label={t('fields.showKms')} checked={editShowKms} onChange={(e) => setEditShowKms(e.target.checked)} />
                  </CCol>
                </CRow>
                <CRow className="g-3 mb-3">
                  {existingPayment.type === 'SUBDIVISION_STATEMENT' && (
                    <CCol xs={12} md={6}>
                      <CFormLabel className="text-body-secondary small mb-1">{t('fields.subdivision')}</CFormLabel>
                      <CFormSelect
                        size="sm"
                        value={editSubdivisions[0] ?? ''}
                        onChange={(e) => setEditSubdivisions(e.target.value ? [e.target.value] : [])}
                      >
                        <option value="">{t('validation.selectSubdivision')}</option>
                        {subdivisionOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                  )}
                  {existingPayment.type === 'SUBDIVISION_STATEMENT' && (
                    <CCol xs={12} md={6}>
                      <CFormLabel className="text-body-secondary small mb-1">
                        {t('fields.internalSuppliers', 'Internal Suppliers')}
                        <small className="text-body-secondary ms-1">({t('fields.optional', 'optional')})</small>
                      </CFormLabel>
                      <CMultiSelect
                        options={editSupplierOptions}
                        value={editSuppliers}
                        onChange={(selected: any[]) => setEditSuppliers(selected.map((o) => String(o.value ?? o)))}
                        placeholder={t('fields.internalSuppliers', 'Internal Suppliers')}
                        selectionType="tags"
                        size="sm"
                        virtualScroller={editSupplierOptions.length > 20}
                        disabled={editSubdivisions.length === 0}
                      />
                    </CCol>
                  )}
                  {existingPayment.type === 'CLIENT_INVOICE' && (
                    <CCol xs={12} md={6}>
                      <CFormLabel className="text-body-secondary small mb-1">{t('fields.clients')}</CFormLabel>
                      <CMultiSelect
                        options={clientOptions}
                        value={editClients}
                        onChange={(selected: any[]) => setEditClients(selected.map((o) => String(o.value ?? o)))}
                        placeholder={t('fields.clients')}
                        selectionType="tags"
                        size="sm"
                      />
                    </CCol>
                  )}
                </CRow>
              </>
            ) : (
              <>
                <CRow className="g-3 mb-3">
                  <CCol xs={6} md={3}>
                    <small className="text-body-secondary d-block">{t('fields.paymentType')}</small>
                    <span className="fw-semibold">{t(`paymentType.${existingPayment.type}`)}</span>
                  </CCol>
                  <CCol xs={6} md={3}>
                    <small className="text-body-secondary d-block">{t('columns.status')}</small>
                    <StatusBadge status={existingPayment.status} />
                  </CCol>
                  <CCol xs={6} md={3}>
                    <small className="text-body-secondary d-block">{t('columns.dateRange')}</small>
                    <span className="fw-semibold">
                      {existingPayment.dateRangeStart
                        ? new Date(existingPayment.dateRangeStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}{' — '}
                      {existingPayment.dateRangeEnd
                        ? new Date(existingPayment.dateRangeEnd).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                  </CCol>
                  <CCol xs={6} md={3}>
                    <small className="text-body-secondary d-block">{t('columns.createdAt')}</small>
                    <span className="fw-semibold">
                      {new Date(existingPayment.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </CCol>
                </CRow>

                <CRow className="g-3 mb-3">
                  <CCol xs={6} md={3}>
                    <small className="text-body-secondary d-block">{t('columns.weekIds')}</small>
                    {(() => {
                      const ids = existingPayment.weekIds?.length ? existingPayment.weekIds : (() => {
                        const s = existingPayment.dateRangeStart
                        const e = existingPayment.dateRangeEnd
                        if (!s || !e) return []
                        const from = new Date(s)
                        const to = new Date(e)
                        return (weeksState.weeks || [])
                          .filter((wk: any) => {
                            const ws = new Date(wk.start_date)
                            const we = new Date(wk.end_date)
                            return ws <= to && we >= from
                          })
                          .map((wk: any) => Number(wk.week_id ?? wk.id))
                      })()
                      return ids.length ? (
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {ids.map((id: number) => (
                            <CBadge key={id} color="secondary" shape="rounded-pill" className="fw-normal" style={{ fontSize: '0.75rem' }}>
                              {weekNameById[id] || id}
                            </CBadge>
                          ))}
                        </div>
                      ) : <span className="fw-semibold">—</span>
                    })()}
                  </CCol>
                  <CCol xs={6} md={3}>
                    <small className="text-body-secondary d-block">{t('fields.exchangeRate')}</small>
                    <span className="fw-semibold">{existingPayment.exchangeRate ?? '—'}</span>
                  </CCol>
                  <CCol xs={6} md={3}>
                    <small className="text-body-secondary d-block">{t('fields.showKms')}</small>
                    <span className="fw-semibold">{existingPayment.showKms ? t('common.yes') : t('common.no')}</span>
                  </CCol>
                  <CCol xs={6} md={3}>
                    <small className="text-body-secondary d-block">{t('detail.createdBy')}</small>
                    <span className="fw-semibold">{resolveUserName(existingPayment.createdBy) || '—'}</span>
                  </CCol>
                </CRow>

                {/* Entity names */}
                {subdivisionNames.length > 0 && (
                  <CRow className="g-3 mb-3">
                    <CCol>
                      <small className="text-body-secondary d-block">{t('fields.subdivisions')}</small>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {subdivisionNames.map((name, i) => (
                          <CBadge key={i} color="info" shape="rounded-pill" className="px-2 py-1">
                            {name}
                          </CBadge>
                        ))}
                      </div>
                    </CCol>
                  </CRow>
                )}

                {clientNames.length > 0 && (
                  <CRow className="g-3 mb-3">
                    <CCol>
                      <small className="text-body-secondary d-block">{t('fields.clients')}</small>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {clientNames.map((name, i) => (
                          <CBadge key={i} color="primary" shape="rounded-pill" className="px-2 py-1">
                            {name}
                          </CBadge>
                        ))}
                      </div>
                    </CCol>
                  </CRow>
                )}
              </>
            )}
          </CCardBody>
        </CCard>

        {/* ─── Settlement Info (shown for CLOSED / VOID with settlement data) ─── */}
        {existingPayment.settlement && (
          <CCard className="shadow-sm border-0 mb-3 border-start border-success border-4">
            <CCardHeader className="bg-transparent">
              <strong>{t('settlement.title')}</strong>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol xs={6} md={3}>
                  <small className="text-body-secondary d-block">{t('settlement.bankId')}</small>
                  <span className="fw-semibold">{existingPayment.settlement.bankId || '—'}</span>
                </CCol>
                <CCol xs={6} md={3}>
                  <small className="text-body-secondary d-block">{t('settlement.transferNumber')}</small>
                  <span className="fw-semibold">{existingPayment.settlement.transferNo || '—'}</span>
                </CCol>
                <CCol xs={6} md={3}>
                  <small className="text-body-secondary d-block">{t('settlement.transferValue')}</small>
                  <span className="fw-semibold">
                    <CurrencyDisplay value={existingPayment.settlement.transferValue ?? 0} currency="USD" />
                  </span>
                </CCol>
                <CCol xs={6} md={3}>
                  <small className="text-body-secondary d-block">{t('settlement.transferDate')}</small>
                  <span className="fw-semibold">
                    {existingPayment.settlement.paymentDate
                      ? new Date(existingPayment.settlement.paymentDate).toLocaleDateString()
                      : '—'}
                  </span>
                </CCol>
              </CRow>
              <CRow className="g-3 mt-1">
                <CCol xs={6} md={3}>
                  <small className="text-body-secondary d-block">{t('detail.closedBy')}</small>
                  <span className="fw-semibold">{resolveUserName(existingPayment.settlement.settledBy) || '—'}</span>
                </CCol>
                <CCol xs={6} md={3}>
                  <small className="text-body-secondary d-block">{t('detail.closedAt')}</small>
                  <span className="fw-semibold">
                    {existingPayment.settlement.settledAt
                      ? new Date(existingPayment.settlement.settledAt).toLocaleDateString()
                      : '—'}
                  </span>
                </CCol>
                {existingPayment.settlement.closeNotes && (
                  <CCol xs={12} md={6}>
                    <small className="text-body-secondary d-block">{t('settlement.closeNotes')}</small>
                    <span className="fw-semibold">{existingPayment.settlement.closeNotes}</span>
                  </CCol>
                )}
              </CRow>
            </CCardBody>
          </CCard>
        )}

        {/* ─── DRAFT Hint ─── */}
        {existingPayment.status === 'DRAFT' && (
          <CAlert color="info" className="mb-3">
            {t('detail.draftHint')}
          </CAlert>
        )}

        {/* ─── Linked Statements ─── */}
        <CCard className="shadow-sm border-0 mb-3">
          <CCardHeader className="bg-transparent d-flex justify-content-between align-items-center">
            <strong>{t('detail.linkedStatements')} ({linkedStatements.length})</strong>
            {isEditable && linkedStatements.length > 0 && (
              <CFormCheck
                label={t('statements.selectAll')}
                checked={linkedStatements.length > 0 && selectedLinkedIds.size === linkedStatements.length}
                onChange={toggleAllLinked}
              />
            )}
          </CCardHeader>
          <CCardBody>
            {/* Bulk action bar */}
            {isEditable && selectedLinkedIds.size > 0 && (
              <div className="d-flex justify-content-between align-items-center bg-danger-subtle rounded px-3 py-2 mb-3">
                <span className="text-danger-emphasis fw-semibold">
                  {t('detail.selectedCount', { count: selectedLinkedIds.size })}
                </span>
                <CButton
                  color="danger"
                  size="sm"
                  disabled={isMutating}
                  onClick={() =>
                    setPendingAction({
                      type: 'bulkRemoveStatements',
                      paymentId: existingPayment.id,
                      statementIds: Array.from(selectedLinkedIds),
                      count: selectedLinkedIds.size,
                    })
                  }
                >
                  <CIcon icon={cilTrash} className="me-1" />
                  {t('detail.removeSelected', { count: selectedLinkedIds.size })}
                </CButton>
              </div>
            )}

            {linkedStatements.length === 0 ? (
              <CAlert color="info" className="mb-0">{t('detail.noLinkedStatements')}</CAlert>
            ) : (
              <>
                <div className="table-responsive">
                  <CSmartTable
                    items={linkedStatements}
                    columns={linkedColumns as any}
                    scopedColumns={linkedScopedColumns}
                    footer={linkedFooter as any}
                    itemsPerPage={50}
                    tableProps={{
                      hover: true,
                      striped: true,
                      responsive: true,
                      className: 'align-middle',
                    }}
                  />
                </div>

              </>
            )}
          </CCardBody>
        </CCard>

        {/* ─── Add More Statements (expandable, only when editable) ─── */}
        {isEditable && (
          <CCard className="shadow-sm border-0 mb-3">
            <CCardHeader
              className="bg-transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowAddStatements(!showAddStatements)}
            >
              <div className="d-flex justify-content-between align-items-center">
                <strong>
                  <CIcon icon={cilPlus} className="me-2" />
                  {t('detail.addStatements')}
                </strong>
                <CIcon icon={showAddStatements ? cilArrowLeft : cilArrowRight} size="sm" />
              </div>
            </CCardHeader>
            {showAddStatements && (
              <CCardBody>
                {isLoadingStatements ? (
                  <div className="text-center py-4"><CSpinner /></div>
                ) : statementsError ? (
                  <CAlert color="danger">{t('errors.loadStatements')}</CAlert>
                ) : availableStatements.length === 0 ? (
                  <CAlert color="info" className="mb-0">{t('statements.noStatements')}</CAlert>
                ) : (
                  <>
                    <div className="d-flex justify-content-end mb-2">
                      <CFormCheck
                        label={t('statements.selectAll')}
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                      />
                    </div>
                    <div className="table-responsive">
                      <CSmartTable
                        items={visibleStatements}
                        columns={statementColumns as any}
                        scopedColumns={statementScopedColumns}
                        itemsPerPage={50}
                        noItemsLabel={t('statements.noStatements')}
                        tableProps={{
                          hover: true,
                          striped: true,
                          responsive: true,
                          className: 'align-middle',
                        }}
                      />
                    </div>
                    {selectedStatementIds.size > 0 && (
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <CAlert color="success" className="mb-0 flex-grow-1 me-3">
                          {t('statements.summary', {
                            count: selectedTotals.count,
                            totalLps: selectedTotals.totalLps.toLocaleString('en-US', { minimumFractionDigits: 2 }),
                            totalUsd: selectedTotals.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }),
                          })}
                        </CAlert>
                        <CButton
                          color="primary"
                          className="text-white"
                          disabled={isAddingStatements}
                          onClick={handleAddStatementsEdit}
                        >
                          {isAddingStatements ? (
                            <CSpinner size="sm" />
                          ) : (
                            <>
                              <CIcon icon={cilCheckAlt} className="me-1" />
                              {t('detail.addSelected')}
                            </>
                          )}
                        </CButton>
                      </div>
                    )}
                  </>
                )}
              </CCardBody>
            )}
          </CCard>
        )}

        {/* ─── Charges ─── */}
        <CCard className="shadow-sm border-0 mb-3">
          <CCardHeader className="bg-transparent d-flex justify-content-between align-items-center">
            <strong>{t('charges.title')} ({charges.length})</strong>
            {isEditable && (
              <div className="d-flex gap-2">
                <CButton
                  color="primary"
                  size="sm"
                  className="text-white"
                  onClick={() => setShowChargeModal(true)}
                >
                  <CIcon icon={cilPlus} className="me-1" />
                  {t('charges.addCharge')}
                </CButton>
                <CButton
                  color="info"
                  size="sm"
                  className="text-white"
                  disabled={isCalculating || linkedStatements.length === 0}
                  onClick={handleRecalculate}
                >
                  <CIcon icon={cilCalculator} className="me-1" />
                  {isCalculating ? t('charges.recalculating') : t('charges.recalculate')}
                </CButton>
                {selectedChargeIds.size > 0 && (
                  <CButton
                    color="danger"
                    size="sm"
                    disabled={isBulkRemovingCharges}
                    onClick={handleBulkRemoveCharges}
                  >
                    <CIcon icon={cilTrash} className="me-1" />
                    {t('charges.removeSelected', { count: selectedChargeIds.size })}
                  </CButton>
                )}
              </div>
            )}
          </CCardHeader>
          <CCardBody>
            {charges.length === 0 ? (
              <CAlert color="info" className="mb-0">{t('charges.noCharges')}</CAlert>
            ) : (
              <div className="table-responsive">
                <CTable hover striped className="align-middle mb-0">
                  <CTableHead>
                    <CTableRow>
                      {isEditable && (
                        <CTableHeaderCell style={{ width: '40px' }}>
                          <CFormCheck
                            checked={charges.length > 0 && selectedChargeIds.size === charges.length}
                            onChange={toggleAllCharges}
                          />
                        </CTableHeaderCell>
                      )}
                      <CTableHeaderCell>{t('detail.chargeType')}</CTableHeaderCell>
                      <CTableHeaderCell>{t('detail.chargeDescription')}</CTableHeaderCell>
                      <CTableHeaderCell>{t('detail.chargeEntry')}</CTableHeaderCell>
                      <CTableHeaderCell className="text-end text-danger">{t('charges.entry.DEBIT')} USD</CTableHeaderCell>
                      <CTableHeaderCell className="text-end text-success">{t('charges.entry.CREDIT')} USD</CTableHeaderCell>
                      <CTableHeaderCell className="text-end text-danger">{t('charges.entry.DEBIT')} LPS</CTableHeaderCell>
                      <CTableHeaderCell className="text-end text-success">{t('charges.entry.CREDIT')} LPS</CTableHeaderCell>
                      <CTableHeaderCell>{t('fields.source')}</CTableHeaderCell>
                      {isEditable && <CTableHeaderCell></CTableHeaderCell>}
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {chargesBySection.map(({ section, items: sectionItems }) => {
                      const sectionTotals = sectionItems.reduce(
                        (acc, c) => ({
                          debitUsd: acc.debitUsd + c.debitUsd,
                          creditUsd: acc.creditUsd + c.creditUsd,
                          debitLps: acc.debitLps + c.debitLps,
                          creditLps: acc.creditLps + c.creditLps,
                        }),
                        { debitUsd: 0, creditUsd: 0, debitLps: 0, creditLps: 0 },
                      )
                      return (
                        <React.Fragment key={section}>
                          <CTableRow>
                            <CTableDataCell colSpan={isEditable ? 10 : 8} className={`bg-${SECTION_COLORS[section]}-subtle fw-semibold`}>
                              {t(`charges.section.${section}`)}
                            </CTableDataCell>
                          </CTableRow>
                          {sectionItems.map((charge) => {
                            const isFuelCharge = charge.section === 'FUEL_STATEMENT' && charge.reference
                            const isAbsorbed = charge.sourceEvent === 'ABSORBED_CREDIT'
                            return (
                            <CTableRow key={charge.id} className={isAbsorbed ? 'bg-success-subtle' : ''}>
                              {isEditable && (
                                <CTableDataCell>
                                  {!isAbsorbed && (
                                    <CFormCheck
                                      checked={selectedChargeIds.has(charge.id)}
                                      onChange={() => toggleChargeSelection(charge.id)}
                                    />
                                  )}
                                </CTableDataCell>
                              )}
                              <CTableDataCell className="fw-semibold">{(i18n.language === 'es' && charge.typeNameEs) || charge.typeName || '—'}</CTableDataCell>
                              <CTableDataCell>
                                {isFuelCharge ? (
                                  <>
                                    {t('charges.fuelDeduction', 'Fuel Deduction')} —{' '}
                                    <a
                                      href={`/operations/subdivision-fuel-statements/${charge.reference}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-decoration-underline"
                                    >
                                      #{charge.reference}
                                    </a>
                                  </>
                                ) : (
                                  charge.description
                                )}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={charge.entryType === 'DEBIT' ? 'danger' : 'success'}>
                                  {t(`charges.entry.${charge.entryType}`)}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell className="text-end text-danger">
                                {charge.debitUsd ? <CurrencyDisplay value={charge.debitUsd} currency="USD" /> : '—'}
                              </CTableDataCell>
                              <CTableDataCell className="text-end text-success">
                                {charge.creditUsd ? <CurrencyDisplay value={charge.creditUsd} currency="USD" /> : '—'}
                              </CTableDataCell>
                              <CTableDataCell className="text-end text-danger">
                                {charge.debitLps ? <CurrencyDisplay value={charge.debitLps} currency="LPS" /> : '—'}
                              </CTableDataCell>
                              <CTableDataCell className="text-end text-success">
                                {charge.creditLps ? <CurrencyDisplay value={charge.creditLps} currency="LPS" /> : '—'}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={charge.sourceEvent === 'MANUAL' ? 'primary' : isAbsorbed ? 'success' : 'secondary'}>
                                  {t(`charges.source.${charge.sourceEvent}`, { defaultValue: charge.sourceEvent })}
                                </CBadge>
                              </CTableDataCell>
                              {isEditable && (
                                <CTableDataCell>
                                  {!isAbsorbed && (
                                    <CButton
                                      color="danger"
                                      variant="ghost"
                                      size="sm"
                                      disabled={isRemovingCharge}
                                      onClick={() => handleRemoveCharge(charge.id)}
                                    >
                                      <CIcon icon={cilTrash} />
                                    </CButton>
                                  )}
                                </CTableDataCell>
                              )}
                            </CTableRow>
                          )})}

                          {/* Section subtotal */}
                          <CTableRow className="fw-semibold bg-body-tertiary">
                            <CTableDataCell colSpan={isEditable ? 4 : 3} className="text-end small">
                              <span>{t(`charges.section.${section}`)} {t('common.subtotalLabel')}</span>
                              <br />
                              <span className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
                                {t('charges.net')}:{' '}
                                <CurrencyDisplay value={Math.round((sectionTotals.debitUsd - sectionTotals.creditUsd) * 100) / 100} currency="USD" />
                                {' / '}
                                <CurrencyDisplay value={Math.round((sectionTotals.debitLps - sectionTotals.creditLps) * 100) / 100} currency="LPS" />
                              </span>
                            </CTableDataCell>
                            <CTableDataCell className="text-end text-danger"><CurrencyDisplay value={sectionTotals.debitUsd} currency="USD" /></CTableDataCell>
                            <CTableDataCell className="text-end text-success"><CurrencyDisplay value={sectionTotals.creditUsd} currency="USD" /></CTableDataCell>
                            <CTableDataCell className="text-end text-danger"><CurrencyDisplay value={sectionTotals.debitLps} currency="LPS" /></CTableDataCell>
                            <CTableDataCell className="text-end text-success"><CurrencyDisplay value={sectionTotals.creditLps} currency="LPS" /></CTableDataCell>
                            <CTableDataCell colSpan={isEditable ? 2 : 1}></CTableDataCell>
                          </CTableRow>
                        </React.Fragment>
                      )
                    })}
                  </CTableBody>
                  <CTableFoot>
                    <CTableRow className="fw-bold border-top border-2">
                      <CTableDataCell colSpan={isEditable ? 4 : 3} className="text-end">
                        {t('totals.totalDeductions')}
                      </CTableDataCell>
                      <CTableDataCell colSpan={2} className="text-end text-danger">
                        <CurrencyDisplay value={Math.round((chargeTotals.debitUsd - chargeTotals.creditUsd) * 100) / 100} currency="USD" />
                      </CTableDataCell>
                      <CTableDataCell colSpan={2} className="text-end text-danger">
                        <CurrencyDisplay value={Math.round((chargeTotals.debitLps - chargeTotals.creditLps) * 100) / 100} currency="LPS" />
                      </CTableDataCell>
                      <CTableDataCell colSpan={isEditable ? 2 : 1}></CTableDataCell>
                    </CTableRow>
                  </CTableFoot>
                </CTable>
              </div>
            )}
          </CCardBody>
        </CCard>

        {/* ─── Financial Breakdown (from /totals endpoint) ─── */}
        <TotalsBreakdownCard paymentId={existingPayment.id} />

        {/* ─── Action Toolbar ─── */}
        <div className="d-flex justify-content-between align-items-center mt-3 mb-3 bg-body-tertiary rounded px-3 py-2">
          <div className="d-flex align-items-center gap-2">
            <StatusBadge status={existingPayment.status} />
            <span className="text-body-secondary small">
              {t(`paymentType.${existingPayment.type}`)}
            </span>
          </div>
          <div className="d-flex gap-2 align-items-center">
            {/* PDF currency selector — controls how the exported PDF prints */}
            <CButtonGroup role="group" aria-label={t('fields.pdfCurrency')}>
              {(['USD', 'LPS', 'BOTH'] as const).map((cur) => (
                <CButton
                  key={cur}
                  color="primary"
                  variant={pdfCurrency === cur ? undefined : 'outline'}
                  size="sm"
                  disabled={isExportingPdf}
                  onClick={() => setPdfCurrency(cur)}
                >
                  {cur === 'BOTH' ? t('fields.currencyBoth') : cur}
                </CButton>
              ))}
            </CButtonGroup>
            {/* Export PDF — always available */}
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              disabled={isExportingPdf}
              onClick={() => handleExportPdf(existingPayment.id)}
            >
              {isExportingPdf ? (
                <CSpinner size="sm" className="me-1" />
              ) : (
                <CIcon icon={cilCloudDownload} className="me-1" />
              )}
              {t('actions.exportPdf')}
            </CButton>
            {availableActions.length > 0 && <div className="vr mx-1" />}
            {workflowActions.map((action) => (
              <CButton
                key={action}
                color={actionColor(action)}
                size="sm"
                className="text-white"
                disabled={isMutating}
                onClick={() => {
                  if (action === 'close') {
                    setShowCloseModal(true)
                  } else {
                    setPendingAction({
                      type: action,
                      paymentId: existingPayment.id,
                      paymentNumber: String(existingPayment.paymentNumber),
                    })
                  }
                }}
              >
                <CIcon icon={actionIcon(action)} className="me-1" />
                {t(`actions.${action}`)}
              </CButton>
            ))}
            {workflowActions.length > 0 && destructiveActions.length > 0 && (
              <div className="vr mx-1" />
            )}
            {destructiveActions.map((action) => (
              <CButton
                key={action}
                color={actionColor(action)}
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() =>
                  setPendingAction({
                    type: action,
                    paymentId: existingPayment.id,
                    paymentNumber: String(existingPayment.paymentNumber),
                  })
                }
              >
                <CIcon icon={actionIcon(action)} className="me-1" />
                {t(`actions.${action}`)}
              </CButton>
            ))}
          </div>
        </div>

        {/* ─── Confirmation Modal ─── */}
        <CModal alignment="center" visible={pendingAction !== null} onClose={() => setPendingAction(null)}>
          <CModalHeader closeButton>
            <CModalTitle>{t('confirm.title')}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {pendingAction && getConfirmMessage(pendingAction)}
            {pendingAction?.type === 'void' && (
              <div className="mt-3">
                <CFormLabel>{t('actions.voidReason')}</CFormLabel>
                <CFormTextarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  rows={2}
                  placeholder={t('actions.voidReasonPlaceholder')}
                />
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="ghost" onClick={() => setPendingAction(null)}>
              {t('confirm.cancel')}
            </CButton>
            <CButton
              color={pendingAction ? actionColor(pendingAction.type) : 'primary'}
              className="text-white"
              disabled={isMutating}
              onClick={handleConfirmAction}
            >
              {isMutating ? <CSpinner size="sm" /> : t('confirm.confirm')}
            </CButton>
          </CModalFooter>
        </CModal>

        {/* ─── Add Charge Modal ─── */}
        <CModal alignment="center" visible={showChargeModal} onClose={() => setShowChargeModal(false)}>
          <CModalHeader closeButton>
            <CModalTitle>{t('charges.form.title')}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {chargeFormError && (
              <CAlert color="danger" dismissible onClose={() => setChargeFormError('')}>
                {chargeFormError}
              </CAlert>
            )}
            <div className="mb-3">
              <CFormLabel>{t('charges.form.entryType')}</CFormLabel>
              <CFormSelect
                value={chargeForm.entryType}
                onChange={(e) => setChargeForm({ ...chargeForm, entryType: e.target.value as 'DEBIT' | 'CREDIT' })}
              >
                <option value="DEBIT">{t('charges.entry.DEBIT')}</option>
                <option value="CREDIT">{t('charges.entry.CREDIT')}</option>
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel>{t('charges.form.costType')}</CFormLabel>
              <CFormSelect
                value={chargeForm.costType}
                onChange={(e) => setChargeForm({ ...chargeForm, costType: e.target.value as 'INCLUDED' | 'OTHER_INCLUDED' | 'NOT_INCLUDED' })}
              >
                <option value="INCLUDED">{t('charges.costType.INCLUDED')}</option>
                <option value="OTHER_INCLUDED">{t('charges.costType.OTHER_INCLUDED', 'Other Included')}</option>
                <option value="NOT_INCLUDED">{t('charges.costType.NOT_INCLUDED')}</option>
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel>{t('chargeConfig.form.category', 'Category')}</CFormLabel>
              <CFormSelect
                value={chargeForm.categoryName}
                onChange={(e) => setChargeForm({ ...chargeForm, categoryName: e.target.value })}
              >
                <option value="">-- {t('chargeConfig.form.noCategory', 'No Category')} --</option>
                {chargeCategoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel>{t('charges.form.description')}</CFormLabel>
              <CFormInput
                value={chargeForm.description}
                onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                maxLength={255}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>{t('charges.form.reference')}</CFormLabel>
              <CFormInput
                value={chargeForm.reference}
                onChange={(e) => setChargeForm({ ...chargeForm, reference: e.target.value })}
                maxLength={255}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>{t('charges.form.amountUsd')}</CFormLabel>
              <CFormInput
                type="number"
                min="0"
                step="0.01"
                value={chargeForm.amountUsd}
                onChange={(e) => setChargeForm({ ...chargeForm, amountUsd: e.target.value })}
                required
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="ghost" onClick={() => setShowChargeModal(false)}>
              {t('confirm.cancel')}
            </CButton>
            <CButton
              color="primary"
              className="text-white"
              disabled={isAddingCharge}
              onClick={handleAddCharge}
            >
              {isAddingCharge ? (
                <><CSpinner size="sm" className="me-1" />{t('charges.form.adding')}</>
              ) : (
                t('charges.form.add')
              )}
            </CButton>
          </CModalFooter>
        </CModal>

        {/* ─── Settlement / Close Modal ─── */}
        <CModal alignment="center" visible={showCloseModal} onClose={() => setShowCloseModal(false)}>
          <CModalHeader closeButton>
            <CModalTitle>{t('settlement.title')}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {closeFormError && (
              <CAlert color="danger" dismissible onClose={() => setCloseFormError('')}>
                {closeFormError}
              </CAlert>
            )}
            <div className="mb-3">
              <CFormLabel>{t('settlement.bankId')}</CFormLabel>
              <CFormSelect
                value={closeForm.bankId}
                onChange={(e) => setCloseForm({ ...closeForm, bankId: e.target.value })}
                required
              >
                <option value="">{t('settlement.selectBank')}</option>
                {bankList.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel>{t('settlement.transferNumber')}</CFormLabel>
              <CFormInput
                value={closeForm.transferNumber}
                onChange={(e) => setCloseForm({ ...closeForm, transferNumber: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>{t('settlement.transferValue')}</CFormLabel>
              <CFormInput
                type="number"
                min="0"
                step="0.01"
                value={closeForm.transferValue}
                onChange={(e) => setCloseForm({ ...closeForm, transferValue: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>{t('settlement.transferDate')}</CFormLabel>
              <CFormInput
                type="date"
                value={closeForm.transferDate}
                onChange={(e) => setCloseForm({ ...closeForm, transferDate: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>{t('settlement.closeNotes')}</CFormLabel>
              <CFormTextarea
                value={closeForm.closeNotes}
                onChange={(e) => setCloseForm({ ...closeForm, closeNotes: e.target.value })}
                rows={3}
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="ghost" onClick={() => setShowCloseModal(false)}>
              {t('confirm.cancel')}
            </CButton>
            <CButton
              color="dark"
              className="text-white"
              disabled={isClosing}
              onClick={handleClosePayment}
            >
              {isClosing ? (
                <><CSpinner size="sm" className="me-1" />{t('settlement.closing')}</>
              ) : (
                <><CIcon icon={cilLockLocked} className="me-1" />{t('settlement.close')}</>
              )}
            </CButton>
          </CModalFooter>
        </CModal>

        {/* ─── Charge Preview Modal ─── */}
        <ChargePreviewModal
          visible={showChargePreview}
          onClose={() => { setShowChargePreview(false); setPreviewData(null) }}
          previewData={previewData}
          isLoading={isLoadingPreview}
          onConfirm={handleApplyCharges}
          isApplying={isApplyingCharges}
        />

        {/* ─── Statement Detail Modal ─── */}
        <StatementDetailModal
          visible={stmtDetailVisible}
          onClose={() => { setStmtDetailVisible(false); setStmtDetail(null) }}
          detail={stmtDetail}
          isLoading={isLoadingStmtDetail}
          entityNames={stmtDetailNames}
          showKms={effectiveShowKms}
        />

        {/* ─── Audit Trail ─── */}
        <AuditTrailCard paymentId={existingPayment.id} />

        {/* ─── Charge Confirm Dialog ─── */}
        <ConfirmDialog
          visible={chargeConfirm.visible}
          title={chargeConfirm.title}
          message={chargeConfirm.message}
          confirmText={chargeConfirm.confirmText}
          cancelText={t('confirm.cancel')}
          onClose={closeChargeConfirm}
          onConfirm={chargeConfirm.onConfirm}
        />
      </>
    )
  }

  // ════════════════════════════════════════════════════
  // CREATE MODE — Wizard
  // ════════════════════════════════════════════════════
  return (
    <>
      <ToasterComponent />
      <PageHero
        kicker="Operations"
        icon={cilLibrary}
        title={t('wizard.title')}
        subtitle={t('wizard.subtitle')}
        actions={
          <CButton
            color="secondary"
            variant="ghost"
            onClick={() => navigate('/operations/payments')}
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            {t('wizard.back')}
          </CButton>
        }
      />

      <FormDirtyGuard isDirty={isDirty} />

      {/* Step indicator */}
      <CRow className="mb-3">
        <CCol>
          <div className="d-flex gap-2">
            <CBadge
              color={step === 0 ? 'primary' : 'success'}
              shape="rounded-pill"
              className="px-3 py-2"
              style={{ cursor: 'pointer' }}
              onClick={() => { if (step === 1 && !createdPaymentId) setStep(0) }}
            >
              1. {t('wizard.step1')}
            </CBadge>
            <CBadge
              color={step === 1 ? 'primary' : 'secondary'}
              shape="rounded-pill"
              className="px-3 py-2"
              style={{ cursor: createdPaymentId ? 'pointer' : 'default' }}
              onClick={() => { if (createdPaymentId) setStep(1) }}
            >
              2. {t('wizard.step2')}
            </CBadge>
          </div>
        </CCol>
      </CRow>

      {validationError && (
        <CAlert color="danger" dismissible onClose={() => setValidationError('')}>
          {validationError}
        </CAlert>
      )}

      {/* ─── STEP 1: Payment Setup ─── */}
      {step === 0 && (
        <CCard className="shadow-sm border-0">
          <CCardHeader className="bg-transparent">
            <strong>{t('wizard.step1')}</strong>
          </CCardHeader>
          <CCardBody>
            {/* Payment Type Cards */}
            <CFormLabel className="fw-semibold mb-2">{t('fields.paymentType')}</CFormLabel>
            <CRow className="mb-4 g-3">
              {PAYMENT_TYPES.map(({ key, icon, color }) => (
                <CCol xs={6} md={4} key={key}>
                  <CCard
                    className={`h-100 ${paymentType === key ? 'border-' + color + ' shadow' : 'border-light'}`}
                    style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                    onClick={() => setPaymentType(key)}
                  >
                    <CCardBody className="text-center py-3">
                      <CIcon
                        icon={icon}
                        size="xl"
                        className={`mb-2 text-${color}`}
                      />
                      <div className={`small fw-semibold ${paymentType === key ? `text-${color}` : 'text-body-secondary'}`}>
                        {t(`paymentType.${key}`)}
                      </div>
                      {paymentType === key && (
                        <CBadge color={color} className="mt-1" shape="rounded-pill">
                          <CIcon icon={cilCheckAlt} size="sm" />
                        </CBadge>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
              ))}
            </CRow>

            {/* Date Range (hidden for CLIENT_INVOICE since it uses weeks) */}
            {paymentType !== 'CLIENT_INVOICE' && (
            <CRow className="mb-3 g-3">
              {paymentType === 'SUBDIVISION_STATEMENT' && (
                <CCol xs={12} md={4}>
                  <CFormLabel>{t('fields.datePreset')}</CFormLabel>
                  <CFormSelect
                    value={datePreset}
                    onChange={(e) => handleDatePreset(e.target.value)}
                  >
                    <option value="">{t('fields.datePresetPlaceholder')}</option>
                    <option value="all">{t('fields.datePresetAll')}</option>
                    <option value="2w">{t('fields.datePreset2w')}</option>
                    <option value="3w">{t('fields.datePreset3w')}</option>
                    <option value="6m">{t('fields.datePreset6m')}</option>
                    <option value="mtd">{t('fields.datePresetMtd')}</option>
                    <option value="custom">{t('fields.datePresetCustom')}</option>
                  </CFormSelect>
                </CCol>
              )}
              <CCol xs={12} md={paymentType === 'SUBDIVISION_STATEMENT' ? 4 : 6}>
                <CFormLabel>{t('fields.dateRangeStart')}</CFormLabel>
                <CFormInput
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => { setDateRangeStart(e.target.value); setDatePreset('custom') }}
                />
              </CCol>
              <CCol xs={12} md={paymentType === 'SUBDIVISION_STATEMENT' ? 4 : 6}>
                <CFormLabel>{t('fields.dateRangeEnd')}</CFormLabel>
                <CFormInput
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => { setDateRangeEnd(e.target.value); setDatePreset('custom') }}
                />
              </CCol>
            </CRow>
            )}

            {/* Entity Selects */}
            <CRow className="mb-3 g-3">
              {showSubdivisionsSelect && (
                <CCol xs={12} md={6}>
                  <CFormLabel>{t('fields.subdivision')}</CFormLabel>
                  <CFormSelect
                    value={selectedSubdivisions[0] ?? ''}
                    onChange={(e) =>
                      setSelectedSubdivisions(e.target.value ? [e.target.value] : [])
                    }
                  >
                    <option value="">{t('validation.selectSubdivision')}</option>
                    {subdivisionOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </CFormSelect>
                </CCol>
              )}
              {paymentType === 'SUBDIVISION_STATEMENT' && (
                <CCol xs={12} md={6}>
                  <CFormLabel>
                    {t('fields.internalSuppliers', 'Internal Suppliers')}
                    <small className="text-body-secondary ms-1">({t('fields.optional', 'optional')})</small>
                  </CFormLabel>
                  <CMultiSelect
                    options={supplierOptions}
                    value={selectedSuppliers}
                    onChange={(selected: any[]) =>
                      setSelectedSuppliers(selected.map((o) => String(o.value ?? o)))
                    }
                    placeholder={t('fields.internalSuppliers', 'Internal Suppliers')}
                    selectionType="tags"
                    virtualScroller={supplierOptions.length > 20}
                    dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                    disabled={selectedSubdivisions.length === 0}
                  />
                </CCol>
              )}
              {showClientsSelect && (
                <CCol xs={12} md={6}>
                  <CFormLabel>{t('fields.clients')}</CFormLabel>
                  <CMultiSelect
                    options={clientOptions}
                    value={selectedClients}
                    onChange={(selected: any[]) =>
                      setSelectedClients(selected.map((o) => String(o.value ?? o)))
                    }
                    placeholder={t('fields.clients')}
                    selectionType="tags"
                    virtualScroller={clientOptions.length > 20}
                    dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                  />
                </CCol>
              )}
              {isUnsupportedType && (
                <CCol xs={12}>
                  <CAlert color="warning" className="mb-0">
                    {t('validation.unsupportedType', { type: t(`paymentType.${paymentType}`) })}
                  </CAlert>
                </CCol>
              )}
            </CRow>

            {/* Weeks + Exchange Rate + Show KMs */}
            <CRow className="mb-3 g-3">
              {paymentType !== 'SUBDIVISION_STATEMENT' && (
                <CCol xs={12} md={4}>
                  <CFormLabel>{t('fields.weeks')}</CFormLabel>
                  <CMultiSelect
                    options={weekOptions}
                    value={selectedWeeks}
                    onChange={(selected: any[]) =>
                      setSelectedWeeks(selected.map((o) => Number(o.value ?? o)))
                    }
                    placeholder={t('fields.weeks')}
                    selectionType="tags"
                    virtualScroller={weekOptions.length > 20}
                    dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                  />
                </CCol>
              )}
              <CCol xs={12} md={4}>
                <CFormLabel>
                  {t('fields.exchangeRate')} *
                  {paymentType === 'SUBDIVISION_STATEMENT' && exchangeRate && (
                    <small className="text-body-secondary ms-1">(from subdivision)</small>
                  )}
                </CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="e.g. 25.00"
                />
              </CCol>
              {paymentType !== 'SUBDIVISION_STATEMENT' && (
                <CCol xs={12} md={4} className="d-flex align-items-end pb-2">
                  <CFormCheck
                    label={t('fields.showKms')}
                    checked={showKms}
                    onChange={(e) => setShowKms(e.target.checked)}
                  />
                </CCol>
              )}
            </CRow>

            {/* Next button */}
            <div className="d-flex justify-content-end mt-4">
              <CButton
                color="primary"
                className="text-white"
                disabled={isCreating}
                onClick={handleNext}
              >
                {isCreating ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    {t('wizard.creating')}
                  </>
                ) : (
                  <>
                    {t('wizard.next')}
                    <CIcon icon={cilArrowRight} className="ms-2" />
                  </>
                )}
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* ─── STEP 2: Statement Selection ─── */}
      {step === 1 && (
        <CCard className="shadow-sm border-0">
          <CCardHeader className="bg-transparent d-flex justify-content-between align-items-center">
            <strong>{t('wizard.step2')}</strong>
            {availableStatements.length > 0 && (
              <CFormCheck
                label={t('statements.selectAll')}
                checked={allVisibleSelected}
                onChange={toggleAll}
              />
            )}
          </CCardHeader>
          <CCardBody>
            {isLoadingStatements ? (
              <div className="text-center py-5">
                <CSpinner />
              </div>
            ) : statementsError ? (
              <CAlert color="danger">{t('errors.loadStatements')}</CAlert>
            ) : availableStatements.length === 0 ? (
              <CAlert color="info">{t('statements.noStatements')}</CAlert>
            ) : (
              <>
                <div className="table-responsive">
                  <CSmartTable
                    items={visibleStatements}
                    columns={statementColumns as any}
                    scopedColumns={statementScopedColumns}
                    itemsPerPage={50}
                    noItemsLabel={t('statements.noStatements')}
                    tableProps={{
                      hover: true,
                      striped: true,
                      responsive: true,
                      className: 'align-middle',
                    }}
                  />
                </div>

                {selectedStatementIds.size > 0 && (
                  <CAlert color="success" className="mt-3 d-flex justify-content-between align-items-center">
                    <span>
                      {t('statements.summary', {
                        count: selectedTotals.count,
                        totalLps: selectedTotals.totalLps.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                        totalUsd: selectedTotals.totalUsd.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                      })}
                    </span>
                  </CAlert>
                )}
              </>
            )}

            {/* Navigation buttons */}
            <div className="d-flex justify-content-between mt-4">
              <CButton
                color="secondary"
                variant="ghost"
                onClick={() => setStep(0)}
                disabled={isAddingStatements}
              >
                <CIcon icon={cilArrowLeft} className="me-1" />
                {t('wizard.back')}
              </CButton>
              <CButton
                color="primary"
                className="text-white"
                disabled={isAddingStatements}
                onClick={handleFinish}
              >
                {isAddingStatements ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    {t('wizard.addingStatements')}
                  </>
                ) : (
                  <>
                    <CIcon icon={cilCheckAlt} className="me-2" />
                    {t('wizard.finish')}
                  </>
                )}
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}
    </>
  )
}

export default PaymentWizardPage
