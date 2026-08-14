import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { rentalStatementAPI } from '../api/rentalStatement.api'
import type {
  RentalDepotStatement,
  RentalInvoiceLine,
  RentalStatementSearchParams,
  RentalStatementState,
} from '../types/rentalStatement.types'

const initialState: RentalStatementState = {
  invoiceLines: [],
  current: {
    client: null,
    depots: [],
    exchangeRate: null,
    weeks: [],
    endDate: null,
    all_depots: null,
    all_weeks: null,
    status: 1,
    upToDate: false,
  },
  list: [],
  isLoading: false,
  isSaving: false,
  errors: null,
}


const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.errors?.[0]?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback


export const loadRentalDepotStatement = createAsyncThunk<
  { depotStatement: RentalDepotStatement },
  number,
  { rejectValue: unknown }
>('rentalStatement/loadRentalDepotStatement', async (id, thunkApi) => {
  try {
    return await rentalStatementAPI.loadOne(id)
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to load rental statement'))
  }
})

export const loadInvoiceLines = createAsyncThunk<
  { invoiceLines: RentalInvoiceLine[][] },
  RentalStatementSearchParams,
  { rejectValue: unknown }
>('rentalStatement/loadInvoiceLines', async (filters, thunkApi) => {
  try {
    return await rentalStatementAPI.loadInvoiceLines(filters)
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to load invoice lines'))
  }
})

export const addDepotStatement = createAsyncThunk<
  { depotStatement: RentalDepotStatement },
  { data: RentalInvoiceLine[][]; searchParams: RentalStatementSearchParams },
  { rejectValue: unknown }
>('rentalStatement/addDepotStatement', async (payload, thunkApi) => {
  try {
    return await rentalStatementAPI.create(payload.data, payload.searchParams)
  } catch (error: any) {
     return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to create rental statement'))
  }
})

export const deleteStatement = createAsyncThunk<
  { id: number },
  number,
  { rejectValue: unknown }
>('rentalStatement/deleteStatement', async (id, thunkApi) => {
  try {
    return await rentalStatementAPI.delete(id)
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to delete rental statement'))
  }
})

const rentalStatementSlice = createSlice({
  name: 'rentalStatement',
  initialState,
  reducers: {
    resetRentalStatementState: () => initialState,
    setRentalStatementList(state, action: PayloadAction<RentalDepotStatement[]>) {
      state.list = action.payload
    },
    clearRentalStatementErrors(state) {
      console.log('clear Errors slice');
      state.errors = null
    },
    clearCurrent(state) {
      state.current = initialState.current
    }
  },
  extraReducers: (builder) => {
    builder

      // loadRentalDepotStatement
      .addCase(loadRentalDepotStatement.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadRentalDepotStatement.fulfilled, (state, action) => {
        state.isLoading = false
        state.current = action.payload.depotStatement
        state.errors = null
      })
      .addCase(loadRentalDepotStatement.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })

      // loadInvoiceLines
      .addCase(loadInvoiceLines.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadInvoiceLines.fulfilled, (state, action) => {
        state.isLoading = false
        state.invoiceLines = action.payload.invoiceLines
        state.errors = null
      })
      .addCase(loadInvoiceLines.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })

      // addDepotStatement
      .addCase(addDepotStatement.pending, (state) => {
        state.isSaving = true
        state.errors = null
      })
      .addCase(addDepotStatement.fulfilled, (state, action) => {
        state.isSaving = false
        state.current = action.payload.depotStatement
        state.list.unshift(action.payload.depotStatement)
        state.errors = null
      })
      .addCase(addDepotStatement.rejected, (state, action) => {
        state.isSaving = false
        state.errors = action.payload ?? action.error
      })

      // deleteStatement
      .addCase(deleteStatement.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(deleteStatement.fulfilled, (state, action) => {
        console.log("delete action: ",action.payload);
        state.isLoading = false
        state.list = state.list.filter(
          (record) => record.depotStatementId !== action.payload.id
        )
        state.errors = null
      })
      .addCase(deleteStatement.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const {
  resetRentalStatementState,
  setRentalStatementList,
  clearRentalStatementErrors,
  clearCurrent
} = rentalStatementSlice.actions

export default rentalStatementSlice.reducer