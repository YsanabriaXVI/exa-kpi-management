import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { locationItemsAPI } from '../api/locationitems.api'
import type { LocationItemsState, LocationItem, LocationTypeKey } from '../types'
import { ACTIVE_STATUS_ID, LOCATION_TYPES } from '../constants'

const TYPE_ID_MAP: Record<LocationTypeKey, string> = {
  variants: 'variant_id',
  cities: 'city_id',
  departments: 'department_id',
  countries: 'country_id',
}

const buildInitialState = (): LocationItemsState => ({
  data: {
    countries: [],
    departments: [],
    cities: [],
    variants: [],
  },
  current: null,
  activeType: 'countries',
  loading: false,
  error: null,
})

const initialState = buildInitialState()

export const loadAllLocationItems = createAsyncThunk(
  'locationitems/loadAll',
  async (_, { rejectWithValue }) => {
    try {
      return await locationItemsAPI.getAll()
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load location items')
    }
  }
)

export const loadLocationItemsByType = createAsyncThunk(
  'locationitems/loadByType',
  async (type: LocationTypeKey, { rejectWithValue }) => {
    try {
      return await locationItemsAPI.getByType(type)
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to load ${type}`)
    }
  }
)

export const createLocationItem = createAsyncThunk(
  'locationitems/create',
  async ({ type, item }: { type: LocationTypeKey; item: LocationItem }, { rejectWithValue }) => {
    try {
      return { type, item: await locationItemsAPI.create(type, item) }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create item')
    }
  }
)

export const updateLocationItem = createAsyncThunk(
  'locationitems/update',
  async ({ type, id, item }: { type: LocationTypeKey; id: number; item: LocationItem }, { rejectWithValue }) => {
    try {
      return { type, item: await locationItemsAPI.update(type, id, item) }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update item')
    }
  }
)

export const deleteLocationItem = createAsyncThunk(
  'locationitems/delete',
  async ({ type, id }: { type: LocationTypeKey; id: number }, { rejectWithValue }) => {
    try {
      await locationItemsAPI.delete(type, id)
      return { type, id }
    } catch (error: any) {
      // If the backend returns 404 but the item is effectively gone, treat as success
      if (error?.response?.status === 404) {
        return { type, id }
      }
      return rejectWithValue(error.message || 'Failed to delete item')
    }
  }
)

const normalizeTypeKey = (value?: string): LocationTypeKey => {
  const lowered = (value || '').toLowerCase()
  if (LOCATION_TYPES.includes(lowered as LocationTypeKey)) {
    return lowered as LocationTypeKey
  }
  return 'countries'
}

const slice = createSlice({
  name: 'locationitems',
  initialState,
  reducers: {
    setActiveType: (state, action) => {
      state.activeType = normalizeTypeKey(action.payload)
      state.current = null
      state.error = null
    },
    setCurrentItem: (state, action) => {
      state.current = action.payload
    },
    setDefaultItem: (state) => {
      state.current = { name: '', status: ACTIVE_STATUS_ID }
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAllLocationItems.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadAllLocationItems.fulfilled, (state, action) => {
        state.loading = false
        const payload = action.payload as any
        state.data = {
          countries: payload.countries || [],
          departments: payload.departments || [],
          cities: payload.cities || [],
          variants: payload.variants || [],
        }
      })
      .addCase(loadAllLocationItems.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load location items'
      })

      .addCase(loadLocationItemsByType.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadLocationItemsByType.fulfilled, (state, action) => {
        state.loading = false
        const payload = action.payload as any
        state.data = {
          ...state.data,
          ...payload,
        }
      })
      .addCase(loadLocationItemsByType.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load location items'
      })

      .addCase(createLocationItem.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createLocationItem.fulfilled, (state, action) => {
        state.loading = false
        const { type, item } = action.payload as any
        state.data[type] = [...(state.data[type] as any[]), item]
        state.current = item
      })
      .addCase(createLocationItem.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to create item'
      })

      .addCase(updateLocationItem.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateLocationItem.fulfilled, (state, action) => {
        state.loading = false
        const { type, item } = action.payload as any
        state.data[type] = (state.data[type] as any[]).map((entry) =>
          entry[TYPE_ID_MAP[type]] === item[TYPE_ID_MAP[type]] ? item : entry
        )
        state.current = item
      })
      .addCase(updateLocationItem.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to update item'
      })

      .addCase(deleteLocationItem.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteLocationItem.fulfilled, (state, action) => {
        state.loading = false
        const { type, id } = action.payload as any
        state.data[type] = (state.data[type] as any[]).filter(
          (entry) => entry[TYPE_ID_MAP[type]] !== id && entry.id !== id
        )
      })
      .addCase(deleteLocationItem.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to delete item'
      })
  },
})

export const { setActiveType, setCurrentItem, setDefaultItem, clearError } = slice.actions
export default slice.reducer
