// src/modules/RepairStatus/store/repairStatus.slice.ts

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../store'
import type {
  RepairStatus,
  RepairStatusState,
} from '../types/repairStatus.types'

import {
  fetchRepairStatusesApi,
  createRepairStatusApi,
  updateRepairStatusApi,
  deleteRepairStatusApi,
} from '../api/repairStatus.api'

export const fetchRepairStatuses = createAsyncThunk<
  RepairStatus[],
  void,
  { rejectValue: unknown }
>('repairStatus/fetchList', async (_, { rejectWithValue }) => {
  try {
    return await fetchRepairStatusesApi()
  } catch (err: any) {
    return rejectWithValue(err?.response?.data || err)
  }
})

export const addRepairStatus = createAsyncThunk<
  RepairStatus,
  RepairStatus,
  { rejectValue: unknown }
>('repairStatus/add', async (payload, { rejectWithValue }) => {
  try {
    return await createRepairStatusApi(payload)
  } catch (err: any) {
    return rejectWithValue(err?.response?.data || err)
  }
})

export const saveRepairStatus = createAsyncThunk<
  RepairStatus,
  RepairStatus,
  { rejectValue: unknown }
>('repairStatus/save', async (payload, { rejectWithValue }) => {
  try {
    return await updateRepairStatusApi(payload)
  } catch (err: any) {
    return rejectWithValue(err?.response?.data || err)
  }
})

export const deleteRepairStatus = createAsyncThunk<
  number,
  number,
  { rejectValue: unknown }
>('repairStatus/delete', async (repairStatusId, { rejectWithValue }) => {
  try {
    await deleteRepairStatusApi(repairStatusId)
    return repairStatusId
  } catch (err: any) {
    return rejectWithValue(err?.response?.data || err)
  }
})

const initialState: RepairStatusState = {
  list: [],
  current: null,
  loading: false,
  errors: null,
  statuses: {
    added: false,
    updated: false,
    deleted: false,
  },
}

const repairStatusSlice = createSlice({
  name: 'repairStatus',
  initialState,
  reducers: {
    resetStatuses(state) {
      state.statuses = {
        added: false,
        updated: false,
        deleted: false,
      }
    },
    loadDefaultRepairStatus(state) {
      state.current = {
        ISOCode: '',
        description: '',
      }
    },
    loadRepairStatusFromList(state, action: PayloadAction<number>) {
      const found = state.list.find(
        (x) => x.repairStatusId === action.payload,
      )
      state.current = found ?? null
    },
    clearCurrent(state) {
      state.current = null
    },
  },
  extraReducers: (builder) => {

    builder
      .addCase(fetchRepairStatuses.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(fetchRepairStatuses.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchRepairStatuses.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload
      })

    builder
      .addCase(addRepairStatus.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(addRepairStatus.fulfilled, (state, action) => {
        state.loading = false
        state.list.unshift(action.payload)
        state.current = action.payload
        state.statuses.added = true
      })
      .addCase(addRepairStatus.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload
      })

    builder
      .addCase(saveRepairStatus.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(saveRepairStatus.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.list.findIndex(
          (x) => x.repairStatusId === action.payload.repairStatusId,
        )
        if (idx !== -1) {
          state.list[idx] = action.payload
        }
        state.current = action.payload
        state.statuses.updated = true
      })
      .addCase(saveRepairStatus.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload
      })

    builder
      .addCase(deleteRepairStatus.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(deleteRepairStatus.fulfilled, (state, action) => {
        state.loading = false
        state.list = state.list.filter(
          (x) => x.repairStatusId !== action.payload,
        )
        state.statuses.deleted = true
      })
      .addCase(deleteRepairStatus.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload
      })
  },
})

export const {
  resetStatuses,
  loadDefaultRepairStatus,
  loadRepairStatusFromList,
  clearCurrent,
} = repairStatusSlice.actions

export default repairStatusSlice.reducer

export const selectRepairStatusList = (state: RootState) =>
  state.repairStatus.list

export const selectRepairStatusCurrent = (state: RootState) =>
  state.repairStatus.current

export const selectRepairStatusLoading = (state: RootState) =>
  state.repairStatus.loading

export const selectRepairStatusErrors = (state: RootState) =>
  state.repairStatus.errors

export const selectRepairStatusStatuses = (state: RootState) =>
  state.repairStatus.statuses
