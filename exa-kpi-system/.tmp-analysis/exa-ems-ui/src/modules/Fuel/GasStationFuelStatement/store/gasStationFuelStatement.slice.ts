import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type {
  GasStationFuelStatement,
  GasStationFuelStatementErrorState,
  InvoiceLine,
} from '../types/gasStationFuelStatement.types'
import { gasStationFuelStatementApi } from '../api/gasStationFuelStatement.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface GasStationFuelStatementState {
  list: GasStationFuelStatement[]
  current: GasStationFuelStatement | null
  previewInvoiceLines: InvoiceLine[]
  additionalInvoiceLines: InvoiceLine[]
  errors: GasStationFuelStatementErrorState
  statuses: StatusFlags
  loadingList: boolean
  loadingCurrent: boolean
  saving: boolean
  deleting: boolean
}

const initialState: GasStationFuelStatementState = {
  list: [],
  current: null,
  previewInvoiceLines: [],
  additionalInvoiceLines: [],
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,
}

const rejectError = (err: any) =>
  err?.response?.data?.errors ?? err?.data?.errors ?? err?.message ?? 'Unknown error'

export const fetchGasStationFuelStatementList = createAsyncThunk<
  GasStationFuelStatement[],
  void,
  { rejectValue: GasStationFuelStatementErrorState }
>('gasStationFuelStatement/fetchList', async (_, thunkAPI) => {
  try {
    return await gasStationFuelStatementApi.fetchList()
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const fetchGasStationFuelStatement = createAsyncThunk<
  GasStationFuelStatement,
  number,
  { rejectValue: GasStationFuelStatementErrorState }
>('gasStationFuelStatement/fetchById', async (id, thunkAPI) => {
  try {
    return await gasStationFuelStatementApi.fetchById(id)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const addGasStationFuelStatement = createAsyncThunk<
  GasStationFuelStatement,
  any,
  { rejectValue: GasStationFuelStatementErrorState }
>('gasStationFuelStatement/add', async (data, thunkAPI) => {
  try {
    return await gasStationFuelStatementApi.create(data)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const saveGasStationFuelStatement = createAsyncThunk<
  GasStationFuelStatement,
  { id: number; data: any },
  { rejectValue: GasStationFuelStatementErrorState }
>('gasStationFuelStatement/save', async ({ id, data }, thunkAPI) => {
  try {
    return await gasStationFuelStatementApi.update(id, data)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const deleteGasStationFuelStatement = createAsyncThunk<
  number,
  number,
  { rejectValue: GasStationFuelStatementErrorState }
>('gasStationFuelStatement/delete', async (id, thunkAPI) => {
  try {
    await gasStationFuelStatementApi.remove(id)
    return id
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const downloadGSFuelStatementPdf = createAsyncThunk<
  void,
  number,
  { rejectValue: GasStationFuelStatementErrorState }
>('gasStationFuelStatement/downloadPdf', async (id, thunkAPI) => {
  try {
    const blob = await gasStationFuelStatementApi.downloadPdf(id)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gas_station_fuel_statement_${id}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const downloadGSFuelStatementXlsx = createAsyncThunk<
  void,
  number,
  { rejectValue: GasStationFuelStatementErrorState }
>('gasStationFuelStatement/downloadXlsx', async (id, thunkAPI) => {
  try {
    const blob = await gasStationFuelStatementApi.downloadXlsx(id)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gas_station_fuel_statement_${id}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const loadGSPreviewInvoiceLines = createAsyncThunk<
  InvoiceLine[],
  any,
  { rejectValue: GasStationFuelStatementErrorState }
>('gasStationFuelStatement/loadPreview', async (params, thunkAPI) => {
  try {
    return await gasStationFuelStatementApi.loadInvoiceLines(params)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

export const loadGSAdditionalInvoiceLines = createAsyncThunk<
  InvoiceLine[],
  any,
  { rejectValue: GasStationFuelStatementErrorState }
>('gasStationFuelStatement/loadAdditional', async (params, thunkAPI) => {
  try {
    return await gasStationFuelStatementApi.loadInvoiceLines(params)
  } catch (err: any) {
    return thunkAPI.rejectWithValue(rejectError(err))
  }
})

const gasStationFuelStatementSlice = createSlice({
  name: 'gasStationFuelStatement',
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
    },
    setDefaultStatement(state) {
      state.current = {
        fuelStatementId: 0,
        gasStationId: null,
        comments: null,
        weekIds: [],
        subdivisionIds: [],
        invoiceLines: [],
      } as any
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGasStationFuelStatementList.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchGasStationFuelStatementList.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload
      })
      .addCase(fetchGasStationFuelStatementList.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(fetchGasStationFuelStatement.pending, (state) => {
        state.loadingCurrent = true
        state.errors = null
      })
      .addCase(fetchGasStationFuelStatement.fulfilled, (state, action) => {
        state.loadingCurrent = false
        state.current = action.payload
      })
      .addCase(fetchGasStationFuelStatement.rejected, (state, action) => {
        state.loadingCurrent = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(addGasStationFuelStatement.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addGasStationFuelStatement.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.added = true
        state.list.unshift(action.payload)
      })
      .addCase(addGasStationFuelStatement.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(saveGasStationFuelStatement.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveGasStationFuelStatement.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.updated = true
        state.current = action.payload
      })
      .addCase(saveGasStationFuelStatement.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(deleteGasStationFuelStatement.pending, (state) => {
        state.deleting = true
      })
      .addCase(deleteGasStationFuelStatement.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter((x) => x.fuelStatementId !== action.payload)
        state.statuses.deleted = true
      })
      .addCase(deleteGasStationFuelStatement.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })

    builder.addCase(loadGSPreviewInvoiceLines.fulfilled, (state, action) => {
      state.previewInvoiceLines = action.payload
    })

    builder.addCase(loadGSAdditionalInvoiceLines.fulfilled, (state, action) => {
      state.additionalInvoiceLines = action.payload
    })
  },
})

export const { resetStatuses, clearCurrent, setDefaultStatement } = gasStationFuelStatementSlice.actions
export default gasStationFuelStatementSlice.reducer

export const selectGSFuelStmtList = (s: RootState) => s.gasStationFuelStatement.list
export const selectGSFuelStmtCurrent = (s: RootState) => s.gasStationFuelStatement.current
export const selectGSFuelStmtPreviewLines = (s: RootState) => s.gasStationFuelStatement.previewInvoiceLines
export const selectGSFuelStmtAdditionalLines = (s: RootState) => s.gasStationFuelStatement.additionalInvoiceLines
export const selectGSFuelStmtErrors = (s: RootState) => s.gasStationFuelStatement.errors
export const selectGSFuelStmtStatuses = (s: RootState) => s.gasStationFuelStatement.statuses
export const selectGSFuelStmtLoadingList = (s: RootState) => s.gasStationFuelStatement.loadingList
export const selectGSFuelStmtLoadingCurrent = (s: RootState) => s.gasStationFuelStatement.loadingCurrent
export const selectGSFuelStmtSaving = (s: RootState) => s.gasStationFuelStatement.saving
