import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ReportsState } from '../types/report.types'
import ReportsAPI from '../api/reports.api'

const initialState: ReportsState = {
  lookups: {},
  storageReportLines: [],
  rentalReportLines: [],
  inventoryReportLines: [],
  activityReportLines: [],
  isLoading: false,
}

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.errors?.[0]?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback

export const loadAttributeItems = createAsyncThunk(
  'depot-reports/loadAttributeItems',
  async (args: { attributeFlatNameId: string | number; moduleFlatNameId: string | number; propertyName: string }, { rejectWithValue }) => {
    try {
      const res = await ReportsAPI.loadAttributeItems(args.attributeFlatNameId, args.moduleFlatNameId)
      return { ...res, propertyName: args.propertyName }
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load attributes'))
    }
  }
)

export const loadLookups = createAsyncThunk(
  'depot-reports/loadFilterLookups',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'depot_report_type', moduleFlatNameId: 'depot_reports', propertyName: 'reportTypesList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'genset_type', moduleFlatNameId: 'genset', propertyName: 'gensetTypesList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'gate', moduleFlatNameId: 'gate', propertyName: 'gateTypesList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'request_type', moduleFlatNameId: 'equipment_request', propertyName: 'requestTypesList' })).unwrap()
      return true
    } catch (e: any) {
      // If any individual lookup fails, surface a single message
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load lookups'))
    }
  }
)

export const loadStorageReportLines = createAsyncThunk<
  { storageReportLines: any[] }, any,
  { rejectValue: unknown }
>('depot-reports/loadStorageReportLines', async (filters, thunkApi) => {
  try {
    return await ReportsAPI.loadStorageReportLines(filters);
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to load storage records'));
  }
})

export const loadRentalReportLines = createAsyncThunk<
  { rentalReportLines: any[] }, any,
  { rejectValue: unknown }
>('depot-reports/loadRentalReportLines', async (filters, thunkApi) => {
  try {
    return await ReportsAPI.loadRentalReportLines(filters);
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to load rental records'));
  }
})

export const loadInventoryReportLines = createAsyncThunk<
  { inventoryReportLines: any[] }, any,
  { rejectValue: unknown }
>('depot-reports/loadInventoryReportLines', async (filters, thunkApi) => {
  try {
    return await ReportsAPI.loadInventoryReportLines(filters);
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to load inventory records'));
  }
})

export const loadActivityReportLines = createAsyncThunk<
  { activityReportLines: any[] }, any,
  { rejectValue: unknown }
>('depot-reports/loadActivityReportLines', async (filters, thunkApi) => {
  try {
    return await ReportsAPI.loadActivityReportLines(filters);
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to load activity invoice lines'));
  }
})

const reportsSlice = createSlice({
  name: 'depotReports',
  initialState,
  reducers: {
    // pending
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAttributeItems.fulfilled, (state, action) => {
        state.lookups[action.payload.propertyName] = action.payload.items
        state.errors = null
      })
      .addCase(loadAttributeItems.rejected, (state, action) => {
        state.errors = action.payload ?? action.error
      })
      .addCase(loadStorageReportLines.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadStorageReportLines.fulfilled, (state, action) => {
        state.isLoading = false
        state.storageReportLines = action.payload.storageReportLines
        state.errors = null
      })
      .addCase(loadStorageReportLines.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })
      .addCase(loadRentalReportLines.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadRentalReportLines.fulfilled, (state, action) => {
        state.isLoading = false
        state.rentalReportLines = action.payload.rentalReportLines
        state.errors = null
      })
      .addCase(loadRentalReportLines.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })
      .addCase(loadInventoryReportLines.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadInventoryReportLines.fulfilled, (state, action) => {
        state.isLoading = false
        state.inventoryReportLines = action.payload.inventoryReportLines
        state.errors = null
      })
      .addCase(loadInventoryReportLines.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })
      .addCase(loadActivityReportLines.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadActivityReportLines.fulfilled, (state, action) => {
        state.isLoading = false
        state.activityReportLines = action.payload.activityReportLines
        state.errors = null
      })
      .addCase(loadActivityReportLines.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const {
  // pending
} = reportsSlice.actions

export default reportsSlice.reducer


