/** Payment types matching exa-payment-core backend DTOs. */

export type PaymentType =
  | 'CLIENT_INVOICE'
  | 'SUBDIVISION_STATEMENT'
  | 'DRIVER'
  | 'GAS_SUPPLIER'

export type PaymentStatus = 'DRAFT' | 'OPEN' | 'REVIEW' | 'APPROVED' | 'CLOSED' | 'VOID'

/** Per-truck internal-supplier snapshot captured on a subdivision-statement payment. */
export interface TruckInternalSupplier {
  truckId: string
  truckLabel?: string
  subdivisionId?: string | null
  internalSupplierId?: string | null
  internalSupplierName?: string | null
}

export interface PaymentListItem {
  id: string
  paymentNumber: string
  type: PaymentType
  status: PaymentStatus
  weekIds: number[]
  clientIds: string[]
  subdivisionIds: string[]
  internalSupplierIds: string[]
  driverIds: string[]
  gasSupplierIds: string[]
  statementCount: number
  totalUsd: number
  totalLps: number
  exchangeRate: number
  transferValue: number | null
  showKms: boolean
  dateRangeStart: string | null
  dateRangeEnd: string | null
  createdBy: string | null
  createdAt: string
  updatedBy: string | null
  updatedAt: string
}

export interface StatementListItem {
  id: string
  legacyId: number | null
  type: string
  statementNumber: string
  clientId: string
  subdivisionId: string
  weekId: number
  dateRangeStart: string
  dateRangeEnd: string
  tripCount: number
  totalKm: number
  subtotalUsd: number
  subtotalLps: number
  taxUsd: number
  taxLps: number
  finalTotalUsd: number
  finalTotalLps: number
  kmRateUsd: number
  kmRateLps: number
  otherChargesUsd: number
  otherChargesLps: number
  exchangeRate: number | null
  status: string
  linkedPaymentId: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentCharge {
  id: string
  chargeConfigId: string | null
  section: 'INCLUDED_COST' | 'OTHER_INCLUDED_COST' | 'OTHER_CHARGE' | 'ADJUSTMENT' | 'FUEL_STATEMENT' | 'MANDATORY_CHARGE'
  entryType: 'DEBIT' | 'CREDIT'
  typeName: string
  typeNameEs: string | null
  description: string
  reference: string | null
  amountUsd: number
  amountLps: number
  debitUsd: number
  creditUsd: number
  debitLps: number
  creditLps: number
  balanceUsd: number
  balanceLps: number
  sourceEvent: string
  addedBy: string
  addedAt: string
}

export interface PaymentDetail extends PaymentListItem {
  settlement: {
    bankId: string
    transferNo: string
    transferValue: number | null
    paymentDate: string
    closeNotes: string | null
    settledBy: string
    settledAt: string
  } | null
  statements: StatementListItem[]
  charges: PaymentCharge[]
  truckInternalSuppliers?: TruckInternalSupplier[]
}

export interface CreatePaymentInput {
  paymentType: PaymentType
  clientIds?: string[]
  subdivisionIds?: string[]
  internalSupplierIds?: string[]
  driverIds?: string[]
  gasSupplierIds?: string[]
  dateRangeStart?: string
  dateRangeEnd?: string
  weekIds?: number[]
  showKms?: boolean
  exchangeRate?: number
  truckInternalSuppliers?: TruckInternalSupplier[]
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    perPage: number
    lastPage: number
  }
}

