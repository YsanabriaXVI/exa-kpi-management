import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type {
  SubdivisionFuelStatement,
  SubdivisionFuelStatementForm,
  SubdivisionFuelStatementErrorState,
  InvoiceLine,
  LinkedStatementOption,
} from '../types/subdivisionFuelStatement.types'
import { subdivisionFuelStatementApi } from '../api/subdivisionFuelStatement.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface ListMeta {
  total: number
  page: number
  pageSize: number
  lastPage: number
}

interface SubdivisionFuelStatementState {
  list: SubdivisionFuelStatement[]
  listMeta: ListMeta
  current: SubdivisionFuelStatement | null
  previewInvoiceLines: InvoiceLine[]
  additionalInvoiceLines: InvoiceLine[]
  linkedStatementsList: LinkedStatementOption[]
  errors: SubdivisionFuelStatementErrorState
  statuses: StatusFlags
  loadingList: boolean
  loadingCurrent: boolean
  saving: boolean
  deleting: boolean
}

const initialState: SubdivisionFuelStatementState = {
  list: [],
  listMeta: { total: 0, page: 1, pageSize: 20, lastPage: 1 },
  current: null,
  previewInvoiceLines: [],
  additionalInvoiceLines: [],
  linkedStatementsList: [],
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,
}

const rejectError = (err: any) =>
  err?.response?.data?.errors ?? err?.data?.errors ?? err?.message ?? 'Unknown error'

export const fetchSubdivisionFuelStatementList = createAsyncThunk<
  { data: SubdivisionFuelStatement[]; meta: ListMeta },
  { page?: number; pageSize?: number } | void,
  { rejectValue: SubdivisionFuelStatementErrorState }
