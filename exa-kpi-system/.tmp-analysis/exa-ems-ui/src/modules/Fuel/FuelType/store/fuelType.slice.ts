import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type { FuelType, FuelTypeForm, FuelTypeErrors } from '../types/fuelType.types'
import { fuelTypesApi } from '../api/fuelType.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface FuelTypeState {
  list: FuelType[]
  fuelType: FuelTypeForm | null
  errors: FuelTypeErrors
  statuses: StatusFlags
  loadingList: boolean
  saving: boolean
  deleting: boolean
}

const fuelTypeDefault: FuelTypeForm = {
  name: '',
}

const initialState: FuelTypeState = {
  list: [],
  fuelType: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  saving: false,
  deleting: false,
}

export const fetchFuelTypes = createAsyncThunk<
  FuelType[],
  void,
  { rejectValue: FuelTypeErrors }
>('fuelType/fetchList', async (_arg, thunkAPI) => {
  try {
    return await fuelTypesApi.fetchFuelTypes()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const addFuelType = createAsyncThunk<
  FuelType,
  FuelTypeForm,
  { rejectValue: FuelTypeErrors }
>('fuelType/add', async (form, thunkAPI) => {
  try {
    return await fuelTypesApi.createFuelType(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const saveFuelType = createAsyncThunk<
  FuelType,
  FuelTypeForm,
  { rejectValue: FuelTypeErrors }
>('fuelType/save', async (form, thunkAPI) => {
  try {
    return await fuelTypesApi.updateFuelType(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const deleteFuelType = createAsyncThunk<
  number,
  number,
  { state: RootState; rejectValue: FuelTypeErrors }
>('fuelType/delete', async (id, thunkAPI) => {
  try {
    await fuelTypesApi.deleteFuelType(id)
    return id
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

const fuelTypeSlice = createSlice({
  name: 'fuelType',
  initialState,
  reducers: {
    loadDefaultFuelType(state, action: PayloadAction<FuelTypeForm | undefined>) {
      state.fuelType = { ...fuelTypeDefault, ...(action.payload || {}) }
      state.errors = null
    },
    loadFuelTypeFromList(state, action: PayloadAction<number>) {
      const id = action.payload
      const found = state.list.find((r) => r.fuelTypeId === id)
      state.fuelType = found ? { ...found } : null
      state.errors = null
    },
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFuelTypes.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchFuelTypes.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload
      })
      .addCase(fetchFuelTypes.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(addFuelType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addFuelType.fulfilled, (state, action) => {
        state.saving = false
        state.list.unshift(action.payload)
        state.fuelType = action.payload
        state.statuses.added = true
      })
      .addCase(addFuelType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(saveFuelType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveFuelType.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.list.findIndex(
          (x) => x.fuelTypeId === action.payload.fuelTypeId,
        )
        if (idx >= 0) state.list.splice(idx, 1, action.payload)
        state.fuelType = action.payload
        state.statuses.updated = true
      })
      .addCase(saveFuelType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(deleteFuelType.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deleteFuelType.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter((x) => x.fuelTypeId !== action.payload)
        state.statuses.deleted = true
      })
      .addCase(deleteFuelType.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const { loadDefaultFuelType, loadFuelTypeFromList, resetStatuses } =
  fuelTypeSlice.actions

export default fuelTypeSlice.reducer

export const selectFuelTypeList = (s: RootState) => s.fuelTypes.list
export const selectFuelType = (s: RootState) => s.fuelTypes.fuelType
export const selectFuelTypeErrors = (s: RootState) => s.fuelTypes.errors
export const selectFuelTypeStatuses = (s: RootState) => s.fuelTypes.statuses
export const selectFuelTypeSaving = (s: RootState) => s.fuelTypes.saving
export const selectFuelTypeLoadingList = (s: RootState) => s.fuelTypes.loadingList
