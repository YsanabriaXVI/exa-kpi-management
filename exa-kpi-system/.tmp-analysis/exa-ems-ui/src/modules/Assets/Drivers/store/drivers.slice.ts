import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { driversAPI } from '../api/drivers.api'
import { Driver, DriverState } from '../types'

const initialState: DriverState = {
  list: [],
  currentDriver: null,
  loading: false,
  error: null,
}

export const loadDrivers = createAsyncThunk(
  'drivers/loadDrivers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await driversAPI.getDrivers()
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const loadDriver = createAsyncThunk(
  'drivers/loadDriver',
  async (id: number | string, { rejectWithValue }) => {
    try {
      const response = await driversAPI.getDriver(id)
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const createDriver = createAsyncThunk(
  'drivers/createDriver',
  async (driver: Driver, { rejectWithValue }) => {
    try {
      const response = await driversAPI.createDriver(driver)
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const updateDriver = createAsyncThunk(
  'drivers/updateDriver',
  async ({ id, driver }: { id: number | string; driver: Driver }, { rejectWithValue }) => {
    try {
      const response = await driversAPI.updateDriver(id, driver)
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const deleteDriver = createAsyncThunk(
  'drivers/deleteDriver',
  async (id: number | string, { rejectWithValue }) => {
    try {
      await driversAPI.deleteDriver(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const driversSlice = createSlice({
  name: 'drivers',
  initialState,
  reducers: {
    clearCurrentDriver: (state) => {
      state.currentDriver = null
    },
    clearErrors: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDrivers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadDrivers.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(loadDrivers.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(loadDriver.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadDriver.fulfilled, (state, action) => {
        state.loading = false
        state.currentDriver = action.payload
      })
      .addCase(loadDriver.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(createDriver.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createDriver.fulfilled, (state, action) => {
        state.loading = false
        state.list.push(action.payload)
      })
      .addCase(createDriver.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateDriver.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateDriver.fulfilled, (state, action) => {
        state.loading = false
        const index = state.list.findIndex((d) => d.asset_id === action.payload.asset_id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        state.currentDriver = action.payload
      })
      .addCase(updateDriver.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(deleteDriver.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteDriver.fulfilled, (state, action) => {
        state.loading = false
        state.list = state.list.filter((d) => d.asset_id !== action.payload)
      })
      .addCase(deleteDriver.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearCurrentDriver, clearErrors } = driversSlice.actions
export default driversSlice.reducer
