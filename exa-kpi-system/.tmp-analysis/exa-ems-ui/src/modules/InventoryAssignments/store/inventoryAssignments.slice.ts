import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { RootState } from '../../../store'
import { inventoryAssignmentsAPI } from '../api/inventoryAssignments.api'
import { driversAPI } from '../../Assets/Drivers/api/drivers.api'
import { trucksAPI } from '../../Assets/Trucks/api/trucks.api'
import {
  InventoryAssignment,
  InventoryAssignmentsState,
  InventoryDriverOption,
  AttributeOption,
  InternalSupplierOption,
} from '../types'
import { MODULE_DRIVERS, MODULE_TRUCKS, getModuleIdByName } from '../../../constants/modules'

const DRIVER_MODULE_ID = getModuleIdByName(MODULE_DRIVERS)
const TRUCK_MODULE_ID = getModuleIdByName(MODULE_TRUCKS)

const DRIVER_STATUS_ATTR_ID = 75
const TRUCK_STATUS_ATTR_ID = 65
const DRIVER_ASSIGNMENT_ATTR_ID = 53
const INTERNAL_SUPPLIER_ATTR_ID = 136

const INVENTORY_STATUSES = {
  UNAVAILABLE: 'Unavailable',
  AVAILABLE: 'Available',
  ASSIGNED: 'Assigned',
  IN_TRIP: 'In trip',
}

const STATUSES = {
  truck: { AVAILABLE: 'Available' },
  driver: { AVAILABLE: 'Available' },
}

const initialState: InventoryAssignmentsState = {
  list: [],
  loading: false,
  error: null,
  driverOptions: [],
  driverStatusOptions: [],
  truckStatusOptions: [],
  internalSupplierOptions: [],
  updatingIds: [],
}

const normalizeAttributeOptions = (attributes: any[], attributeId: number): AttributeOption[] => {
  if (!Array.isArray(attributes)) return []
  const attr = attributes.find((item) => Number(item.attribute_id ?? item.id) === attributeId)
  const items = attr?.items || []
  return items.map((item: any) => ({
    value: String(item.attribute_item_id ?? item.id ?? item.value ?? ''),
    label: item.name || item.label || `Option ${item.attribute_item_id ?? item.id ?? ''}`,
  }))
}

const normalizeDriverOptions = (drivers: any[]): InventoryDriverOption[] => {
  if (!Array.isArray(drivers)) return []
  return drivers.map((driver) => ({
    asset_id: driver.asset_id ?? driver.id,
    name: driver.name || driver.driver_name || driver.reference || `Driver ${driver.asset_id ?? driver.id ?? ''}`,
    subdivision: driver.subdivision ?? driver.subdivision_id ?? driver.subdivisionId ?? null,
    driver_status: driver.driver_status ?? driver.driver_status_id ?? driver.status ?? null,
  }))
}

const buildOptionMap = (options: AttributeOption[]) => {
  const map = new Map<string, string>()
  options.forEach((opt) => {
    map.set(String(opt.value), opt.label)
  })
  return map
}

const buildDriverMap = (drivers: InventoryDriverOption[]) => {
  const map = new Map<number, InventoryDriverOption>()
  drivers.forEach((driver) => {
    if (driver.asset_id !== undefined && driver.asset_id !== null) {
      map.set(Number(driver.asset_id), driver)
    }
  })
  return map
}

const computeAvailability = (record: InventoryAssignment) => {
  if (record.availability && record.availability.toLowerCase() === INVENTORY_STATUSES.IN_TRIP.toLowerCase()) {
    return INVENTORY_STATUSES.IN_TRIP
  }
  const truckAvailable = (record.truck_status_label || '').toLowerCase() === STATUSES.truck.AVAILABLE.toLowerCase()
  const driverAvailable = (record.driver_status_label || '').toLowerCase() === STATUSES.driver.AVAILABLE.toLowerCase()
  if (truckAvailable && driverAvailable) {
    return record.current_trip ? INVENTORY_STATUSES.ASSIGNED : INVENTORY_STATUSES.AVAILABLE
  }
  return record.availability || INVENTORY_STATUSES.UNAVAILABLE
}

