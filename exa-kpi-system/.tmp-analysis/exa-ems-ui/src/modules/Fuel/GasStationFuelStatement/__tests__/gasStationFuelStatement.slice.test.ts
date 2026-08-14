import { describe, it, expect } from 'vitest'
import reducer, {
  resetStatuses,
  clearCurrent,
  setDefaultStatement,
  fetchGasStationFuelStatementList,
  fetchGasStationFuelStatement,
  addGasStationFuelStatement,
  saveGasStationFuelStatement,
  deleteGasStationFuelStatement,
  loadGSPreviewInvoiceLines,
  loadGSAdditionalInvoiceLines,
} from '../store/gasStationFuelStatement.slice'

const initialState = {
  list: [],
  current: null,
  previewInvoiceLines: [],
  additionalInvoiceLines: [],
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,
}

describe('gasStationFuelStatement slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState)
  })

  it('resetStatuses should clear statuses and errors', () => {
    const state = {
      ...initialState,
      statuses: { added: false, updated: true, deleted: false },
      errors: 'err',
    }
    const result = reducer(state as any, resetStatuses())
    expect(result.statuses).toEqual({ added: false, updated: false, deleted: false })
    expect(result.errors).toBeNull()
  })

  it('clearCurrent should reset current and lines', () => {
    const state = {
      ...initialState,
      current: { fuelStatementId: 1 } as any,
      previewInvoiceLines: [{ id: '1' }] as any,
    }
    const result = reducer(state as any, clearCurrent())
    expect(result.current).toBeNull()
    expect(result.previewInvoiceLines).toEqual([])
  })

  it('setDefaultStatement should set blank statement', () => {
    const result = reducer(initialState as any, setDefaultStatement())
    expect(result.current).not.toBeNull()
    expect(result.current?.gasStationId).toBeNull()
    expect(result.current?.invoiceLines).toEqual([])
  })

  it('fetchList.pending should set loadingList', () => {
    const result = reducer(initialState as any, fetchGasStationFuelStatementList.pending('', undefined))
    expect(result.loadingList).toBe(true)
  })

  it('fetchList.fulfilled should update list', () => {
    const items = [{ fuelStatementId: 1 }] as any
    const result = reducer(initialState as any, fetchGasStationFuelStatementList.fulfilled(items, '', undefined))
    expect(result.list).toEqual(items)
    expect(result.loadingList).toBe(false)
  })

  it('fetchList.rejected should set errors', () => {
    const result = reducer(initialState as any,
      fetchGasStationFuelStatementList.rejected(null, '', undefined, 'fail'))
    expect(result.errors).toBe('fail')
  })

  it('fetchById.fulfilled should set current', () => {
    const stmt = { fuelStatementId: 5 } as any
    const result = reducer(initialState as any, fetchGasStationFuelStatement.fulfilled(stmt, '', 5))
    expect(result.current).toEqual(stmt)
  })

  it('add.fulfilled should set added and add to list', () => {
    const stmt = { fuelStatementId: 10 } as any
    const result = reducer(initialState as any, addGasStationFuelStatement.fulfilled(stmt, '', {}))
    expect(result.statuses.added).toBe(true)
    expect(result.list[0]).toEqual(stmt)
  })

  it('save.fulfilled should set updated', () => {
    const stmt = { fuelStatementId: 1 } as any
    const result = reducer(initialState as any, saveGasStationFuelStatement.fulfilled(stmt, '', { id: 1, data: {} }))
    expect(result.statuses.updated).toBe(true)
  })

  it('delete.fulfilled should remove from list', () => {
    const state = { ...initialState, list: [{ fuelStatementId: 1 }, { fuelStatementId: 2 }] as any }
    const result = reducer(state as any, deleteGasStationFuelStatement.fulfilled(1, '', 1))
    expect(result.list).toHaveLength(1)
    expect(result.statuses.deleted).toBe(true)
  })

  it('loadPreview.fulfilled should update preview lines', () => {
    const items = [{ id: '1' }] as any
    const result = reducer(initialState as any, loadGSPreviewInvoiceLines.fulfilled(items, '', {}))
    expect(result.previewInvoiceLines).toEqual(items)
  })

  it('loadAdditional.fulfilled should update additional lines', () => {
    const items = [{ id: '2' }] as any
    const result = reducer(initialState as any, loadGSAdditionalInvoiceLines.fulfilled(items, '', {}))
    expect(result.additionalInvoiceLines).toEqual(items)
  })
})