>('subdivisionFuelStatement/fetchList', async (params, thunkAPI) => {
  try {
    return await subdivisionFuelStatementApi.fetchList(params ?? undefined)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const fetchSubdivisionFuelStatement = createAsyncThunk<
  SubdivisionFuelStatement,
  number,
  { rejectValue: SubdivisionFuelStatementErrorState }
>('subdivisionFuelStatement/fetchById', async (id, thunkAPI) => {
  try {
    return await subdivisionFuelStatementApi.fetchById(id)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const addSubdivisionFuelStatement = createAsyncThunk<
  SubdivisionFuelStatement,
  any,
  { rejectValue: SubdivisionFuelStatementErrorState }
>('subdivisionFuelStatement/add', async (data, thunkAPI) => {
  try {
    return await subdivisionFuelStatementApi.create(data)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const saveSubdivisionFuelStatement = createAsyncThunk<
  SubdivisionFuelStatement,
  { id: number; data: any },
  { rejectValue: SubdivisionFuelStatementErrorState }
>('subdivisionFuelStatement/save', async ({ id, data }, thunkAPI) => {
  try {
    return await subdivisionFuelStatementApi.update(id, data)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const deleteSubdivisionFuelStatement = createAsyncThunk<
  number,
  number,
  { rejectValue: SubdivisionFuelStatementErrorState }
>('subdivisionFuelStatement/delete', async (id, thunkAPI) => {
  try {
    await subdivisionFuelStatementApi.remove(id)
    return id
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const loadLinkedStatements = createAsyncThunk<
  LinkedStatementOption[],
  { subdivisionId: number; gasSupplierIds: number[] },
  { rejectValue: SubdivisionFuelStatementErrorState }
>('subdivisionFuelStatement/loadLinked', async (params, thunkAPI) => {
  try {
    return await subdivisionFuelStatementApi.loadLinkedStatements(params)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const loadPreviewInvoiceLines = createAsyncThunk<
  InvoiceLine[],
  any,
  { rejectValue: SubdivisionFuelStatementErrorState }
>('subdivisionFuelStatement/loadPreview', async (params, thunkAPI) => {
  try {
    return await subdivisionFuelStatementApi.loadInvoiceLines(params)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const loadAdditionalInvoiceLines = createAsyncThunk<
  InvoiceLine[],
  any,
  { rejectValue: SubdivisionFuelStatementErrorState }
>('subdivisionFuelStatement/loadAdditional', async (params, thunkAPI) => {
  try {
    return await subdivisionFuelStatementApi.loadInvoiceLines(params)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

const subdivisionFuelStatementSlice = createSlice({
  name: 'subdivisionFuelStatement',
  initialState,
  reducers: {
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
    clearCurrent(state) {
      state.current = null
      state.previewInvoiceLines = []
      state.additionalInvoiceLines = []
      state.linkedStatementsList = []
    },
    setDefaultStatement(state) {
      state.current = {
        fuelStatementId: 0,
        subdivisionId: null,
        clientId: null,
        comments: null,
        personalizedTrips: 'no',
        weekIds: [],
        statementIds: [],
        gasSupplierIds: [],
        invoiceLines: [],
      } as any
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubdivisionFuelStatementList.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchSubdivisionFuelStatementList.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload.data
        state.listMeta = action.payload.meta
      })
      .addCase(fetchSubdivisionFuelStatementList.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(fetchSubdivisionFuelStatement.pending, (state) => {
        state.loadingCurrent = true
        state.errors = null
      })
      .addCase(fetchSubdivisionFuelStatement.fulfilled, (state, action) => {
        state.loadingCurrent = false
        state.current = action.payload
      })
      .addCase(fetchSubdivisionFuelStatement.rejected, (state, action) => {
        state.loadingCurrent = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(addSubdivisionFuelStatement.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addSubdivisionFuelStatement.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.added = true
        state.list.unshift(action.payload)
      })
      .addCase(addSubdivisionFuelStatement.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(saveSubdivisionFuelStatement.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveSubdivisionFuelStatement.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.updated = true
        state.current = action.payload
      })
      .addCase(saveSubdivisionFuelStatement.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(deleteSubdivisionFuelStatement.pending, (state) => {
        state.deleting = true
      })
      .addCase(deleteSubdivisionFuelStatement.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter((x) => x.fuelStatementId !== action.payload)
        state.statuses.deleted = true
      })
      .addCase(deleteSubdivisionFuelStatement.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(loadLinkedStatements.fulfilled, (state, action) => {
        state.linkedStatementsList = action.payload
      })
      .addCase(loadLinkedStatements.rejected, (state, action) => {
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(loadPreviewInvoiceLines.fulfilled, (state, action) => {
        state.previewInvoiceLines = action.payload
      })
      .addCase(loadPreviewInvoiceLines.rejected, (state, action) => {
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(loadAdditionalInvoiceLines.fulfilled, (state, action) => {
        state.additionalInvoiceLines = action.payload
      })
      .addCase(loadAdditionalInvoiceLines.rejected, (state, action) => {
        state.errors = action.payload ?? action.error
      })
  },
})

export const { resetStatuses, clearCurrent, setDefaultStatement } = subdivisionFuelStatementSlice.actions
export default subdivisionFuelStatementSlice.reducer

export const selectSubdivFuelStmtList = (s: RootState) => s.subdivisionFuelStatement.list
export const selectSubdivFuelStmtListMeta = (s: RootState) => s.subdivisionFuelStatement.listMeta
export const selectSubdivFuelStmtCurrent = (s: RootState) => s.subdivisionFuelStatement.current
export const selectSubdivFuelStmtPreviewLines = (s: RootState) => s.subdivisionFuelStatement.previewInvoiceLines
export const selectSubdivFuelStmtAdditionalLines = (s: RootState) => s.subdivisionFuelStatement.additionalInvoiceLines
export const selectSubdivFuelStmtLinkedStatements = (s: RootState) => s.subdivisionFuelStatement.linkedStatementsList
export const selectSubdivFuelStmtErrors = (s: RootState) => s.subdivisionFuelStatement.errors
export const selectSubdivFuelStmtStatuses = (s: RootState) => s.subdivisionFuelStatement.statuses
export const selectSubdivFuelStmtLoadingList = (s: RootState) => s.subdivisionFuelStatement.loadingList
export const selectSubdivFuelStmtLoadingCurrent = (s: RootState) => s.subdivisionFuelStatement.loadingCurrent
export const selectSubdivFuelStmtSaving = (s: RootState) => s.subdivisionFuelStatement.saving
