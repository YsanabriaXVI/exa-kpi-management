import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { tripsAPI } from '../api/trips.api'
import type {
  TripListItem,
  TripDetails,
  TripListParams,
  TripAuditorListParams,
  TripAuditorRow,
} from '../types'

interface TripsState {
  list: TripListItem[]
  total: number
  isLoading: boolean
  errors: string | null
  currentTrip: TripDetails | null
  isSaving: boolean
  auditorList: TripAuditorRow[]
  auditorTotal: number
  auditorOffset: number
  isAuditorLoading: boolean
  auditorErrors: string | null
}

const initialState: TripsState = {
  list: [],
  total: 0,
  isLoading: false,
  errors: null,
  currentTrip: null,
  isSaving: false,
  auditorList: [],
  auditorTotal: 0,
  auditorOffset: 0,
  isAuditorLoading: false,
  auditorErrors: null,
}

export const loadTripsList = createAsyncThunk(
  'trips/loadList',
  async (params: TripListParams, { rejectWithValue }) => {
    try {
      return await tripsAPI.getTripsList(params)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load trips')
    }
  }
)

export const loadTrip = createAsyncThunk(
  'trips/loadTrip',
  async ({ id, isAudit = false }: { id: number; isAudit?: boolean }, { rejectWithValue }) => {
    try {
      return await tripsAPI.getTrip(id, isAudit)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load trip')
    }
  }
)

export const saveTrip = createAsyncThunk(
  'trips/saveTrip',
  async (
    { id, trip, isAudit = false }: { id: number; trip: TripDetails; isAudit?: boolean },
    { rejectWithValue }
  ) => {
    try {
      return await tripsAPI.updateTrip(id, trip, isAudit)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save trip')
    }
  }
)

export const deleteTrip = createAsyncThunk(
  'trips/deleteTrip',
  async (id: number, { rejectWithValue }) => {
    try {
      await tripsAPI.deleteTrip(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete trip')
    }
  }
)

export const loadTripAuditorList = createAsyncThunk(
  'trips/loadTripAuditorList',
  async (params: TripAuditorListParams, { rejectWithValue }) => {
    try {
      return await tripsAPI.getTripAuditorList(params)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load trip auditor list')
    }
  }
)

export const updateTripStatementStatus = createAsyncThunk(
  'trips/updateTripStatementStatus',
  async (
    { id, payload }: { id: number; payload: Record<string, any> },
    { rejectWithValue }
  ) => {
    try {
      return await tripsAPI.updateStatementStatus(id, payload)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update status')
    }
  }
)

export const loadTripRates = createAsyncThunk(
  'trips/loadTripRates',
  async ({ tripId, inventoryId }: { tripId: number; inventoryId: number }, { rejectWithValue }) => {
    try {
      return await tripsAPI.getTripRates(tripId, inventoryId)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load trip rates')
    }
  }
)

const tripsSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.errors = null
    },
    clearCurrentTrip: (state) => {
      state.currentTrip = null
    },
    resetLoading: (state) => {
      state.isLoading = false
    },
    resetAuditorLoading: (state) => {
      state.isAuditorLoading = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTripsList.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadTripsList.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = action.payload.trips
        state.total = action.payload.total
      })
      .addCase(loadTripsList.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

      .addCase(loadTrip.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadTrip.fulfilled, (state, action: PayloadAction<TripDetails>) => {
        state.isLoading = false
        state.currentTrip = action.payload
      })
      .addCase(loadTrip.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

      .addCase(saveTrip.pending, (state) => {
        state.isSaving = true
        state.errors = null
      })
      .addCase(saveTrip.fulfilled, (state, action: PayloadAction<TripDetails>) => {
        state.isSaving = false
        state.currentTrip = action.payload
      })
      .addCase(saveTrip.rejected, (state, action) => {
        state.isSaving = false
        state.errors = action.payload as string
      })

      .addCase(deleteTrip.fulfilled, (state, action: PayloadAction<number>) => {
        state.list = state.list.filter((trip) => trip.trip_id !== action.payload)
        state.total = Math.max(0, state.total - 1)
      })

      .addCase(loadTripAuditorList.pending, (state) => {
        state.isAuditorLoading = true
        state.auditorErrors = null
      })
      .addCase(loadTripAuditorList.fulfilled, (state, action) => {
        state.isAuditorLoading = false
        state.auditorList = action.payload.trips
        state.auditorTotal = action.payload.total
        state.auditorOffset = action.payload.offset
      })
      .addCase(loadTripAuditorList.rejected, (state, action) => {
        state.isAuditorLoading = false
        state.auditorErrors = action.payload as string
      })

      .addCase(updateTripStatementStatus.fulfilled, (state, action: PayloadAction<TripAuditorRow>) => {
        state.auditorList = state.auditorList.map((row) =>
          row.trip === action.payload.trip ? action.payload : row
        )
      })

      .addCase(loadTripRates.fulfilled, (state, action) => {
        if (state.currentTrip) {
          state.currentTrip.rates = action.payload
        }
      })
  },
})

export const { clearErrors, clearCurrentTrip, resetLoading, resetAuditorLoading } = tripsSlice.actions
export default tripsSlice.reducer
