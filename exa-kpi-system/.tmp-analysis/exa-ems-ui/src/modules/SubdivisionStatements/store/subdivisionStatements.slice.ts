import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { subdivisionStatementsAPI } from '../api/subdivisionStatements.api'
import type { SubdivisionStatement, SubdivisionStatementsState, SubdivisionStatementTableData, PaginatedStatementsResult } from '../types'

const initialState: SubdivisionStatementsState = {
  list: [],
  total: 0,
  current: null,
  trips: null,
  loading: false,
  error: null,
}

export const loadStatements = createAsyncThunk<SubdivisionStatement[], void, { rejectValue: string }>(
  'subdivisionStatements/loadList',
  async (_, { rejectWithValue }) => {
    try {
      const { list } = await subdivisionStatementsAPI.getStatements()
      return list
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load subdivision statements')
    }
  }
)

export const loadStatementsPaginated = createAsyncThunk<
  PaginatedStatementsResult,
  { limit: number; offset: number; search?: string },
  { rejectValue: string }
>(
  'subdivisionStatements/loadListPaginated',
  async (params, { rejectWithValue }) => {
    try {
      return await subdivisionStatementsAPI.getStatementsPaginated(params)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load subdivision statements')
    }
  }
)

export const loadStatement = createAsyncThunk<SubdivisionStatement, number | string, { rejectValue: string }>(
  'subdivisionStatements/loadOne',
  async (id, { rejectWithValue }) => {
    try {
      return await subdivisionStatementsAPI.getStatement(id)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load subdivision statement')
    }
  }
)

export const createStatement = createAsyncThunk<SubdivisionStatement, any, { rejectValue: string }>(
  'subdivisionStatements/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await subdivisionStatementsAPI.createStatement(payload)
    } catch (error: any) {
      const responseData = error.response?.data
      const msg =
        (Array.isArray(responseData?.data) ? responseData.data[0] : responseData?.data) ||
        responseData?.message ||
        error.message ||
        'Failed to create subdivision statement'
      return rejectWithValue(msg)
    }
  }
)

export const updateStatement = createAsyncThunk<SubdivisionStatement, { id: number | string; payload: any }, { rejectValue: string }>(
  'subdivisionStatements/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await subdivisionStatementsAPI.updateStatement(id, payload)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update subdivision statement')
    }
  }
)

export const deleteStatement = createAsyncThunk<number | string, number | string, { rejectValue: string }>(
  'subdivisionStatements/delete',
  async (id, { rejectWithValue }) => {
    try {
      await subdivisionStatementsAPI.deleteStatement(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete subdivision statement')
    }
  }
)

export const loadStatementTrips = createAsyncThunk<SubdivisionStatementTableData, number | string, { rejectValue: string }>(
  'subdivisionStatements/loadTrips',
  async (id, { rejectWithValue }) => {
    try {
      return await subdivisionStatementsAPI.getTripTable(id)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load trips')
    }
  }
)

const subdivisionStatementsSlice = createSlice({
  name: 'subdivisionStatements',
  initialState,
  reducers: {
    clearCurrentStatement: (state) => {
      state.current = null
      state.trips = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStatements.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadStatements.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
        state.total = action.payload.length
      })
      .addCase(loadStatements.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load subdivision statements'
      })

      .addCase(loadStatementsPaginated.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadStatementsPaginated.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.list
        state.total = action.payload.total
      })
      .addCase(loadStatementsPaginated.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load subdivision statements'
      })

      .addCase(loadStatement.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadStatement.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
      })
      .addCase(loadStatement.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load subdivision statement'
      })

      .addCase(createStatement.pending, (state) => {
        state.loading = true
      })
      .addCase(createStatement.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
        state.list = [action.payload, ...(state.list || [])]
        state.total = state.total + 1
      })
      .addCase(createStatement.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to create subdivision statement'
      })

      .addCase(updateStatement.pending, (state) => {
        state.loading = true
      })
      .addCase(updateStatement.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
        const id = action.payload.paymentId ?? action.payload.id
        state.list = state.list.map((item) => (item.id === id || item.paymentId === id ? action.payload : item))
      })
      .addCase(updateStatement.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to update subdivision statement'
      })

      .addCase(deleteStatement.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item.paymentId !== action.payload && item.id !== action.payload)
        state.total = Math.max(0, state.total - 1)
      })

      .addCase(loadStatementTrips.fulfilled, (state, action) => {
        state.trips = action.payload
      })
  },
})

export const { clearCurrentStatement } = subdivisionStatementsSlice.actions
export default subdivisionStatementsSlice.reducer
