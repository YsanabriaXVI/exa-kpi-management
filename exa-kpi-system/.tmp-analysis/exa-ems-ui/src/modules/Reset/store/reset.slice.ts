// src/modules/Reset/store/reset.slice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { resetApi } from '../api/reset.api'
import type { Reset, ResetListItem, ResetCurrentInfo } from '../types/reset.types'

interface ResetState {
  list: ResetListItem[]
  current: Reset | null
  loading: boolean
  saving: boolean
  error: string | null
}

const initialState: ResetState = {
  list: [],
  current: null,
  loading: false,
  saving: false,
  error: null,
}

export const fetchResets = createAsyncThunk(
  'reset/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await resetApi.getAll()
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message)
    }
  },
)

export const fetchResetById = createAsyncThunk(
  'reset/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await resetApi.getById(id)
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message)
    }
  },
)

export const fetchResetContext = createAsyncThunk(
  'reset/fetchContext',
  async (
    params: { plate: string; dateFrom: string; dateTo: string },
    { rejectWithValue },
  ) => {
    try {
      return await resetApi.getContext(params)
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message)
    }
  },
)

export const saveReset = createAsyncThunk(
  'reset/save',
  async (payload: Reset, { rejectWithValue }) => {
    try {
      return await resetApi.save(payload)
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message)
    }
  },
)

const resetSlice = createSlice({
  name: 'reset',
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null
      state.error = null
    },
    updateCurrentInfo(state, action: PayloadAction<ResetCurrentInfo>) {
      if (state.current) {
        state.current.currentInfo = action.payload
      }
    },
    toggleTripSelected(state, action: PayloadAction<number>) {
      if (state.current) {
        const trip = state.current.trips.find((t) => t.id === action.payload)
        if (trip) trip.selected = !trip.selected
      }
    },
    toggleAllTripsSelected(state, action: PayloadAction<boolean>) {
      if (state.current) {
        state.current.trips.forEach((t) => {
          t.selected = action.payload
        })
      }
    },
    deleteSelectedTrips(state) {
      if (state.current) {
        state.current.trips = state.current.trips.filter((t) => !t.selected)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResets.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchResets.fulfilled, (state, { payload }) => {
        state.loading = false
        state.list = payload
      })
      .addCase(fetchResets.rejected, (state, { payload }) => {
        state.loading = false
        state.error = payload as string
      })

      .addCase(fetchResetById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchResetById.fulfilled, (state, { payload }) => {
        state.loading = false
        state.current = payload
      })
      .addCase(fetchResetById.rejected, (state, { payload }) => {
        state.loading = false
        state.error = payload as string
      })

      .addCase(fetchResetContext.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchResetContext.fulfilled, (state, { payload }) => {
        state.loading = false
        state.current = payload
      })
      .addCase(fetchResetContext.rejected, (state, { payload }) => {
        state.loading = false
        state.error = payload as string
      })

      .addCase(saveReset.pending, (state) => {
        state.saving = true
        state.error = null
      })
      .addCase(saveReset.fulfilled, (state, { payload }) => {
        state.saving = false
        state.current = payload

        const idx = state.list.findIndex((x) => x.id === payload.id)
        const listItem: ResetListItem = {
          id: payload.id ?? 0,
          plate: payload.plate,
          equipmentType: payload.equipmentType,
          date: payload.dateTo,
          status: payload.status,
          kmsEcm: Number(payload.currentInfo.kmsEcm || 0),
          gallonsEcm: Number(payload.currentInfo.gallonsEcm || 0),
        }

        if (idx >= 0) state.list[idx] = listItem
        else state.list = [listItem, ...state.list]
      })
      .addCase(saveReset.rejected, (state, { payload }) => {
        state.saving = false
        state.error = payload as string
      })
  },
})

export const {
  clearCurrent,
  updateCurrentInfo,
  toggleTripSelected,
  toggleAllTripsSelected,
  deleteSelectedTrips,
} = resetSlice.actions

export default resetSlice.reducer