const normalizeInventoryRecord = (
  record: InventoryAssignment,
  driverMap: Map<number, InventoryDriverOption>,
  driverStatusMap: Map<string, string>,
  truckStatusMap: Map<string, string>,
) => {
  const driverInfo = record.driver ? driverMap.get(Number(record.driver)) : undefined
  const driverStatusId =
    record.driver_status_id ??
    (driverInfo && driverInfo.driver_status !== undefined ? Number(driverInfo.driver_status) : undefined)
  const truckStatusId = record.truck_status_id ?? record.truck_status
  const driverStatusLabel =
    (driverStatusId !== undefined && driverStatusMap.get(String(driverStatusId))) || record.driver_status_label || record.driver_status || ''
  const truckStatusLabel =
    (truckStatusId !== undefined && truckStatusMap.get(String(truckStatusId))) || record.truck_status_label || record.truck_status || ''
  const driverName = driverInfo?.name || record.driverName || (record.driver ? `Driver #${record.driver}` : 'No Driver')

  return {
    ...record,
    driver: record.driver ? Number(record.driver) : null,
    driverName,
    driver_status_id: driverStatusId ?? null,
    driver_status_label: driverStatusLabel,
    truck_status_id: truckStatusId ? Number(truckStatusId) : null,
    truck_status_label: truckStatusLabel,
    driver_current_status: record.driver_current_status ?? (record as any)['111'] ?? record.driver_current_status,
    availability: computeAvailability({
      ...record,
      driver_status_label: driverStatusLabel,
      truck_status_label: truckStatusLabel,
    }),
  }
}

export const loadInventoryAssignments = createAsyncThunk(
  'inventoryAssignments/load',
  async (_, { rejectWithValue }) => {
    try {
      const [inventory, driverAttrs, truckAttrs, drivers, internalSupplierOptions] = await Promise.all([
        inventoryAssignmentsAPI.getInventory(),
        driversAPI.getAttributesWithItems().catch(() => []),
        trucksAPI.getAttributesWithItems().catch(() => []),
        driversAPI.getDriverNames().catch(() => []),
        inventoryAssignmentsAPI.getInternalSupplierItems().catch(() => [] as InternalSupplierOption[]),
      ])
      const driverStatusOptions = normalizeAttributeOptions(driverAttrs, DRIVER_STATUS_ATTR_ID)
      const truckStatusOptions = normalizeAttributeOptions(truckAttrs, TRUCK_STATUS_ATTR_ID)
      const driverOptions = normalizeDriverOptions(drivers)
      const driverStatusMap = buildOptionMap(driverStatusOptions)
      const truckStatusMap = buildOptionMap(truckStatusOptions)
      const driverMap = buildDriverMap(driverOptions)
      const normalizedList = (inventory as InventoryAssignment[]).map((record) =>
        normalizeInventoryRecord(record, driverMap, driverStatusMap, truckStatusMap),
      )
      return {
        list: normalizedList,
        driverOptions,
        driverStatusOptions,
        truckStatusOptions,
        internalSupplierOptions,
      }
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to load inventory assignments')
    }
  },
)

type UpdateType = 'driver' | 'truck_status' | 'driver_status' | 'internal_supplier'

interface UpdatePayload {
  assetId: number
  type: UpdateType
  value: string
}

