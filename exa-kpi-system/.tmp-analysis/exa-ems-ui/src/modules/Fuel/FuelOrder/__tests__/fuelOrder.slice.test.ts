import { describe, it, expect } from 'vitest'
import reducer, {
  loadDefaultFuelOrder,
  updateFuelOrderForm,
  resetStatuses,
  setPage,
  clearTripDetail,
  clearEquipmentDetail,
  fetchFuelOrdersList,
  fetchFuelOrder,
  addFuelOrder,
  saveFuelOrder,
  deleteFuelOrder,
  updateFuelOrderStatus,
  calculateSuggestedFuel,
  loadTripDetail,
  searchTrips,
  loadFuelOrderAttributes,
  loadGasStores,
  loadEquipmentDetail,
  loadDriverOptions,
  addReconciliation,
  deleteReconciliation,
} from '../store/fuelOrder.slice'

const initialState = {
  list: [],
  total: 0,
  page: 1,
  rowsPerPage: 15,
  current: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,
  orderTypes: [],
  fuelTypesList: [],
  paymentMethods: [],
  fuelRecipients: [],
  resourceCategories: [],
  fuelOrderStatuses: [],
  reconciliationStatuses: [],
  gasSupplierPaymentStatuses: [],
  subdivisionPaymentStatuses: [],
  containerTypes: [],
  gasStores: [],
  tripSearchResults: [],
  cityOptions: [],
  connectedCities: [],
  driverOptions: [],
  equipmentDetail: null,
  gasStationInfo: null,
  tripDetail: null,
  settings: null,
  suggested: null,
  fuelLimitAssessment: null,
  reconciliation: null,
  reconciliationStatuses2: { added: false, updated: false, deleted: false },
}

