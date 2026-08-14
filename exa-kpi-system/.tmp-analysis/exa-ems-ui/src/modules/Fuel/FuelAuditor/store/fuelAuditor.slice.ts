import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type {
  GasStationTransaction,
  FuelAuditorErrors,
  FuelAuditorListParams,
  FuelAuditorListResponse,
  BulkPaymentStatusPayload,
  LinkFuelOrderPayload,
  PaymentStatusOption,
  FuelOrderSummary,
} from '../types/fuelAuditor.types'
import { fuelAuditorApi } from '../api/fuelAuditor.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface FuelAuditorState {
  list: GasStationTransaction[]
  total: number
  page: number
  rowsPerPage: number
  current: GasStationTransaction | null
  currentFuelOrder: FuelOrderSummary | null
  errors: FuelAuditorErrors
  statuses: StatusFlags
  loadingList: boolean
  loadingCurrent: boolean
  saving: boolean
  deleting: boolean
  gasSupplierStatusList: PaymentStatusOption[]
  subdivisionStatusList: PaymentStatusOption[]
  searchResults: FuelOrderSummary[]
}

const initialState: FuelAuditorState = {
  list: [],
  total: 0,
  page: 1,
  rowsPerPage: 15,
  current: null,
  currentFuelOrder: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,
  gasSupplierStatusList: [],
  subdivisionStatusList: [],
  searchResults: [],
}

export const fetchFuelAuditorList = createAsyncThunk<
  FuelAuditorListResponse,
  FuelAuditorListParams,
  { rejectValue: FuelAuditorErrors }
