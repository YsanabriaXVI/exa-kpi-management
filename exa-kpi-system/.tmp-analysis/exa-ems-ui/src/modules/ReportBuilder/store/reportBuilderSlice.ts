/**
 * Custom Report Builder Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { reportBuilderAPI } from '../api/reportBuilder.api'
import type {
  ReportBuilderState,
  ReportBuilderWizardData,
  ReportResultTable,
  EntityIds,
} from '../types'

const initialState: ReportBuilderState = {
  report: null,
  isLoading: false,
  error: null,
  availableEntities: null,
}

/**
 * Thunk: Fetch available entities
 */
export const fetchAvailableEntities = createAsyncThunk(
  'reportBuilder/fetchAvailableEntities',
  async (data: Partial<ReportBuilderWizardData>, { rejectWithValue }) => {
    try {
      const entities = await reportBuilderAPI.getAvailableEntities(data)
      return entities
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch entities')
    }
  },
)

/**
 * Thunk: Generate report
 */
export const generateCustomReport = createAsyncThunk(
  'reportBuilder/generateReport',
  async (data: ReportBuilderWizardData, { rejectWithValue }) => {
    try {
      const report = await reportBuilderAPI.generateReport(data)
      return report
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate report')
    }
  },
)

/**
 * Slice
 */
const reportBuilderSlice = createSlice({
  name: 'reportBuilder',
  initialState,
  reducers: {
    clearReport: (state) => {
      state.report = null
      state.error = null
      state.availableEntities = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Available Entities
      .addCase(fetchAvailableEntities.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(
        fetchAvailableEntities.fulfilled,
        (state, action: PayloadAction<EntityIds>) => {
          state.isLoading = false
          state.availableEntities = action.payload
        },
      )
      .addCase(fetchAvailableEntities.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Generate Report
      .addCase(generateCustomReport.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(
        generateCustomReport.fulfilled,
        (state, action: PayloadAction<ReportResultTable[]>) => {
          state.isLoading = false
          state.report = action.payload
        },
      )
      .addCase(generateCustomReport.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearReport, clearError } = reportBuilderSlice.actions
export default reportBuilderSlice.reducer

