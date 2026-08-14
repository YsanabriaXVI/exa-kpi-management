import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type {
  FuelOrder,
  FuelOrderForm,
  FuelOrderErrors,
  FuelOrderListParams,
  FuelOrderListResponse,
  AttributeItem,
  StatusUpdatePayload,
  PaymentStatusPayload,
  ReconciliationPayload,
  ReconciliationData,
  SuggestedFuelParams,
  TripSearchResult,
  CityOption,
  DriverOption,
  EquipmentDetail,
  EquipmentSearchResult,
  TripDetail,
  GasStationInfo,
  ManualTripSearchParams,
} from '../types/fuelOrder.types'
import { fuelOrderApi } from '../api/fuelOrder.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface FuelOrderState {
  list: FuelOrder[]
  total: number
  page: number
  rowsPerPage: number
  current: FuelOrderForm | null
  errors: FuelOrderErrors
  statuses: StatusFlags
  loadingList: boolean
  loadingCurrent: boolean
  saving: boolean
  deleting: boolean
  // Attribute lists
  orderTypes: AttributeItem[]
  fuelTypesList: AttributeItem[]
  paymentMethods: AttributeItem[]
  fuelRecipients: AttributeItem[]
  resourceCategories: AttributeItem[]
  fuelOrderStatuses: AttributeItem[]
  reconciliationStatuses: AttributeItem[]
  gasSupplierPaymentStatuses: AttributeItem[]
  subdivisionPaymentStatuses: AttributeItem[]
  containerTypes: AttributeItem[]
  // Lookups
  gasStores: any[]
  tripSearchResults: TripSearchResult[]
  searchingTrips: boolean
  equipmentSearchResults: EquipmentSearchResult[]
  searchingEquipment: boolean
  cityOptions: CityOption[]
  connectedCities: CityOption[]
  driverOptions: DriverOption[]
  equipmentDetail: EquipmentDetail | null
  gasStationInfo: GasStationInfo | null
  tripDetail: TripDetail | null
  settings: any | null
  suggested: number | null
  fuelLimitAssessment: any | null
  // Reconciliation
  reconciliation: ReconciliationData | null
  reconciliationForm: ReconciliationPayload | null
  reconciliationStatuses2: StatusFlags
  // Mechanic search
  mechanicOptions: any[]
  // Optimistic delete snapshot
  _fuelAuditorSnapshot: any | null
}

const fuelOrderDefault: FuelOrderForm = {
  companyId: undefined,
  tripId: null,
  tripsid: null,
  plate: '',
  gasStationsId: null,
  gasStationsParentId: null,
  orderType: null,
  typeContainer: null,
  fuelType: null,
  fuelTank: null,
  fuelTankLiters: null,
  fuelRequest: null,
  fuelRequestLiters: null,
  suggested: null,
  equipmentType: null,
  equipmentId: null,
  responsibleId: null,
  mechanicId: null,
  subdivisionId: null,
  resourceCategory: null,
  measure: null,
  dateSchedule: null,
  expirationDate: null,
  routeLegs: [],
}

const initialState: FuelOrderState = {
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
  searchingTrips: false,
  equipmentSearchResults: [],
  searchingEquipment: false,
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
  reconciliationForm: null,
  reconciliationStatuses2: { added: false, updated: false, deleted: false },
  mechanicOptions: [],
  _fuelAuditorSnapshot: null,
}

// ─── List ─────────────────────────────────────────────
export const fetchFuelOrdersList = createAsyncThunk<
  FuelOrderListResponse,
  FuelOrderListParams,
  { rejectValue: FuelOrderErrors }
