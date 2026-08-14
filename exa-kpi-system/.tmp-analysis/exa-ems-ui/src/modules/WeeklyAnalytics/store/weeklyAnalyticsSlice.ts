/**
 * Weekly Analytics Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { weeklyAnalyticsAPI } from '../api/weeklyAnalytics.api'
import type {
  WeeklyAnalyticsState,
  WeeklyAnalyticsFilter,
  WeeklyAnalyticsReport,
} from '../types'

const initialState: WeeklyAnalyticsState = {
  report: null,
  isLoading: false,
  error: null,
}

/**
 * Thunk: Generate report
 */
export const generateWeeklyReport = createAsyncThunk(
  'weeklyAnalytics/generateReport',
  async (filter: WeeklyAnalyticsFilter, { rejectWithValue }) => {
    try {
      const report = await weeklyAnalyticsAPI.generateReport(filter)
      return report
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate report')
    }
  },
)

/**
 * Slice
 */
const weeklyAnalyticsSlice = createSlice({
  name: 'weeklyAnalytics',
  initialState,
  reducers: {
    clearReport: (state) => {
      state.report = null
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate Report
      .addCase(generateWeeklyReport.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(
        generateWeeklyReport.fulfilled,
        (state, action: PayloadAction<WeeklyAnalyticsReport>) => {
          state.isLoading = false
          state.report = action.payload
        },
      )
      .addCase(generateWeeklyReport.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearReport, clearError } = weeklyAnalyticsSlice.actions
export default weeklyAnalyticsSlice.reducer

