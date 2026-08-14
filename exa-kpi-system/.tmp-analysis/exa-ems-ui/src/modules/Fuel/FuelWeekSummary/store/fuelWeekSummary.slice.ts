import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type {
  SummaryRow,
  AttributeOption,
  FuelWeekSummaryErrorState,
} from '../types/fuelWeekSummary.types'
import { fuelWeekSummaryApi } from '../api/fuelWeekSummary.api'

interface FuelWeekSummaryState {
  summary: SummaryRow[]
  fuelStatementStatuses: AttributeOption[]
  supplierStatementStatuses: AttributeOption[]
  assetTypes: AttributeOption[]
  orderTypes: AttributeOption[]
  reconciliationStatuses: AttributeOption[]
  errors: FuelWeekSummaryErrorState
  loading: boolean
}

const initialState: FuelWeekSummaryState = {
  summary: [],
  fuelStatementStatuses: [],
  supplierStatementStatuses: [],
  assetTypes: [],
  orderTypes: [],
  reconciliationStatuses: [],
  errors: null,
  loading: false,
}

const rejectError = (err: any) =>
  err?.response?.data?.errors ?? err?.data?.errors ?? err?.message ?? 'Unknown error'

export const generateFuelWeekReport = createAsyncThunk<
  SummaryRow[],
  any,
  { rejectValue: FuelWeekSummaryErrorState }
>('fuelWeekSummary/generate', async (filters, thunkAPI) => {
  try {
    return await fuelWeekSummaryApi.generateReport(filters)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const loadFuelStatementStatuses = createAsyncThunk<
  AttributeOption[], void, { rejectValue: FuelWeekSummaryErrorState }
>('fuelWeekSummary/loadFuelStatementStatuses', async (_, thunkAPI) => {
  try {
    return await fuelWeekSummaryApi.loadAttributeItems('subdivision_payment_status', 'fuel_order')
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const loadSupplierStatementStatuses = createAsyncThunk<
  AttributeOption[], void, { rejectValue: FuelWeekSummaryErrorState }
>('fuelWeekSummary/loadSupplierStatementStatuses', async (_, thunkAPI) => {
  try {
    return await fuelWeekSummaryApi.loadAttributeItems('gas_supplier_payment_status', 'fuel_order')
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const loadAssetTypes = createAsyncThunk<
  AttributeOption[], void, { rejectValue: FuelWeekSummaryErrorState }
>('fuelWeekSummary/loadAssetTypes', async (_, thunkAPI) => {
  try {
    return await fuelWeekSummaryApi.loadAttributeItems('vehicle_type', 'trucks')
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const loadOrderTypes = createAsyncThunk<
  AttributeOption[], void, { rejectValue: FuelWeekSummaryErrorState }
>('fuelWeekSummary/loadOrderTypes', async (_, thunkAPI) => {
  try {
    return await fuelWeekSummaryApi.loadAttributeItems('tipo_de_labor', 'fuel_order')
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const loadReconciliationStatuses = createAsyncThunk<
  AttributeOption[], void, { rejectValue: FuelWeekSummaryErrorState }
>('fuelWeekSummary/loadReconciliationStatuses', async (_, thunkAPI) => {
  try {
    return await fuelWeekSummaryApi.loadAttributeItems('reconciliation_status', 'fuel_order')
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

const fuelWeekSummarySlice = createSlice({
  name: 'fuelWeekSummary',
  initialState,
  reducers: {
    clearSummary(state) {
      state.summary = []
      state.errors = null
    },
    clearErrors(state) {
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateFuelWeekReport.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(generateFuelWeekReport.fulfilled, (state, action) => {
        state.loading = false
        state.summary = action.payload
      })
      .addCase(generateFuelWeekReport.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload ?? action.error
      })

    builder.addCase(loadFuelStatementStatuses.fulfilled, (state, action) => {
      state.fuelStatementStatuses = action.payload
    })
    builder.addCase(loadSupplierStatementStatuses.fulfilled, (state, action) => {
      state.supplierStatementStatuses = action.payload
    })
    builder.addCase(loadAssetTypes.fulfilled, (state, action) => {
      state.assetTypes = action.payload
    })
    builder.addCase(loadOrderTypes.fulfilled, (state, action) => {
      state.orderTypes = action.payload
    })
    builder.addCase(loadReconciliationStatuses.fulfilled, (state, action) => {
      state.reconciliationStatuses = action.payload
    })
  },
})

export const { clearSummary, clearErrors } = fuelWeekSummarySlice.actions
export default fuelWeekSummarySlice.reducer

export const selectFuelWeekSummary = (s: RootState) => s.fuelWeekSummary.summary
export const selectFuelWeekSummaryLoading = (s: RootState) => s.fuelWeekSummary.loading
export const selectFuelWeekSummaryErrors = (s: RootState) => s.fuelWeekSummary.errors
export const selectFuelStatementStatuses = (s: RootState) => s.fuelWeekSummary.fuelStatementStatuses
export const selectSupplierStatementStatuses = (s: RootState) => s.fuelWeekSummary.supplierStatementStatuses
export const selectAssetTypes = (s: RootState) => s.fuelWeekSummary.assetTypes
export const selectOrderTypes = (s: RootState) => s.fuelWeekSummary.orderTypes
export const selectReconciliationStatuses = (s: RootState) => s.fuelWeekSummary.reconciliationStatuses
