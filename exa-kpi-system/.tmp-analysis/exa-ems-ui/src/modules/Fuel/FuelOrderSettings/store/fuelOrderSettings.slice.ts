import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type {
  FuelOrderSettings,
  FuelOrderSettingsForm,
  FuelOrderSettingsErrors,
  PlateOption,
  SubdivisionUser,
  AttributeItem,
} from '../types/fuelOrderSettings.types'
import { fuelOrderSettingsApi } from '../api/fuelOrderSettings.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface FuelOrderSettingsState {
  list: FuelOrderSettings[]
  current: FuelOrderSettingsForm | null
  errors: FuelOrderSettingsErrors
  statuses: StatusFlags
  loadingList: boolean
  loadingCurrent: boolean
  saving: boolean
  deleting: boolean
  platesList: PlateOption[]
  subdivisionUsers: SubdivisionUser[]
  workTypes: AttributeItem[]
  assetTypes: AttributeItem[]
  fuelOrderTypes: AttributeItem[]
  periods: AttributeItem[]
  timeSlots: AttributeItem[]
}

const settingsDefault: FuelOrderSettingsForm = {
  name: '',
  company_id: null,
  subdivisions: [],
  workTypes: [],
  assetTypes: [],
  clients: [],
  fuelOrderTypeId: null,
  ratebuilderId: null,
  tripRequired: 0,
  approvalRequired: 0,
  suggestedAmountRequired: 0,
  expTimeBefore: 0,
  expTimeAfter: 0,
  minimumApprove: 0,
  maximumApprove: 0,
  fuelLimitRules: [],
  fuelVariationMin: 0,
  fuelVariationMax: 0,
  fuelSupplyVariationMin: 0,
  fuelSupplyVariationMax: 0,
  fuelStatementRequired: 1,
  supplierStatementRequired: 1,
  maxFuelFeature: 0,
  approvers: [],
}

const initialState: FuelOrderSettingsState = {
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

export const fetchFuelOrderSettingsList = createAsyncThunk<
  FuelOrderSettings[],
  void,
  { rejectValue: FuelOrderSettingsErrors }
>('fuelOrderSettings/fetchList', async (_arg, thunkAPI) => {
  try {
    return await fuelOrderSettingsApi.fetchList()
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data?.errors ?? err.message)
  }
})

export const fetchFuelOrderSettings = createAsyncThunk<
  FuelOrderSettings,
  number,
  { rejectValue: FuelOrderSettingsErrors }
>('fuelOrderSettings/fetchById', async (id, thunkAPI) => {
  try {
    return await fuelOrderSettingsApi.fetchById(id)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data?.errors ?? err.message)
  }
})

export const addFuelOrderSettings = createAsyncThunk<
  FuelOrderSettings,
  FuelOrderSettingsForm,
  { rejectValue: FuelOrderSettingsErrors }
>('fuelOrderSettings/add', async (form, thunkAPI) => {
  try {
    return await fuelOrderSettingsApi.create(form)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data?.errors ?? err.message)
  }
})

export const saveFuelOrderSettings = createAsyncThunk<
  FuelOrderSettings,
  FuelOrderSettingsForm,
  { rejectValue: FuelOrderSettingsErrors }
>('fuelOrderSettings/save', async (form, thunkAPI) => {
  try {
    return await fuelOrderSettingsApi.update(form)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data?.errors ?? err.message)
  }
})

export const deleteFuelOrderSettings = createAsyncThunk<
  number,
  number,
  { state: RootState; rejectValue: FuelOrderSettingsErrors }
>('fuelOrderSettings/delete', async (id, thunkAPI) => {
  try {
    await fuelOrderSettingsApi.remove(id)
    return id
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data?.errors ?? err.message)
  }
})

