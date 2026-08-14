import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../store'
import type {
  MaterialType,
  MaterialTypeForm,
  MaterialErrors,
} from '../types/materialTypes.types'

import { equipmentTypesApi, type EquipmentType } from '../api/equipmentTypes.api'
import { materialTypesApi } from '../api/materialTypes.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface MaterialTypesState {
  list: MaterialType[]
  current: MaterialType | null
  equipmentTypesList: EquipmentType[]
  loading: boolean
  saving: boolean
  errors: MaterialErrors | null
  statuses: StatusFlags
}

const initialState: MaterialTypesState = {
  list: [],
  current: null,
  equipmentTypesList: [],
  loading: false,
  saving: false,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
}

/**
 * GET LIST
 */
export const fetchMaterialTypes = createAsyncThunk<
  MaterialType[],
  void,
  { rejectValue: MaterialErrors }
>('materialTypes/fetchList', async (_, thunkAPI) => {
  try {
    return await materialTypesApi.fetchMaterialTypes()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

/**
 * GET ONE
 * - primero intenta desde list (como legacy)
 * - si no está, intenta endpoint por id
 */
export const fetchMaterialTypeById = createAsyncThunk<
  MaterialType,
  number,
  { state: RootState; rejectValue: MaterialErrors }
>('materialTypes/fetchById', async (id, thunkAPI) => {
  try {
    const state = thunkAPI.getState()
    const fromList = state.materialTypes?.list?.find((x) => x.materialId === id)
    if (fromList) return fromList

    return await materialTypesApi.fetchMaterialById(id)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

/**
 * EQUIPMENT TYPES (para el select)
 */
export const fetchEquipmentTypes = createAsyncThunk<
  { equipmentTypesList: EquipmentType[] },
  void,
  { rejectValue: MaterialErrors }
>('materialTypes/fetchEquipmentTypes', async (_, thunkAPI) => {
  try {
    return await equipmentTypesApi.loadEquipmentTypes()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

/**
 * ADD
 */
export const addMaterialType = createAsyncThunk<
  MaterialType,
  MaterialTypeForm,
  { rejectValue: MaterialErrors }
>('materialTypes/add', async (form, thunkAPI) => {
  try {
    return await materialTypesApi.createMaterial(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

/**
 * UPDATE
 */
export const updateMaterialType = createAsyncThunk<
  MaterialType,
  { id: number; form: MaterialTypeForm },
  { rejectValue: MaterialErrors }
>('materialTypes/update', async ({ id, form }, thunkAPI) => {
  try {
    return await materialTypesApi.updateMaterial(id, form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

/**
 * DELETE
 */
export const deleteMaterialType = createAsyncThunk<
  number,
  number,
  { rejectValue: MaterialErrors }
>('materialTypes/delete', async (id, thunkAPI) => {
  try {
    await materialTypesApi.deleteMaterial(id)
    return id
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

const materialTypesSlice = createSlice({
  name: 'materialTypes',
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null
      state.errors = null
    },
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
    setCurrent(state, action: PayloadAction<MaterialType | null>) {
      state.current = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(fetchMaterialTypes.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(fetchMaterialTypes.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchMaterialTypes.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload ?? action.error
      })

      // by id
      .addCase(fetchMaterialTypeById.pending, (state) => {
        state.loading = true
        state.errors = null
      })
      .addCase(fetchMaterialTypeById.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
      })
      .addCase(fetchMaterialTypeById.rejected, (state, action) => {
        state.loading = false
        state.errors = action.payload ?? action.error
      })

      // equipment types
      .addCase(fetchEquipmentTypes.fulfilled, (state, action) => {
        state.equipmentTypesList = action.payload?.equipmentTypesList ?? []
      })

      .addCase(fetchEquipmentTypes.rejected, (state, action) => {
        state.errors = action.payload ?? action.error
      })

      // add
      .addCase(addMaterialType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addMaterialType.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.added = true
        // opcional: optimista
        state.list = [action.payload, ...state.list]
        state.current = action.payload
      })
      .addCase(addMaterialType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

      // update
      .addCase(updateMaterialType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(updateMaterialType.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.updated = true
        const idx = state.list.findIndex((x) => x.materialId === action.payload.materialId)
        if (idx >= 0) state.list[idx] = action.payload
        state.current = action.payload
      })
      .addCase(updateMaterialType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

      // delete
      .addCase(deleteMaterialType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(deleteMaterialType.fulfilled, (state, action) => {
        state.saving = false
        state.statuses.deleted = true
        state.list = state.list.filter((x) => x.materialId !== action.payload)
      })
      .addCase(deleteMaterialType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const { clearCurrent, resetStatuses, setCurrent } = materialTypesSlice.actions

export default materialTypesSlice.reducer

// selectors
export const selectMaterialTypes = (state: RootState) => state.materialTypes.list
export const selectMaterialCurrent = (state: RootState) => state.materialTypes.current
export const selectMaterialEquipmentTypes = (state: RootState) => state.materialTypes.equipmentTypesList
export const selectMaterialLoading = (state: RootState) => state.materialTypes.loading
export const selectMaterialSaving = (state: RootState) => state.materialTypes.saving
export const selectMaterialErrors = (state: RootState) => state.materialTypes.errors
export const selectMaterialStatuses = (state: RootState) => state.materialTypes.statuses
