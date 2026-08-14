/**
 * Rate Builder Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { rateBuilderAPI } from '../api/ratebuilder.api'
import { RateBuilderState, RateBuilderRow, RateBuilderCell, RateBuilderData } from '../types'

const initialState: RateBuilderState = {
  data: [],
  loading: false,
  error: null,
  updatingCells: [],
}

/**
 * Load Rate Builder Data and transform it into a matrix structure
 */
export const loadRateBuilderData = createAsyncThunk(
  'ratebuilder/loadData',
  async (
    {
      pType,
      classType,
      clients,
      subdivisions,
    }: {
      pType: number
      classType: number
      clients: any[]
      subdivisions: any[]
    },
    { rejectWithValue }
  ) => {
    try {
      console.log('ratebuilderSlice: Fetching data for', { pType, classType })
      const data = await rateBuilderAPI.getRateBuilderData(pType, classType)
      console.log('ratebuilderSlice: API Response', data)

      // Transform flat data into matrix structure
      const rows: RateBuilderRow[] = subdivisions.map((subdivision) => {
        const row: RateBuilderRow = {
          subdivisionName: subdivision.name,
          subdivisionId: subdivision.subdivision_id,
        }

        clients.forEach((client) => {
          const plan = data.find(
            (item) =>
              item.client.client_id === client.client_id &&
              item.subdivision.subdivision_id === subdivision.subdivision_id
          )

          const cell: RateBuilderCell = {
            id: `${client.client_id}-${subdivision.subdivision_id}`,
            data: plan || null,
            colValue: plan?.rate_builder?.name || '',
          }

          row[`client-${client.client_id}`] = cell
        })

        return row
      })

      console.log('ratebuilderSlice: Transformed Rows', rows)
      return rows
    } catch (error: any) {
      console.error('ratebuilderSlice: Error', error)
      return rejectWithValue(error.message)
    }
  }
)

/**
 * Update existing rate builder data cell
 */
export const updateRateBuilderCell = createAsyncThunk(
  'ratebuilder/updateCell',
  async (
    {
      cellId,
      rateBuilderDataId,
      ratePlanId,
    }: {
      cellId: string
      rateBuilderDataId: number
      ratePlanId: number
    },
    { rejectWithValue }
  ) => {
    try {
      const updatedData = await rateBuilderAPI.updateRateBuilderData(rateBuilderDataId, {
        rate_builder_id: ratePlanId,
      })
      return { cellId, data: updatedData }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

/**
 * Create new rate builder data cell
 */
export const createRateBuilderCell = createAsyncThunk(
  'ratebuilder/createCell',
  async (
    {
      cellId,
      clientId,
      subdivisionId,
      pType,
      classType,
      ratePlanId,
    }: {
      cellId: string
      clientId: number
      subdivisionId: number
      pType: number
      classType: number
      ratePlanId: number
    },
    { rejectWithValue }
  ) => {
    try {
      const newData = await rateBuilderAPI.createRateBuilderData({
        client_id: clientId,
        subdivision_id: subdivisionId,
        p_type: pType,
        class: classType,
        rate_builder_id: ratePlanId,
      })
      return { cellId, data: newData }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const rateBuilderSlice = createSlice({
  name: 'ratebuilder',
  initialState,
  reducers: {
    clearData: (state) => {
      state.data = []
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Load Data
      .addCase(loadRateBuilderData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadRateBuilderData.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
      })
      .addCase(loadRateBuilderData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // Update Cell
      .addCase(updateRateBuilderCell.pending, (state, action) => {
        state.updatingCells.push(action.meta.arg.cellId)
      })
      .addCase(updateRateBuilderCell.fulfilled, (state, action) => {
        const { cellId, data } = action.payload
        state.updatingCells = state.updatingCells.filter((id) => id !== cellId)

        // Update the cell data in the matrix
        state.data = state.data.map((row) => {
          const clientKey = `client-${data.client.client_id}`
          if (row[clientKey]?.id === cellId) {
            return {
              ...row,
              [clientKey]: {
                ...row[clientKey],
                data,
                colValue: data.rate_builder.name,
              },
            }
          }
          return row
        })
      })
      .addCase(updateRateBuilderCell.rejected, (state, action) => {
        state.updatingCells = state.updatingCells.filter(
          (id) => id !== action.meta.arg.cellId
        )
        state.error = action.payload as string
      })

      // Create Cell
      .addCase(createRateBuilderCell.pending, (state, action) => {
        state.updatingCells.push(action.meta.arg.cellId)
      })
      .addCase(createRateBuilderCell.fulfilled, (state, action) => {
        const { cellId, data } = action.payload
        state.updatingCells = state.updatingCells.filter((id) => id !== cellId)

        // Update the cell data in the matrix
        state.data = state.data.map((row) => {
          const clientKey = `client-${data.client.client_id}`
          if (row[clientKey]?.id === cellId) {
            return {
              ...row,
              [clientKey]: {
                ...row[clientKey],
                data,
                colValue: data.rate_builder.name,
              },
            }
          }
          return row
        })
      })
      .addCase(createRateBuilderCell.rejected, (state, action) => {
        state.updatingCells = state.updatingCells.filter(
          (id) => id !== action.meta.arg.cellId
        )
        state.error = action.payload as string
      })
  },
})

export const { clearData } = rateBuilderSlice.actions
export default rateBuilderSlice.reducer



