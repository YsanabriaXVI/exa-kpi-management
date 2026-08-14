import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { clientsAPI } from '../api/clients.api'
import { Client, ClientState } from '../types'

const initialState: ClientState = {
  list: [],
  currentClient: null,
  loading: false,
  error: null,
}

export const loadClients = createAsyncThunk('clients/loadClients', async (_, { rejectWithValue }) => {
  try {
    const response = await clientsAPI.getClients()
    return response
  } catch (error: any) {
    return rejectWithValue(error.response?.data || error.message)
  }
})

export const loadClient = createAsyncThunk('clients/loadClient', async (id: number | string, { rejectWithValue }) => {
  try {
    const response = await clientsAPI.getClient(id)
    return response
  } catch (error: any) {
    return rejectWithValue(error.response?.data || error.message)
  }
})

export const createClient = createAsyncThunk('clients/createClient', async (client: Client, { rejectWithValue }) => {
  try {
    const response = await clientsAPI.createClient(client)
    return response
  } catch (error: any) {
    return rejectWithValue(error.response?.data || error.message)
  }
})

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, client }: { id: number | string; client: Client }, { rejectWithValue }) => {
    try {
      const response = await clientsAPI.updateClient(id, client)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const deleteClient = createAsyncThunk('clients/deleteClient', async (id: number | string, { rejectWithValue }) => {
  try {
    await clientsAPI.deleteClient(id)
    return id
  } catch (error: any) {
    return rejectWithValue(error.response?.data || error.message)
  }
})

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    clearCurrentClient: (state) => {
      state.currentClient = null
    },
    clearErrors: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadClients.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadClients.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(loadClients.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(loadClient.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadClient.fulfilled, (state, action) => {
        state.loading = false
        state.currentClient = action.payload
      })
      .addCase(loadClient.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(createClient.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.loading = false
        state.list.push(action.payload)
      })
      .addCase(createClient.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateClient.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.loading = false
        const index = state.list.findIndex((c) => c.client_id === action.payload.client_id)
        if (index !== -1) {
          state.list[index] = action.payload
        }
        state.currentClient = action.payload
      })
      .addCase(updateClient.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(deleteClient.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.loading = false
        state.list = state.list.filter((c) => c.client_id !== action.payload)
      })
      .addCase(deleteClient.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearCurrentClient, clearErrors } = clientsSlice.actions
export default clientsSlice.reducer
