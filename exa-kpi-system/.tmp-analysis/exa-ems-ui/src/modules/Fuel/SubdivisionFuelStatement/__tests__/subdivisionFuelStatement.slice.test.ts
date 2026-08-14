import { describe, it, expect } from 'vitest'
import reducer, {
  resetStatuses,
  clearCurrent,
  setDefaultStatement,
  fetchSubdivisionFuelStatementList,
  fetchSubdivisionFuelStatement,
  addSubdivisionFuelStatement,
  saveSubdivisionFuelStatement,
  deleteSubdivisionFuelStatement,
  loadLinkedStatements,
  loadPreviewInvoiceLines,
  loadAdditionalInvoiceLines,
} from '../store/subdivisionFuelStatement.slice'

const initialState = {
  list: [],
  current: null,
  previewInvoiceLines: [],
  additionalInvoiceLines: [],
  linkedStatementsList: [],
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,
}

describe('subdivisionFuelStatement slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState)
  })

  it('resetStatuses should clear statuses and errors', () => {
    const state = {
      ...initialState,
      statuses: { added: true, updated: false, deleted: false },
      errors: 'some error',
    }
    const result = reducer(state as any, resetStatuses())
    expect(result.statuses).toEqual({ added: false, updated: false, deleted: false })
    expect(result.errors).toBeNull()
  })

  it('clearCurrent should reset current and related lists', () => {
    const state = {
      ...initialState,
      current: { fuelStatementId: 1 } as any,
      previewInvoiceLines: [{ id: '1' }] as any,
      additionalInvoiceLines: [{ id: '2' }] as any,
      linkedStatementsList: [{ value: 1, label: '1' }],
    }
    const result = reducer(state as any, clearCurrent())
    expect(result.current).toBeNull()
    expect(result.previewInvoiceLines).toEqual([])
    expect(result.additionalInvoiceLines).toEqual([])
    expect(result.linkedStatementsList).toEqual([])
  })

  it('setDefaultStatement should set a blank statement', () => {
    const result = reducer(initialState as any, setDefaultStatement())
    expect(result.current).not.toBeNull()
    expect(result.current?.subdivisionId).toBeNull()
    expect(result.current?.invoiceLines).toEqual([])
    expect(result.current?.personalizedTrips).toBe('no')
  })

  it('fetchList.pending should set loadingList', () => {
    const result = reducer(initialState as any, fetchSubdivisionFuelStatementList.pending('', undefined))
    expect(result.loadingList).toBe(true)
    expect(result.errors).toBeNull()
  })

  it('fetchList.fulfilled should update list', () => {
    const items = [{ fuelStatementId: 1 }] as any
    const result = reducer(initialState as any, fetchSubdivisionFuelStatementList.fulfilled(items, '', undefined))
    expect(result.loadingList).toBe(false)
    expect(result.list).toEqual(items)
  })

  it('fetchList.rejected should set errors', () => {
    const result = reducer(initialState as any,
      fetchSubdivisionFuelStatementList.rejected(null, '', undefined, 'fail'))
    expect(result.loadingList).toBe(false)
    expect(result.errors).toBe('fail')
  })

  it('fetchById.pending should set loadingCurrent', () => {
    const result = reducer(initialState as any, fetchSubdivisionFuelStatement.pending('', 1))
    expect(result.loadingCurrent).toBe(true)
  })

  it('fetchById.fulfilled should set current', () => {
    const stmt = { fuelStatementId: 1, invoiceLines: [] } as any
    const result = reducer(initialState as any, fetchSubdivisionFuelStatement.fulfilled(stmt, '', 1))
    expect(result.loadingCurrent).toBe(false)
    expect(result.current).toEqual(stmt)
  })

  it('add.pending should set saving', () => {
    const result = reducer(initialState as any, addSubdivisionFuelStatement.pending('', {}))
    expect(result.saving).toBe(true)
  })

  it('add.fulfilled should add to list and set added', () => {
    const stmt = { fuelStatementId: 99 } as any
    const result = reducer(initialState as any, addSubdivisionFuelStatement.fulfilled(stmt, '', {}))
    expect(result.saving).toBe(false)
    expect(result.statuses.added).toBe(true)
    expect(result.list[0]).toEqual(stmt)
  })

  it('save.fulfilled should set updated', () => {
    const stmt = { fuelStatementId: 1 } as any
    const result = reducer(initialState as any, saveSubdivisionFuelStatement.fulfilled(stmt, '', { id: 1, data: {} }))
    expect(result.statuses.updated).toBe(true)
  })

  it('delete.fulfilled should remove from list', () => {
    const state = { ...initialState, list: [{ fuelStatementId: 1 }, { fuelStatementId: 2 }] as any }
    const result = reducer(state as any, deleteSubdivisionFuelStatement.fulfilled(1, '', 1))
    expect(result.list).toHaveLength(1)
    expect(result.list[0].fuelStatementId).toBe(2)
    expect(result.statuses.deleted).toBe(true)
  })

  it('loadLinkedStatements.fulfilled should update list', () => {
    const items = [{ value: 1, label: 'S1' }]
    const result = reducer(initialState as any,
      loadLinkedStatements.fulfilled(items, '', { subdivisionId: 1, gasSupplierIds: [1] }))
    expect(result.linkedStatementsList).toEqual(items)
  })

  it('loadPreviewInvoiceLines.fulfilled should update preview', () => {
    const items = [{ id: '1', fuelPrice: 10 }] as any
    const result = reducer(initialState as any, loadPreviewInvoiceLines.fulfilled(items, '', {}))
    expect(result.previewInvoiceLines).toEqual(items)
  })

  it('loadAdditionalInvoiceLines.fulfilled should update additional', () => {
    const items = [{ id: '2', fuelPrice: 20 }] as any
    const result = reducer(initialState as any, loadAdditionalInvoiceLines.fulfilled(items, '', {}))
    expect(result.additionalInvoiceLines).toEqual(items)
  })
})
