import { describe, it, expect } from 'vitest'
import reducer, {
  resetStatuses,
  clearCurrent,
  clearDepartments,
  clearCities,
  fetchFuelPrices,
  fetchFuelPriceById,
  addFuelPrice,
  saveFuelPrice,
  deleteFuelPrice,
  loadCountries,
  loadDepartments,
  loadCities,
  loadFuelTypes,
  loadUnitTypes,
} from '../store/fuelPrice.slice'

const initialState = {
  list: [],
  current: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,
  countries: [],
  departments: [],
  cities: [],
  fuelTypes: [],
  unitTypes: [],
}

describe('fuelPrice slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle resetStatuses', () => {
    const modified = {
      ...initialState,
      statuses: { added: true, updated: false, deleted: false },
    }
    const state = reducer(modified, resetStatuses())
    expect(state.statuses).toEqual({ added: false, updated: false, deleted: false })
  })

  it('should handle clearCurrent', () => {
    const modified = {
      ...initialState,
      current: { fuelPriceLocationWeekId: 1 } as any,
    }
    const state = reducer(modified, clearCurrent())
    expect(state.current).toBeNull()
  })

  it('should handle clearDepartments', () => {
    const modified = {
      ...initialState,
      departments: [{ deparmentid: 1, name: 'Test' }],
    }
    const state = reducer(modified, clearDepartments())
    expect(state.departments).toEqual([])
  })

  it('should handle clearCities', () => {
    const modified = {
      ...initialState,
      cities: [{ citieid: 1, name: 'Test' }],
    }
    const state = reducer(modified, clearCities())
    expect(state.cities).toEqual([])
  })

  // fetchList
  it('should set loadingList on fetchFuelPrices.pending', () => {
    const action = { type: fetchFuelPrices.pending.type }
    const state = reducer(initialState, action)
    expect(state.loadingList).toBe(true)
    expect(state.errors).toBeNull()
  })

  it('should populate list on fetchFuelPrices.fulfilled', () => {
    const items = [
      { fuelPriceLocationWeekId: 179, weekLabel: '2026 - W8', countryName: 'Honduras' },
    ]
    const action = { type: fetchFuelPrices.fulfilled.type, payload: items }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.list).toEqual(items)
  })

  it('should set errors on fetchFuelPrices.rejected', () => {
    const action = { type: fetchFuelPrices.rejected.type, payload: 'Network error' }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.errors).toBe('Network error')
  })

  // fetchById
  it('should set loadingCurrent on fetchFuelPriceById.pending', () => {
    const action = { type: fetchFuelPriceById.pending.type }
    const state = reducer(initialState, action)
    expect(state.loadingCurrent).toBe(true)
    expect(state.errors).toBeNull()
  })

  it('should set current on fetchFuelPriceById.fulfilled', () => {
    const item = { fuelPriceLocationWeekId: 179, weekId: 772, exchangeRate: '26.75' }
    const action = { type: fetchFuelPriceById.fulfilled.type, payload: item }
    const state = reducer({ ...initialState, loadingCurrent: true }, action)
    expect(state.loadingCurrent).toBe(false)
    expect(state.current).toEqual(item)
  })

  it('should set errors on fetchFuelPriceById.rejected', () => {
    const action = { type: fetchFuelPriceById.rejected.type, payload: 'Not found' }
    const state = reducer({ ...initialState, loadingCurrent: true }, action)
    expect(state.loadingCurrent).toBe(false)
    expect(state.errors).toBe('Not found')
  })

  // add
  it('should set saving on addFuelPrice.pending', () => {
    const action = { type: addFuelPrice.pending.type }
    const state = reducer(initialState, action)
    expect(state.saving).toBe(true)
    expect(state.errors).toBeNull()
  })

  it('should set statuses.added on addFuelPrice.fulfilled', () => {
    const action = { type: addFuelPrice.fulfilled.type, payload: {} }
    const state = reducer({ ...initialState, saving: true }, action)
    expect(state.saving).toBe(false)
    expect(state.statuses.added).toBe(true)
  })

  it('should set errors on addFuelPrice.rejected', () => {
    const action = { type: addFuelPrice.rejected.type, payload: 'Create failed' }
    const state = reducer({ ...initialState, saving: true }, action)
    expect(state.saving).toBe(false)
    expect(state.errors).toBe('Create failed')
  })

  // save
  it('should set saving on saveFuelPrice.pending', () => {
    const action = { type: saveFuelPrice.pending.type }
    const state = reducer(initialState, action)
    expect(state.saving).toBe(true)
  })

  it('should set statuses.updated on saveFuelPrice.fulfilled', () => {
    const action = { type: saveFuelPrice.fulfilled.type, payload: {} }
    const state = reducer({ ...initialState, saving: true }, action)
    expect(state.saving).toBe(false)
    expect(state.statuses.updated).toBe(true)
  })

  it('should set errors on saveFuelPrice.rejected', () => {
    const action = { type: saveFuelPrice.rejected.type, payload: 'Update failed' }
    const state = reducer({ ...initialState, saving: true }, action)
    expect(state.saving).toBe(false)
    expect(state.errors).toBe('Update failed')
  })

  // delete
  it('should set deleting on deleteFuelPrice.pending', () => {
    const action = { type: deleteFuelPrice.pending.type }
    const state = reducer(initialState, action)
    expect(state.deleting).toBe(true)
  })

  it('should set statuses.deleted on deleteFuelPrice.fulfilled', () => {
    const action = { type: deleteFuelPrice.fulfilled.type, payload: 179 }
    const state = reducer({ ...initialState, deleting: true }, action)
    expect(state.deleting).toBe(false)
    expect(state.statuses.deleted).toBe(true)
  })

  it('should set errors on deleteFuelPrice.rejected', () => {
    const action = { type: deleteFuelPrice.rejected.type, payload: 'Delete failed' }
    const state = reducer(initialState, action)
    expect(state.deleting).toBe(false)
    expect(state.errors).toBe('Delete failed')
  })

  // lookup data
  it('should populate countries on loadCountries.fulfilled', () => {
    const countries = [{ countryId: 13, name: 'Honduras' }]
    const action = { type: loadCountries.fulfilled.type, payload: countries }
    const state = reducer(initialState, action)
    expect(state.countries).toEqual(countries)
  })

  it('should populate departments on loadDepartments.fulfilled', () => {
    const departments = [{ deparmentid: 13, name: 'Francisco Morazán' }]
    const action = { type: loadDepartments.fulfilled.type, payload: departments }
    const state = reducer(initialState, action)
    expect(state.departments).toEqual(departments)
  })

  it('should populate cities on loadCities.fulfilled', () => {
    const cities = [{ citieid: 70, name: 'Tegucigalpa' }]
    const action = { type: loadCities.fulfilled.type, payload: cities }
    const state = reducer(initialState, action)
    expect(state.cities).toEqual(cities)
  })

  it('should populate fuelTypes on loadFuelTypes.fulfilled', () => {
    const fuelTypes = [{ attributeItemid: 889, name: 'Diesel' }]
    const action = { type: loadFuelTypes.fulfilled.type, payload: fuelTypes }
    const state = reducer(initialState, action)
    expect(state.fuelTypes).toEqual(fuelTypes)
  })

  it('should populate unitTypes on loadUnitTypes.fulfilled', () => {
    const unitTypes = [{ unitTypeId: 1, name: 'Litros' }]
    const action = { type: loadUnitTypes.fulfilled.type, payload: unitTypes }
    const state = reducer(initialState, action)
    expect(state.unitTypes).toEqual(unitTypes)
  })
})
