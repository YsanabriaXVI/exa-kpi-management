// src/modules/RepairTypes/store/repairTypes.slice.ts
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../store'
import type {
  RepairType,
  RepairTypeForm,
  RepairErrors,
  EquipmentType,
} from '../types/repairTypes.types'
import { repairTypesApi } from '../api/repairTypes.api'
import { equipmentTypesApi } from '../../DamageTypes/api/equipmentTypes.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface RepairTypesState {
  list: RepairType[]
  repair: RepairTypeForm | null
  errors: RepairErrors
  statuses: StatusFlags
  loadingList: boolean
  saving: boolean
  deleting: boolean

  equipmentTypesList: EquipmentType[]
  loadingEquipmentTypes: boolean
  equipmentTypesError: string | null
}

const repairDefault: RepairTypeForm = {
  repairName: undefined,
  description: undefined,
  equipmentTypeId: undefined,
  internalCode: undefined,
  ISOCode: undefined,
  status: 1,
  active: 1,
}

const initialState: RepairTypesState = {
  list: [],
  repair: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  saving: false,
  deleting: false,

  equipmentTypesList: [],
  loadingEquipmentTypes: false,
  equipmentTypesError: null,
}

export const fetchRepairTypes = createAsyncThunk<
  RepairType[],
  void,
  { rejectValue: RepairErrors }
>('repairTypes/fetchList', async (_arg, thunkAPI) => {
  try {
    return await repairTypesApi.fetchRepairTypes()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const loadEquipmentTypes = createAsyncThunk(
  'repairTypes/loadEquipmentTypes',
  async (_: void, { rejectWithValue }) => {
    try {
      // retorna { equipmentTypesList }
      return await equipmentTypesApi.loadEquipmentTypes()
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load equipment types')
    }
  },
)

export const addRepairType = createAsyncThunk<
  RepairType,
  RepairTypeForm,
  { rejectValue: RepairErrors }
>('repairTypes/add', async (form, thunkAPI) => {
  try {
    return await repairTypesApi.createRepairType(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const saveRepairType = createAsyncThunk<
  RepairType,
  RepairTypeForm,
  { rejectValue: RepairErrors }
>('repairTypes/save', async (form, thunkAPI) => {
  try {
    return await repairTypesApi.updateRepairType(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const deleteRepairType = createAsyncThunk<
  number,
  number,
  { state: RootState; rejectValue: RepairErrors }
>('repairTypes/delete', async (id, thunkAPI) => {
  try {
    await repairTypesApi.deleteRepairType(id)
    return id
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

const repairTypesSlice = createSlice({
  name: 'repairTypes',
  initialState,
  reducers: {
    loadDefaultRepair(state, action: PayloadAction<RepairTypeForm | undefined>) {
      state.repair = { ...repairDefault, ...(action.payload || {}) }
      state.errors = null
    },

    loadRepairFromList(state, action: PayloadAction<number>) {
      const id = action.payload
      const found = state.list.find((r) => r.repairTypesId === id)
      state.repair = found ? { ...found } : null
      state.errors = null
    },

    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    // LIST
    builder
      .addCase(fetchRepairTypes.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchRepairTypes.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload
      })
      .addCase(fetchRepairTypes.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    // EQUIPMENT TYPES
    builder
      .addCase(loadEquipmentTypes.pending, (state) => {
        state.loadingEquipmentTypes = true
        state.equipmentTypesError = null
      })
      .addCase(loadEquipmentTypes.fulfilled, (state, action: any) => {
        state.loadingEquipmentTypes = false
        state.equipmentTypesList = action.payload?.equipmentTypesList ?? []
      })
      .addCase(loadEquipmentTypes.rejected, (state, action: any) => {
        state.loadingEquipmentTypes = false
        state.equipmentTypesError =
          action.payload ?? action.error?.message ?? 'Failed to load equipment types'
      })

    // ADD
    builder
      .addCase(addRepairType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addRepairType.fulfilled, (state, action) => {
        state.saving = false
        state.list.unshift(action.payload)
        state.repair = action.payload
        state.statuses.added = true
      })
      .addCase(addRepairType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    // UPDATE
    builder
      .addCase(saveRepairType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveRepairType.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.list.findIndex(
          (x) => x.repairTypesId === action.payload.repairTypesId,
        )
        if (idx >= 0) state.list.splice(idx, 1, action.payload)
        state.repair = action.payload
        state.statuses.updated = true
      })
      .addCase(saveRepairType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    // DELETE
    builder
      .addCase(deleteRepairType.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deleteRepairType.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter((x) => x.repairTypesId !== action.payload)
        state.statuses.deleted = true
      })
      .addCase(deleteRepairType.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const { loadDefaultRepair, loadRepairFromList, resetStatuses } =
  repairTypesSlice.actions

export default repairTypesSlice.reducer

// selectors
export const selectRepairTypesList = (s: RootState) => s.repairTypes.list
export const selectRepair = (s: RootState) => s.repairTypes.repair
export const selectRepairErrors = (s: RootState) => s.repairTypes.errors
export const selectRepairStatuses = (s: RootState) => s.repairTypes.statuses
export const selectRepairSaving = (s: RootState) => s.repairTypes.saving

export const selectEquipmentTypesList = (s: RootState) =>
  s.repairTypes.equipmentTypesList
export const selectEquipmentTypesLoading = (s: RootState) =>
  s.repairTypes.loadingEquipmentTypes
