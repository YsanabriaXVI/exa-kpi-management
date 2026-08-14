import { describe, it, expect } from 'vitest'
import reducer, {
  clearSummary,
  clearErrors,
  generateFuelWeekReport,
  loadFuelStatementStatuses,
  loadSupplierStatementStatuses,
  loadAssetTypes,
  loadOrderTypes,
  loadReconciliationStatuses,
} from '../store/fuelWeekSummary.slice'

const initialState = {
  summary: [],
  fuelStatementStatuses: [],
  supplierStatementStatuses: [],
  assetTypes: [],
  orderTypes: [],
  reconciliationStatuses: [],
  errors: null,
  loading: false,
}

describe('fuelWeekSummary slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState)
  })

  it('clearSummary should reset summary and errors', () => {
    const state = { ...initialState, summary: [{ fuelOrderId: 1 }] as any, errors: 'err' }
    const result = reducer(state as any, clearSummary())
    expect(result.summary).toEqual([])
    expect(result.errors).toBeNull()
  })

  it('clearErrors should reset errors only', () => {
    const state = { ...initialState, errors: 'err', summary: [{ fuelOrderId: 1 }] as any }
    const result = reducer(state as any, clearErrors())
    expect(result.errors).toBeNull()
    expect(result.summary).toHaveLength(1)
  })

  it('generateReport.pending should set loading', () => {
    const result = reducer(initialState as any, generateFuelWeekReport.pending('', {}))
    expect(result.loading).toBe(true)
    expect(result.errors).toBeNull()
  })

  it('generateReport.fulfilled should set summary', () => {
    const rows = [{ fuelOrderId: 1, weekname: 'W1' }] as any
    const result = reducer(initialState as any, generateFuelWeekReport.fulfilled(rows, '', {}))
    expect(result.loading).toBe(false)
    expect(result.summary).toEqual(rows)
  })

  it('generateReport.rejected should set errors', () => {
    const result = reducer(initialState as any,
      generateFuelWeekReport.rejected(null, '', {}, 'fail'))
    expect(result.loading).toBe(false)
    expect(result.errors).toBe('fail')
  })

  it('loadFuelStatementStatuses.fulfilled should update statuses', () => {
    const opts = [{ value: 1, label: 'Pending' }]
    const result = reducer(initialState as any, loadFuelStatementStatuses.fulfilled(opts, '', undefined))
    expect(result.fuelStatementStatuses).toEqual(opts)
  })

  it('loadSupplierStatementStatuses.fulfilled should update statuses', () => {
    const opts = [{ value: 2, label: 'Paid' }]
    const result = reducer(initialState as any, loadSupplierStatementStatuses.fulfilled(opts, '', undefined))
    expect(result.supplierStatementStatuses).toEqual(opts)
  })

  it('loadAssetTypes.fulfilled should update asset types', () => {
    const opts = [{ value: 3, label: 'Truck' }]
    const result = reducer(initialState as any, loadAssetTypes.fulfilled(opts, '', undefined))
    expect(result.assetTypes).toEqual(opts)
  })

  it('loadOrderTypes.fulfilled should update order types', () => {
    const opts = [{ value: 4, label: 'Regular' }]
    const result = reducer(initialState as any, loadOrderTypes.fulfilled(opts, '', undefined))
    expect(result.orderTypes).toEqual(opts)
  })

  it('loadReconciliationStatuses.fulfilled should update recon statuses', () => {
    const opts = [{ value: 5, label: 'Reconciled' }]
    const result = reducer(initialState as any, loadReconciliationStatuses.fulfilled(opts, '', undefined))
    expect(result.reconciliationStatuses).toEqual(opts)
  })
})
