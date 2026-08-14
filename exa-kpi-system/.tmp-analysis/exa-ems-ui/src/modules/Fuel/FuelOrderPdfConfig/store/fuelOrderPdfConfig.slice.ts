import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type { FuelOrderPdfConfig, FuelOrderPdfConfigForm, FuelOrderPdfConfigErrors } from '../types/fuelOrderPdfConfig.types'
import { fuelOrderPdfConfigApi } from '../api/fuelOrderPdfConfig.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface FuelOrderPdfConfigState {
  list: FuelOrderPdfConfig[]
  current: FuelOrderPdfConfigForm | null
  errors: FuelOrderPdfConfigErrors
  statuses: StatusFlags
  loadingList: boolean
  saving: boolean
  deleting: boolean
}

const defaultForm: FuelOrderPdfConfigForm = {
  configName: '',
}

const initialState: FuelOrderPdfConfigState = {
  list: [],
  current: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  saving: false,
  deleting: false,
}

export const fetchPdfConfigs = createAsyncThunk<
  FuelOrderPdfConfig[],
  void,
  { rejectValue: FuelOrderPdfConfigErrors }
>('fuelOrderPdfConfig/fetchList', async (_arg, thunkAPI) => {
  try {
    return await fuelOrderPdfConfigApi.fetchList()
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data?.errors ?? err?.data?.errors ?? err.message)
  }
})

export const addPdfConfig = createAsyncThunk<
  FuelOrderPdfConfig,
  FuelOrderPdfConfigForm,
  { rejectValue: FuelOrderPdfConfigErrors }
>('fuelOrderPdfConfig/add', async (form, thunkAPI) => {
  try {
    return await fuelOrderPdfConfigApi.create(form)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data?.errors ?? err?.data?.errors ?? err.message)
  }
})

export const savePdfConfig = createAsyncThunk<
  FuelOrderPdfConfig,
  FuelOrderPdfConfigForm,
  { rejectValue: FuelOrderPdfConfigErrors }
>('fuelOrderPdfConfig/save', async (form, thunkAPI) => {
  try {
    return await fuelOrderPdfConfigApi.update(form)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data?.errors ?? err?.data?.errors ?? err.message)
  }
})

export const deletePdfConfig = createAsyncThunk<
  number,
  number,
  { state: RootState; rejectValue: FuelOrderPdfConfigErrors }
>('fuelOrderPdfConfig/delete', async (id, thunkAPI) => {
  try {
    await fuelOrderPdfConfigApi.remove(id)
    return id
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data?.errors ?? err?.data?.errors ?? err.message)
  }
})

const fuelOrderPdfConfigSlice = createSlice({
  name: 'fuelOrderPdfConfig',
  initialState,
  reducers: {
    loadDefaultPdfConfig(state, action: PayloadAction<FuelOrderPdfConfigForm | undefined>) {
      state.current = { ...defaultForm, ...(action.payload || {}) }
      state.errors = null
    },
    loadPdfConfigFromList(state, action: PayloadAction<number>) {
      const found = state.list.find((r) => r.id === action.payload)
      state.current = found ? { ...found } : null
      state.errors = null
    },
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPdfConfigs.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchPdfConfigs.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload
      })
      .addCase(fetchPdfConfigs.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(addPdfConfig.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addPdfConfig.fulfilled, (state, action) => {
        state.saving = false
        state.list.unshift(action.payload)
        state.current = action.payload
        state.statuses.added = true
      })
      .addCase(addPdfConfig.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(savePdfConfig.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(savePdfConfig.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.list.findIndex((x) => x.id === action.payload.id)
        if (idx >= 0) state.list.splice(idx, 1, action.payload)
        state.current = action.payload
        state.statuses.updated = true
      })
      .addCase(savePdfConfig.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(deletePdfConfig.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deletePdfConfig.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter((x) => x.id !== action.payload)
        state.statuses.deleted = true
      })
      .addCase(deletePdfConfig.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const { loadDefaultPdfConfig, loadPdfConfigFromList, resetStatuses } =
  fuelOrderPdfConfigSlice.actions

export default fuelOrderPdfConfigSlice.reducer

export const selectPdfConfigList = (s: RootState) => s.fuelOrderPdfConfig.list
export const selectPdfConfig = (s: RootState) => s.fuelOrderPdfConfig.current
export const selectPdfConfigErrors = (s: RootState) => s.fuelOrderPdfConfig.errors
export const selectPdfConfigStatuses = (s: RootState) => s.fuelOrderPdfConfig.statuses
export const selectPdfConfigSaving = (s: RootState) => s.fuelOrderPdfConfig.saving
export const selectPdfConfigLoadingList = (s: RootState) => s.fuelOrderPdfConfig.loadingList
