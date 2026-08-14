import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { rateRoutesAPI } from '../api/rateRoutes.api'
import { RateRoute, RateRouteState } from '../types'

const initialState: RateRouteState = {
  list: [],
  currentRateRoute: null,
  loading: false,
  error: null,
}

export const loadRateRoutes = createAsyncThunk('rateRoutes/loadRateRoutes', async (_, { rejectWithValue }) => {
  try {
    return await rateRoutesAPI.getRateRoutes()
  } catch (error: any) {
    return rejectWithValue(error.response?.data || error.message)
  }
})

export const loadRateRoute = createAsyncThunk('rateRoutes/loadRateRoute', async (id: number | string, { rejectWithValue }) => {
  try {
    return await rateRoutesAPI.getRateRoute(id)
  } catch (error: any) {
    return rejectWithValue(error.response?.data || error.message)
  }
})

export const createRateRoute = createAsyncThunk(
  'rateRoutes/createRateRoute',
  async (route: RateRoute, { rejectWithValue }) => {
    try {
      return await rateRoutesAPI.createRateRoute(route)
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const updateRateRoute = createAsyncThunk(
  'rateRoutes/updateRateRoute',
  async ({ id, route }: { id: number | string; route: RateRoute }, { rejectWithValue }) => {
    try {
      return await rateRoutesAPI.updateRateRoute(id, route)
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const deleteRateRoute = createAsyncThunk(
  'rateRoutes/deleteRateRoute',
  async (id: number | string, { rejectWithValue }) => {
    try {
      await rateRoutesAPI.deleteRateRoute(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

const rateRoutesSlice = createSlice({
  name: 'rateRoutes',
  initialState,
  reducers: {
    clearCurrentRateRoute: (state) => {
      state.currentRateRoute = null
    },
    clearErrors: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadRateRoutes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadRateRoutes.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(loadRateRoutes.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(loadRateRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadRateRoute.fulfilled, (state, action) => {
        state.loading = false
        state.currentRateRoute = action.payload
      })
      .addCase(loadRateRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(createRateRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createRateRoute.fulfilled, (state, action) => {
        state.loading = false
        state.list.push(action.payload)
      })
      .addCase(createRateRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateRateRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateRateRoute.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.list.findIndex((r) => r.route_id === action.payload.route_id)
        if (idx !== -1) state.list[idx] = action.payload
        state.currentRateRoute = action.payload
      })
      .addCase(updateRateRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(deleteRateRoute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteRateRoute.fulfilled, (state, action) => {
        state.loading = false
        state.list = state.list.filter((r) => r.route_id !== action.payload)
      })
      .addCase(deleteRateRoute.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearCurrentRateRoute, clearErrors } = rateRoutesSlice.actions
export default rateRoutesSlice.reducer
