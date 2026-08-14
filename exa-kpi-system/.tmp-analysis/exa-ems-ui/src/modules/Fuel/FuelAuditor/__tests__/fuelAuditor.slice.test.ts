import { describe, it, expect } from 'vitest'
import reducer, {
  resetStatuses,
  setPage,
  clearCurrent,
  fetchFuelAuditorList,
  fetchFuelAuditorTransaction,
  fetchLinkedFuelOrder,
  deleteFuelAuditorTransaction,
  bulkDeleteTransactions,
  bulkUpdatePaymentStatus,
  linkFuelOrder,
  searchUnlinkedFuelOrders,
  loadGasSupplierPaymentStatusOptions,
  loadSubdivisionPaymentStatusOptions,
} from '../store/fuelAuditor.slice'
import {
  getStatusGroup,
  validatePaymentStatusChange,
  validateSimpleStatusTransition,
  GAS_NOT_READY,
  GAS_READY,
  GAS_INVOICE_RECEIVED,
  GAS_INVOICE_PAID,
  GAS_NOT_APPLY,
  SUB_NOT_READY,
  SUB_READY,
  SUB_DEDUCTED,
  SUB_DECLARED,
  SUB_NOT_APPLY,
} from '../utils/fuelAuditorUtils'
import type { FuelOrderSummary } from '../types/fuelAuditor.types'

const initialState = {
  list: [],
  total: 0,
  page: 1,
  rowsPerPage: 15,
  current: null,
  currentFuelOrder: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,
  gasSupplierStatusList: [],
  subdivisionStatusList: [],
  searchResults: [],
}

describe('fuelAuditor slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle resetStatuses', () => {
    const s = {
      ...initialState,
      statuses: { added: false, updated: true, deleted: false },
      errors: 'err' as any,
    }
    const state = reducer(s, resetStatuses())
    expect(state.statuses).toEqual({ added: false, updated: false, deleted: false })
    expect(state.errors).toBeNull()
  })

  it('should handle setPage', () => {
    const state = reducer(initialState, setPage(5))
    expect(state.page).toBe(5)
  })

  it('should handle clearCurrent', () => {
    const s = {
      ...initialState,
      current: { gasStationTransactionId: 1 } as any,
      currentFuelOrder: { fuelOrderId: 1 } as any,
    }
    const state = reducer(s, clearCurrent())
    expect(state.current).toBeNull()
    expect(state.currentFuelOrder).toBeNull()
  })

  it('should set loadingList on fetchList.pending', () => {
    const action = { type: fetchFuelAuditorList.pending.type }
    const state = reducer(initialState, action)
    expect(state.loadingList).toBe(true)
  })

  it('should populate list on fetchList.fulfilled', () => {
    const payload = {
      data: [{ gasStationTransactionId: 1, licensePlate: 'ABC' }],
      total: 1,
      page: 1,
      size: 15,
    }
    const action = { type: fetchFuelAuditorList.fulfilled.type, payload }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.list).toEqual(payload.data)
    expect(state.total).toBe(1)
  })

  it('should set errors on fetchList.rejected', () => {
    const action = { type: fetchFuelAuditorList.rejected.type, payload: 'Error' }
    const state = reducer(initialState, action)
    expect(state.errors).toBe('Error')
  })

  it('should load current on fetchById.fulfilled', () => {
    const txn = { gasStationTransactionId: 1, licensePlate: 'XYZ' }
    const action = { type: fetchFuelAuditorTransaction.fulfilled.type, payload: txn }
    const state = reducer(initialState, action)
    expect(state.current).toEqual(txn)
  })

  it('should load fuel order on fetchLinkedFuelOrder.fulfilled', () => {
    const order = { fuelOrderId: 10, plate: 'AAA' }
    const action = { type: fetchLinkedFuelOrder.fulfilled.type, payload: order }
    const state = reducer(initialState, action)
    expect(state.currentFuelOrder).toEqual(order)
  })

  it('should handle delete.fulfilled', () => {
    const s = {
      ...initialState,
      list: [
        { gasStationTransactionId: 1 } as any,
        { gasStationTransactionId: 2 } as any,
      ],
      total: 2,
    }
    const action = { type: deleteFuelAuditorTransaction.fulfilled.type, payload: 1 }
    const state = reducer(s, action)
    expect(state.list).toHaveLength(1)
    expect(state.statuses.deleted).toBe(true)
  })

  it('should handle bulkDelete.fulfilled', () => {
    const s = {
      ...initialState,
      list: [
        { gasStationTransactionId: 1 } as any,
        { gasStationTransactionId: 2 } as any,
        { gasStationTransactionId: 3 } as any,
      ],
      total: 3,
    }
    const action = { type: bulkDeleteTransactions.fulfilled.type, payload: [1, 3] }
    const state = reducer(s, action)
    expect(state.list).toHaveLength(1)
    expect(state.list[0].gasStationTransactionId).toBe(2)
    expect(state.statuses.deleted).toBe(true)
  })

  it('should handle bulkUpdatePayment.fulfilled', () => {
    const action = { type: bulkUpdatePaymentStatus.fulfilled.type }
    const state = reducer(initialState, action)
    expect(state.statuses.updated).toBe(true)
  })

  it('should handle linkFuelOrder.fulfilled', () => {
    const action = { type: linkFuelOrder.fulfilled.type }
    const state = reducer(initialState, action)
    expect(state.statuses.updated).toBe(true)
  })

  it('should handle searchUnlinked.fulfilled', () => {
    const results = [{ fuelOrderId: 1, plate: 'AB' }]
    const action = { type: searchUnlinkedFuelOrders.fulfilled.type, payload: results }
    const state = reducer(initialState, action)
    expect(state.searchResults).toEqual(results)
  })

  it('should handle loadGasSupplierStatuses.fulfilled', () => {
    const options = [{ value: 1, label: 'Not Ready' }]
    const action = {
      type: loadGasSupplierPaymentStatusOptions.fulfilled.type,
      payload: options,
    }
    const state = reducer(initialState, action)
    expect(state.gasSupplierStatusList).toEqual(options)
  })

  it('should handle loadSubdivisionStatuses.fulfilled', () => {
    const options = [{ value: 2, label: 'Ready' }]
    const action = {
      type: loadSubdivisionPaymentStatusOptions.fulfilled.type,
      payload: options,
    }
    const state = reducer(initialState, action)
    expect(state.subdivisionStatusList).toEqual(options)
  })
})

