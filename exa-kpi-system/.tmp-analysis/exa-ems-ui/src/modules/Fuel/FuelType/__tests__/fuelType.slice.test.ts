import { describe, it, expect } from 'vitest'
import reducer, {
  loadDefaultFuelType,
  loadFuelTypeFromList,
  resetStatuses,
  fetchFuelTypes,
  addFuelType,
  saveFuelType,
  deleteFuelType,
} from '../store/fuelType.slice'

const initialState = {
  list: [],
  fuelType: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  saving: false,
  deleting: false,
}

describe('fuelType slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle loadDefaultFuelType', () => {
    const state = reducer(initialState, loadDefaultFuelType(undefined))
    expect(state.fuelType).toEqual({ name: '' })
    expect(state.errors).toBeNull()
  })

  it('should handle loadDefaultFuelType with override', () => {
    const state = reducer(initialState, loadDefaultFuelType({ name: 'Diesel' }))
    expect(state.fuelType).toEqual({ name: 'Diesel' })
  })

  it('should handle loadFuelTypeFromList when found', () => {
    const stateWithList = {
      ...initialState,
      list: [
        { fuelTypeId: 1, name: 'Diesel' },
        { fuelTypeId: 2, name: 'Gasoline' },
      ],
    }
    const state = reducer(stateWithList, loadFuelTypeFromList(2))
    expect(state.fuelType).toEqual({ fuelTypeId: 2, name: 'Gasoline' })
    expect(state.errors).toBeNull()
  })

  it('should handle loadFuelTypeFromList when not found', () => {
    const stateWithList = { ...initialState, list: [{ fuelTypeId: 1, name: 'Diesel' }] }
    const state = reducer(stateWithList, loadFuelTypeFromList(999))
    expect(state.fuelType).toBeNull()
  })

  it('should handle resetStatuses', () => {
    const stateWithStatuses = {
      ...initialState,
      statuses: { added: true, updated: false, deleted: false },
      errors: 'some error' as any,
    }
    const state = reducer(stateWithStatuses, resetStatuses())
    expect(state.statuses).toEqual({ added: false, updated: false, deleted: false })
    expect(state.errors).toBeNull()
  })

  it('should set loadingList on fetchFuelTypes.pending', () => {
    const action = { type: fetchFuelTypes.pending.type }
    const state = reducer(initialState, action)
    expect(state.loadingList).toBe(true)
    expect(state.errors).toBeNull()
  })

  it('should populate list on fetchFuelTypes.fulfilled', () => {
    const items = [{ fuelTypeId: 889, name: 'Diesel' }]
    const action = { type: fetchFuelTypes.fulfilled.type, payload: items }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.list).toEqual(items)
  })

  it('should set errors on fetchFuelTypes.rejected', () => {
    const action = { type: fetchFuelTypes.rejected.type, payload: 'Network error' }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.errors).toBe('Network error')
  })

  it('should handle addFuelType.pending', () => {
    const action = { type: addFuelType.pending.type }
    const state = reducer(initialState, action)
    expect(state.saving).toBe(true)
  })

  it('should handle addFuelType.fulfilled', () => {
    const newItem = { fuelTypeId: 5, name: 'LPG' }
    const action = { type: addFuelType.fulfilled.type, payload: newItem }
    const state = reducer(initialState, action)
    expect(state.saving).toBe(false)
    expect(state.list[0]).toEqual(newItem)
    expect(state.statuses.added).toBe(true)
  })

  it('should handle saveFuelType.fulfilled', () => {
    const stateWithList = {
      ...initialState,
      list: [{ fuelTypeId: 1, name: 'Diesel' }],
    }
    const updated = { fuelTypeId: 1, name: 'Diesel Premium' }
    const action = { type: saveFuelType.fulfilled.type, payload: updated }
    const state = reducer(stateWithList, action)
    expect(state.list[0].name).toBe('Diesel Premium')
    expect(state.statuses.updated).toBe(true)
  })

  it('should handle deleteFuelType.fulfilled', () => {
    const stateWithList = {
      ...initialState,
      list: [
        { fuelTypeId: 1, name: 'Diesel' },
        { fuelTypeId: 2, name: 'Gasoline' },
      ],
    }
    const action = { type: deleteFuelType.fulfilled.type, payload: 1 }
    const state = reducer(stateWithList, action)
    expect(state.list).toHaveLength(1)
    expect(state.list[0].fuelTypeId).toBe(2)
    expect(state.statuses.deleted).toBe(true)
  })

  it('should handle deleteFuelType.rejected', () => {
    const action = { type: deleteFuelType.rejected.type, payload: 'Delete failed' }
    const state = reducer(initialState, action)
    expect(state.deleting).toBe(false)
    expect(state.errors).toBe('Delete failed')
  })
})
