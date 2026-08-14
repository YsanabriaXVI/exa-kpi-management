import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { weeksAPI } from '../api/weeks.api'
import type { Week, WeeksState } from '../types'
import { ACTIVE_STATUS_ID, DEFAULT_ACTIVE, DEFAULT_STATUS_ID } from '../constants'

const toErrorPayload = (error: any, fallback: string) =>
  error?.response?.data?.message ??
  error?.response?.data ??
  error?.message ??
  fallback

const buildDefaultWeek = (): Week => ({
  week_no: undefined,
  week_year: new Date().getFullYear(),
  start_date: null,
  end_date: null,
  active: DEFAULT_ACTIVE,
  status: DEFAULT_STATUS_ID,
})

const initialState: WeeksState = {
  weeks: [],
  currentWeek: buildDefaultWeek(),
  loading: false,
  error: null,
  total: 0,
}

export const loadWeeks = createAsyncThunk('weeks/loadWeeks', async (_, { rejectWithValue }) => {
  try {
    return await weeksAPI.getWeeks()
  } catch (error: any) {
    return rejectWithValue(toErrorPayload(error, 'Failed to load weeks'))
  }
})

export const loadWeek = createAsyncThunk(
  'weeks/loadWeek',
  async (id: number, { rejectWithValue, getState, dispatch }) => {
    try {
      const state: any = getState()
      const existing = state?.weeks?.weeks?.find((w: Week) => w.week_id === id || w.id === id)
      if (existing) {
        return existing
      }

      // Backend does not expose GET /weeks/:id, fetch list and pick one
      const all = await weeksAPI.getWeeks()
      if (Array.isArray(all.data) && all.data.length) {
        dispatch(setWeeks(all.data))
      }
      const found = all.data.find((w: Week) => w.week_id === id || w.id === id)
      if (found) return found

      throw new Error('Week not found')
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to load week'))
    }
  }
)

export const createWeek = createAsyncThunk('weeks/createWeek', async (week: Week, { rejectWithValue }) => {
  try {
    return await weeksAPI.createWeek(week)
  } catch (error: any) {
    return rejectWithValue(toErrorPayload(error, 'Failed to create week'))
  }
})

export const updateWeek = createAsyncThunk(
  'weeks/updateWeek',
  async ({ id, week }: { id: number; week: Week }, { rejectWithValue }) => {
    try {
      return await weeksAPI.updateWeek(id, week)
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to update week'))
    }
  }
)

export const deleteWeek = createAsyncThunk('weeks/deleteWeek', async (id: number, { rejectWithValue }) => {
  try {
    await weeksAPI.deleteWeek(id)
    return id
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return id
    }
    return rejectWithValue(toErrorPayload(error, 'Failed to delete week'))
  }
})

const weeksSlice = createSlice({
  name: 'weeks',
  initialState,
  reducers: {
    clearCurrentWeek: (state) => {
      state.currentWeek = null
    },
    setDefaultWeek: (state) => {
      state.currentWeek = buildDefaultWeek()
      state.error = null
    },
    setWeeks: (state, action) => {
      state.weeks = action.payload || []
      state.total = state.weeks.length
    },
    setCurrentWeek: (state, action) => {
      state.currentWeek = action.payload
    },
    clearWeekError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWeeks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadWeeks.fulfilled, (state, action) => {
        state.loading = false
        state.weeks = action.payload.data
        state.total = action.payload.total ?? action.payload.data.length
      })
      .addCase(loadWeeks.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to load weeks'
      })
      .addCase(loadWeek.fulfilled, (state, action) => {
        state.currentWeek = action.payload
        if (action.payload?.week_id) {
          const exists = state.weeks.some((w) => w.week_id === action.payload.week_id)
          state.weeks = exists
            ? state.weeks.map((w) => (w.week_id === action.payload.week_id ? action.payload : w))
            : [...state.weeks, action.payload]
        }
      })
      .addCase(loadWeek.rejected, (state, action) => {
        state.error = (action.payload as any) || 'Failed to load week'
      })
      .addCase(createWeek.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createWeek.fulfilled, (state, action) => {
        state.loading = false
        state.currentWeek = action.payload
        state.weeks = [...state.weeks, action.payload]
      })
      .addCase(createWeek.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to create week'
      })
      .addCase(updateWeek.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateWeek.fulfilled, (state, action) => {
        state.loading = false
        state.currentWeek = action.payload
        state.weeks = state.weeks.map((week) => (week.week_id === action.payload.week_id ? action.payload : week))
      })
      .addCase(updateWeek.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to update week'
      })
      .addCase(deleteWeek.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteWeek.fulfilled, (state, action) => {
        state.loading = false
        state.weeks = state.weeks.filter((week) => week.week_id !== action.payload)
      })
      .addCase(deleteWeek.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to delete week'
      })
  },
})

export const { clearCurrentWeek, setDefaultWeek, setCurrentWeek, clearWeekError, setWeeks } = weeksSlice.actions
export default weeksSlice.reducer
