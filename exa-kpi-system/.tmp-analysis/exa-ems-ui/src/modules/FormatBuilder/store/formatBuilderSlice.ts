import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { formatBuilderAPI } from '../api/formatbuilder.api'
import type { FormatBuilder, FormatBuilderState, FormatListParams } from '../types'
import { ACTIVE_STATUS_ID } from '../constants'
import apiClient from '../../../services/api/axios.config'

const toErrorPayload = (error: any, fallback: string) =>
  error?.response?.data?.message ??
  error?.response?.data ??
  error?.message ??
  fallback

const buildDefaultFormat = (): FormatBuilder => ({
  name: '',
  type: 'Invoice',
  tax_rate: 0,
  currency: 0,
  note: 0,
  othercharges: 0,
  totalkm: 0,
  duedays: 0,
  font: 50,
  row: 1,
  status: { id: ACTIVE_STATUS_ID, name: 'ACTIVE' },
})

const initialState: FormatBuilderState = {
  formats: [],
  currentFormat: buildDefaultFormat(),
  loading: false,
  error: null,
  total: 0,
  tripitems: [],
}

export const loadFormats = createAsyncThunk(
  'formatbuilder/loadFormats',
  async (params: FormatListParams | undefined, { rejectWithValue }) => {
    try {
      return await formatBuilderAPI.getFormats(params || {})
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to load formats'))
    }
  }
)

export const loadFormat = createAsyncThunk(
  'formatbuilder/loadFormat',
  async (id: number, { rejectWithValue }) => {
    try {
      return await formatBuilderAPI.getFormat(id)
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to load format'))
    }
  }
)

export const createFormat = createAsyncThunk(
  'formatbuilder/createFormat',
  async (format: FormatBuilder, { rejectWithValue }) => {
    try {
      return await formatBuilderAPI.createFormat(format)
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to create format'))
    }
  }
)

export const updateFormat = createAsyncThunk(
  'formatbuilder/updateFormat',
  async ({ id, format }: { id: number; format: FormatBuilder }, { rejectWithValue }) => {
    try {
      return await formatBuilderAPI.updateFormat(id, format)
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to update format'))
    }
  }
)

export const deleteFormat = createAsyncThunk(
  'formatbuilder/deleteFormat',
  async (id: number, { rejectWithValue }) => {
    try {
      await formatBuilderAPI.deleteFormat(id)
      return id
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to delete format'))
    }
  }
)

export const loadTripItems = createAsyncThunk(
  'formatbuilder/loadTripItems',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<any>('/tripitems', {
        headers: { 'Route-Type': 'admin' },
      })
      const payload = response.data?.tripitems ?? response.data?.data?.tripitems ?? response.data?.data ?? response.data
      return Array.isArray(payload) ? payload : []
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to load trip items'))
    }
  }
)

const formatBuilderSlice = createSlice({
  name: 'formatbuilder',
  initialState,
  reducers: {
    clearCurrentFormat: (state) => {
      state.currentFormat = null
    },
    setDefaultFormat: (state) => {
      state.currentFormat = buildDefaultFormat()
      state.error = null
    },
    clearFormatError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadFormats.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadFormats.fulfilled, (state, action) => {
        state.loading = false
        state.formats = action.payload.data
        state.total = action.payload.total ?? action.payload.data.length
      })
      .addCase(loadFormats.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to load formats'
      })

      .addCase(loadFormat.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadFormat.fulfilled, (state, action) => {
        state.loading = false
        state.currentFormat = action.payload
      })
      .addCase(loadFormat.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to load format'
      })

      .addCase(createFormat.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createFormat.fulfilled, (state, action) => {
        state.loading = false
        state.currentFormat = action.payload
        state.formats = [...state.formats, action.payload]
      })
      .addCase(createFormat.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to create format'
      })

      .addCase(updateFormat.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateFormat.fulfilled, (state, action) => {
        state.loading = false
        state.currentFormat = action.payload
        state.formats = state.formats.map((f) => (f.id === action.payload.id ? action.payload : f))
      })
      .addCase(updateFormat.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to update format'
      })

      .addCase(deleteFormat.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteFormat.fulfilled, (state, action) => {
        state.loading = false
        state.formats = state.formats.filter((f) => f.id !== action.payload)
      })
      .addCase(deleteFormat.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to delete format'
      })

      .addCase(loadTripItems.fulfilled, (state, action) => {
        state.tripitems = action.payload as any[]
      })
  },
})

export const { clearCurrentFormat, setDefaultFormat, clearFormatError } = formatBuilderSlice.actions

export default formatBuilderSlice.reducer