describe('fuelOrder slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle loadDefaultFuelOrder', () => {
    const state = reducer(initialState, loadDefaultFuelOrder(undefined))
    expect(state.current).toBeTruthy()
    expect(state.current?.plate).toBe('')
    expect(state.errors).toBeNull()
  })

  it('should handle loadDefaultFuelOrder with override', () => {
    const state = reducer(initialState, loadDefaultFuelOrder({ plate: 'ABC123' }))
    expect(state.current?.plate).toBe('ABC123')
  })

  it('should handle updateFuelOrderForm', () => {
    const stateWithCurrent = {
      ...initialState,
      current: { plate: 'OLD', orderType: 961 },
    }
    const state = reducer(stateWithCurrent, updateFuelOrderForm({ plate: 'NEW' }))
    expect(state.current?.plate).toBe('NEW')
    expect(state.current?.orderType).toBe(961)
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

  it('should handle setPage', () => {
    const state = reducer(initialState, setPage(3))
    expect(state.page).toBe(3)
  })

  it('should handle clearTripDetail', () => {
    const stateWithTrip = { ...initialState, tripDetail: { tripsid: 1 } as any }
    const state = reducer(stateWithTrip, clearTripDetail())
    expect(state.tripDetail).toBeNull()
  })

  it('should handle clearEquipmentDetail', () => {
    const stateWithEquip = {
      ...initialState,
      equipmentDetail: { plate: 'X' } as any,
      driverOptions: [{ driverId: 1 }] as any[],
    }
    const state = reducer(stateWithEquip, clearEquipmentDetail())
    expect(state.equipmentDetail).toBeNull()
    expect(state.driverOptions).toEqual([])
  })

  it('should set loadingList on fetchList.pending', () => {
    const action = { type: fetchFuelOrdersList.pending.type }
    const state = reducer(initialState, action)
    expect(state.loadingList).toBe(true)
  })

  it('should populate list on fetchList.fulfilled', () => {
    const payload = {
      data: [{ fuelOrderId: 1, plate: 'ABC' }],
      total: 1,
      page: 1,
      size: 15,
    }
    const action = { type: fetchFuelOrdersList.fulfilled.type, payload }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.list).toEqual(payload.data)
    expect(state.total).toBe(1)
  })

  it('should set errors on fetchList.rejected', () => {
    const action = { type: fetchFuelOrdersList.rejected.type, payload: 'Network error' }
    const state = reducer(initialState, action)
    expect(state.errors).toBe('Network error')
  })

  it('should load current on fetchById.fulfilled', () => {
    const record = { fuelOrderId: 1, plate: 'DEF' }
    const action = { type: fetchFuelOrder.fulfilled.type, payload: record }
    const state = reducer({ ...initialState, loadingCurrent: true }, action)
    expect(state.loadingCurrent).toBe(false)
    expect(state.current).toEqual(record)
  })

  it('should handle add.fulfilled', () => {
    const newItem = { fuelOrderId: 5, plate: 'NEW' }
    const action = { type: addFuelOrder.fulfilled.type, payload: newItem }
    const state = reducer(initialState, action)
    expect(state.saving).toBe(false)
    expect(state.current).toEqual(newItem)
    expect(state.statuses.added).toBe(true)
  })

  it('should handle save.fulfilled', () => {
    const updated = { fuelOrderId: 1, plate: 'UPDATED' }
    const action = { type: saveFuelOrder.fulfilled.type, payload: updated }
    const state = reducer(initialState, action)
    expect(state.current).toEqual(updated)
    expect(state.statuses.updated).toBe(true)
  })

  it('should handle delete.fulfilled', () => {
    const stateWithList = {
      ...initialState,
      list: [
        { fuelOrderId: 1, plate: 'A' } as any,
        { fuelOrderId: 2, plate: 'B' } as any,
      ],
      total: 2,
    }
    const action = { type: deleteFuelOrder.fulfilled.type, payload: 1 }
    const state = reducer(stateWithList, action)
    expect(state.list).toHaveLength(1)
    expect(state.list[0].fuelOrderId).toBe(2)
    expect(state.statuses.deleted).toBe(true)
    expect(state.total).toBe(1)
  })

  it('should handle updateStatus.fulfilled', () => {
    const action = { type: updateFuelOrderStatus.fulfilled.type }
    const state = reducer(initialState, action)
    expect(state.statuses.updated).toBe(true)
  })

  it('should handle calculateSuggested.fulfilled', () => {
    const action = { type: calculateSuggestedFuel.fulfilled.type, payload: 150 }
    const state = reducer(initialState, action)
    expect(state.suggested).toBe(150)
  })

  it('should handle loadTrip.fulfilled', () => {
    const tripDetail = { tripsid: 10, referenceNumber: 'REF-01' }
    const action = { type: loadTripDetail.fulfilled.type, payload: tripDetail }
    const state = reducer(initialState, action)
    expect(state.tripDetail).toEqual(tripDetail)
  })

  it('should handle searchTrips.fulfilled', () => {
    const trips = [{ tripsid: 1, plate: 'ABC' }]
    const action = { type: searchTrips.fulfilled.type, payload: trips }
    const state = reducer(initialState, action)
    expect(state.tripSearchResults).toEqual(trips)
  })

  it('should handle loadAttributes.fulfilled for orderType', () => {
    const items = [{ attribute_item_id: 961, name: 'Viaje' }]
    const action = {
      type: loadFuelOrderAttributes.fulfilled.type,
      payload: { field: 'orderType', items },
    }
    const state = reducer(initialState, action)
    expect(state.orderTypes).toEqual(items)
  })

  it('should handle loadGasStores.fulfilled', () => {
    const stores = [{ gasStationsId: 1, name: 'Station A' }]
    const action = { type: loadGasStores.fulfilled.type, payload: stores }
    const state = reducer(initialState, action)
    expect(state.gasStores).toEqual(stores)
  })

  it('should handle loadEquipmentDetail.fulfilled', () => {
    const detail = { plate: 'XYZ', brand: 'Ford' }
    const action = { type: loadEquipmentDetail.fulfilled.type, payload: detail }
    const state = reducer(initialState, action)
    expect(state.equipmentDetail).toEqual(detail)
  })

  it('should handle loadDrivers.fulfilled', () => {
    const drivers = [{ driverId: 1, name: 'John' }]
    const action = { type: loadDriverOptions.fulfilled.type, payload: drivers }
    const state = reducer(initialState, action)
    expect(state.driverOptions).toEqual(drivers)
  })

  it('should handle addReconciliation.fulfilled', () => {
    const action = { type: addReconciliation.fulfilled.type }
    const state = reducer(initialState, action)
    expect(state.reconciliationStatuses2.added).toBe(true)
  })

  it('should handle deleteReconciliation.fulfilled', () => {
    const action = { type: deleteReconciliation.fulfilled.type }
    const state = reducer(initialState, action)
    expect(state.reconciliationStatuses2.deleted).toBe(true)
  })
})
