import { describe, it, expect } from 'vitest'
import reducer, {
  loadDefaultFuelUnitType,
  loadFuelUnitTypeFromList,
  resetStatuses,
  fetchFuelUnitTypes,
  addFuelUnitType,
  saveFuelUnitType,
  deleteFuelUnitType,
} from '../store/fuelUnitType.slice'

const initialState = {
  list: [],
  fuelUnitType: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  saving: false,
  deleting: false,
}

describe('fuelUnitType slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle loadDefaultFuelUnitType', () => {
    const state = reducer(initialState, loadDefaultFuelUnitType(undefined))
    expect(state.fuelUnitType).toEqual({ name: '' })
    expect(state.errors).toBeNull()
  })

  it('should handle loadDefaultFuelUnitType with override', () => {
    const state = reducer(initialState, loadDefaultFuelUnitType({ name: 'Liters' }))
    expect(state.fuelUnitType).toEqual({ name: 'Liters' })
  })

  it('should handle loadFuelUnitTypeFromList when found', () => {
    const stateWithList = {
      ...initialState,
      list: [
        { unitTypeId: 1, name: 'Liters' },
        { unitTypeId: 2, name: 'Gallons' },
      ],
    }
    const state = reducer(stateWithList, loadFuelUnitTypeFromList(2))
    expect(state.fuelUnitType).toEqual({ unitTypeId: 2, name: 'Gallons' })
    expect(state.errors).toBeNull()
  })

  it('should handle loadFuelUnitTypeFromList when not found', () => {
    const stateWithList = { ...initialState, list: [{ unitTypeId: 1, name: 'Liters' }] }
    const state = reducer(stateWithList, loadFuelUnitTypeFromList(999))
    expect(state.fuelUnitType).toBeNull()
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

  it('should set loadingList on fetchFuelUnitTypes.pending', () => {
    const action = { type: fetchFuelUnitTypes.pending.type }
    const state = reducer(initialState, action)
    expect(state.loadingList).toBe(true)
  })

  it('should populate list on fetchFuelUnitTypes.fulfilled', () => {
    const items = [{ unitTypeId: 1, name: 'Liters' }]
    const action = { type: fetchFuelUnitTypes.fulfilled.type, payload: items }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.list).toEqual(items)
  })

  it('should set errors on fetchFuelUnitTypes.rejected', () => {
    const action = { type: fetchFuelUnitTypes.rejected.type, payload: 'Network error' }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.errors).toBe('Network error')
  })

  it('should handle addFuelUnitType.fulfilled', () => {
    const newItem = { unitTypeId: 5, name: 'Cubic Meters' }
    const action = { type: addFuelUnitType.fulfilled.type, payload: newItem }
    const state = reducer(initialState, action)
    expect(state.saving).toBe(false)
    expect(state.list[0]).toEqual(newItem)
    expect(state.statuses.added).toBe(true)
  })

  it('should handle saveFuelUnitType.fulfilled', () => {
    const stateWithList = {
      ...initialState,
      list: [{ unitTypeId: 1, name: 'Liters' }],
    }
    const updated = { unitTypeId: 1, name: 'Litres' }
    const action = { type: saveFuelUnitType.fulfilled.type, payload: updated }
    const state = reducer(stateWithList, action)
    expect(state.list[0].name).toBe('Litres')
    expect(state.statuses.updated).toBe(true)
  })

  it('should handle deleteFuelUnitType.fulfilled', () => {
    const stateWithList = {
      ...initialState,
      list: [
        { unitTypeId: 1, name: 'Liters' },
        { unitTypeId: 2, name: 'Gallons' },
      ],
    }
    const action = { type: deleteFuelUnitType.fulfilled.type, payload: 1 }
    const state = reducer(stateWithList, action)
    expect(state.list).toHaveLength(1)
    expect(state.list[0].unitTypeId).toBe(2)
    expect(state.statuses.deleted).toBe(true)
  })
})
