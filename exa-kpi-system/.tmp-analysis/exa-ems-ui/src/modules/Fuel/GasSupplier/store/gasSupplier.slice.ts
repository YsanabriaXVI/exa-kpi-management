import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type {
  GasSupplier,
  GasSupplierForm,
  GasStore,
  GasStoreForm,
  GasSupplierErrors,
} from '../types/gasSupplier.types'
import { gasSupplierApi } from '../api/gasSupplier.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface GasSupplierState {
  list: GasSupplier[]
  allStores: GasStore[]
  current: GasSupplierForm | null
  stores: GasStore[]
  currentStore: GasStoreForm | null
  errors: GasSupplierErrors
  statuses: StatusFlags
  childStatuses: StatusFlags
  loadingList: boolean
  loadingCurrent: boolean
  loadingStores: boolean
  loadingStore: boolean
  saving: boolean
  deleting: boolean
}

const supplierDefault: GasSupplierForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  creditDays: '',
  countryId: 0,
  departmentId: 0,
  cityId: 0,
  status: 1,
  active: 0,
  subdivisions: [],
}

const initialState: GasSupplierState = {
  list: [],
  allStores: [],
  current: null,
  stores: [],
  currentStore: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  childStatuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  loadingStores: false,
  loadingStore: false,
  saving: false,
  deleting: false,
}

// --- Supplier thunks ---

export const fetchSuppliers = createAsyncThunk<
  GasSupplier[],
  void,
  { rejectValue: GasSupplierErrors }
