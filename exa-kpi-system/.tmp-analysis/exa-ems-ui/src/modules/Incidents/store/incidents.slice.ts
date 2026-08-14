import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { incidentsAPI } from '../api/incidents.api'
import type { Incident, IncidentsState } from '../types'

const initialState: IncidentsState = {
  list: [],
  current: null,
  loading: false,
  error: null,
}

export const loadIncidents = createAsyncThunk<Incident[], { module?: string; id?: string | number } | undefined, { rejectValue: string }>(
  'incidents/loadList',
  async (params, { rejectWithValue }) => {
    try {
      return await incidentsAPI.getIncidents(params)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load incidents')
    }
  }
)

export const loadIncident = createAsyncThunk<Incident, number | string, { rejectValue: string }>(
  'incidents/loadOne',
  async (id, { rejectWithValue }) => {
    try {
      return await incidentsAPI.getIncident(id)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load incident')
    }
  }
)

export const createIncident = createAsyncThunk<Incident, Partial<Incident>, { rejectValue: string }>(
  'incidents/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await incidentsAPI.createIncident(payload)
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Failed to create incident'
      return rejectWithValue(msg)
    }
  }
)

export const updateIncident = createAsyncThunk<Incident, { id: number | string; payload: Partial<Incident> }, { rejectValue: string }>(
  'incidents/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await incidentsAPI.updateIncident(id, payload)
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Failed to update incident'
      return rejectWithValue(msg)
    }
  }
)

export const deleteIncident = createAsyncThunk<number | string, number | string, { rejectValue: string }>(
  'incidents/delete',
  async (id, { rejectWithValue }) => {
    try {
      await incidentsAPI.deleteIncident(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete incident')
    }
  }
)

const incidentsSlice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    clearCurrentIncident: (state) => {
      state.current = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadIncidents.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadIncidents.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(loadIncidents.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load incidents'
      })
      .addCase(loadIncident.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadIncident.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
      })
      .addCase(loadIncident.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load incident'
      })
      .addCase(createIncident.pending, (state) => {
        state.loading = true
      })
      .addCase(createIncident.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
        state.list = [action.payload, ...(state.list || [])]
      })
      .addCase(createIncident.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to create incident'
      })
      .addCase(updateIncident.pending, (state) => {
        state.loading = true
      })
      .addCase(updateIncident.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
        state.list = state.list.map((item) => (item.incident_id === action.payload.incident_id ? action.payload : item))
      })
      .addCase(updateIncident.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to update incident'
      })
      .addCase(deleteIncident.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item.incident_id !== action.payload)
      })
  },
})

export const { clearCurrentIncident } = incidentsSlice.actions
export default incidentsSlice.reducer