>('fuelAuditor/fetchList', async (params, thunkAPI) => {
  try {
    return await fuelAuditorApi.fetchList(params)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const fetchFuelAuditorTransaction = createAsyncThunk<
  GasStationTransaction,
  number,
  { rejectValue: FuelAuditorErrors }
>('fuelAuditor/fetchById', async (id, thunkAPI) => {
  try {
    return await fuelAuditorApi.fetchById(id)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const fetchLinkedFuelOrder = createAsyncThunk<
  FuelOrderSummary,
  number,
  { rejectValue: FuelAuditorErrors }
>('fuelAuditor/fetchFuelOrder', async (id, thunkAPI) => {
  try {
    return await fuelAuditorApi.fetchFuelOrder(id)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const deleteFuelAuditorTransaction = createAsyncThunk<
  number,
  number,
  { rejectValue: FuelAuditorErrors }
>('fuelAuditor/delete', async (id, thunkAPI) => {
  try {
    await fuelAuditorApi.remove(id)
    return id
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const bulkDeleteTransactions = createAsyncThunk<
  number[],
  number[],
  { rejectValue: FuelAuditorErrors }
>('fuelAuditor/bulkDelete', async (ids, thunkAPI) => {
  try {
    await fuelAuditorApi.bulkDelete(ids)
    return ids
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const bulkUpdatePaymentStatus = createAsyncThunk<
  void,
  BulkPaymentStatusPayload,
  { rejectValue: FuelAuditorErrors }
>('fuelAuditor/bulkUpdatePayment', async (payload, thunkAPI) => {
  try {
    await fuelAuditorApi.bulkUpdatePaymentStatus(payload)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const linkFuelOrder = createAsyncThunk<
  any,
  LinkFuelOrderPayload,
  { rejectValue: FuelAuditorErrors }
>('fuelAuditor/linkFuelOrder', async (payload, thunkAPI) => {
  try {
    return await fuelAuditorApi.linkFuelOrder(payload)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const updateAuditorPaymentStatus = createAsyncThunk(
  'fuelAuditor/updatePaymentStatus',
  async (
    payload: {
      fuelOrderId: number
      gasSupplierPaymentStatus?: number
      subdivisionPaymentStatus?: number
    },
    thunkAPI,
  ) => {
    try {
      return await fuelAuditorApi.updatePaymentStatus(
        payload.fuelOrderId,
        payload,
      )
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.errors ?? err.message,
      )
    }
  },
)

export const searchUnlinkedFuelOrders = createAsyncThunk(
  'fuelAuditor/searchUnlinked',
  async (
    payload: { query?: string; transactionData?: any },
    thunkAPI,
  ) => {
    try {
      return await fuelAuditorApi.searchUnlinkedFuelOrders(
        payload.query,
        payload.transactionData,
      )
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

export const exportFuelAuditorExcel = createAsyncThunk<
  void,
  FuelAuditorListParams,
  { rejectValue: FuelAuditorErrors }
>('fuelAuditor/exportExcel', async (params, thunkAPI) => {
  try {
    const blob = await fuelAuditorApi.exportExcel(params)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fuel_auditor_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const loadGasSupplierPaymentStatusOptions = createAsyncThunk(
  'fuelAuditor/loadGasSupplierStatuses',
  async (_arg: void, thunkAPI) => {
    try {
      return await fuelAuditorApi.loadPaymentStatusOptions(
        'gas_supplier_payment_status',
      )
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

export const loadSubdivisionPaymentStatusOptions = createAsyncThunk(
  'fuelAuditor/loadSubdivisionStatuses',
  async (_arg: void, thunkAPI) => {
    try {
      return await fuelAuditorApi.loadPaymentStatusOptions(
        'subdivision_payment_status',
      )
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message)
    }
  },
)

const fuelAuditorSlice = createSlice({
  name: 'fuelAuditor',
  initialState,
  reducers: {
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload
    },
    clearCurrent(state) {
      state.current = null
      state.currentFuelOrder = null
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchFuelAuditorList.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchFuelAuditorList.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload.data
        state.total = action.payload.total
        state.page = action.payload.page
      })
      .addCase(fetchFuelAuditorList.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    // Single
    builder
      .addCase(fetchFuelAuditorTransaction.pending, (state) => {
        state.loadingCurrent = true
        state.errors = null
      })
      .addCase(fetchFuelAuditorTransaction.fulfilled, (state, action) => {
        state.loadingCurrent = false
        state.current = action.payload
      })
      .addCase(fetchFuelAuditorTransaction.rejected, (state, action) => {
        state.loadingCurrent = false
        state.errors = action.payload ?? action.error
      })

    // Linked fuel order
    builder.addCase(fetchLinkedFuelOrder.fulfilled, (state, action) => {
      state.currentFuelOrder = action.payload
    })

    // Delete
    builder
      .addCase(deleteFuelAuditorTransaction.pending, (state) => {
        state.deleting = true
      })
      .addCase(deleteFuelAuditorTransaction.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter(
          (x) => x.gasStationTransactionId !== action.payload,
        )
        state.total = Math.max(0, state.total - 1)
        state.statuses.deleted = true
      })
      .addCase(deleteFuelAuditorTransaction.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })

    // Bulk delete
    builder.addCase(bulkDeleteTransactions.fulfilled, (state, action) => {
      state.list = state.list.filter(
        (x) => !action.payload.includes(x.gasStationTransactionId),
      )
      state.total = Math.max(0, state.total - action.payload.length)
      state.statuses.deleted = true
    })

    // Bulk update payment
    builder.addCase(bulkUpdatePaymentStatus.fulfilled, (state) => {
      state.statuses.updated = true
    })

    // Link fuel order
    builder.addCase(linkFuelOrder.fulfilled, (state) => {
      state.statuses.updated = true
    })

    // Update payment status
    builder.addCase(updateAuditorPaymentStatus.fulfilled, (state) => {
      state.statuses.updated = true
    })

    // Search unlinked
    builder.addCase(searchUnlinkedFuelOrders.fulfilled, (state, action: any) => {
      state.searchResults = action.payload ?? []
    })

    // Payment status options
    builder.addCase(loadGasSupplierPaymentStatusOptions.fulfilled, (state, action: any) => {
      state.gasSupplierStatusList = action.payload ?? []
    })
    builder.addCase(loadSubdivisionPaymentStatusOptions.fulfilled, (state, action: any) => {
      state.subdivisionStatusList = action.payload ?? []
    })
  },
})

export const {
  resetStatuses,
  setPage,
  clearCurrent,
} = fuelAuditorSlice.actions

export default fuelAuditorSlice.reducer

export const selectFuelAuditorList = (s: RootState) => s.fuelAuditor.list
export const selectFuelAuditorTotal = (s: RootState) => s.fuelAuditor.total
export const selectFuelAuditorPage = (s: RootState) => s.fuelAuditor.page
export const selectFuelAuditorCurrent = (s: RootState) => s.fuelAuditor.current
export const selectFuelAuditorCurrentFuelOrder = (s: RootState) => s.fuelAuditor.currentFuelOrder
export const selectFuelAuditorErrors = (s: RootState) => s.fuelAuditor.errors
export const selectFuelAuditorStatuses = (s: RootState) => s.fuelAuditor.statuses
export const selectFuelAuditorLoadingList = (s: RootState) => s.fuelAuditor.loadingList
export const selectFuelAuditorLoadingCurrent = (s: RootState) => s.fuelAuditor.loadingCurrent
export const selectFuelAuditorGasSupplierStatuses = (s: RootState) => s.fuelAuditor.gasSupplierStatusList
export const selectFuelAuditorSubdivisionStatuses = (s: RootState) => s.fuelAuditor.subdivisionStatusList
export const selectFuelAuditorSearchResults = (s: RootState) => s.fuelAuditor.searchResults