describe('getStatusGroup', () => {
  it('maps gas supplier status IDs correctly', () => {
    expect(getStatusGroup(GAS_NOT_READY)).toBe('not_ready')
    expect(getStatusGroup(GAS_READY)).toBe('ready')
    expect(getStatusGroup(GAS_INVOICE_RECEIVED)).toBe('declared')
    expect(getStatusGroup(GAS_INVOICE_PAID)).toBe('completed')
    expect(getStatusGroup(GAS_NOT_APPLY)).toBe('not_apply')
  })

  it('maps subdivision status IDs correctly', () => {
    expect(getStatusGroup(SUB_NOT_READY)).toBe('not_ready')
    expect(getStatusGroup(SUB_READY)).toBe('ready')
    expect(getStatusGroup(SUB_DECLARED)).toBe('declared')
    expect(getStatusGroup(SUB_DEDUCTED)).toBe('completed')
    expect(getStatusGroup(SUB_NOT_APPLY)).toBe('not_apply')
  })

  it('returns unknown for null/undefined/unrecognized', () => {
    expect(getStatusGroup(null)).toBe('unknown')
    expect(getStatusGroup(undefined)).toBe('unknown')
    expect(getStatusGroup(9999)).toBe('unknown')
  })
})

describe('validatePaymentStatusChange', () => {
  const makeOrder = (overrides: Partial<FuelOrderSummary> = {}): FuelOrderSummary => ({
    fuelOrderId: 100,
    statusFuelOrder: 10,
    ...overrides,
  })

  const approvedStatusList = [{ attributeItemId: 10, flat_name_id: 'approved' }]

  it('returns valid when fuelOrder is null', () => {
    const result = validatePaymentStatusChange(null, 'gas_supplier_payment_status', GAS_READY)
    expect(result.valid).toBe(true)
  })

  it('rejects Not Ready when order is not Approved', () => {
    const order = makeOrder({ statusFuelOrder: 5 })
    const statusList = [{ attributeItemId: 5, flat_name_id: 'pending' }]
    const result = validatePaymentStatusChange(
      order,
      'gas_supplier_payment_status',
      GAS_NOT_READY,
      statusList,
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Approved')
  })

  it('allows Not Ready when order is Approved', () => {
    const order = makeOrder()
    const result = validatePaymentStatusChange(
      order,
      'gas_supplier_payment_status',
      GAS_NOT_READY,
      approvedStatusList,
    )
    expect(result.valid).toBe(true)
  })

  it('rejects Ready when order has no reconciliation', () => {
    const order = makeOrder({ gasStationTransactionId: undefined })
    const result = validatePaymentStatusChange(order, 'gas_supplier_payment_status', GAS_READY)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Reconciled')
  })

  it('allows Ready when order has reconciliation via gasStationTransactionId', () => {
    const order = makeOrder({ gasStationTransactionId: 42 })
    const result = validatePaymentStatusChange(order, 'gas_supplier_payment_status', GAS_READY)
    expect(result.valid).toBe(true)
  })

  it('allows Ready when order has reconciliation via fuelAuditor', () => {
    const order = makeOrder({ fuelAuditor: { fuelOrderId: 100 } })
    const result = validatePaymentStatusChange(order, 'gas_supplier_payment_status', GAS_READY)
    expect(result.valid).toBe(true)
  })

  it('rejects Invoice Received when gas supplier order is not in a statement', () => {
    const order = makeOrder({ gasSupplierStatementId: undefined, gasStationStatementId: undefined })
    const result = validatePaymentStatusChange(
      order,
      'gas_supplier_payment_status',
      GAS_INVOICE_RECEIVED,
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Statement')
  })

  it('allows Invoice Received when gas supplier order is in a statement', () => {
    const order = makeOrder({ gasSupplierStatementId: 5 })
    const result = validatePaymentStatusChange(
      order,
      'gas_supplier_payment_status',
      GAS_INVOICE_RECEIVED,
    )
    expect(result.valid).toBe(true)
  })

  it('rejects Declared when subdivision order is not in a fuel statement', () => {
    const order = makeOrder({ fuelStatementId: undefined })
    const result = validatePaymentStatusChange(
      order,
      'subdivision_payment_status',
      SUB_DECLARED,
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Statement')
  })

  it('allows Declared when subdivision order is in a fuel statement', () => {
    const order = makeOrder({ fuelStatementId: 7 })
    const result = validatePaymentStatusChange(
      order,
      'subdivision_payment_status',
      SUB_DECLARED,
    )
    expect(result.valid).toBe(true)
  })

  it('rejects reverting to Ready while in a gas supplier statement', () => {
    const order = makeOrder({ gasStationStatementId: 3, gasStationTransactionId: 1 })
    const result = validatePaymentStatusChange(order, 'gas_supplier_payment_status', GAS_READY)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Statement')
  })

  it('rejects reverting to Not Ready while in a subdivision statement', () => {
    const order = makeOrder({ fuelStatementId: 3 })
    const result = validatePaymentStatusChange(
      order,
      'subdivision_payment_status',
      SUB_NOT_READY,
      approvedStatusList,
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Statement')
  })
})

describe('validateSimpleStatusTransition', () => {
  it('blocks changes from completed status', () => {
    const result = validateSimpleStatusTransition(GAS_INVOICE_PAID, GAS_READY)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Paid/Deducted')
  })

  it('blocks reverting from declared to not_ready', () => {
    const result = validateSimpleStatusTransition(GAS_INVOICE_RECEIVED, GAS_NOT_READY)
    expect(result.valid).toBe(false)
  })

  it('allows transition from not_ready to ready', () => {
    const result = validateSimpleStatusTransition(GAS_NOT_READY, GAS_READY)
    expect(result.valid).toBe(true)
  })

  it('blocks jumping from not_ready directly to completed', () => {
    const result = validateSimpleStatusTransition(GAS_NOT_READY, GAS_INVOICE_PAID)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Ready')
  })

  it('allows transition from ready to completed', () => {
    const result = validateSimpleStatusTransition(GAS_READY, GAS_INVOICE_PAID)
    expect(result.valid).toBe(true)
  })

  it('allows not_apply transitions', () => {
    const result = validateSimpleStatusTransition(GAS_NOT_READY, GAS_NOT_APPLY)
    expect(result.valid).toBe(true)
  })
})
