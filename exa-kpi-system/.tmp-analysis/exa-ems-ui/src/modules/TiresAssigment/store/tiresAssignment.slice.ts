// src/modules/TiresAssignment/store/tiresAssignment.slice.ts

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../store'
import { tiresAssignmentApi } from '../api/tiresAssignment.api'
import type {
  TiresAssignment,
  TiresAssignmentForm,
  TiresAssignmentErrors,
  TiresCatalogs,
} from '../types/tiresAssignment.types'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface TiresAssignmentState {
  list: TiresAssignment[]
  current: TiresAssignment | null
  catalogs: TiresCatalogs
  loading: boolean
  catalogsLoading: boolean
  saving: boolean
  errors: TiresAssignmentErrors | null
  statuses: StatusFlags
}

const emptyCatalogs: TiresCatalogs = {
  brands: [],
  tireTypes: [],
  assignedTo: [],
  positions: [],
  categories: [],
  statuses: [],
}

const initialState: TiresAssignmentState = {
  list: [],
  current: null,
  catalogs: emptyCatalogs,
  loading: false,
  catalogsLoading: false,
  saving: false,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
}

const getErrors = (err: any) =>
  err?.response?.data?.errors ??
  err?.response?.data?.message ??
  err?.data?.errors ??
  err?.message ??
  err

const getSerialNo = (item: Partial<TiresAssignment> | null | undefined): string => {
  if (!item) return ''
  return String(item.serialNo ?? item.seriesNumber ?? '')
    .trim()
    .toUpperCase()
}

export const fetchTiresAssignments = createAsyncThunk<
  TiresAssignment[],
  void,
  { rejectValue: TiresAssignmentErrors }
>('tiresAssignment/fetchList', async (_, thunkAPI) => {
  try {
    return await tiresAssignmentApi.fetchAssignments()
  } catch (err: any) {
    return thunkAPI.rejectWithValue(getErrors(err))
  }
})

export const fetchTiresAssignmentById = createAsyncThunk<
  TiresAssignment,
  string,
  { state: RootState; rejectValue: TiresAssignmentErrors }
>('tiresAssignment/fetchById', async (serialNo, thunkAPI) => {
  try {
    const normalizedSerialNo = String(serialNo ?? '')
      .trim()
      .toUpperCase()
    const state = thunkAPI.getState()

    const fromList = state.tiresAssignment?.list?.find(
      (item) => getSerialNo(item) === normalizedSerialNo,
    )

    if (fromList) return fromList

    return await tiresAssignmentApi.fetchAssignmentById(normalizedSerialNo)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(getErrors(err))
  }
})

// Alias temporal para no romper imports existentes
export const fetchTiresAssignmentByChassisId = fetchTiresAssignmentById

export const fetchTiresCatalogs = createAsyncThunk<
  TiresCatalogs,
  void,
  { rejectValue: TiresAssignmentErrors }
>('tiresAssignment/fetchCatalogs', async (_, thunkAPI) => {
  try {
    return await tiresAssignmentApi.fetchTiresCatalogs()
  } catch (err: any) {
    return thunkAPI.rejectWithValue(getErrors(err))
  }
})

export const addTiresAssignment = createAsyncThunk<
  TiresAssignment,
  TiresAssignmentForm,
  { rejectValue: TiresAssignmentErrors }
>('tiresAssignment/add', async (form, thunkAPI) => {
  try {
    return await tiresAssignmentApi.createAssignment(form)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(getErrors(err))
  }
})

export const updateTiresAssignment = createAsyncThunk<
  TiresAssignment,
  { serialNo: string; form: TiresAssignmentForm },
  { rejectValue: TiresAssignmentErrors }
>('tiresAssignment/update', async ({ serialNo, form }, thunkAPI) => {
  try {
    const normalizedSerialNo = String(serialNo ?? '')
      .trim()
      .toUpperCase()
    return await tiresAssignmentApi.updateAssignment(normalizedSerialNo, form)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(getErrors(err))
  }
})

export const deleteTiresAssignment = createAsyncThunk<
  string,
  string,
  { rejectValue: TiresAssignmentErrors }
>('tiresAssignment/delete', async (serialNo, thunkAPI) => {
  try {
    const normalizedSerialNo = String(serialNo ?? '')
      .trim()
      .toUpperCase()
    await tiresAssignmentApi.deleteAssignment(normalizedSerialNo)
    return normalizedSerialNo
  } catch (err: any) {
    return thunkAPI.rejectWithValue(getErrors(err))
  }
})

const tiresAssignmentSlice = createSlice({
  name: 'tiresAssignment',
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null
      state.errors = null
    },
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
    setCurrent(state, action: PayloadAction<TiresAssignment | null>) {
      state.current = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTiresAssignments.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(fetchTiresAssignments.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchTiresAssignments.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload ?? action.error
      })

      .addCase(fetchTiresAssignmentById.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(fetchTiresAssignmentById.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
      })
      .addCase(fetchTiresAssignmentById.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload ?? action.error
      })

      .addCase(fetchTiresCatalogs.pending, (state) => {
        state.catalogsLoading = true
        state.errors = null
      })
      .addCase(fetchTiresCatalogs.fulfilled, (state, action) => {
        state.catalogsLoading = false
        state.catalogs = action.payload
      })
      .addCase(fetchTiresCatalogs.rejected, (state, action) => {
        state.catalogsLoading = false
        state.errors = action.payload ?? action.error
      })

      .addCase(addTiresAssignment.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addTiresAssignment.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.added = true

        const serialNo = getSerialNo(action.payload)
        const exists = state.list.some((item) => getSerialNo(item) === serialNo)

        state.list = exists
          ? state.list.map((item) => (getSerialNo(item) === serialNo ? action.payload : item))
          : [action.payload, ...state.list]

        state.current = action.payload
      })
      .addCase(addTiresAssignment.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

      .addCase(updateTiresAssignment.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(updateTiresAssignment.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.updated = true

        const serialNo = getSerialNo(action.payload)
        const idx = state.list.findIndex((item) => getSerialNo(item) === serialNo)

        if (idx >= 0) state.list[idx] = action.payload
        else state.list = [action.payload, ...state.list]

        state.current = action.payload
      })
      .addCase(updateTiresAssignment.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

      .addCase(deleteTiresAssignment.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(deleteTiresAssignment.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.deleted = true

        const serialNo = String(action.payload ?? '')
          .trim()
          .toUpperCase()
        state.list = state.list.filter((item) => getSerialNo(item) !== serialNo)

        if (getSerialNo(state.current) === serialNo) {
          state.current = null
        }
      })
      .addCase(deleteTiresAssignment.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const { clearCurrent, resetStatuses, setCurrent } = tiresAssignmentSlice.actions

export default tiresAssignmentSlice.reducer

export const selectTiresAssignments = (state: RootState) => state.tiresAssignment.list
export const selectTiresAssignmentCurrent = (state: RootState) => state.tiresAssignment.current
export const selectTiresAssignmentCatalogs = (state: RootState) => state.tiresAssignment.catalogs
export const selectTiresAssignmentCatalogsLoading = (state: RootState) =>
  state.tiresAssignment.catalogsLoading
export const selectTiresAssignmentLoading = (state: RootState) => state.tiresAssignment.loading
export const selectTiresAssignmentSaving = (state: RootState) => state.tiresAssignment.saving
export const selectTiresAssignmentErrors = (state: RootState) => state.tiresAssignment.errors
export const selectTiresAssignmentStatuses = (state: RootState) => state.tiresAssignment.statuses
