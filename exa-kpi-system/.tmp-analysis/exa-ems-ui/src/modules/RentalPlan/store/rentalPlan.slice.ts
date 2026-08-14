// src/modules/RentalPlan/store/rentalPlan.slice.ts

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../../../store'
import { rentalPlanApi } from '../api/rentalPlan.api'

/* ======================================================
 * Types
 * ====================================================== */

export interface RentalPlan {
  rentalPlanId: number
  planName: string
  clients: string
  status: number
}

/* ======================================================
 * State
 * ====================================================== */

interface RentalPlanState {
  list: RentalPlan[]
  current: any | null
  loading: boolean
  saving: boolean
  errors: any
  statuses: {
    added: boolean
    updated: boolean
    deleted: boolean
  }
  gensetTypesList: any[]
}

const initialState: RentalPlanState = {
  list: [],
  current: null,
  loading: false,
  saving: false,
  errors: null,
  statuses: {
    added: false,
    updated: false,
    deleted: false,
  },
  gensetTypesList: [],
}

/* ======================================================
 * Thunks
 * ====================================================== */

// --- LIST ---
export const fetchRentalPlans = createAsyncThunk(
  'rentalPlan/fetchList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await rentalPlanApi.fetchList()
      return response
    } catch (err: any) {
      return rejectWithValue(err)
    }
  },
)

// --- LOAD ONE ---
export const fetchRentalPlanById = createAsyncThunk(
  'rentalPlan/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await rentalPlanApi.fetchById(id)
      return response
    } catch (err: any) {
      return rejectWithValue(err)
    }
  },
)

// --- DEFAULT ---
export const loadDefaultRentalPlan = createAsyncThunk(
  'rentalPlan/loadDefault',
  async () => {
    return {
      planName: '',
      clientIds: [],
      comboRates: [],
      jobRates: [],
      status: 1,
    }
  },
)

// --- ADD ---
export const addRentalPlan = createAsyncThunk(
  'rentalPlan/add',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await rentalPlanApi.add(payload)
      return response
    } catch (err: any) {
      return rejectWithValue(err)
    }
  },
)

export const loadGensetTypes = createAsyncThunk(
  "rentalPlan/loadGensetTypes",
  async (_, { rejectWithValue }) => {
    try {
      return await rentalPlanApi.loadAttributeItems("genset_type", "genset");
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// --- UPDATE ---
export const saveRentalPlan = createAsyncThunk(
  'rentalPlan/update',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await rentalPlanApi.update(payload)
      return response
    } catch (err: any) {
      return rejectWithValue(err)
    }
  },
)

// --- DELETE ---
export const deleteRentalPlan = createAsyncThunk(
  'rentalPlan/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await rentalPlanApi.remove(id)
      return id
    } catch (err: any) {
      return rejectWithValue(err)
    }
  },
)

/* ======================================================
 * Slice
 * ====================================================== */

const rentalPlanSlice = createSlice({
  name: 'rentalPlan',
  initialState,
  reducers: {
    resetStatuses(state) {
      state.statuses = {
        added: false,
        updated: false,
        deleted: false,
      }
    },
    clearCurrent(state) {
      state.current = null
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    builder

      // -----------------------
      // Fetch list
      // -----------------------
      .addCase(fetchRentalPlans.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(fetchRentalPlans.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchRentalPlans.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload
      })

      // -----------------------
      // Fetch by id
      // -----------------------
      .addCase(fetchRentalPlanById.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(fetchRentalPlanById.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
      })
      .addCase(fetchRentalPlanById.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload
      })

      // -----------------------
      // Load default
      // -----------------------
      .addCase(loadDefaultRentalPlan.fulfilled, (state, action) => {
        state.current = action.payload
      })

      // -----------------------
      // Add
      // -----------------------
      .addCase(addRentalPlan.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addRentalPlan.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.added = true
        state.current = action.payload
      })
      .addCase(addRentalPlan.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload
      })

      // -----------------------
      // Update
      // -----------------------
      .addCase(saveRentalPlan.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveRentalPlan.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.updated = true
        state.current = action.payload
      })
      .addCase(saveRentalPlan.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload
      })

      // -----------------------
      // Delete
      // -----------------------
      .addCase(deleteRentalPlan.fulfilled, (state, action) => {
        state.statuses.deleted = true
        state.list = state.list.filter(
          (p) => p.rentalPlanId !== action.payload,
        )
      })
      .addCase(deleteRentalPlan.rejected, (state, action) => {
        state.errors = action.payload
      })

      .addCase(loadGensetTypes.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(loadGensetTypes.fulfilled, (state, action) => {
        state.loading = false
        state.gensetTypesList = action.payload
      })
      .addCase(loadGensetTypes.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload as string
      })
  },
})

/* ======================================================
 * Exports
 * ====================================================== */

export const { resetStatuses, clearCurrent } = rentalPlanSlice.actions

export const selectRentalPlansList = (state: RootState) =>
  state.rentalPlan.list

export const selectRentalPlansCurrent = (state: RootState) =>
  state.rentalPlan.current

export const selectRentalPlansLoading = (state: RootState) =>
  state.rentalPlan.loading

export const selectRentalPlansSaving = (state: RootState) =>
  state.rentalPlan.saving

export const selectRentalPlansErrors = (state: RootState) =>
  state.rentalPlan.errors

export const selectRentalPlansStatuses = (state: RootState) =>
  state.rentalPlan.statuses

export default rentalPlanSlice.reducer
