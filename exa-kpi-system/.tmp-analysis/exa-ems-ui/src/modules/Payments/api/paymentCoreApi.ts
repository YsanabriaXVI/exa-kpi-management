import { baseApi } from '../../../services/api/baseApi'
import type {
  AuditEntry,
  CalculateChargesInput,
  CalculateChargesResponse,
  ChargeConfigDetail,
  ChargeConfigListItem,
  ChargeConfigListParams,
  ClosePaymentInput,
  CreateChargeConfigInput,
  CreateChargeInput,
  CreatePaymentInput,
  InstallmentListItem,
  InstallmentSummary,
  PaginatedResponse,
  PaymentSummary,
  StatementDetail,
  PaymentCharge,
  PaymentDetail,
  PaymentListItem,
  PaymentListParams,
  PaymentTotals,
  StatementListItem,
  UpdateChargeConfigInput,
  UpdateInstallmentInput,
  UpdatePaymentInput,
  WeeklyReportData,
  WeeklyReportParams,
} from '../types.v2'

interface ReconciliationCount {
  legacy: number
  migrated: number
  match: boolean
}

interface ReconciliationTotal extends ReconciliationCount {
  delta: number
}

export interface MigrationReconciliation {
  paymentCount: ReconciliationCount
  statementCount: ReconciliationCount
  chargeCount: ReconciliationCount
  totalUsd: ReconciliationTotal
  totalLps: ReconciliationTotal
  discrepancies: string[]
}

export interface MigrationRunResult {
  totalLegacy: number
  created: number
  skipped: number
  errors: number
  errorDetails: string[]
  reconciliation: MigrationReconciliation
}