export interface PaymentListParams {
  page?: number
  perPage?: number
  status?: PaymentStatus
  type?: PaymentType
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export interface CreateChargeInput {
  entryType: 'DEBIT' | 'CREDIT'
  costType: 'INCLUDED' | 'OTHER_INCLUDED' | 'NOT_INCLUDED'
  categoryName?: string | null
  description: string
  reference?: string
  debit: number
  credit: number
  chargeConfigId?: string
}

export interface ClosePaymentInput {
  bankId: string
  transferNumber: string
  transferValue: number
  transferDate: string
  closeNotes?: string
}

export interface CalculateChargesInput {
  preview?: boolean
  replace?: boolean
}

export interface CalculateChargesResponse {
  charges: PaymentCharge[]
  preview: boolean
  totalDebit: number
  totalCredit: number
  netEffect: number
}

/* ── Charge Configuration ── */

export type ChargeConfigChargeType = 'calculated' | 'flexible'
export type AppliesToType = 'SUBDIVISION' | 'TRUCK' | 'DRIVER' | 'SUBDIVISION_TRUCK' | 'SUBDIVISION_DRIVER' | 'CLIENT' | 'GAS_SUPPLIER'
export type CalculationType = 'PERCENT' | 'FIXED_AMOUNT'
export type CalculationBase = 'KMS' | 'TOTAL_STATEMENT_USD' | 'TOTAL_STATEMENT_LPS' | 'TOTAL_STATEMENT_KMS' | 'CLIENT_STATEMENT_USD' | 'CLIENT_STATEMENT_LPS' | 'CLIENT_STATEMENT_KMS' | 'TRIPS'
export type FrequencyType = 'WEEKLY' | 'MONTHLY' | 'ANNUALLY'

export interface ChargeConfigListItem {
  id: string
  name: string
  nameEs: string | null
  description: string | null
  entryType: 'DEBIT' | 'CREDIT'
  appliesTo: AppliesToType
  chargeType: ChargeConfigChargeType
  costType: 'INCLUDED' | 'OTHER_INCLUDED' | 'NOT_INCLUDED'
  mandatory: boolean
  adjustment: boolean
  active: boolean
  categoryId: number | null
  categoryName: string | null
  scopeCount: number
  paymentChargeCount: number
  createdBy: string | null
  createdAt: string
  updatedBy: string | null
  updatedAt: string | null
}

export interface ChargeScope {
  id: string
  entityType: 'CLIENT' | 'SUBDIVISION' | 'TRUCK' | 'DRIVER' | 'GAS_SUPPLIER' | 'INTERNAL_SUPPLIER'
  entityId: string | null
  allEntities: boolean
}

export interface CalculatedConfig {
  id: string
  calculationType: CalculationType
  calculationBase: CalculationBase
  value: number
  period: FrequencyType
  startDate: string
  endDate: string | null
  currency?: 'USD' | 'HNL'
}

export interface FlexibleConfig {
  id: string
  frequency: FrequencyType
  startDate: string
  totalValue: number
  installmentCount: number
  currency?: 'USD' | 'HNL'
}

export interface ChargeConfigDetail extends ChargeConfigListItem {
  scopes: ChargeScope[]
  calculatedConfig: CalculatedConfig | null
  flexibleConfig: FlexibleConfig | null
}

export interface CreateChargeConfigInput {
  name: string
  nameEs?: string
  description?: string
  entry: 'DEBIT' | 'CREDIT'
  appliesToType: AppliesToType
  chargeType: 'CALCULATED' | 'FLEXIBLE'
  costType?: 'INCLUDED' | 'OTHER_INCLUDED' | 'NOT_INCLUDED'
  isAdjustment?: boolean
  isMandatory?: boolean
  categoryId?: number | null
  categoryName?: string | null
  calculatedRule?: {
    calculationType: CalculationType
    calculationBase: CalculationBase
    value: number
    period?: FrequencyType
    startDate: string
    endDate?: string
    currency?: 'USD' | 'HNL'
  }
  flexibleRule?: {
    totalValue: number
    installmentCount: number
    frequency: FrequencyType
    startDate: string
    /**
     * Legacy-loan onboarding (create-only). Number of installments from the
     * start that were already paid before this config was created in EMS.
     * The first N rows are stored as DEDUCTED with no paymentChargeId.
     * Must be 0..installmentCount inclusive. Defaults to 0.
     */
    initialPaidCount?: number
    currency?: 'USD' | 'HNL'
  }
  scopes?: { entityType: string; entityId?: string; allEntities?: boolean }[]
}

export interface UpdateChargeConfigInput extends Partial<Omit<CreateChargeConfigInput, 'chargeType'>> {}

export interface ChargeConfigListParams {
  page?: number
  pageSize?: number
  chargeType?: string
  appliesToType?: string
  isActive?: string
}

/* ── Statement Detail (with trips) ── */

export interface StatementTrip {
  id: string
  tripId: string
  legacyTripId: number | null
  invKm: number | null
  invPrice: number | null
  payKm: number | null
  payPrice: number | null
  counterRate: number | null
  addedAt: string
}

export interface StatementDetail extends StatementListItem {
  notes: string | null
  trips: StatementTrip[]
}

/* ── Payment Summary (report) ── */

export interface PaymentSummaryBucket {
  count: number
  totalUsd: number
  totalLps: number
}

export interface PaymentSummary {
  totalPayments: number
  grandTotalUsd: number
  grandTotalLps: number
  byStatus: Record<string, PaymentSummaryBucket>
  byType: Record<string, PaymentSummaryBucket>
}

/* ── Sprint 2 additions ── */

export interface UpdatePaymentInput {
  dateRangeStart?: string
  dateRangeEnd?: string
  clientIds?: string[]
  subdivisionIds?: string[]
  internalSupplierIds?: string[]
  driverIds?: string[]
  gasSupplierIds?: string[]
  exchangeRate?: number
  weekIds?: number[]
  showKms?: boolean
  truckInternalSuppliers?: TruckInternalSupplier[]
}

export interface PaymentTotals {
  statementTotalUsd: number
  statementTotalLps: number
  adjustments: { totalDebit: number; totalCredit: number; balance: number; balanceLps: number }
  includedCostCharges: { totalDebit: number; totalCredit: number; totalDebitLps: number; totalCreditLps: number; fuelTotal: number; fuelTotalLps: number; balance: number; balanceLps: number }
  otherIncludedCharges?: { totalDebit: number; totalCredit: number; totalDebitLps: number; totalCreditLps: number }
  otherCharges: { totalDebit: number; totalCredit: number; balance: number; balanceLps: number }
  subtotalUsd: number
  subtotalLps: number
  // 3-tier breakdown (Excel structure)
  grossUsd?: number
  grossLps?: number
  absorbedCreditUsd?: number
  absorbedCreditLps?: number
  includedCostsDebitUsd?: number
  includedCostsDebitLps?: number
  otherIncludedDebitUsd?: number
  otherIncludedDebitLps?: number
  totalIncludedCostsUsd?: number
  totalIncludedCostsLps?: number
  invoiceAmountUsd?: number
  invoiceAmountLps?: number
  nonIncludedDebitUsd?: number
  nonIncludedDebitLps?: number
  totalDeductionsUsd: number
  totalDeductionsLps: number
  totalDueUsd: number
  totalDueLps: number
}

export interface AuditEntry {
  id: string
  action: string
  previousState: Record<string, unknown> | null
  newState: Record<string, unknown> | null
  changedBy: string
  changedAt: string
  metadata?: Record<string, unknown>
}

export type InstallmentStatus = 'PENDING' | 'DEDUCTED' | 'CANCELLED'

export interface InstallmentListItem {
  id: string
  chargeConfigId: string
  chargeConfigName: string
  sequenceNumber: number
  label: string | null
  scheduledDate: string
  value: number
  status: InstallmentStatus
  createdAt: string
  updatedAt: string
}

export interface InstallmentSummary {
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  cancelledAmount: number
  installmentCount: number
  paidCount: number
  pendingCount: number
  cancelledCount: number
  progressPercent: number
}

export interface UpdateInstallmentInput {
  label?: string
  scheduledDate?: string
  amount?: number
}

/* ── Weekly Report ── */

export interface WeeklyReportCharge {
  typeName: string
  creditUsd?: number
  creditLps?: number
  debitUsd?: number
  debitLps?: number
}

export interface WeeklyReportRow {
  paymentId: string
  paymentNumber: number
  status: PaymentStatus
  subdivisionIds: string[]
  internalSupplierIds: string[]
  /** Snapshot names captured on the payment; preferred over the live attribute map when present. */
  internalSupplierNames?: string[]
  bankId: string | null
  weekIds: number[]
  exchangeRate: number
  statementTotalUsd: number
  statementTotalLps: number
  credits: WeeklyReportCharge[]
  includedDebits: WeeklyReportCharge[]
  otherIncludedDebits: WeeklyReportCharge[]
  notIncludedDebits: WeeklyReportCharge[]
  totalDueUsd: number
  totalDueLps: number
}

export interface WeeklyReportChargeColumns {
  credits: string[]
  includedDebits: string[]
  otherIncludedDebits: string[]
  notIncludedDebits: string[]
}

export interface WeeklyReportData {
  rows: WeeklyReportRow[]
  chargeColumns: WeeklyReportChargeColumns
}

export interface WeeklyReportParams {
  weekIds?: string
  dateFrom?: string
  dateTo?: string
  status?: PaymentStatus
  paymentType?: PaymentType
}