>('gasSupplier/fetchList', async (_arg, thunkAPI) => {
  try {
    return await gasSupplierApi.fetchSuppliers()
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const fetchSupplier = createAsyncThunk<
  GasSupplier,
  number,
  { rejectValue: GasSupplierErrors }
>('gasSupplier/fetchOne', async (id, thunkAPI) => {
  try {
    return await gasSupplierApi.fetchSupplier(id)
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const addSupplier = createAsyncThunk<
  GasSupplier,
  GasSupplierForm,
  { rejectValue: GasSupplierErrors }
>('gasSupplier/add', async (form, thunkAPI) => {
  try {
    return await gasSupplierApi.createSupplier(form)
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors?.[0]?.message ??
      err?.response?.data?.errors ??
      err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const saveSupplier = createAsyncThunk<
  GasSupplier,
  GasSupplierForm,
  { rejectValue: GasSupplierErrors }
>('gasSupplier/save', async (form, thunkAPI) => {
  try {
    return await gasSupplierApi.updateSupplier(form)
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors?.[0]?.message ??
      err?.response?.data?.errors ??
      err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const deleteSupplier = createAsyncThunk<
  number,
  number,
  { rejectValue: GasSupplierErrors }
>('gasSupplier/delete', async (id, thunkAPI) => {
  try {
    await gasSupplierApi.deleteSupplier(id)
    return id
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const fetchAllGasStores = createAsyncThunk<
  GasStore[],
  void,
  { rejectValue: GasSupplierErrors }
>('gasSupplier/fetchAllStores', async (_arg, thunkAPI) => {
  try {
    return await gasSupplierApi.fetchAllStores()
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

// --- Store thunks ---

export const fetchStores = createAsyncThunk<
  GasStore[],
  number,
  { rejectValue: GasSupplierErrors }
>('gasSupplier/fetchStores', async (parentId, thunkAPI) => {
  try {
    return await gasSupplierApi.fetchStores(parentId)
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const fetchStore = createAsyncThunk<
  GasStore,
  number,
  { rejectValue: GasSupplierErrors }
>('gasSupplier/fetchStore', async (id, thunkAPI) => {
  try {
    return await gasSupplierApi.fetchStore(id)
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const addStore = createAsyncThunk<
  GasStore,
  { form: GasStoreForm; parentId: number },
  { rejectValue: GasSupplierErrors }
>('gasSupplier/addStore', async ({ form, parentId }, thunkAPI) => {
  try {
    return await gasSupplierApi.createStore(form, parentId)
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors?.[0]?.message ??
      err?.response?.data?.errors ??
      err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const saveStore = createAsyncThunk<
  GasStore,
  GasStoreForm,
  { rejectValue: GasSupplierErrors }
>('gasSupplier/saveStore', async (form, thunkAPI) => {
  try {
    return await gasSupplierApi.updateStore(form)
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors?.[0]?.message ??
      err?.response?.data?.errors ??
      err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const deleteStore = createAsyncThunk<
  number,
  { id: number; parentId: number },
  { rejectValue: GasSupplierErrors }
>('gasSupplier/deleteStore', async ({ id }, thunkAPI) => {
  try {
    await gasSupplierApi.deleteStore(id)
    return id
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

const gasSupplierSlice = createSlice({
  name: 'gasSupplier',
  initialState,
  reducers: {
    loadDefaultSupplier(state) {
      state.current = { ...supplierDefault }
      state.errors = null
    },
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
    resetChildStatuses(state) {
      state.childStatuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
    resetStores(state) {
      state.stores = []
    },
    loadDefaultStore(state) {
      state.currentStore = {
        name: '',
        phone: '',
        email: '',
        address: '',
        creditDays: '',
        countryId: 0,
        departmentId: 0,
        cityId: 0,
        status: 1,
        active: 0,
        subdivisions: [],
      }
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    // Suppliers
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(fetchAllGasStores.fulfilled, (state, action) => {
        state.allStores = action.payload
      })

    builder
      .addCase(fetchSupplier.pending, (state) => {
        state.loadingCurrent = true
        state.errors = null
      })
      .addCase(fetchSupplier.fulfilled, (state, action) => {
        state.loadingCurrent = false
        state.current = action.payload
      })
      .addCase(fetchSupplier.rejected, (state, action) => {
        state.loadingCurrent = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(addSupplier.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addSupplier.fulfilled, (state, action) => {
        state.saving = false
        state.list.unshift(action.payload)
        state.current = action.payload
        state.statuses.added = true
      })
      .addCase(addSupplier.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(saveSupplier.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveSupplier.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.list.findIndex(
          (x) =>
            x.gasStationsParentId === action.payload.gasStationsParentId,
        )
        if (idx >= 0) state.list.splice(idx, 1, action.payload)
        state.current = action.payload
        state.statuses.updated = true
      })
      .addCase(saveSupplier.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(deleteSupplier.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter(
          (x) => x.gasStationsParentId !== action.payload,
        )
        state.statuses.deleted = true
      })
      .addCase(deleteSupplier.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })

    // Stores
    builder
      .addCase(fetchStores.pending, (state) => {
        state.loadingStores = true
      })
      .addCase(fetchStores.fulfilled, (state, action) => {
        state.loadingStores = false
        state.stores = action.payload
      })
      .addCase(fetchStores.rejected, (state, action) => {
        state.loadingStores = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(fetchStore.pending, (state) => {
        state.loadingStore = true
        state.errors = null
      })
      .addCase(fetchStore.fulfilled, (state, action) => {
        state.loadingStore = false
        state.currentStore = action.payload
      })
      .addCase(fetchStore.rejected, (state, action) => {
        state.loadingStore = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(addStore.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addStore.fulfilled, (state, action) => {
        state.saving = false
        state.stores.unshift(action.payload)
        state.currentStore = action.payload
        state.childStatuses.added = true
      })
      .addCase(addStore.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(saveStore.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveStore.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.stores.findIndex(
          (x) => x.gasStationsId === action.payload.gasStationsId,
        )
        if (idx >= 0) state.stores.splice(idx, 1, action.payload)
        state.currentStore = action.payload
        state.childStatuses.updated = true
      })
      .addCase(saveStore.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(deleteStore.pending, (state) => {
        state.deleting = true
      })
      .addCase(deleteStore.fulfilled, (state, action) => {
        state.deleting = false
        state.stores = state.stores.filter(
          (x) => x.gasStationsId !== action.payload,
        )
        state.childStatuses.deleted = true
      })
      .addCase(deleteStore.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const {
  loadDefaultSupplier,
  resetStatuses,
  resetChildStatuses,
  resetStores,
  loadDefaultStore,
} = gasSupplierSlice.actions

export default gasSupplierSlice.reducer

export const selectSupplierList = (s: RootState) => s.gasSupplier.list
export const selectAllGasStores = (s: RootState) => s.gasSupplier.allStores
export const selectCurrentSupplier = (s: RootState) => s.gasSupplier.current
export const selectStores = (s: RootState) => s.gasSupplier.stores
export const selectCurrentStore = (s: RootState) => s.gasSupplier.currentStore
export const selectGasSupplierErrors = (s: RootState) => s.gasSupplier.errors
export const selectGasSupplierStatuses = (s: RootState) => s.gasSupplier.statuses
export const selectChildStatuses = (s: RootState) => s.gasSupplier.childStatuses
export const selectSupplierLoadingList = (s: RootState) => s.gasSupplier.loadingList
export const selectSupplierLoadingCurrent = (s: RootState) => s.gasSupplier.loadingCurrent
export const selectStoresLoading = (s: RootState) => s.gasSupplier.loadingStores
export const selectStoreLoading = (s: RootState) => s.gasSupplier.loadingStore
export const selectGasSupplierSaving = (s: RootState) => s.gasSupplier.saving
export const selectGasSupplierDeleting = (s: RootState) => s.gasSupplier.deleting
