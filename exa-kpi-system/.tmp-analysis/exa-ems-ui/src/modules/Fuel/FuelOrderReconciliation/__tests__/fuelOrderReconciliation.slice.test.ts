import { describe, it, expect } from 'vitest'
import reducer, {
  resetStatuses,
  clearReconciliationData,
  setReconciliationData,
  removeTransaction,
  removeAllDuplicates,
  clearErrors,
  fetchReconciliationList,
  fetchUploadSession,
  validateReconciliationData,
  processReconciliation,
  deleteUploadSession,
  deleteGasStationTransaction,
} from '../store/fuelOrderReconciliation.slice'

const initialState = {
  reconciliationList: [],
  reconciliationData: [],
  errors: null,
  statuses: { added: false, updated: false, deleted: false, processed: false },
  loadingList: false,
  loadingData: false,
  processing: false,
  gasStationId: null,
  gasStationName: '',
  uploadSessionId: null,
  uploadDate: null,
  totalTransactions: 0,
  matchedTransactions: 0,
  unmatchedTransactions: 0,
}

describe('fuelOrderReconciliation slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle resetStatuses', () => {
    const s = {
      ...initialState,
      statuses: { added: false, updated: false, deleted: true, processed: false },
      errors: 'err' as any,
    }
    const state = reducer(s, resetStatuses())
    expect(state.statuses).toEqual({ added: false, updated: false, deleted: false, processed: false })
    expect(state.errors).toBeNull()
  })

  it('should handle clearReconciliationData', () => {
    const s = {
      ...initialState,
      reconciliationData: [{ transactionId: '1' }] as any[],
      gasStationId: 5,
      gasStationName: 'Station',
    }
    const state = reducer(s, clearReconciliationData())
    expect(state.reconciliationData).toEqual([])
    expect(state.gasStationId).toBeNull()
    expect(state.gasStationName).toBe('')
  })

  it('should handle setReconciliationData', () => {
    const data = [{ transactionId: 'A' }] as any[]
    const state = reducer(
      initialState,
      setReconciliationData({ data, gasStationId: 10, gasStationName: 'Test Station' }),
    )
    expect(state.reconciliationData).toEqual(data)
    expect(state.gasStationId).toBe(10)
    expect(state.gasStationName).toBe('Test Station')
  })

  it('should handle removeTransaction', () => {
    const s = {
      ...initialState,
      reconciliationData: [
        { transactionId: '1' },
        { transactionId: '2' },
      ] as any[],
    }
    const state = reducer(s, removeTransaction('1'))
    expect(state.reconciliationData).toHaveLength(1)
    expect(state.reconciliationData[0].transactionId).toBe('2')
  })

  it('should handle removeAllDuplicates', () => {
    const s = {
      ...initialState,
      reconciliationData: [
        { transactionId: '1', isDuplicate: false },
        { transactionId: '2', isDuplicate: true },
        { transactionId: '3', isDuplicate: false },
      ] as any[],
    }
    const state = reducer(s, removeAllDuplicates())
    expect(state.reconciliationData).toHaveLength(2)
    expect(state.reconciliationData.every((t) => !t.isDuplicate)).toBe(true)
  })

  it('should handle clearErrors', () => {
    const s = { ...initialState, errors: 'some error' as any }
    const state = reducer(s, clearErrors())
    expect(state.errors).toBeNull()
  })

  it('should set loadingList on fetchList.pending', () => {
    const action = { type: fetchReconciliationList.pending.type }
    const state = reducer(initialState, action)
    expect(state.loadingList).toBe(true)
  })

  it('should populate list on fetchList.fulfilled', () => {
    const items = [{ uploadSessionId: 1, gasStationName: 'A' }]
    const action = { type: fetchReconciliationList.fulfilled.type, payload: items }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.reconciliationList).toEqual(items)
  })

  it('should set errors on fetchList.rejected', () => {
    const action = { type: fetchReconciliationList.rejected.type, payload: 'Error' }
    const state = reducer(initialState, action)
    expect(state.errors).toBe('Error')
  })

  it('should load session on fetchSession.fulfilled', () => {
    const payload = {
      reconciliationData: [{ transactionId: '1' }],
      gasStationId: 5,
      gasStationName: 'Station',
      uploadSessionId: 99,
      uploadDate: '2026-01-01',
      totalTransactions: 10,
      matchedTransactions: 7,
      unmatchedTransactions: 3,
    }
    const action = { type: fetchUploadSession.fulfilled.type, payload }
    const state = reducer(initialState, action)
    expect(state.reconciliationData).toEqual(payload.reconciliationData)
    expect(state.gasStationId).toBe(5)
    expect(state.totalTransactions).toBe(10)
  })

  it('should handle validate.fulfilled', () => {
    const validated = [{ transactionId: '1', reconciliationStatus: 'matched' }]
    const action = { type: validateReconciliationData.fulfilled.type, payload: validated }
    const state = reducer(initialState, action)
    expect(state.reconciliationData).toEqual(validated)
  })

  it('should handle process.fulfilled', () => {
    const action = { type: processReconciliation.fulfilled.type }
    const state = reducer(initialState, action)
    expect(state.statuses.processed).toBe(true)
  })

  it('should handle deleteSession.fulfilled', () => {
    const s = {
      ...initialState,
      reconciliationList: [
        { uploadSessionId: 1 } as any,
        { uploadSessionId: 2 } as any,
      ],
    }
    const action = { type: deleteUploadSession.fulfilled.type, payload: 1 }
    const state = reducer(s, action)
    expect(state.reconciliationList).toHaveLength(1)
    expect(state.reconciliationList[0].uploadSessionId).toBe(2)
    expect(state.statuses.deleted).toBe(true)
  })

  it('should handle deleteTransaction.fulfilled', () => {
    const s = {
      ...initialState,
      reconciliationData: [
        { gasStationTransactionId: 10 } as any,
        { gasStationTransactionId: 20 } as any,
      ],
    }
    const action = { type: deleteGasStationTransaction.fulfilled.type, payload: 10 }
    const state = reducer(s, action)
    expect(state.reconciliationData).toHaveLength(1)
    expect(state.statuses.deleted).toBe(true)
  })
})