>('fuelOrder/fetchList', async (params, thunkAPI) => {
  try {
    return await fuelOrderApi.fetchList(params)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

// ─── Single ───────────────────────────────────────────
export const fetchFuelOrder = createAsyncThunk<
  FuelOrder,
  number,
  { rejectValue: FuelOrderErrors }
>('fuelOrder/fetchById', async (id, thunkAPI) => {
  try {
    return await fuelOrderApi.fetchById(id)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

// ─── Create ───────────────────────────────────────────
export const addFuelOrder = createAsyncThunk<
  FuelOrder,
  FuelOrderForm,
  { rejectValue: FuelOrderErrors }
>('fuelOrder/add', async (form, thunkAPI) => {
  try {
    return await fuelOrderApi.create(form)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

// ─── Update ───────────────────────────────────────────
export const saveFuelOrder = createAsyncThunk<
  FuelOrder,
  FuelOrderForm,
  { rejectValue: FuelOrderErrors }
>('fuelOrder/save', async (form, thunkAPI) => {
  try {
    return await fuelOrderApi.update(form)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

// ─── Delete ───────────────────────────────────────────
export const deleteFuelOrder = createAsyncThunk<
  number,
  number,
  { state: RootState; rejectValue: FuelOrderErrors }
>('fuelOrder/delete', async (id, thunkAPI) => {
  try {
    await fuelOrderApi.remove(id)
    return id
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

// ─── Status update ────────────────────────────────────
export const updateFuelOrderStatus = createAsyncThunk<
  any,
  StatusUpdatePayload,
  { rejectValue: FuelOrderErrors }
>('fuelOrder/updateStatus', async (payload, thunkAPI) => {
  try {
    return await fuelOrderApi.updateStatus(payload)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

// ─── Payment status ───────────────────────────────────
export const updatePaymentStatus = createAsyncThunk<
  any,
  PaymentStatusPayload,
  { rejectValue: FuelOrderErrors }
>('fuelOrder/updatePaymentStatus', async (payload, thunkAPI) => {
  try {
    return await fuelOrderApi.updatePaymentStatus(payload)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

// ─── Suggested fuel ───────────────────────────────────
export const calculateSuggestedFuel = createAsyncThunk<
  number | null,
  SuggestedFuelParams,
  { rejectValue: FuelOrderErrors }
>('fuelOrder/calculateSuggested', async (params, thunkAPI) => {
  try {
    return await fuelOrderApi.getSuggestedFuel(params)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

// ─── Load trip ────────────────────────────────────────
export const loadTripDetail = createAsyncThunk<
  TripDetail,
  number,
  { rejectValue: FuelOrderErrors }
>('fuelOrder/loadTrip', async (tripId, thunkAPI) => {
  try {
    return await fuelOrderApi.fetchTrip(tripId)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

// ─── Search trips ─────────────────────────────────────
export const searchTrips = createAsyncThunk<
  TripSearchResult[],
  { query: string; orderType?: number; manualParams?: ManualTripSearchParams },
  { rejectValue: FuelOrderErrors }
>('fuelOrder/searchTrips', async ({ query, orderType, manualParams }, thunkAPI) => {
  try {
    return await fuelOrderApi.searchTrips(query, orderType, manualParams, thunkAPI.signal)
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
      return thunkAPI.rejectWithValue(null as any)
    }
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

// ─── Load settings ────────────────────────────────────
export const loadFuelSettings = createAsyncThunk(
  'fuelOrder/loadSettings',
  async (params: Record<string, any> | undefined, thunkAPI) => {
    try {
      return await fuelOrderApi.fetchSettings(params)
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Fuel limit assessment ────────────────────────────
export const checkFuelLimit = createAsyncThunk(
  'fuelOrder/checkFuelLimit',
  async (payload: any, thunkAPI) => {
    try {
      return await fuelOrderApi.checkFuelLimit(payload)
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Load attribute items ─────────────────────────────
export const loadFuelOrderAttributes = createAsyncThunk(
  'fuelOrder/loadAttributes',
  async (
    payload: { attributeFlatNameId: string; targetField: string; moduleFlatNameId?: string },
    thunkAPI,
  ) => {
    try {
      const items = await fuelOrderApi.loadAttributeItems(
        payload.attributeFlatNameId,
        payload.moduleFlatNameId,
      )
      return { field: payload.targetField, items }
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Load gas stores ──────────────────────────────────
export const loadGasStores = createAsyncThunk(
  'fuelOrder/loadGasStores',
  async (_arg: void, thunkAPI) => {
    try {
      return await fuelOrderApi.fetchGasSupplierStores()
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Load gas station info ────────────────────────────
export const loadGasStationInfo = createAsyncThunk(
  'fuelOrder/loadGasStation',
  async (id: number, thunkAPI) => {
    try {
      return await fuelOrderApi.fetchGasStation(id)
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Equipment search ─────────────────────────────────
export const searchEquipment = createAsyncThunk(
  'fuelOrder/searchEquipment',
  async (
    payload: { equipmentType: number; query: string },
    thunkAPI,
  ) => {
    try {
      return await fuelOrderApi.searchEquipment(
        payload.equipmentType,
        payload.query,
      )
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Equipment detail + driver options (sequential) ──
export const loadEquipmentAndDrivers = createAsyncThunk(
  'fuelOrder/loadEquipmentAndDrivers',
  async (
    payload: { equipmentType: number; equipmentId: number },
    thunkAPI,
  ) => {
    try {
      let equipmentDetail: any
      switch (payload.equipmentType) {
        case 1:
          equipmentDetail = await fuelOrderApi.fetchTruckDetail(payload.equipmentId)
          break
        case 2:
          equipmentDetail = await fuelOrderApi.fetchGensetDetail(payload.equipmentId)
          break
        default:
          equipmentDetail = await fuelOrderApi.fetchOtherAssetDetail(payload.equipmentId)
      }

      let driverOptions: any[] = []
      const eqType = payload.equipmentType

      if (eqType === 1 || eqType === 2) {
        const rawDriverId =
          equipmentDetail?.driverAssigned ??
          equipmentDetail?.responsibleId ??
          0
        const driverId = Number(rawDriverId)
        if (driverId > 0) {
          try {
            driverOptions = await fuelOrderApi.fetchDriverOptions(driverId)
          } catch { /* driver fetch is non-fatal */ }
        }
      } else if (eqType === 3) {
        try {
          driverOptions = await fuelOrderApi.fetchDriversForAsset(3, payload.equipmentId)
        } catch { /* driver fetch is non-fatal */ }
      }

      const formUpdates: Partial<FuelOrderForm> = {}

      if (equipmentDetail?.subdivisionId) {
        formUpdates.subdivisionId = equipmentDetail.subdivisionId
      }
      if (eqType === 1 || eqType === 2) {
        formUpdates.plate =
          equipmentDetail?.truck_plate ??
          equipmentDetail?.genset_no ??
          equipmentDetail?.personal_identification ??
          null
      } else if (eqType === 3) {
        formUpdates.plate = equipmentDetail?.personal_identification ?? null
      }
      if (equipmentDetail?.fuelType ?? equipmentDetail?.fuel_type) {
        formUpdates.fuelType = Number(equipmentDetail.fuelType ?? equipmentDetail.fuel_type) || null
      } else if (eqType === 1) {
        formUpdates.fuelType = 889
      }
      if (equipmentDetail?.fuel_recipient) {
        formUpdates.typeContainer = Number(equipmentDetail.fuel_recipient) || null
      }
      if (eqType === 3 && equipmentDetail?.resourceCategory) {
        formUpdates.resourceCategory = Number(equipmentDetail.resourceCategory) || null
      } else if (eqType === 1) {
        formUpdates.resourceCategory = 1500
      } else if (eqType === 2) {
        formUpdates.resourceCategory = 1499
      }
      if (eqType === 1 || eqType === 2) {
        const rawId = Number(
          equipmentDetail?.driverAssigned ??
          equipmentDetail?.responsibleId ??
          0,
        )
        if (rawId > 0) formUpdates.responsibleId = rawId
      }

      return { equipmentDetail, driverOptions, formUpdates }
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Equipment detail (standalone, kept for edit page load) ──
export const loadEquipmentDetail = createAsyncThunk(
  'fuelOrder/loadEquipmentDetail',
  async (
    payload: { equipmentType: number; equipmentId: number },
    thunkAPI,
  ) => {
    try {
      switch (payload.equipmentType) {
        case 1:
          return await fuelOrderApi.fetchTruckDetail(payload.equipmentId)
        case 2:
          return await fuelOrderApi.fetchGensetDetail(payload.equipmentId)
        default:
          return await fuelOrderApi.fetchOtherAssetDetail(payload.equipmentId)
      }
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Driver options (standalone, kept for specific use cases) ──
export const loadDriverOptions = createAsyncThunk(
  'fuelOrder/loadDrivers',
  async (
    payload: { equipmentType: number; equipmentId: number; driverId?: number },
    thunkAPI,
  ) => {
    try {
      if (payload.equipmentType === 1 || payload.equipmentType === 2) {
        const id = payload.driverId ?? payload.equipmentId
        return await fuelOrderApi.fetchDriverOptions(id)
      }
      return await fuelOrderApi.fetchDriversForAsset(
        payload.equipmentType,
        payload.equipmentId,
      )
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Connected cities ─────────────────────────────────
export const loadConnectedCities = createAsyncThunk(
  'fuelOrder/loadConnectedCities',
  async (params: { fromCityId: number; subdivisionId?: number } | number, thunkAPI) => {
    try {
      if (typeof params === 'number') {
        return await fuelOrderApi.fetchConnectedCities(params)
      }
      return await fuelOrderApi.fetchConnectedCities(params.fromCityId, params.subdivisionId)
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Reconciliation CRUD ──────────────────────────────
export const addReconciliation = createAsyncThunk(
  'fuelOrder/addReconciliation',
  async (payload: ReconciliationPayload, thunkAPI) => {
    try {
      return await fuelOrderApi.addReconciliation(payload)
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.errors ?? err.message,
      )
    }
  },
)

export const updateReconciliation = createAsyncThunk(
  'fuelOrder/updateReconciliation',
  async (
    payload: { transactionId: number; data: ReconciliationPayload },
    thunkAPI,
  ) => {
    try {
      return await fuelOrderApi.updateReconciliation(
        payload.transactionId,
        payload.data,
      )
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.errors ?? err.message,
      )
    }
  },
)

export const deleteReconciliation = createAsyncThunk(
  'fuelOrder/deleteReconciliation',
  async (transactionId: number, thunkAPI) => {
    try {
      await fuelOrderApi.deleteReconciliation(transactionId)
      return transactionId
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.errors ?? err.message,
      )
    }
  },
)

// ─── Sync fuel price ──────────────────────────────────
export const syncFuelPrice = createAsyncThunk(
  'fuelOrder/syncFuelPrice',
  async (fuelOrderId: number, thunkAPI) => {
    try {
      return await fuelOrderApi.syncFuelPrice(fuelOrderId)
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Download PDF ─────────────────────────────────────
export const downloadFuelOrderPdf = createAsyncThunk(
  'fuelOrder/downloadPdf',
  async (fuelOrderId: number, thunkAPI) => {
    try {
      const blob = await fuelOrderApi.downloadPdf(fuelOrderId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fuel-order-${fuelOrderId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      return true
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Suggested fuel for equipment type 1 (two-step) ──
export const calculateSuggestedFuelForType1 = createAsyncThunk(
  'fuelOrder/calculateSuggestedType1',
  async (
    params: {
      legs?: any[]
      tripDetail?: any
      ratebuilderId?: number
      clientid?: number
      subdivisionId?: number
      workorderid?: number
    },
    thunkAPI,
  ) => {
    try {
      const { legs, tripDetail, ratebuilderId, clientid, subdivisionId, workorderid } = params
      let totalSuggested = 0

      if (legs && legs.length > 0) {
        const firstLeg = legs[0]
        const fromCityId = firstLeg.fromCityId ?? firstLeg.fromCity?.value
        const toCityId = firstLeg.toCityId ?? firstLeg.toCity?.value
        if (fromCityId && toCityId) {
          const routeId = await fuelOrderApi.getRouteId(fromCityId, toCityId)
          if (routeId) {
            const query = new URLSearchParams()
            query.set('routeid', String(routeId))
            if (clientid) query.set('clientid', String(clientid))
            if (subdivisionId) query.set('subdivisionid', String(subdivisionId))
            if (ratebuilderId) query.set('ratebuilderId', String(ratebuilderId))
            const simpleSuggested = await fuelOrderApi.getSimpleSuggestedWithParams(query.toString())
            totalSuggested += simpleSuggested ?? 0
          }
        }
      }

      if (tripDetail) {
        const tripRouteId = tripDetail.workOrder?.routeID ?? tripDetail.workOrder?.routeid ?? tripDetail.work_order?.routeID ?? tripDetail.work_order?.routeid ?? tripDetail.routeId ?? tripDetail.routeid
        const tripClientId = clientid ?? tripDetail.workOrder?.clientid ?? tripDetail.workOrder?.clientId ?? tripDetail.work_order?.clientid ?? tripDetail.work_order?.clientId
        const tripWorkOrderId = workorderid ?? tripDetail.workOrder?.workOrderId ?? tripDetail.workOrder?.workorderid ?? tripDetail.work_order?.workOrderId ?? tripDetail.work_order?.workorderid ?? tripDetail.workOrderId
        if (tripRouteId) {
          const tripSuggested = await fuelOrderApi.getSuggestedFuel({
            routeid: tripRouteId,
            clientid: tripClientId,
            subdivisionId,
            workorderid: tripWorkOrderId,
            equipmentType: 1,
            ratebuilderId,
          })
          totalSuggested += tripSuggested ?? 0
        }
      }

      return totalSuggested > 0 ? totalSuggested : null
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Search mechanics (for orderType 962) ────────────
export const searchMechanics = createAsyncThunk(
  'fuelOrder/searchMechanics',
  async (
    payload: { searchText?: string; subdivisionId?: number; resourceCategoryId?: number },
    thunkAPI,
  ) => {
    try {
      const filter: any = {}
      if (payload.subdivisionId) filter.subdivisionId = payload.subdivisionId
      if (payload.resourceCategoryId) filter.resourceCategoryId = payload.resourceCategoryId
      if (payload.searchText) filter.searchText = payload.searchText
      const results = await fuelOrderApi.searchOtherAssetPeople(filter)
      return (results ?? []).map((item: any) => ({
        value: item.assetsid ?? item.id,
        label: `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || String(item.assetsid),
      }))
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Load default values from equipment (maintenance orders) ──
export const loadDefaultValuesFromEquipment = createAsyncThunk(
  'fuelOrder/loadDefaultsFromEquipment',
  async (
    equipmentData: {
      equipmentId: number
      equipmentModule: string
      subdivisionId?: number
      driverRequired?: boolean
    },
    thunkAPI,
  ) => {
    try {
      let equipmentType: number
      let measureType: string | null = null
      switch (equipmentData.equipmentModule) {
        case 'trucks':
          equipmentType = 1
          measureType = 'odometer'
          break
        case 'gensets':
          equipmentType = 2
          measureType = 'horometer'
          break
        default:
          equipmentType = 3
          measureType = 'odometer'
      }

      const workTypeItems = await fuelOrderApi.loadAttributeItems('tipo_de_labor', 'fuel_order')
      const maintenanceWorkType = workTypeItems.find(
        (item: any) =>
          item.flat_name_id === 'mantenimiento' || item.name === 'Mantenimiento',
      )

      const recipientItems = await fuelOrderApi.loadAttributeItems('fuel_recipient', 'fuel_order')
      const tankRecipient = recipientItems.find(
        (item: any) => item.flat_name_id === 'tanque' || item.name === 'Tank',
      )

      const categoryItems = await fuelOrderApi.loadAttributeItems('fuel_order_type', 'fuel_order_settings')
      const ownedEquipment = categoryItems.find(
        (item: any) =>
          item.flat_name_id === 'equipo_propio' ||
          item.name === 'Equipo Propio' ||
          item.name === 'Owned Equipment',
      )

      return {
        equipmentId: equipmentData.equipmentId,
        equipmentType,
        measureType,
        orderType: maintenanceWorkType
          ? maintenanceWorkType.attributeItemId
          : 962,
        fuelType: 889,
        typeContainer: tankRecipient ? tankRecipient.attributeItemId : null,
        resourceCategory: ownedEquipment ? ownedEquipment.attributeItemId : null,
        subdivisionId: equipmentData.subdivisionId ?? null,
        tripRequired: false,
        suggested: 0,
        driverRequired: equipmentData.driverRequired,
      }
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

// ─── Slice ────────────────────────────────────────────
const fuelOrderSlice = createSlice({
  name: 'fuelOrder',
  initialState,
  reducers: {
    loadDefaultFuelOrder(state, action: PayloadAction<FuelOrderForm | undefined>) {
      state.current = { ...fuelOrderDefault, ...(action.payload || {}) }
      state.errors = null
      state.reconciliation = null
      state.equipmentDetail = null
      state.gasStationInfo = null
      state.tripDetail = null
      state.suggested = null
    },
    updateFuelOrderForm(
      state,
      action: PayloadAction<Partial<FuelOrderForm> & { _replace?: boolean }>,
    ) {
      const { _replace, ...payload } = action.payload
      if (_replace) {
        state.current = payload as FuelOrderForm
      } else if (state.current) {
        state.current = { ...state.current, ...payload }
      }
    },
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
    resetReconciliationStatuses(state) {
      state.reconciliationStatuses2 = { added: false, updated: false, deleted: false }
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload
    },
    clearTripDetail(state) {
      state.tripDetail = null
    },
    clearEquipmentDetail(state) {
      state.equipmentDetail = null
      state.driverOptions = []
      state.equipmentSearchResults = []
    },
    updateReconciliationForm(state, action: PayloadAction<Partial<ReconciliationPayload>>) {
      if (state.reconciliationForm) {
        state.reconciliationForm = { ...state.reconciliationForm, ...action.payload }
      } else {
        state.reconciliationForm = { fuelOrderId: 0, ...action.payload } as ReconciliationPayload
      }
    },
    resetReconciliationForm(state, action: PayloadAction<ReconciliationPayload>) {
      state.reconciliationForm = action.payload
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchFuelOrdersList.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchFuelOrdersList.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload.data
        state.total = action.payload.total
        state.page = action.payload.page
      })
      .addCase(fetchFuelOrdersList.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    // Single
    builder
      .addCase(fetchFuelOrder.pending, (state) => {
        state.loadingCurrent = true
        state.errors = null
      })
      .addCase(fetchFuelOrder.fulfilled, (state, action) => {
        state.loadingCurrent = false
        state.current = action.payload
        if (action.payload.tripDetail) state.tripDetail = action.payload.tripDetail
        if (action.payload.gasStation) state.gasStationInfo = action.payload.gasStation
        if (action.payload.equipmentDetail) state.equipmentDetail = action.payload.equipmentDetail
        if (action.payload.driverOptions) state.driverOptions = action.payload.driverOptions
        if (action.payload.settings) state.settings = action.payload.settings
      })
      .addCase(fetchFuelOrder.rejected, (state, action) => {
        state.loadingCurrent = false
        state.errors = action.payload ?? action.error
      })

    // Create
    builder
      .addCase(addFuelOrder.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addFuelOrder.fulfilled, (state, action) => {
        state.saving = false
        state.current = action.payload
        state.statuses.added = true
      })
      .addCase(addFuelOrder.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    // Update
    builder
      .addCase(saveFuelOrder.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveFuelOrder.fulfilled, (state, action) => {
        state.saving = false
        state.current = action.payload
        state.statuses.updated = true
      })
      .addCase(saveFuelOrder.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    // Delete
    builder
      .addCase(deleteFuelOrder.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deleteFuelOrder.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter((x) => x.fuelOrderId !== action.payload)
        state.total = Math.max(0, state.total - 1)
        state.statuses.deleted = true
      })
      .addCase(deleteFuelOrder.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })

    // Status update
    builder.addCase(updateFuelOrderStatus.fulfilled, (state) => {
      state.statuses.updated = true
    })

    // Payment status
    builder.addCase(updatePaymentStatus.fulfilled, (state) => {
      state.statuses.updated = true
    })

    // Suggested fuel
    builder.addCase(calculateSuggestedFuel.fulfilled, (state, action) => {
      state.suggested = action.payload
    })

    // Trip detail
    builder.addCase(loadTripDetail.fulfilled, (state, action) => {
      state.tripDetail = action.payload
    })

    // Trip search
    builder.addCase(searchTrips.pending, (state) => {
      state.searchingTrips = true
    })
    builder.addCase(searchTrips.fulfilled, (state, action) => {
      state.tripSearchResults = action.payload
      state.searchingTrips = false
    })
    builder.addCase(searchTrips.rejected, (state) => {
      state.searchingTrips = false
    })

    // Settings
    builder.addCase(loadFuelSettings.fulfilled, (state, action: any) => {
      state.settings = action.payload
    })

    // Fuel limit
    builder.addCase(checkFuelLimit.fulfilled, (state, action: any) => {
      state.fuelLimitAssessment = action.payload
    })

    // Attribute items
    builder.addCase(loadFuelOrderAttributes.fulfilled, (state, action: any) => {
      const { field, items } = action.payload
      switch (field) {
        case 'orderType': state.orderTypes = items; break
        case 'fuelType': state.fuelTypesList = items; break
        case 'paymentMethod': state.paymentMethods = items; break
        case 'fuelRecipient': state.fuelRecipients = items; break
        case 'resourceCategory': state.resourceCategories = items; break
        case 'fuelOrderStatus': state.fuelOrderStatuses = items; break
        case 'reconciliationStatus': state.reconciliationStatuses = items; break
        case 'gasSupplierPaymentStatus': state.gasSupplierPaymentStatuses = items; break
        case 'subdivisionPaymentStatus': state.subdivisionPaymentStatuses = items; break
        case 'containerType': state.containerTypes = items; break
      }
    })

    // Gas stores
    builder.addCase(loadGasStores.fulfilled, (state, action: any) => {
      state.gasStores = action.payload ?? []
    })

    // Gas station info
    builder.addCase(loadGasStationInfo.fulfilled, (state, action: any) => {
      state.gasStationInfo = action.payload
    })

    // Equipment search
    builder.addCase(searchEquipment.pending, (state) => {
      state.searchingEquipment = true
    })
    builder.addCase(searchEquipment.fulfilled, (state, action: any) => {
      state.equipmentSearchResults = action.payload ?? []
      state.searchingEquipment = false
    })
    builder.addCase(searchEquipment.rejected, (state) => {
      state.searchingEquipment = false
    })

    // Combined equipment + drivers
    builder.addCase(loadEquipmentAndDrivers.fulfilled, (state, action: any) => {
      state.equipmentDetail = action.payload.equipmentDetail
      state.driverOptions = action.payload.driverOptions ?? []
      if (action.payload.formUpdates && state.current) {
        state.current = { ...state.current, ...action.payload.formUpdates }
      }
    })

    // Equipment detail (standalone)
    builder.addCase(loadEquipmentDetail.fulfilled, (state, action: any) => {
      state.equipmentDetail = action.payload
    })

    // Driver options (standalone)
    builder.addCase(loadDriverOptions.fulfilled, (state, action: any) => {
      state.driverOptions = action.payload ?? []
    })

    // Connected cities
    builder.addCase(loadConnectedCities.fulfilled, (state, action: any) => {
      state.connectedCities = action.payload ?? []
    })

    // Reconciliation
    builder
      .addCase(addReconciliation.fulfilled, (state) => {
        state.reconciliationStatuses2.added = true
      })
      .addCase(updateReconciliation.fulfilled, (state) => {
        state.reconciliationStatuses2.updated = true
      })
      .addCase(deleteReconciliation.pending, (state) => {
        // Optimistic delete: snapshot, then clear
        if (state.current) {
          state._fuelAuditorSnapshot = {
            fuelAuditor: (state.current as any).fuelAuditor ?? null,
            GasStationTransactions: (state.current as any).GasStationTransactions ?? [],
          }
          ;(state.current as any).fuelAuditor = null
          ;(state.current as any).GasStationTransactions = []
        }
      })
      .addCase(deleteReconciliation.fulfilled, (state) => {
        state.reconciliationStatuses2.deleted = true
        state._fuelAuditorSnapshot = null
      })
      .addCase(deleteReconciliation.rejected, (state) => {
        // Restore from snapshot on failure
        if (state._fuelAuditorSnapshot && state.current) {
          ;(state.current as any).fuelAuditor = state._fuelAuditorSnapshot.fuelAuditor
          ;(state.current as any).GasStationTransactions = state._fuelAuditorSnapshot.GasStationTransactions
        }
        state._fuelAuditorSnapshot = null
      })

    // Suggested fuel type 1
    builder.addCase(calculateSuggestedFuelForType1.fulfilled, (state, action: any) => {
      state.suggested = action.payload
    })

    // Mechanic search
    builder.addCase(searchMechanics.fulfilled, (state, action: any) => {
      state.mechanicOptions = action.payload ?? []
    })

    // Load default values from equipment
    builder.addCase(loadDefaultValuesFromEquipment.fulfilled, (state, action: any) => {
      const defaults = action.payload
      state.current = {
        ...fuelOrderDefault,
        equipmentId: defaults.equipmentId,
        equipmentType: defaults.equipmentType,
        orderType: defaults.orderType,
        fuelType: defaults.fuelType,
        typeContainer: defaults.typeContainer,
        resourceCategory: defaults.resourceCategory,
        subdivisionId: defaults.subdivisionId,
        suggested: defaults.suggested ?? 0,
      }
      if (!defaults.driverRequired) {
        state.current.responsibleId = null
      }
    })
  },
})

export const {
  loadDefaultFuelOrder,
  updateFuelOrderForm,
  resetStatuses,
  resetReconciliationStatuses,
  setPage,
  clearTripDetail,
  clearEquipmentDetail,
  updateReconciliationForm,
  resetReconciliationForm,
} = fuelOrderSlice.actions

export default fuelOrderSlice.reducer

// ─── Selectors ────────────────────────────────────────
export const selectFuelOrderList = (s: RootState) => s.fuelOrder.list
export const selectFuelOrderTotal = (s: RootState) => s.fuelOrder.total
export const selectFuelOrderPage = (s: RootState) => s.fuelOrder.page
export const selectFuelOrderCurrent = (s: RootState) => s.fuelOrder.current
export const selectFuelOrderErrors = (s: RootState) => s.fuelOrder.errors
export const selectFuelOrderStatuses = (s: RootState) => s.fuelOrder.statuses
export const selectFuelOrderSaving = (s: RootState) => s.fuelOrder.saving
export const selectFuelOrderLoadingList = (s: RootState) => s.fuelOrder.loadingList
export const selectFuelOrderLoadingCurrent = (s: RootState) => s.fuelOrder.loadingCurrent
export const selectFuelOrderOrderTypes = (s: RootState) => s.fuelOrder.orderTypes
export const selectFuelOrderFuelTypes = (s: RootState) => s.fuelOrder.fuelTypesList
export const selectFuelOrderPaymentMethods = (s: RootState) => s.fuelOrder.paymentMethods
export const selectFuelOrderGasStores = (s: RootState) => s.fuelOrder.gasStores
export const selectFuelOrderTripSearch = (s: RootState) => s.fuelOrder.tripSearchResults
export const selectFuelOrderSearchingTrips = (s: RootState) => s.fuelOrder.searchingTrips
export const selectFuelOrderTripDetail = (s: RootState) => s.fuelOrder.tripDetail
export const selectFuelOrderSettings = (s: RootState) => s.fuelOrder.settings
export const selectFuelOrderSuggested = (s: RootState) => s.fuelOrder.suggested
export const selectFuelOrderEquipmentDetail = (s: RootState) => s.fuelOrder.equipmentDetail
export const selectFuelOrderGasStationInfo = (s: RootState) => s.fuelOrder.gasStationInfo
export const selectFuelOrderDriverOptions = (s: RootState) => s.fuelOrder.driverOptions
export const selectFuelOrderEquipmentSearch = (s: RootState) => s.fuelOrder.equipmentSearchResults
export const selectFuelOrderSearchingEquipment = (s: RootState) => s.fuelOrder.searchingEquipment
export const selectFuelOrderConnectedCities = (s: RootState) => s.fuelOrder.connectedCities
export const selectFuelOrderResourceCategories = (s: RootState) => s.fuelOrder.resourceCategories
export const selectFuelOrderContainerTypes = (s: RootState) => s.fuelOrder.containerTypes
export const selectFuelOrderReconciliationStatuses = (s: RootState) => s.fuelOrder.reconciliationStatuses2
export const selectFuelOrderReconciliationStatusList = (s: RootState) => s.fuelOrder.reconciliationStatuses
export const selectFuelOrderFuelRecipients = (s: RootState) => s.fuelOrder.fuelRecipients
export const selectFuelOrderFuelOrderStatuses = (s: RootState) => s.fuelOrder.fuelOrderStatuses
export const selectFuelOrderGasSupplierPaymentStatuses = (s: RootState) => s.fuelOrder.gasSupplierPaymentStatuses
export const selectFuelOrderSubdivisionPaymentStatuses = (s: RootState) => s.fuelOrder.subdivisionPaymentStatuses
export const selectFuelOrderReconciliationForm = (s: RootState) => s.fuelOrder.reconciliationForm
export const selectFuelOrderMechanicOptions = (s: RootState) => s.fuelOrder.mechanicOptions
