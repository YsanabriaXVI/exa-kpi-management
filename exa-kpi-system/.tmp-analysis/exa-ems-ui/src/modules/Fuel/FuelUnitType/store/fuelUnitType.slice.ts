import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type { FuelUnitType, FuelUnitTypeForm, FuelUnitTypeErrors } from '../types/fuelUnitType.types'
import { fuelUnitTypesApi } from '../api/fuelUnitType.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface FuelUnitTypeState {
  list: FuelUnitType[]
  fuelUnitType: FuelUnitTypeForm | null
  errors: FuelUnitTypeErrors
  statuses: StatusFlags
  loadingList: boolean
  saving: boolean
  deleting: boolean
}

const fuelUnitTypeDefault: FuelUnitTypeForm = {
  name: '',
}

const initialState: FuelUnitTypeState = {
  list: [],
  fuelUnitType: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  saving: false,
  deleting: false,
}

export const fetchFuelUnitTypes = createAsyncThunk<
  FuelUnitType[],
  void,
  { rejectValue: FuelUnitTypeErrors }
>('fuelUnitType/fetchList', async (_arg, thunkAPI) => {
  try {
    return await fuelUnitTypesApi.fetchFuelUnitTypes()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const addFuelUnitType = createAsyncThunk<
  FuelUnitType,
  FuelUnitTypeForm,
  { rejectValue: FuelUnitTypeErrors }
>('fuelUnitType/add', async (form, thunkAPI) => {
  try {
    return await fuelUnitTypesApi.createFuelUnitType(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const saveFuelUnitType = createAsyncThunk<
  FuelUnitType,
  FuelUnitTypeForm,
  { rejectValue: FuelUnitTypeErrors }
>('fuelUnitType/save', async (form, thunkAPI) => {
  try {
    return await fuelUnitTypesApi.updateFuelUnitType(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const deleteFuelUnitType = createAsyncThunk<
  number,
  number,
  { state: RootState; rejectValue: FuelUnitTypeErrors }
>('fuelUnitType/delete', async (id, thunkAPI) => {
  try {
    await fuelUnitTypesApi.deleteFuelUnitType(id)
    return id
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

const fuelUnitTypeSlice = createSlice({
  name: 'fuelUnitTypes',
  initialState,
  reducers: {
    loadDefaultFuelUnitType(state, action: PayloadAction<FuelUnitTypeForm | undefined>) {
      state.fuelUnitType = { ...fuelUnitTypeDefault, ...(action.payload || {}) }
      state.errors = null
    },
    loadFuelUnitTypeFromList(state, action: PayloadAction<number>) {
      const id = action.payload
      const found = state.list.find((r) => r.unitTypeId === id)
      state.fuelUnitType = found ? { ...found } : null
      state.errors = null
    },
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFuelUnitTypes.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchFuelUnitTypes.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload
      })
      .addCase(fetchFuelUnitTypes.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(addFuelUnitType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addFuelUnitType.fulfilled, (state, action) => {
        state.saving = false
        state.list.unshift(action.payload)
        state.fuelUnitType = action.payload
        state.statuses.added = true
      })
      .addCase(addFuelUnitType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(saveFuelUnitType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveFuelUnitType.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.list.findIndex(
          (x) => x.unitTypeId === action.payload.unitTypeId,
        )
        if (idx >= 0) state.list.splice(idx, 1, action.payload)
        state.fuelUnitType = action.payload
        state.statuses.updated = true
      })
      .addCase(saveFuelUnitType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(deleteFuelUnitType.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deleteFuelUnitType.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter((x) => x.unitTypeId !== action.payload)
        state.statuses.deleted = true
      })
      .addCase(deleteFuelUnitType.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const { loadDefaultFuelUnitType, loadFuelUnitTypeFromList, resetStatuses } =
  fuelUnitTypeSlice.actions

export default fuelUnitTypeSlice.reducer

export const selectFuelUnitTypeList = (s: RootState) => s.fuelUnitTypes.list
export const selectFuelUnitType = (s: RootState) => s.fuelUnitTypes.fuelUnitType
export const selectFuelUnitTypeErrors = (s: RootState) => s.fuelUnitTypes.errors
export const selectFuelUnitTypeStatuses = (s: RootState) => s.fuelUnitTypes.statuses
export const selectFuelUnitTypeSaving = (s: RootState) => s.fuelUnitTypes.saving
export const selectFuelUnitTypeLoadingList = (s: RootState) => s.fuelUnitTypes.loadingList