export const paymentCoreApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query<PaginatedResponse<PaymentListItem>, PaymentListParams | void>({
      query: (params) => {
        const q = params ?? {}
        const searchParams = new URLSearchParams()
        if (q.page) searchParams.set('page', String(q.page))
        if (q.perPage) searchParams.set('perPage', String(q.perPage))
        if (q.status) searchParams.set('status', q.status)
        if (q.type) searchParams.set('paymentType', q.type)
        if (q.dateFrom) searchParams.set('dateFrom', q.dateFrom)
        if (q.dateTo) searchParams.set('dateTo', q.dateTo)
        if (q.sortBy) searchParams.set('sortBy', q.sortBy)
        if (q.sortDir) searchParams.set('sortDir', q.sortDir)
        const qs = searchParams.toString()
        return `/payment-core/payments${qs ? `?${qs}` : ''}`
      },
      providesTags: ['PaymentList'],
    }),

    getPaymentSummary: builder.query<
      { data: PaymentSummary },
      { dateFrom?: string; dateTo?: string } | void
    >({
      query: (params) => {
        const q = params ?? {}
        const sp = new URLSearchParams()
        if (q.dateFrom) sp.set('dateFrom', q.dateFrom)
        if (q.dateTo) sp.set('dateTo', q.dateTo)
        const qs = sp.toString()
        return `/payment-core/payments/summary${qs ? `?${qs}` : ''}`
      },
      providesTags: ['PaymentList'],
    }),

    getPaymentById: builder.query<{ data: PaymentDetail }, string>({
      query: (id) => `/payment-core/payments/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Payment' as const, id }],
    }),

    getAvailableStatements: builder.query<{ data: StatementListItem[] }, string>({
      query: (paymentId) => `/payment-core/payments/${paymentId}/statements/available`,
    }),

    getStatementDetail: builder.query<
      { data: StatementDetail },
      { paymentId: string; statementId: string }
    >({
      query: ({ paymentId, statementId }) =>
        `/payment-core/payments/${paymentId}/statements/${statementId}`,
      providesTags: (_r, _e, { statementId }) => [{ type: 'Payment' as const, id: statementId }],
    }),

    createPayment: builder.mutation<{ data: PaymentDetail }, CreatePaymentInput>({
      query: (body) => ({ url: '/payment-core/payments', method: 'POST', body }),
      invalidatesTags: ['PaymentList'],
    }),

    addStatements: builder.mutation<{ data: StatementListItem[] }, { paymentId: string; statementIds: string[] }>({
      query: ({ paymentId, statementIds }) => ({
        url: `/payment-core/payments/${paymentId}/statements`,
        method: 'POST',
        body: { statementIds },
      }),
      invalidatesTags: (_result, _error, { paymentId }) => [
        'PaymentList',
        { type: 'Payment' as const, id: paymentId },
      ],
    }),

    removeStatement: builder.mutation<void, { paymentId: string; statementId: string }>({
      query: ({ paymentId, statementId }) => ({
        url: `/payment-core/payments/${paymentId}/statements/${statementId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { paymentId }) => [
        'PaymentList',
        { type: 'Payment' as const, id: paymentId },
      ],
    }),

    deletePayment: builder.mutation<void, string>({
      query: (id) => ({ url: `/payment-core/payments/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        'PaymentList',
        { type: 'Payment' as const, id },
      ],
    }),

    openPayment: builder.mutation<void, string>({
      query: (id) => ({ url: `/payment-core/payments/${id}/open`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        'PaymentList',
        { type: 'Payment' as const, id },
      ],
    }),

    submitPayment: builder.mutation<void, string>({
      query: (id) => ({ url: `/payment-core/payments/${id}/submit`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        'PaymentList',
        { type: 'Payment' as const, id },
      ],
    }),

    approvePayment: builder.mutation<void, string>({
      query: (id) => ({ url: `/payment-core/payments/${id}/approve`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        'PaymentList',
        { type: 'Payment' as const, id },
      ],
    }),

    returnPayment: builder.mutation<void, string>({
      query: (id) => ({ url: `/payment-core/payments/${id}/return`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        'PaymentList',
        { type: 'Payment' as const, id },
      ],
    }),

    voidPayment: builder.mutation<void, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/payment-core/payments/${id}/void`, method: 'POST', body: { reason } }),
      invalidatesTags: (_result, _error, { id }) => [
        'PaymentList',
        { type: 'Payment' as const, id },
      ],
    }),

    reopenPayment: builder.mutation<void, string>({
      query: (id) => ({ url: `/payment-core/payments/${id}/reopen`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        'PaymentList',
        { type: 'Payment' as const, id },
      ],
    }),

    addCharge: builder.mutation<{ data: PaymentCharge }, { paymentId: string; body: CreateChargeInput }>({
      query: ({ paymentId, body }) => ({
        url: `/payment-core/payments/${paymentId}/charges`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { paymentId }) => [
        'PaymentList',
        { type: 'Payment' as const, id: paymentId },
      ],
    }),

    removeCharge: builder.mutation<void, { paymentId: string; chargeId: string }>({
      query: ({ paymentId, chargeId }) => ({
        url: `/payment-core/payments/${paymentId}/charges/${chargeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { paymentId }) => [
        'PaymentList',
        { type: 'Payment' as const, id: paymentId },
      ],
    }),

    bulkRemoveCharges: builder.mutation<void, { paymentId: string; chargeIds: string[] }>({
      query: ({ paymentId, chargeIds }) => ({
        url: `/payment-core/payments/${paymentId}/charges`,
        method: 'DELETE',
        body: { chargeIds },
      }),
      invalidatesTags: (_r, _e, { paymentId }) => [
        'PaymentList',
        { type: 'Payment' as const, id: paymentId },
      ],
    }),

    calculateCharges: builder.mutation<{ data: CalculateChargesResponse }, { paymentId: string; body: CalculateChargesInput }>({
      query: ({ paymentId, body }) => ({
        url: `/payment-core/payments/${paymentId}/calculated-charges`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { paymentId }) => [
        'PaymentList',
        { type: 'Payment' as const, id: paymentId },
      ],
    }),

    closePayment: builder.mutation<{ data: PaymentDetail }, { paymentId: string; body: ClosePaymentInput }>({
      query: ({ paymentId, body }) => ({
        url: `/payment-core/payments/${paymentId}/close`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { paymentId }) => [
        'PaymentList',
        { type: 'Payment' as const, id: paymentId },
      ],
    }),

    updatePayment: builder.mutation<{ data: PaymentDetail }, { id: string; body: UpdatePaymentInput }>({
      query: ({ id, body }) => ({ url: `/payment-core/payments/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => ['PaymentList', { type: 'Payment' as const, id }],
    }),

    getPaymentTotals: builder.query<{ data: PaymentTotals }, string>({
      query: (id) => `/payment-core/payments/${id}/totals`,
      providesTags: (_result, _error, id) => [{ type: 'Payment' as const, id }],
    }),

    getPaymentAudit: builder.query<{ data: AuditEntry[] }, string>({
      query: (id) => `/payment-core/payments/${id}/audit`,
      providesTags: (_result, _error, id) => [{ type: 'Payment' as const, id }],
    }),

    /* ── Installment endpoints ── */

    getChargeConfigInstallments: builder.query<
      PaginatedResponse<InstallmentListItem>,
      { configId: string; page?: number; pageSize?: number }
    >({
      query: ({ configId, page, pageSize }) => {
        const searchParams = new URLSearchParams()
        if (page) searchParams.set('page', String(page))
        if (pageSize) searchParams.set('pageSize', String(pageSize))
        const qs = searchParams.toString()
        return `/payment-core/charge-configs/${configId}/installments${qs ? `?${qs}` : ''}`
      },
      providesTags: (_result, _error, { configId }) => [{ type: 'ChargeConfig' as const, id: configId }],
    }),

    getInstallmentSummary: builder.query<{ data: InstallmentSummary }, string>({
      query: (configId) => `/payment-core/charge-configs/${configId}/installments/summary`,
      providesTags: (_result, _error, id) => [{ type: 'ChargeConfig' as const, id }, 'InstallmentList'],
    }),

    getPendingInstallments: builder.query<
      PaginatedResponse<InstallmentListItem>,
      { page?: number; pageSize?: number } | void
    >({
      query: (params) => {
        const q = params ?? {}
        const searchParams = new URLSearchParams()
        if (q.page) searchParams.set('page', String(q.page))
        if (q.pageSize) searchParams.set('pageSize', String(q.pageSize))
        const qs = searchParams.toString()
        return `/payment-core/installments/pending${qs ? `?${qs}` : ''}`
      },
      providesTags: ['InstallmentList'],
    }),

    getUpcomingInstallments: builder.query<{ data: InstallmentListItem[] }, number | void>({
      query: (limit) => `/payment-core/installments/upcoming${limit ? `?limit=${limit}` : ''}`,
      providesTags: ['InstallmentList'],
    }),

    updateInstallment: builder.mutation<{ data: InstallmentListItem }, { id: string; body: UpdateInstallmentInput }>({
      query: ({ id, body }) => ({ url: `/payment-core/installments/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['InstallmentList'],
    }),

    cancelInstallment: builder.mutation<void, string>({
      query: (id) => ({ url: `/payment-core/installments/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['InstallmentList'],
    }),

    /* ── Exchange Rates ── */

    getExchangeRates: builder.query<
      { data: { base: string; rates: { USD: number; HNL: number | null; GTQ: number | null } } },
      void
    >({
      query: () => '/payment-core/lookups/exchange-rates',
      keepUnusedDataFor: 14400, // 4 hours
    }),

    /* ── Charge Configuration endpoints ── */

    getChargeConfigs: builder.query<PaginatedResponse<ChargeConfigListItem>, ChargeConfigListParams | void>({
      query: (params) => {
        const q = params ?? {}
        const searchParams = new URLSearchParams()
        if (q.page) searchParams.set('page', String(q.page))
        if (q.pageSize) searchParams.set('pageSize', String(q.pageSize))
        if (q.chargeType) searchParams.set('chargeType', q.chargeType)
        if (q.appliesToType) searchParams.set('appliesToType', q.appliesToType)
        if (q.isActive) searchParams.set('isActive', q.isActive)
        const qs = searchParams.toString()
        return `/payment-core/charge-configs${qs ? `?${qs}` : ''}`
      },
      providesTags: ['ChargeConfigList'],
    }),

    getChargeConfigById: builder.query<{ data: ChargeConfigDetail }, string>({
      query: (id) => `/payment-core/charge-configs/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ChargeConfig' as const, id }],
    }),

    getChargeConfigAudit: builder.query<{ data: AuditEntry[] }, string>({
      query: (id) => `/payment-core/charge-configs/${id}/audit`,
      providesTags: (_result, _error, id) => [{ type: 'ChargeConfig' as const, id }],
    }),

    createChargeConfig: builder.mutation<{ data: ChargeConfigDetail }, CreateChargeConfigInput>({
      query: (body) => ({ url: '/payment-core/charge-configs', method: 'POST', body }),
      invalidatesTags: ['ChargeConfigList'],
    }),

    updateChargeConfig: builder.mutation<{ data: ChargeConfigDetail }, { id: string; body: UpdateChargeConfigInput }>({
      query: ({ id, body }) => ({ url: `/payment-core/charge-configs/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [
        'ChargeConfigList',
        { type: 'ChargeConfig' as const, id },
      ],
    }),

    /**
     * Reshape a flexible charge-config's schedule while preserving already-paid
     * installments. DEDUCTED rows are left untouched, NOT_PAID rows are
     * soft-cancelled, and a new tranche is appended sized to the remaining
     * balance. The backend writes a ChargeConfigAudit row and emits a
     * `charge_config.restructured` domain event.
     */
    restructureChargeConfig: builder.mutation<
      {
        data: ChargeConfigDetail
        summary: {
          paidCount: number
          paidAmount: string
          cancelledCount: number
          newCount: number
          newTotalValue: string
        }
      },
      {
        id: string
        body: {
          newTotalValue?: number
          newRemainingCount: number
          newFrequency: 'WEEKLY' | 'MONTHLY'
          newStartDate: string
          expectedUpdatedAt?: string
          reason?: string
        }
      }
    >({
      query: ({ id, body }) => ({
        url: `/payment-core/charge-configs/${id}/restructure`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'ChargeConfigList',
        { type: 'ChargeConfig' as const, id },
      ],
    }),

    activateChargeConfig: builder.mutation<void, string>({
      query: (id) => ({ url: `/payment-core/charge-configs/${id}/activate`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        'ChargeConfigList',
        { type: 'ChargeConfig' as const, id },
      ],
    }),

    deactivateChargeConfig: builder.mutation<void, string>({
      query: (id) => ({ url: `/payment-core/charge-configs/${id}/deactivate`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        'ChargeConfigList',
        { type: 'ChargeConfig' as const, id },
      ],
    }),

    deleteChargeConfig: builder.mutation<void, string>({
      query: (id) => ({ url: `/payment-core/charge-configs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ChargeConfigList'],
    }),

    /* ── Weekly Report ── */

    getWeeklyReport: builder.query<{ data: WeeklyReportData }, WeeklyReportParams | void>({
      query: (params) => {
        const q = params ?? {}
        const sp = new URLSearchParams()
        if (q.weekIds) sp.set('weekIds', q.weekIds)
        if (q.dateFrom) sp.set('dateFrom', q.dateFrom)
        if (q.dateTo) sp.set('dateTo', q.dateTo)
        if (q.status) sp.set('status', q.status)
        if (q.paymentType) sp.set('paymentType', q.paymentType)
        const qs = sp.toString()
        return `/payment-core/payments/weekly-report${qs ? `?${qs}` : ''}`
      },
      providesTags: ['PaymentList'],
    }),

    /* ── Migration endpoints (dev only) ── */

    getMigrationReconcile: builder.query<MigrationReconciliation, void>({
      query: () => '/payment-core/migration/reconcile',
      providesTags: ['MigrationData'],
    }),

    runMigration: builder.mutation<MigrationRunResult, void>({
      query: () => ({ url: '/payment-core/migration/run', method: 'POST' }),
      invalidatesTags: ['PaymentList', 'MigrationData'],
    }),
  }),
})

export const {
  useGetPaymentsQuery,
  useGetPaymentSummaryQuery,
  useGetPaymentByIdQuery,
  useGetAvailableStatementsQuery,
  useLazyGetStatementDetailQuery,
  useCreatePaymentMutation,
  useUpdatePaymentMutation,
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
  useGetPaymentTotalsQuery,
  useGetPaymentAuditQuery,
  useGetChargeConfigInstallmentsQuery,
  useGetInstallmentSummaryQuery,
  useGetPendingInstallmentsQuery,
  useGetUpcomingInstallmentsQuery,
  useUpdateInstallmentMutation,
  useCancelInstallmentMutation,
  useGetExchangeRatesQuery,
  useGetChargeConfigsQuery,
  useGetChargeConfigByIdQuery,
  useGetChargeConfigAuditQuery,
  useCreateChargeConfigMutation,
  useUpdateChargeConfigMutation,
  useRestructureChargeConfigMutation,
  useActivateChargeConfigMutation,
  useDeactivateChargeConfigMutation,
  useDeleteChargeConfigMutation,
  useGetWeeklyReportQuery,
  useGetMigrationReconcileQuery,
  useRunMigrationMutation,
} = paymentCoreApi
