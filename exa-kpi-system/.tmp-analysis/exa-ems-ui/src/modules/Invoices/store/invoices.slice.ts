import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { invoicesAPI } from '../api/invoices.api'
import type { Invoice, InvoicesState, InvoiceTableData, PaginatedInvoicesResult } from '../types'

const initialState: InvoicesState = {
  list: [],
  total: 0,
  current: null,
  trips: null,
  loading: false,
  error: null,
}

export const loadInvoices = createAsyncThunk<Invoice[], void, { rejectValue: string }>(
  'invoices/loadList',
  async (_, { rejectWithValue }) => {
    try {
      const { list } = await invoicesAPI.getInvoices()
      return list
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load invoices')
    }
  }
)

export const loadInvoicesPaginated = createAsyncThunk<PaginatedInvoicesResult, { limit: number; offset: number; search?: string }, { rejectValue: string }>(
  'invoices/loadPaginated',
  async (params, { rejectWithValue }) => {
    try {
      return await invoicesAPI.getInvoicesPaginated(params)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load invoices')
    }
  }
)

export const loadInvoice = createAsyncThunk<Invoice, number | string, { rejectValue: string }>(
  'invoices/loadOne',
  async (id, { rejectWithValue }) => {
    try {
      return await invoicesAPI.getInvoice(id)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load invoice')
    }
  }
)

export const createInvoice = createAsyncThunk<Invoice, any, { rejectValue: string }>(
  'invoices/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await invoicesAPI.createInvoice(payload)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create invoice')
    }
  }
)

export const updateInvoice = createAsyncThunk<Invoice, { id: number | string; payload: any }, { rejectValue: string }>(
  'invoices/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await invoicesAPI.updateInvoice(id, payload)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update invoice')
    }
  }
)

export const deleteInvoice = createAsyncThunk<number | string, number | string, { rejectValue: string }>(
  'invoices/delete',
  async (id, { rejectWithValue }) => {
    try {
      await invoicesAPI.deleteInvoice(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete invoice')
    }
  }
)

export const loadInvoiceTrips = createAsyncThunk<InvoiceTableData, number | string, { rejectValue: string }>(
  'invoices/loadTrips',
  async (id, { rejectWithValue }) => {
    try {
      return await invoicesAPI.getTripTable(id)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load trips')
    }
  }
)

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    clearCurrentInvoice: (state) => {
      state.current = null
      state.trips = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadInvoices.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadInvoices.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
        state.total = action.payload.length
      })
      .addCase(loadInvoices.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load invoices'
      })

      .addCase(loadInvoicesPaginated.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadInvoicesPaginated.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.list
        state.total = action.payload.total
      })
      .addCase(loadInvoicesPaginated.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load invoices'
      })

      .addCase(loadInvoice.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadInvoice.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
      })
      .addCase(loadInvoice.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load invoice'
      })

      .addCase(createInvoice.pending, (state) => {
        state.loading = true
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
        state.list = [action.payload, ...(state.list || [])]
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to create invoice'
      })

      .addCase(updateInvoice.pending, (state) => {
        state.loading = true
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
        const id = action.payload.invoice_id ?? action.payload.id
        state.list = state.list.map((inv) => (inv.invoice_id === id || inv.id === id ? action.payload : inv))
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to update invoice'
      })

      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.list = state.list.filter((inv) => inv.invoice_id !== action.payload && inv.id !== action.payload)
      })

      .addCase(loadInvoiceTrips.fulfilled, (state, action) => {
        state.trips = action.payload
      })
  },
})

export const { clearCurrentInvoice } = invoicesSlice.actions
export default invoicesSlice.reducer
