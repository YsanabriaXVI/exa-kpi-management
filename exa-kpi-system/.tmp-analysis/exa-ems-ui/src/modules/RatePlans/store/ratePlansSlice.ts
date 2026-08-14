import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ratePlansAPI } from '../api/rateplans.api'
import type { RatePlan, RatePlanListParams, RatePlansState } from '../types'
import { ACTIVE_STATUS_ID } from '../constants'

const buildDefaultRatePlan = (): RatePlan => ({
  name: '',
  status: { id: ACTIVE_STATUS_ID, name: 'ACTIVE' },
})

const initialState: RatePlansState = {
  rateplans: [],
  currentRatePlan: buildDefaultRatePlan(),
  loading: false,
  error: null,
  total: 0,
}

export const loadRatePlans = createAsyncThunk(
  'rateplans/loadRatePlans',
  async (params: RatePlanListParams | undefined, { rejectWithValue }) => {
    try {
      return await ratePlansAPI.getRatePlans(params || {})
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load rate plans')
    }
  }
)

export const loadRatePlan = createAsyncThunk(
  'rateplans/loadRatePlan',
  async (id: number, { rejectWithValue }) => {
    try {
      return await ratePlansAPI.getRatePlan(id)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load rate plan')
    }
  }
)

export const createRatePlan = createAsyncThunk(
  'rateplans/createRatePlan',
  async (plan: RatePlan, { rejectWithValue }) => {
    try {
      return await ratePlansAPI.createRatePlan(plan)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create rate plan')
    }
  }
)

export const updateRatePlan = createAsyncThunk(
  'rateplans/updateRatePlan',
  async ({ id, plan }: { id: number; plan: RatePlan }, { rejectWithValue }) => {
    try {
      return await ratePlansAPI.updateRatePlan(id, plan)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update rate plan')
    }
  }
)

export const deleteRatePlan = createAsyncThunk(
  'rateplans/deleteRatePlan',
  async (id: number, { rejectWithValue }) => {
    try {
      await ratePlansAPI.deleteRatePlan(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete rate plan')
    }
  }
)

const ratePlansSlice = createSlice({
  name: 'rateplans',
  initialState,
  reducers: {
    clearCurrentRatePlan: (state) => {
      state.currentRatePlan = null
    },
    setDefaultRatePlan: (state) => {
      state.currentRatePlan = buildDefaultRatePlan()
      state.error = null
    },
    clearRatePlanError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadRatePlans.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadRatePlans.fulfilled, (state, action) => {
        state.loading = false
        state.rateplans = action.payload.data
        state.total = action.payload.total ?? action.payload.data.length
      })
      .addCase(loadRatePlans.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load rate plans'
      })

      .addCase(loadRatePlan.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadRatePlan.fulfilled, (state, action) => {
        state.loading = false
        state.currentRatePlan = action.payload
      })
      .addCase(loadRatePlan.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load rate plan'
      })

      .addCase(createRatePlan.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createRatePlan.fulfilled, (state, action) => {
        state.loading = false
        state.currentRatePlan = action.payload
        state.rateplans = [...state.rateplans, action.payload]
      })
      .addCase(createRatePlan.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to create rate plan'
      })

      .addCase(updateRatePlan.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateRatePlan.fulfilled, (state, action) => {
        state.loading = false
        state.currentRatePlan = action.payload
        state.rateplans = state.rateplans.map((p) => (p.id === action.payload.id ? action.payload : p))
      })
      .addCase(updateRatePlan.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to update rate plan'
      })

      .addCase(deleteRatePlan.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteRatePlan.fulfilled, (state, action) => {
        state.loading = false
        state.rateplans = state.rateplans.filter((p) => p.id !== action.payload)
      })
      .addCase(deleteRatePlan.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to delete rate plan'
      })
  },
})

export const { clearCurrentRatePlan, setDefaultRatePlan, clearRatePlanError } = ratePlansSlice.actions

export default ratePlansSlice.reducer
