// src/modules/Depots/store/depots.slice.ts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../../../store'
import type { Depot } from './depots.types'
import { depotsAPI } from '../api/depots.api'

type Statuses = { added: boolean; updated: boolean; deleted: boolean }

type DepotsState = {
  list: Depot[]
  loading: boolean
  saving: boolean
  errors: any
  statuses: Statuses
  current: Depot | null
}

const initialState: DepotsState = {
  list: [],
  loading: false,
  saving: false,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  current: null,
}

export const fetchDepots = createAsyncThunk('depots/fetchList', async (_, thunkApi) => {
  try {
    return await depotsAPI.getDepots()
  } catch (e: any) {
    return thunkApi.rejectWithValue(e?.data?.errors ?? e?.message ?? 'Failed to load depots')
  }
})

export const addDepot = createAsyncThunk(
  'depots/add',
  async (
    payload: { locationId: number; depotName: string; depotCode: string; active: number; status: number },
    thunkApi,
  ) => {
    try {
      return await depotsAPI.createDepot(payload)
    } catch (e: any) {
      return thunkApi.rejectWithValue(e?.data?.errors ?? e?.message ?? 'Failed to create depot')
    }
  },
)

export const saveDepot = createAsyncThunk(
  'depots/save',
  async (
    payload: { depotId: number; locationId: number; depotName: string; depotCode: string; active: number; status: number },
    thunkApi,
  ) => {
    try {
      const { depotId, ...body } = payload
      return await depotsAPI.updateDepot(depotId, body)
    } catch (e: any) {
      return thunkApi.rejectWithValue(e?.data?.errors ?? e?.message ?? 'Failed to update depot')
    }
  },
)

export const deleteDepot = createAsyncThunk('depots/delete', async (id: number, thunkApi) => {
  try {
    await depotsAPI.deleteDepot(id)
    return id
  } catch (e: any) {
    return thunkApi.rejectWithValue(e?.data?.errors ?? e?.message ?? 'Failed to delete depot')
  }
})

const depotsSlice = createSlice({
  name: 'depots',
  initialState,
  reducers: {
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
    },
    loadDepotFromList(state, action: { payload: number }) {
      const id = action.payload
      state.current = state.list.find((x) => x.depotId === id) ?? null
    },
    loadDefaultDepot(state) {
      state.current = { depotId: 0, depotName: '', depotCode: '', status: 1 }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepots.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(fetchDepots.fulfilled, (state, action) => {
        state.loading = false
        state.list = [...action.payload].sort((a, b) => b.depotId - a.depotId)
      })
      .addCase(fetchDepots.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload ?? action.error
      })

      .addCase(addDepot.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addDepot.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.added = true
        state.list.unshift(action.payload)
        state.current = action.payload
      })
      .addCase(addDepot.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

      .addCase(saveDepot.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveDepot.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.updated = true
        const idx = state.list.findIndex((x) => x.depotId === action.payload.depotId)
        if (idx >= 0) state.list[idx] = action.payload
        state.current = action.payload
      })
      .addCase(saveDepot.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

      .addCase(deleteDepot.fulfilled, (state, action) => {
        state.statuses.deleted = true
        state.list = state.list.filter((x) => x.depotId !== action.payload)
      })
      .addCase(deleteDepot.rejected, (state, action) => {
        state.errors = action.payload ?? action.error
      })
  },
})

export const { resetStatuses, loadDepotFromList, loadDefaultDepot } = depotsSlice.actions
export default depotsSlice.reducer

export const selectDepotsList = (s: RootState) => (s as any).depots.list as Depot[]
export const selectDepotsErrors = (s: RootState) => (s as any).depots.errors
export const selectDepotsStatuses = (s: RootState) => (s as any).depots.statuses
export const selectDepotsLoading = (s: RootState) => (s as any).depots.loading
export const selectDepotsSaving = (s: RootState) => (s as any).depots.saving
export const selectDepotsCurrent = (s: RootState) => (s as any).depots.current
