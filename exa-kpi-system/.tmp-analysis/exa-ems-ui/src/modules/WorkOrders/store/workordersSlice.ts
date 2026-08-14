/**
 * Work Orders Redux Slice (Redux Toolkit)
 * Modern state management for Work Orders module
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { workOrdersAPI } from '../api/workorders.api'
import type {
  WorkOrder,
  WorkOrderState,
  WorkOrderListParams,
  WorkOrderListResponse,
} from '../types'

// Initial state
const initialState: WorkOrderState = {
  list: [],
  workorder: null,
  isLoading: false,
  total: 0,
  start: 0,
  page: 0,
  status: null,
  errors: null,
}

// Async thunks for API calls

/**
 * Load work orders list with filters and pagination
 */
export const loadWorkOrdersList = createAsyncThunk<
  WorkOrderListResponse,
  WorkOrderListParams,
  { rejectValue: any }
>(
  'workorders/loadList',
  async (params, { rejectWithValue }) => {
    try {
      const response = await workOrdersAPI.getWorkOrdersList(params)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

/**
 * Load single work order
 */
export const loadWorkOrder = createAsyncThunk<
  WorkOrder,
  number,
  { rejectValue: any }
>(
  'workorders/loadSingle',
  async (id, { rejectWithValue }) => {
    try {
      const response = await workOrdersAPI.getWorkOrder(id)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

/**
 * Create new work order
 */
export const createWorkOrder = createAsyncThunk<
  WorkOrder,
  Partial<WorkOrder>,
  { rejectValue: any }
>(
  'workorders/create',
  async (workorder, { rejectWithValue }) => {
    try {
      const response = await workOrdersAPI.createWorkOrder(workorder)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

/**
 * Update existing work order
 */
export const updateWorkOrder = createAsyncThunk<
  WorkOrder,
  { id: number; workorder: Partial<WorkOrder> },
  { rejectValue: any }
>(
  'workorders/update',
  async ({ id, workorder }, { rejectWithValue }) => {
    try {
      const response = await workOrdersAPI.updateWorkOrder(id, workorder)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

/**
 * Delete work order
 */
export const deleteWorkOrder = createAsyncThunk<
  number,
  number,
  { rejectValue: any }
>(
  'workorders/delete',
  async (id, { rejectWithValue }) => {
    try {
      await workOrdersAPI.deleteWorkOrder(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Slice
const workordersSlice = createSlice({
  name: 'workorders',
  initialState,
  reducers: {
    // Clear list
    clearList(state) {
      state.list = []
      state.total = 0
      state.start = 0
    },
    // Clear errors
    clearErrors(state) {
      state.errors = null
    },
    // Clear current work order
    clearWorkOrder(state) {
      state.workorder = null
    },
    // Reset status
    resetStatus(state) {
      state.status = null
    },
    // Reset loading (used when navigating back to list to clear stale loading state)
    resetLoading(state) {
      state.isLoading = false
    },
  },
  extraReducers: (builder) => {
    // Load list
    builder
      .addCase(loadWorkOrdersList.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadWorkOrdersList.fulfilled, (state, action: PayloadAction<WorkOrderListResponse>) => {
        state.isLoading = false
        state.list = action.payload.orders
        state.total = action.payload.total
        state.start = action.payload.offset
        state.status = 'loaded'
      })
      .addCase(loadWorkOrdersList.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload
        state.status = 'error'
      })

    // Load single work order
    builder
      .addCase(loadWorkOrder.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadWorkOrder.fulfilled, (state, action: PayloadAction<WorkOrder>) => {
        state.isLoading = false
        state.workorder = action.payload
        state.status = 'loaded'
      })
      .addCase(loadWorkOrder.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload
        state.status = 'error'
      })

    // Create work order
    builder
      .addCase(createWorkOrder.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(createWorkOrder.fulfilled, (state, action: PayloadAction<WorkOrder>) => {
        state.isLoading = false
        state.workorder = action.payload
        state.status = 'created'
      })
      .addCase(createWorkOrder.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload
        state.status = 'error'
      })

    // Update work order
    builder
      .addCase(updateWorkOrder.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(updateWorkOrder.fulfilled, (state, action: PayloadAction<WorkOrder>) => {
        state.isLoading = false
        state.workorder = action.payload
        state.status = 'updated'
      })
      .addCase(updateWorkOrder.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload
        state.status = 'error'
      })

    // Delete work order
    builder
      .addCase(deleteWorkOrder.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(deleteWorkOrder.fulfilled, (state) => {
        state.isLoading = false
        state.status = 'deleted'
      })
      .addCase(deleteWorkOrder.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload
        state.status = 'error'
      })
  },
})

// Export actions
export const { clearList, clearErrors, clearWorkOrder, resetStatus, resetLoading } = workordersSlice.actions

// Export reducer
export default workordersSlice.reducer

