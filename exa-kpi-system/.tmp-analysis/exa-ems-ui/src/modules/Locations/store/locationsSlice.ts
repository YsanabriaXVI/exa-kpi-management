import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { locationsAPI } from '../api/locations.api'
import type { Location, LocationsState } from '../types'
import { ACTIVE_STATUS_ID, DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from '../constants'

const toErrorPayload = (error: any, fallback: string) =>
  error?.response?.data?.message ??
  error?.response?.data ??
  error?.message ??
  fallback

const buildDefaultLocation = (): Location => ({
  name: '',
  city_id: undefined,
  address: '',
  reference: '',
  phone: '',
  status: ACTIVE_STATUS_ID,
  latitud: DEFAULT_LATITUDE,
  longitud: DEFAULT_LONGITUDE,
})

const initialState: LocationsState = {
  locations: [],
  cities: [],
  currentLocation: buildDefaultLocation(),
  loading: false,
  error: null,
  total: 0,
}

export const loadLocations = createAsyncThunk('locations/loadLocations', async (_, { rejectWithValue }) => {
  try {
    return await locationsAPI.getLocations()
  } catch (error: any) {
    return rejectWithValue(toErrorPayload(error, 'Failed to load locations'))
  }
})

export const loadLocation = createAsyncThunk('locations/loadLocation', async (id: number, { rejectWithValue }) => {
  try {
    return await locationsAPI.getLocation(id)
  } catch (error: any) {
    return rejectWithValue(toErrorPayload(error, 'Failed to load location'))
  }
})

export const loadCities = createAsyncThunk('locations/loadCities', async (_, { rejectWithValue }) => {
  try {
    return await locationsAPI.getCities()
  } catch (error: any) {
    return rejectWithValue(toErrorPayload(error, 'Failed to load cities'))
  }
})

export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (location: Location, { rejectWithValue }) => {
    try {
      return await locationsAPI.createLocation(location)
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to create location'))
    }
  }
)

export const updateLocation = createAsyncThunk(
  'locations/updateLocation',
  async ({ id, location }: { id: number; location: Location }, { rejectWithValue }) => {
    try {
      return await locationsAPI.updateLocation(id, location)
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to update location'))
    }
  }
)

export const deleteLocation = createAsyncThunk(
  'locations/deleteLocation',
  async (id: number, { rejectWithValue }) => {
    try {
      await locationsAPI.deleteLocation(id)
      return id
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return id
      }
      return rejectWithValue(toErrorPayload(error, 'Failed to delete location'))
    }
  }
)

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    clearCurrentLocation: (state) => {
      state.currentLocation = null
    },
    setDefaultLocation: (state) => {
      state.currentLocation = buildDefaultLocation()
      state.error = null
    },
    setCurrentLocation: (state, action) => {
      state.currentLocation = action.payload
    },
    clearLocationError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLocations.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadLocations.fulfilled, (state, action) => {
        state.loading = false
        state.locations = action.payload.data
        state.total = action.payload.total ?? action.payload.data.length
      })
      .addCase(loadLocations.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to load locations'
      })
      .addCase(loadLocation.fulfilled, (state, action) => {
        state.currentLocation = action.payload
      })
      .addCase(loadLocation.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to load location'
      })
      .addCase(loadCities.fulfilled, (state, action) => {
        state.cities = action.payload as any[]
      })
      .addCase(createLocation.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.loading = false
        state.currentLocation = action.payload
        state.locations = [...state.locations, action.payload]
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to create location'
      })
      .addCase(updateLocation.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateLocation.fulfilled, (state, action) => {
        state.loading = false
        state.currentLocation = action.payload
        state.locations = state.locations.map((loc) =>
          loc.location_id === action.payload.location_id ? action.payload : loc
        )
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to update location'
      })
      .addCase(deleteLocation.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.loading = false
        state.locations = state.locations.filter((loc) => loc.location_id !== action.payload)
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to delete location'
      })
  },
})

export const { clearCurrentLocation, setDefaultLocation, setCurrentLocation, clearLocationError } =
  locationsSlice.actions
export default locationsSlice.reducer
