import { describe, it, expect } from 'vitest'
import reducer, {
  loadDefaultSettings,
  resetStatuses,
  fetchFuelOrderSettingsList,
  addFuelOrderSettings,
  saveFuelOrderSettings,
  deleteFuelOrderSettings,
  fetchFuelOrderSettings,
  loadPlatesList,
  loadSubdivisionUsers,
  loadAttributeItems,
} from '../store/fuelOrderSettings.slice'

const initialState = {
  list: [],
  current: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,
  platesList: [],
  subdivisionUsers: [],
  workTypes: [],
  assetTypes: [],
  fuelOrderTypes: [],
  periods: [],
  timeSlots: [],
}

describe('fuelOrderSettings slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle loadDefaultSettings', () => {
    const state = reducer(initialState, loadDefaultSettings(undefined))
    expect(state.current).toBeTruthy()
    expect(state.current?.name).toBe('')
    expect(state.current?.tripRequired).toBe(0)
    expect(state.current?.fuelStatementRequired).toBe(1)
    expect(state.errors).toBeNull()
  })

  it('should handle loadDefaultSettings with override', () => {
    const state = reducer(initialState, loadDefaultSettings({ name: 'Test Config' }))
    expect(state.current?.name).toBe('Test Config')
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

  it('should set loadingList on fetchList.pending', () => {
    const action = { type: fetchFuelOrderSettingsList.pending.type }
    const state = reducer(initialState, action)
    expect(state.loadingList).toBe(true)
  })

  it('should populate list on fetchList.fulfilled', () => {
    const items = [{ fuelModuleConfigId: 1, name: 'Config A' }]
    const action = { type: fetchFuelOrderSettingsList.fulfilled.type, payload: items }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.list).toEqual(items)
  })

  it('should set errors on fetchList.rejected', () => {
    const action = { type: fetchFuelOrderSettingsList.rejected.type, payload: 'Network error' }
    const state = reducer(initialState, action)
    expect(state.errors).toBe('Network error')
  })

  it('should load current on fetchById.fulfilled', () => {
    const record = { fuelModuleConfigId: 1, name: 'Config A', tripRequired: 1 }
    const action = { type: fetchFuelOrderSettings.fulfilled.type, payload: record }
    const state = reducer({ ...initialState, loadingCurrent: true }, action)
    expect(state.loadingCurrent).toBe(false)
    expect(state.current).toEqual(record)
  })

  it('should handle add.fulfilled', () => {
    const newItem = { fuelModuleConfigId: 5, name: 'New Config' }
    const action = { type: addFuelOrderSettings.fulfilled.type, payload: newItem }
    const state = reducer(initialState, action)
    expect(state.saving).toBe(false)
    expect(state.list[0]).toEqual(newItem)
    expect(state.statuses.added).toBe(true)
  })

  it('should handle save.fulfilled', () => {
    const stateWithList = {
      ...initialState,
      list: [{ fuelModuleConfigId: 1, name: 'Old Name' } as any],
    }
    const updated = { fuelModuleConfigId: 1, name: 'Updated Name' }
    const action = { type: saveFuelOrderSettings.fulfilled.type, payload: updated }
    const state = reducer(stateWithList, action)
    expect(state.list[0].name).toBe('Updated Name')
    expect(state.statuses.updated).toBe(true)
  })

  it('should handle delete.fulfilled', () => {
    const stateWithList = {
      ...initialState,
      list: [
        { fuelModuleConfigId: 1, name: 'A' } as any,
        { fuelModuleConfigId: 2, name: 'B' } as any,
      ],
    }
    const action = { type: deleteFuelOrderSettings.fulfilled.type, payload: 1 }
    const state = reducer(stateWithList, action)
    expect(state.list).toHaveLength(1)
    expect(state.list[0].fuelModuleConfigId).toBe(2)
    expect(state.statuses.deleted).toBe(true)
  })

  it('should handle loadPlatesList.fulfilled', () => {
    const plates = [{ asset_id: 10, name: 'Truck-01' }]
    const action = { type: loadPlatesList.fulfilled.type, payload: plates }
    const state = reducer(initialState, action)
    expect(state.platesList).toEqual(plates)
  })

  it('should handle loadSubdivisionUsers.fulfilled', () => {
    const users = [{ user_id: 1, name: 'John' }]
    const action = { type: loadSubdivisionUsers.fulfilled.type, payload: users }
    const state = reducer(initialState, action)
    expect(state.subdivisionUsers).toEqual(users)
  })

  it('should handle loadAttributeItems.fulfilled for workType', () => {
    const items = [{ attribute_item_id: 1, name: 'Labor Type A' }]
    const action = { type: loadAttributeItems.fulfilled.type, payload: { field: 'workType', items } }
    const state = reducer(initialState, action)
    expect(state.workTypes).toEqual(items)
  })

  it('should handle loadAttributeItems.fulfilled for assetType', () => {
    const items = [{ attribute_item_id: 2, name: 'Vehicle Type B' }]
    const action = { type: loadAttributeItems.fulfilled.type, payload: { field: 'assetType', items } }
    const state = reducer(initialState, action)
    expect(state.assetTypes).toEqual(items)
  })
})
