import { describe, it, expect } from 'vitest'
import reducer, {
  loadDefaultSupplier,
  resetStatuses,
  resetChildStatuses,
  resetStores,
  loadDefaultStore,
  fetchSuppliers,
  fetchSupplier,
  addSupplier,
  saveSupplier,
  deleteSupplier,
  fetchStores,
  fetchStore,
  addStore,
  saveStore,
  deleteStore,
} from '../store/gasSupplier.slice'

const initialState = {
  list: [],
  current: null,
  stores: [],
  currentStore: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  childStatuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  loadingStores: false,
  loadingStore: false,
  saving: false,
  deleting: false,
}

const sampleSupplier = {
  gasStationsParentId: 1,
  name: 'Shell',
  phone: '555-1234',
  email: 'shell@test.com',
}

const sampleStore = {
  gasStationsId: 10,
  gasStationsParentId: 1,
  name: 'Shell Store #1',
  phone: '555-5678',
}

describe('gasSupplier slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle loadDefaultSupplier', () => {
    const state = reducer(initialState, loadDefaultSupplier())
    expect(state.current).toBeTruthy()
    expect(state.current!.name).toBe('')
    expect(state.errors).toBeNull()
  })

  it('should handle loadDefaultStore', () => {
    const state = reducer(initialState, loadDefaultStore())
    expect(state.currentStore).toBeTruthy()
    expect(state.currentStore!.name).toBe('')
  })

  it('should handle resetStatuses', () => {
    const modified = { ...initialState, statuses: { added: true, updated: false, deleted: false }, errors: 'err' as any }
    const state = reducer(modified, resetStatuses())
    expect(state.statuses).toEqual({ added: false, updated: false, deleted: false })
    expect(state.errors).toBeNull()
  })

  it('should handle resetChildStatuses', () => {
    const modified = { ...initialState, childStatuses: { added: false, updated: false, deleted: true } }
    const state = reducer(modified, resetChildStatuses())
    expect(state.childStatuses).toEqual({ added: false, updated: false, deleted: false })
  })

  it('should handle resetStores', () => {
    const modified = { ...initialState, stores: [sampleStore as any] }
    const state = reducer(modified, resetStores())
    expect(state.stores).toEqual([])
  })

  // fetchSuppliers
  it('should set loadingList on fetchSuppliers.pending', () => {
    const state = reducer(initialState, { type: fetchSuppliers.pending.type })
    expect(state.loadingList).toBe(true)
  })

  it('should populate list on fetchSuppliers.fulfilled', () => {
    const state = reducer(
      { ...initialState, loadingList: true },
      { type: fetchSuppliers.fulfilled.type, payload: [sampleSupplier] },
    )
    expect(state.loadingList).toBe(false)
    expect(state.list).toEqual([sampleSupplier])
  })

  it('should set errors on fetchSuppliers.rejected', () => {
    const state = reducer(
      { ...initialState, loadingList: true },
      { type: fetchSuppliers.rejected.type, payload: 'Network error' },
    )
    expect(state.loadingList).toBe(false)
    expect(state.errors).toBe('Network error')
  })

  // fetchSupplier
  it('should set loadingCurrent on fetchSupplier.pending', () => {
    const state = reducer(initialState, { type: fetchSupplier.pending.type })
    expect(state.loadingCurrent).toBe(true)
  })

  it('should populate current on fetchSupplier.fulfilled', () => {
    const state = reducer(initialState, { type: fetchSupplier.fulfilled.type, payload: sampleSupplier })
    expect(state.current).toEqual(sampleSupplier)
    expect(state.loadingCurrent).toBe(false)
  })

  // addSupplier
  it('should handle addSupplier.fulfilled', () => {
    const state = reducer(initialState, { type: addSupplier.fulfilled.type, payload: sampleSupplier })
    expect(state.saving).toBe(false)
    expect(state.list[0]).toEqual(sampleSupplier)
    expect(state.statuses.added).toBe(true)
  })

  // saveSupplier
  it('should handle saveSupplier.fulfilled', () => {
    const stateWithList = { ...initialState, list: [sampleSupplier as any] }
    const updated = { ...sampleSupplier, name: 'Shell Updated' }
    const state = reducer(stateWithList, { type: saveSupplier.fulfilled.type, payload: updated })
    expect(state.list[0].name).toBe('Shell Updated')
    expect(state.statuses.updated).toBe(true)
  })

  // deleteSupplier
  it('should handle deleteSupplier.fulfilled', () => {
    const stateWithList = { ...initialState, list: [sampleSupplier as any] }
    const state = reducer(stateWithList, { type: deleteSupplier.fulfilled.type, payload: 1 })
    expect(state.list).toHaveLength(0)
    expect(state.statuses.deleted).toBe(true)
  })

  it('should handle deleteSupplier.rejected', () => {
    const state = reducer(initialState, { type: deleteSupplier.rejected.type, payload: 'Failed' })
    expect(state.deleting).toBe(false)
    expect(state.errors).toBe('Failed')
  })

  // fetchStores
  it('should set loadingStores on fetchStores.pending', () => {
    const state = reducer(initialState, { type: fetchStores.pending.type })
    expect(state.loadingStores).toBe(true)
  })

  it('should populate stores on fetchStores.fulfilled', () => {
    const state = reducer(initialState, { type: fetchStores.fulfilled.type, payload: [sampleStore] })
    expect(state.stores).toEqual([sampleStore])
    expect(state.loadingStores).toBe(false)
  })

  // fetchStore
  it('should populate currentStore on fetchStore.fulfilled', () => {
    const state = reducer(initialState, { type: fetchStore.fulfilled.type, payload: sampleStore })
    expect(state.currentStore).toEqual(sampleStore)
  })

  // addStore
  it('should handle addStore.fulfilled', () => {
    const state = reducer(initialState, { type: addStore.fulfilled.type, payload: sampleStore })
    expect(state.stores[0]).toEqual(sampleStore)
    expect(state.childStatuses.added).toBe(true)
  })

  // saveStore
  it('should handle saveStore.fulfilled', () => {
    const stateWithStores = { ...initialState, stores: [sampleStore as any] }
    const updated = { ...sampleStore, name: 'Updated Store' }
    const state = reducer(stateWithStores, { type: saveStore.fulfilled.type, payload: updated })
    expect(state.stores[0].name).toBe('Updated Store')
    expect(state.childStatuses.updated).toBe(true)
  })

  // deleteStore
  it('should handle deleteStore.fulfilled', () => {
    const stateWithStores = { ...initialState, stores: [sampleStore as any] }
    const state = reducer(stateWithStores, { type: deleteStore.fulfilled.type, payload: 10 })
    expect(state.stores).toHaveLength(0)
    expect(state.childStatuses.deleted).toBe(true)
  })

  it('should handle deleteStore.rejected', () => {
    const state = reducer(initialState, { type: deleteStore.rejected.type, payload: 'Delete failed' })
    expect(state.deleting).toBe(false)
    expect(state.errors).toBe('Delete failed')
  })
})
