/**
 * Other Charges Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { otherChargesAPI } from '../api/othercharges.api'
import type { OtherChargesState, OtherCharge, OtherChargeListParams } from '../types'

/**
 * Initial State
 */
const initialState: OtherChargesState = {
  charges: [],
  currentCharge: null,
  routes: [],
  paymentPlans: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
  total: 0,
}

/**
 * Async Thunks
 */

// Fetch all charges
export const loadChargesList = createAsyncThunk(
  'otherCharges/loadChargesList',
  async (params: OtherChargeListParams, { rejectWithValue }) => {
    try {
      const response = await otherChargesAPI.getChargesList(params)
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Fetch single charge
export const loadCharge = createAsyncThunk(
  'otherCharges/loadCharge',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await otherChargesAPI.getCharge(id)
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Create charge
export const createCharge = createAsyncThunk(
  'otherCharges/createCharge',
  async (chargeData: Partial<OtherCharge>, { rejectWithValue }) => {
    try {
      const response = await otherChargesAPI.createCharge(chargeData)
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Update charge
export const updateCharge = createAsyncThunk(
  'otherCharges/updateCharge',
  async ({ id, chargeData }: { id: number; chargeData: Partial<OtherCharge> }, { rejectWithValue }) => {
    try {
      const response = await otherChargesAPI.updateCharge(id, chargeData)
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Delete charge
export const deleteCharge = createAsyncThunk(
  'otherCharges/deleteCharge',
  async (id: number, { rejectWithValue }) => {
    try {
      await otherChargesAPI.deleteCharge(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Fetch routes
export const loadRoutes = createAsyncThunk(
  'otherCharges/loadRoutes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await otherChargesAPI.getRoutes()
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Fetch payment plans
export const loadPaymentPlans = createAsyncThunk(
  'otherCharges/loadPaymentPlans',
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await otherChargesAPI.getPaymentPlans(params)
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

/**
 * Other Charges Slice
 */
const otherChargesSlice = createSlice({
  name: 'otherCharges',
  initialState,
  reducers: {
    clearCurrentCharge: (state) => {
      state.currentCharge = null
    },
    clearErrors: (state) => {
      state.error = null
    },
    setPaymentPlans: (state, action: PayloadAction<any[]>) => {
      state.paymentPlans = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Load Charges List
      .addCase(loadChargesList.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadChargesList.fulfilled, (state, action) => {
        state.loading = false
        state.charges = action.payload.data || []
        state.total = action.payload.total || 0
        state.pagination = action.payload.pagination || state.pagination
      })
      .addCase(loadChargesList.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Load Single Charge
      .addCase(loadCharge.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadCharge.fulfilled, (state, action) => {
        state.loading = false
        state.currentCharge = action.payload
      })
      .addCase(loadCharge.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Create Charge
      .addCase(createCharge.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createCharge.fulfilled, (state, action) => {
        state.loading = false
        state.charges.push(action.payload)
      })
      .addCase(createCharge.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Update Charge
      .addCase(updateCharge.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateCharge.fulfilled, (state, action) => {
        state.loading = false
        const index = state.charges.findIndex((c) => c.id === action.payload.id)
        if (index !== -1) {
          state.charges[index] = action.payload
        }
        state.currentCharge = action.payload
      })
      .addCase(updateCharge.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Delete Charge
      .addCase(deleteCharge.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteCharge.fulfilled, (state, action) => {
        state.loading = false
        state.charges = state.charges.filter((c) => c.id !== action.payload)
      })
      .addCase(deleteCharge.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Load Routes
      .addCase(loadRoutes.fulfilled, (state, action) => {
        state.routes = action.payload
      })
      
      // Load Payment Plans
      .addCase(loadPaymentPlans.pending, (state) => {
        state.loading = true
      })
      .addCase(loadPaymentPlans.fulfilled, (state, action) => {
        state.loading = false
        state.paymentPlans = action.payload
      })
      .addCase(loadPaymentPlans.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearCurrentCharge, clearErrors, setPaymentPlans } = otherChargesSlice.actions

export default otherChargesSlice.reducer

