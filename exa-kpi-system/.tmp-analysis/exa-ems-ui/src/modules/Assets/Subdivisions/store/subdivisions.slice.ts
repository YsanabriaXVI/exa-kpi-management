import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { subdivisionsAPI } from '../api/subdivisions.api'
import { Subdivision, SubdivisionState } from '../types'

const initialState: SubdivisionState = {
  list: [],
  currentSubdivision: null,
  loading: false,
  error: null,
}

export const loadSubdivisions = createAsyncThunk(
  'subdivisions/loadSubdivisions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subdivisionsAPI.getSubdivisions()
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const loadSubdivision = createAsyncThunk(
  'subdivisions/loadSubdivision',
  async (id: number | string, { rejectWithValue }) => {
    try {
      const response = await subdivisionsAPI.getSubdivision(id)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const createSubdivision = createAsyncThunk(
  'subdivisions/createSubdivision',
  async (subdivision: Subdivision, { rejectWithValue }) => {
    try {
      const response = await subdivisionsAPI.createSubdivision(subdivision)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const updateSubdivision = createAsyncThunk(
  'subdivisions/updateSubdivision',
  async ({ id, subdivision }: { id: number | string; subdivision: Subdivision }, { rejectWithValue }) => {
    try {
      const response = await subdivisionsAPI.updateSubdivision(id, subdivision)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const deleteSubdivision = createAsyncThunk(
  'subdivisions/deleteSubdivision',
  async (id: number | string, { rejectWithValue }) => {
    try {
      await subdivisionsAPI.deleteSubdivision(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

const subdivisionsSlice = createSlice({
  name: 'subdivisions',
  initialState,
  reducers: {
    clearCurrentSubdivision: (state) => {
      state.currentSubdivision = null
    },
    clearErrors: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSubdivisions.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadSubdivisions.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(loadSubdivisions.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(loadSubdivision.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadSubdivision.fulfilled, (state, action) => {
        state.loading = false
        state.currentSubdivision = action.payload
      })
      .addCase(loadSubdivision.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(createSubdivision.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createSubdivision.fulfilled, (state, action) => {
        state.loading = false
        state.list.push(action.payload)
      })
      .addCase(createSubdivision.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateSubdivision.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateSubdivision.fulfilled, (state, action) => {
        state.loading = false
        const index = state.list.findIndex((s) => s.subdivision_id === action.payload.subdivision_id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        state.currentSubdivision = action.payload
      })
      .addCase(updateSubdivision.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(deleteSubdivision.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteSubdivision.fulfilled, (state, action) => {
        state.loading = false
        state.list = state.list.filter((s) => s.subdivision_id !== action.payload)
      })
      .addCase(deleteSubdivision.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearCurrentSubdivision, clearErrors } = subdivisionsSlice.actions
export default subdivisionsSlice.reducer