export const loadPlatesList = createAsyncThunk(
  'fuelOrderSettings/loadPlates',
  async (payload: { subdivisionIds: number[]; assetTypeIds: number[] }, thunkAPI) => {
    try {
      return await fuelOrderSettingsApi.loadPlatesList(payload)
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

export const loadSubdivisionUsers = createAsyncThunk(
  'fuelOrderSettings/loadSubdivisionUsers',
  async (payload: { subdivisionIds: number[] }, thunkAPI) => {
    try {
      return await fuelOrderSettingsApi.loadSubdivisionUsers(payload)
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

export const loadAttributeItems = createAsyncThunk(
  'fuelOrderSettings/loadAttributeItems',
  async (
    payload: { attributeFlatNameId: string; moduleFlatNameId: string; targetField: string },
    thunkAPI,
  ) => {
    try {
      const items = await fuelOrderSettingsApi.loadAttributeItems(
        payload.attributeFlatNameId,
        payload.moduleFlatNameId,
      )
      return { field: payload.targetField, items }
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

const fuelOrderSettingsSlice = createSlice({
  name: 'fuelOrderSettings',
  initialState,
  reducers: {
    loadDefaultSettings(state, action: PayloadAction<FuelOrderSettingsForm | undefined>) {
      state.current = { ...settingsDefault, ...(action.payload || {}) }
      state.errors = null
    },
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFuelOrderSettingsList.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchFuelOrderSettingsList.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload
      })
      .addCase(fetchFuelOrderSettingsList.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(fetchFuelOrderSettings.pending, (state) => {
        state.loadingCurrent = true
        state.errors = null
      })
      .addCase(fetchFuelOrderSettings.fulfilled, (state, action) => {
        state.loadingCurrent = false
        state.current = action.payload
      })
      .addCase(fetchFuelOrderSettings.rejected, (state, action) => {
        state.loadingCurrent = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(addFuelOrderSettings.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addFuelOrderSettings.fulfilled, (state, action) => {
        state.saving = false
        state.list.unshift(action.payload)
        state.current = action.payload
        state.statuses.added = true
      })
      .addCase(addFuelOrderSettings.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(saveFuelOrderSettings.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveFuelOrderSettings.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.list.findIndex(
          (x) => x.fuelModuleConfigId === action.payload.fuelModuleConfigId,
        )
        if (idx >= 0) state.list.splice(idx, 1, action.payload)
        state.current = action.payload
        state.statuses.updated = true
      })
      .addCase(saveFuelOrderSettings.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(deleteFuelOrderSettings.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deleteFuelOrderSettings.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter(
          (x) => x.fuelModuleConfigId !== action.payload,
        )
        state.statuses.deleted = true
      })
      .addCase(deleteFuelOrderSettings.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(loadPlatesList.fulfilled, (state, action: any) => {
        state.platesList = action.payload ?? []
      })
      .addCase(loadSubdivisionUsers.fulfilled, (state, action: any) => {
        state.subdivisionUsers = action.payload ?? []
      })
      .addCase(loadAttributeItems.fulfilled, (state, action: any) => {
        const { field, items } = action.payload
        if (field === 'workType') state.workTypes = items
        else if (field === 'assetType') state.assetTypes = items
        else if (field === 'fuelOrderType') state.fuelOrderTypes = items
        else if (field === 'period') state.periods = items
        else if (field === 'timeSlot') state.timeSlots = items
      })
  },
})

export const { loadDefaultSettings, resetStatuses } =
  fuelOrderSettingsSlice.actions

export default fuelOrderSettingsSlice.reducer

export const selectFuelOrderSettingsList = (s: RootState) => s.fuelOrderSettings.list
export const selectFuelOrderSettingsCurrent = (s: RootState) => s.fuelOrderSettings.current
export const selectFuelOrderSettingsErrors = (s: RootState) => s.fuelOrderSettings.errors
export const selectFuelOrderSettingsStatuses = (s: RootState) => s.fuelOrderSettings.statuses
export const selectFuelOrderSettingsSaving = (s: RootState) => s.fuelOrderSettings.saving
export const selectFuelOrderSettingsLoadingList = (s: RootState) => s.fuelOrderSettings.loadingList
export const selectFuelOrderSettingsLoadingCurrent = (s: RootState) => s.fuelOrderSettings.loadingCurrent
export const selectPlatesList = (s: RootState) => s.fuelOrderSettings.platesList
export const selectSubdivisionUsers = (s: RootState) => s.fuelOrderSettings.subdivisionUsers
export const selectWorkTypes = (s: RootState) => s.fuelOrderSettings.workTypes
export const selectAssetTypes = (s: RootState) => s.fuelOrderSettings.assetTypes
export const selectFuelOrderTypes = (s: RootState) => s.fuelOrderSettings.fuelOrderTypes
export const selectPeriods = (s: RootState) => s.fuelOrderSettings.periods
