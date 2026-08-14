import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { storageStatementAPI } from '../api/storageStatement.api'
import type {
  StorageDepotStatement,
  StorageInvoiceDepotGroup,
  StorageStatementSearchParams,
  StorageStatementState,
} from '../types/storageStatement.types'

const depotStatementDefault: StorageDepotStatement = {
  client: null,
  depots: [],
  exchangeRate: null,
  services: [],
  weeks: [],
  equipmentsTypes: [],
  startDate: null,
  endDate: null,
  comments: null,
  equipments_Types: null,
  all_depots: null,
  all_equipments_Types: null,
  all_weeks: null,
  upToDate: false,
  status: 1,
}

const initialState: StorageStatementState = {
  invoiceLines: [],
  depotStatement: {
    ...depotStatementDefault,
    all_services: null,
  },
  list: [],
  jobs: [],
  statementTypes: [],
  isLoading: false,
  isSaving: false,
  errors: null,
}

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.errors?.[0]?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback

export const loadStorageStatement = createAsyncThunk<
  { depotStatement: StorageDepotStatement },
  number,
  { rejectValue: unknown }
>('storageStatement/loadStorageStatement', async (id, thunkApi) => {
  try {
    return await storageStatementAPI.loadOne(id)
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to load storage statement'));
  }
})

export const loadStorageInvoiceLines = createAsyncThunk<
  { invoiceLines: StorageInvoiceDepotGroup[] },
  StorageStatementSearchParams,
  { rejectValue: unknown }
>('storageStatement/loadStorageInvoiceLines', async (filters, thunkApi) => {
  try {
    return await storageStatementAPI.loadInvoiceLines(filters)
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to load invoice lines'));
  }
})

export const addStorageStatement = createAsyncThunk<
  { depotStatement: StorageDepotStatement },
  { data: StorageInvoiceDepotGroup[]; searchParams: StorageStatementSearchParams },
  { rejectValue: unknown }
>('storageStatement/addStorageStatement', async (payload, thunkApi) => {
  try {
    return await storageStatementAPI.create(payload.data, payload.searchParams)
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to add storage statement'));
  }
})

export const saveStorageStatement = createAsyncThunk<
  { depotStatement: StorageDepotStatement },
  { data: StorageInvoiceDepotGroup[]; searchParams: StorageStatementSearchParams },
  { rejectValue: unknown }
>('storageStatement/saveStorageStatement', async (payload, thunkApi) => {
  try {
    return await storageStatementAPI.save(payload.data, payload.searchParams)
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to save storage statement'));
  }
})

export const deleteStorageStatement = createAsyncThunk<
  { id: number },
  number,
  { rejectValue: unknown }
>('storageStatement/deleteStorageStatement', async (id, thunkApi) => {
  try {
    return await storageStatementAPI.delete(id)
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to delete storage statement'));
  }
})

export const loadStorageAttributeItems = createAsyncThunk<
  { propertyName: string; items: unknown[] },
  { attributeFlatNameId: string | number; moduleFlatNameId: string | number; propertyName: string },
  { rejectValue: unknown }
>('storageStatement/loadStorageAttributeItems', async (payload, thunkApi) => {
  try {
    const result = await storageStatementAPI.loadAttributeItems(
      payload.attributeFlatNameId,
      payload.moduleFlatNameId
    )

    return {
      propertyName: payload.propertyName,
      items: result.items,
    }
  } catch (error: any) {
    return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to load attribute items'));
  }
})

const storageStatementSlice = createSlice({
  name: 'storageStatement',
  initialState,
  reducers: {
    resetStorageStatementState: () => initialState,
    loadDefaultStorageStatement(state) {
      state.depotStatement = { ...depotStatementDefault }
      state.errors = null
    },
    clearCurrentStorageStatement(state) {
      state.depotStatement = { ...depotStatementDefault }
    },
    setStorageStatementList(state, action: PayloadAction<StorageDepotStatement[]>) {
      state.list = action.payload
    },
    clearStorageStatementErrors(state) {
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStorageStatement.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadStorageStatement.fulfilled, (state, action) => {
        state.isLoading = false
        state.depotStatement = action.payload.depotStatement
        state.errors = null
      })
      .addCase(loadStorageStatement.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })

      .addCase(loadStorageInvoiceLines.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadStorageInvoiceLines.fulfilled, (state, action) => {
        state.isLoading = false
        state.invoiceLines = action.payload.invoiceLines
        state.errors = null
      })
      .addCase(loadStorageInvoiceLines.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })

      .addCase(addStorageStatement.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(addStorageStatement.fulfilled, (state, action) => {
        state.isLoading = false
        state.depotStatement = action.payload.depotStatement
        state.list.unshift(action.payload.depotStatement)
        state.errors = null
      })
      .addCase(addStorageStatement.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })

      .addCase(saveStorageStatement.pending, (state) => {
        state.isSaving = true
        state.errors = null
      })
      .addCase(saveStorageStatement.fulfilled, (state, action) => {
        state.isSaving = false
        state.depotStatement = action.payload.depotStatement
        state.errors = null
      })
      .addCase(saveStorageStatement.rejected, (state, action) => {
        state.isSaving = false
        state.errors = action.payload ?? action.error
      })

      .addCase(deleteStorageStatement.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(deleteStorageStatement.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = state.list.filter(
          (record) => record.depotStatementId !== action.payload.id
        )
        state.errors = null
      })
      .addCase(deleteStorageStatement.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })

      .addCase(loadStorageAttributeItems.fulfilled, (state, action) => {
        ;(state as any)[action.payload.propertyName] = action.payload.items
        state.errors = null
      })
      .addCase(loadStorageAttributeItems.rejected, (state, action) => {
        state.errors = action.payload ?? action.error
      })
  },
})

export const {
  resetStorageStatementState,
  loadDefaultStorageStatement,
  clearCurrentStorageStatement,
  setStorageStatementList,
  clearStorageStatementErrors,
} = storageStatementSlice.actions

export default storageStatementSlice.reducer