import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { trucksAPI } from '../api/trucks.api'
import { Truck, TruckState } from '../types'

const toErrorPayload = (error: any, fallback: string) =>
  error?.response?.data?.message ??
  error?.response?.data ??
  error?.message ??
  fallback

const initialState: TruckState = {
  list: [],
  currentTruck: null,
  loading: false,
  error: null,
}

// Async Thunks

export const loadTrucks = createAsyncThunk(
  'trucks/loadTrucks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await trucksAPI.getTrucks()
      return response
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to load trucks'))
    }
  }
)

export const loadTruck = createAsyncThunk(
  'trucks/loadTruck',
  async (id: number | string, { rejectWithValue }) => {
    try {
      const response = await trucksAPI.getTruck(id)
      return response
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to load truck'))
    }
  }
)

export const createTruck = createAsyncThunk(
  'trucks/createTruck',
  async (truck: Truck, { rejectWithValue }) => {
    try {
      const response = await trucksAPI.createTruck(truck)
      return response
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to create truck'))
    }
  }
)

export const updateTruck = createAsyncThunk(
  'trucks/updateTruck',
  async ({ id, truck }: { id: number | string; truck: Truck }, { rejectWithValue }) => {
    try {
      const response = await trucksAPI.updateTruck(id, truck)
      return response
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to update truck'))
    }
  }
)

export const deleteTruck = createAsyncThunk(
  'trucks/deleteTruck',
  async (id: number | string, { rejectWithValue }) => {
    try {
      await trucksAPI.deleteTruck(id)
      return id
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to delete truck'))
    }
  }
)

const trucksSlice = createSlice({
  name: 'trucks',
  initialState,
  reducers: {
    clearCurrentTruck: (state) => {
      state.currentTruck = null
    },
    clearErrors: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Load Trucks
      .addCase(loadTrucks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadTrucks.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(loadTrucks.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as any
      })

      // Load Truck
      .addCase(loadTruck.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadTruck.fulfilled, (state, action) => {
        state.loading = false
        state.currentTruck = action.payload
      })
      .addCase(loadTruck.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as any
      })

      // Create Truck
      .addCase(createTruck.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createTruck.fulfilled, (state, action) => {
        state.loading = false
        state.list.push(action.payload)
      })
      .addCase(createTruck.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as any
      })

      // Update Truck
      .addCase(updateTruck.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateTruck.fulfilled, (state, action) => {
        state.loading = false
        const index = state.list.findIndex((t) => t.asset_id === action.payload.asset_id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        state.currentTruck = action.payload
      })
      .addCase(updateTruck.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as any
      })

      // Delete Truck
      .addCase(deleteTruck.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteTruck.fulfilled, (state, action) => {
        state.loading = false
        state.list = state.list.filter((t) => t.asset_id !== action.payload)
      })
      .addCase(deleteTruck.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as any
      })
  },
})

export const { clearCurrentTruck, clearErrors } = trucksSlice.actions
export default trucksSlice.reducer