export const updateInventoryAssignment = createAsyncThunk(
  'inventoryAssignments/updateAssignment',
  async ({ assetId, type, value }: UpdatePayload, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState
      const currentRecord = (state as any).inventoryAssignments.list.find(
        (item: InventoryAssignment) => item.asset_id === assetId,
      ) as InventoryAssignment | undefined
      if (!currentRecord) {
        throw new Error('Inventory record not found')
      }
      let moduleId = TRUCK_MODULE_ID
      let attributeId = DRIVER_ASSIGNMENT_ATTR_ID
      let targetAssetId: number | string = assetId

      if (type === 'truck_status') {
        attributeId = TRUCK_STATUS_ATTR_ID
      } else if (type === 'internal_supplier') {
        attributeId = INTERNAL_SUPPLIER_ATTR_ID
      } else if (type === 'driver_status') {
        moduleId = DRIVER_MODULE_ID
        attributeId = DRIVER_STATUS_ATTR_ID
        if (!currentRecord.driver) {
          throw new Error('No driver assigned to update status')
        }
        targetAssetId = currentRecord.driver
      }

      const valueToSend =
        value === '' || value === null || value === undefined ? null : Number.isNaN(Number(value)) ? value : Number(value)

      await inventoryAssignmentsAPI.updateAssetAttribute(moduleId, targetAssetId, attributeId, valueToSend)

      const driverStatusOptions = (state as any).inventoryAssignments.driverStatusOptions as AttributeOption[]
      const truckStatusOptions = (state as any).inventoryAssignments.truckStatusOptions as AttributeOption[]
      const driverOptions = (state as any).inventoryAssignments.driverOptions as InventoryDriverOption[]
      const driverStatusMap = buildOptionMap(driverStatusOptions)
      const truckStatusMap = buildOptionMap(truckStatusOptions)
      const driverMap = buildDriverMap(driverOptions)

      const updatedRecord: InventoryAssignment = { ...currentRecord }

      if (type === 'driver') {
        updatedRecord.driver = value ? Number(value) : null
      } else if (type === 'truck_status') {
        updatedRecord.truck_status_id = value ? Number(value) : null
      } else if (type === 'driver_status') {
        updatedRecord.driver_status_id = value ? Number(value) : null
      } else if (type === 'internal_supplier') {
        const internalSupplierOptions = (state as any).inventoryAssignments
          .internalSupplierOptions as InternalSupplierOption[]
        const match = internalSupplierOptions.find((opt) => String(opt.value) === String(value))
        updatedRecord.internal_supplier_id = value ? Number(value) : null
        updatedRecord.internal_supplier = match ? match.label : ''
      }

      const normalizedRecord = normalizeInventoryRecord(updatedRecord, driverMap, driverStatusMap, truckStatusMap)

      return {
        assetId,
        record: normalizedRecord,
        driverStatusUpdate:
          type === 'driver_status' && updatedRecord.driver
            ? { driverId: updatedRecord.driver, value: normalizedRecord.driver_status_id }
            : undefined,
      }
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to update inventory assignment')
    }
  },
)

const inventoryAssignmentsSlice = createSlice({
  name: 'inventoryAssignments',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadInventoryAssignments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadInventoryAssignments.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.list
        state.driverOptions = action.payload.driverOptions
        state.driverStatusOptions = action.payload.driverStatusOptions
        state.truckStatusOptions = action.payload.truckStatusOptions
        state.internalSupplierOptions = action.payload.internalSupplierOptions
      })
      .addCase(loadInventoryAssignments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateInventoryAssignment.pending, (state, action) => {
        const assetId = action.meta.arg.assetId
        if (!state.updatingIds.includes(assetId)) {
          state.updatingIds.push(assetId)
        }
      })
      .addCase(updateInventoryAssignment.fulfilled, (state, action) => {
        state.updatingIds = state.updatingIds.filter((id) => id !== action.payload.assetId)
        const index = state.list.findIndex((item) => item.asset_id === action.payload.assetId)
        if (index !== -1) {
          state.list[index] = action.payload.record
        }
        const driverUpdate = action.payload.driverStatusUpdate
        if (driverUpdate) {
          state.driverOptions = state.driverOptions.map((driver) =>
            Number(driver.asset_id) === Number(driverUpdate.driverId)
              ? { ...driver, driver_status: driverUpdate.value ?? null }
              : driver,
          )
        }
      })
      .addCase(updateInventoryAssignment.rejected, (state, action) => {
        state.updatingIds = state.updatingIds.filter((id) => id !== action.meta.arg.assetId)
        state.error = action.payload as string
      })
  },
})

export default inventoryAssignmentsSlice.reducer
