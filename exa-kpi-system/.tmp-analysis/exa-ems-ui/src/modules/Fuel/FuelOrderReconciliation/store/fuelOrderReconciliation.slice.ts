import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type {
  UploadSession,
  ReconciliationTransaction,
  FuelOrderReconciliationErrors,
  ValidateReconciliationPayload,
  ProcessReconciliationPayload,
  ReconciliationSessionData,
} from '../types/fuelOrderReconciliation.types'
import { fuelOrderReconciliationApi } from '../api/fuelOrderReconciliation.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
  processed: boolean
}

interface FuelOrderReconciliationState {
  reconciliationList: UploadSession[]
  reconciliationData: ReconciliationTransaction[]
  errors: FuelOrderReconciliationErrors
  statuses: StatusFlags
  loadingList: boolean
  loadingData: boolean
  processing: boolean
  gasStationId: number | null
  gasStationName: string
  uploadSessionId: number | null
  uploadDate: string | null
  totalTransactions: number
  matchedTransactions: number
  unmatchedTransactions: number
}

const initialState: FuelOrderReconciliationState = {
  reconciliationList: [],
  reconciliationData: [],
  errors: null,
  statuses: { added: false, updated: false, deleted: false, processed: false },
  loadingList: false,
  loadingData: false,
  processing: false,
  gasStationId: null,
  gasStationName: '',
  uploadSessionId: null,
  uploadDate: null,
  totalTransactions: 0,
  matchedTransactions: 0,
  unmatchedTransactions: 0,
}

export const fetchReconciliationList = createAsyncThunk<
  UploadSession[],
  void,
  { rejectValue: FuelOrderReconciliationErrors }
>('fuelOrderReconciliation/fetchList', async (_arg, thunkAPI) => {
  try {
    return await fuelOrderReconciliationApi.fetchList()
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const fetchUploadSession = createAsyncThunk<
  ReconciliationSessionData,
  number,
  { rejectValue: FuelOrderReconciliationErrors }
>('fuelOrderReconciliation/fetchSession', async (id, thunkAPI) => {
  try {
    return await fuelOrderReconciliationApi.fetchById(id)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const validateReconciliationData = createAsyncThunk<
  ReconciliationTransaction[],
  ValidateReconciliationPayload,
  { rejectValue: FuelOrderReconciliationErrors }
>('fuelOrderReconciliation/validate', async (payload, thunkAPI) => {
  try {
    return await fuelOrderReconciliationApi.validateData(payload)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const processReconciliation = createAsyncThunk<
  any,
  ProcessReconciliationPayload,
  { rejectValue: FuelOrderReconciliationErrors }
>('fuelOrderReconciliation/process', async (payload, thunkAPI) => {
  try {
    return await fuelOrderReconciliationApi.processReconciliation(payload)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const deleteUploadSession = createAsyncThunk<
  number,
  number,
  { rejectValue: FuelOrderReconciliationErrors }
>('fuelOrderReconciliation/deleteSession', async (id, thunkAPI) => {
  try {
    await fuelOrderReconciliationApi.deleteUploadSession(id)
    return id
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

export const deleteGasStationTransaction = createAsyncThunk<
  number,
  number,
  { rejectValue: FuelOrderReconciliationErrors }
>('fuelOrderReconciliation/deleteTransaction', async (id, thunkAPI) => {
  try {
    await fuelOrderReconciliationApi.deleteGasStationTransaction(id)
    return id
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message,
    )
  }
})

const fuelOrderReconciliationSlice = createSlice({
  name: 'fuelOrderReconciliation',
  initialState,
  reducers: {
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false, processed: false }
      state.errors = null
    },
    clearReconciliationData(state) {
      state.reconciliationData = []
      state.gasStationId = null
      state.gasStationName = ''
      state.uploadSessionId = null
      state.uploadDate = null
      state.totalTransactions = 0
      state.matchedTransactions = 0
      state.unmatchedTransactions = 0
    },
    setReconciliationData(
      state,
      action: PayloadAction<{
        data: ReconciliationTransaction[]
        gasStationId: number
        gasStationName: string
      }>,
    ) {
      state.reconciliationData = action.payload.data
      state.gasStationId = action.payload.gasStationId
      state.gasStationName = action.payload.gasStationName
    },
    removeTransaction(state, action: PayloadAction<string>) {
      state.reconciliationData = state.reconciliationData.filter(
        (t) => t.transactionId !== action.payload,
      )
    },
    removeAllDuplicates(state) {
      state.reconciliationData = state.reconciliationData.filter(
        (t) => !t.isDuplicate,
      )
    },
    clearErrors(state) {
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchReconciliationList.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchReconciliationList.fulfilled, (state, action) => {
        state.loadingList = false
        state.reconciliationList = action.payload
      })
      .addCase(fetchReconciliationList.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    // Fetch session
    builder
      .addCase(fetchUploadSession.pending, (state) => {
        state.loadingData = true
        state.errors = null
      })
      .addCase(fetchUploadSession.fulfilled, (state, action) => {
        state.loadingData = false
        state.reconciliationData = action.payload.reconciliationData
        state.gasStationId = action.payload.gasStationId
        state.gasStationName = action.payload.gasStationName
        state.uploadSessionId = action.payload.uploadSessionId ?? null
        state.uploadDate = action.payload.uploadDate ?? null
        state.totalTransactions = action.payload.totalTransactions ?? 0
        state.matchedTransactions = action.payload.matchedTransactions ?? 0
        state.unmatchedTransactions = action.payload.unmatchedTransactions ?? 0
      })
      .addCase(fetchUploadSession.rejected, (state, action) => {
        state.loadingData = false
        state.errors = action.payload ?? action.error
      })

    // Validate
    builder
      .addCase(validateReconciliationData.pending, (state) => {
        state.loadingData = true
        state.errors = null
      })
      .addCase(validateReconciliationData.fulfilled, (state, action) => {
        state.loadingData = false
        state.reconciliationData = action.payload
      })
      .addCase(validateReconciliationData.rejected, (state, action) => {
        state.loadingData = false
        state.errors = action.payload ?? action.error
      })

    // Process
    builder
      .addCase(processReconciliation.pending, (state) => {
        state.processing = true
        state.errors = null
      })
      .addCase(processReconciliation.fulfilled, (state) => {
        state.processing = false
        state.statuses.processed = true
      })
      .addCase(processReconciliation.rejected, (state, action) => {
        state.processing = false
        state.errors = action.payload ?? action.error
      })

    // Delete session
    builder
      .addCase(deleteUploadSession.fulfilled, (state, action) => {
        state.reconciliationList = state.reconciliationList.filter(
          (s) => s.uploadSessionId !== action.payload,
        )
        state.statuses.deleted = true
      })

    // Delete transaction
    builder
      .addCase(deleteGasStationTransaction.fulfilled, (state, action) => {
        state.reconciliationData = state.reconciliationData.filter(
          (t) => t.gasStationTransactionId !== action.payload,
        )
        state.statuses.deleted = true
      })
  },
})

export const {
  resetStatuses,
  clearReconciliationData,
  setReconciliationData,
  removeTransaction,
  removeAllDuplicates,
  clearErrors,
} = fuelOrderReconciliationSlice.actions

export default fuelOrderReconciliationSlice.reducer

export const selectReconciliationList = (s: RootState) => s.fuelOrderReconciliation.reconciliationList
export const selectReconciliationData = (s: RootState) => s.fuelOrderReconciliation.reconciliationData
export const selectReconciliationErrors = (s: RootState) => s.fuelOrderReconciliation.errors
export const selectReconciliationStatuses = (s: RootState) => s.fuelOrderReconciliation.statuses
export const selectReconciliationLoadingList = (s: RootState) => s.fuelOrderReconciliation.loadingList
export const selectReconciliationLoadingData = (s: RootState) => s.fuelOrderReconciliation.loadingData
export const selectReconciliationProcessing = (s: RootState) => s.fuelOrderReconciliation.processing
export const selectReconciliationGasStationId = (s: RootState) => s.fuelOrderReconciliation.gasStationId
export const selectReconciliationGasStationName = (s: RootState) => s.fuelOrderReconciliation.gasStationName
export const selectReconciliationUploadDate = (s: RootState) => s.fuelOrderReconciliation.uploadDate
export const selectReconciliationTotalTransactions = (s: RootState) => s.fuelOrderReconciliation.totalTransactions
export const selectReconciliationMatchedTransactions = (s: RootState) => s.fuelOrderReconciliation.matchedTransactions
export const selectReconciliationUnmatchedTransactions = (s: RootState) => s.fuelOrderReconciliation.unmatchedTransactions
