import {
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit'
import type { RootState } from '../../../store'
import type {
  DamageType,
  DamageTypeForm,
  DamageErrors,
} from '../types/damageTypes.types'
import { fetchEquipmentTypesApi, type EquipmentType } from '../api/equipmentTypes.api'
import { damageTypesApi } from '../api/damageTypes.api'
import { equipmentTypesApi } from '../api/equipmentTypes.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface DamageTypesState {
  list: DamageType[]
  damage: DamageTypeForm | null
  errors: DamageErrors | null
  errMessage: string | null
  statuses: StatusFlags
  loadingList: boolean
  saving: boolean
  deleting: boolean
  equipmentTypesList: EquipmentType[]
  loadingEquipmentTypes: boolean
  equipmentTypesError: string | null
}

const damageDefault: DamageTypeForm = {
  damageName: undefined,
  description: undefined,
  equipmentTypeId: undefined,
  code: undefined,
  isoCode: undefined,
  status: 1,
}

const initialState: DamageTypesState = {
  list: [],
  damage: null,
  errors: null,
  errMessage: null,
  statuses: {
    added: false,
    updated: false,
    deleted: false,
  },
  loadingList: false,
  saving: false,
  deleting: false,
  equipmentTypesList: [],
  loadingEquipmentTypes: false,
  equipmentTypesError: null,
}

/**
 * LIST – antes: loadDamagesList
 */
export const fetchDamageTypes = createAsyncThunk<
  DamageType[],
  void,
  { rejectValue: DamageErrors }
>('damageTypes/fetchList', async (_arg, thunkAPI) => {
  try {
    const list = await damageTypesApi.fetchDamageTypes()
    return list
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const loadEquipmentTypes = createAsyncThunk(
  '/equipment-service',
  
  async(_, { rejectWithValue }) => {
    try {
      return await equipmentTypesApi.loadEquipmentTypes()
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load equipment types')
    }
  }
)

/**
 * ADD – antes: addDamage
 */
export const addDamage = createAsyncThunk<
  DamageType,
  DamageTypeForm,
  { rejectValue: DamageErrors }
>('damageTypes/add', async (form, thunkAPI) => {
  try {
    const record = await damageTypesApi.createDamage(form)
    return record
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

/**
 * UPDATE – antes: saveDamage
 */
export const saveDamage = createAsyncThunk<
  DamageType,
  DamageTypeForm,
  { rejectValue: DamageErrors }
>('damageTypes/save', async (form, thunkAPI) => {
  try {
    const record = await damageTypesApi.updateDamage(form)
    return record
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

/**
 * DELETE – antes: deleteDamage
 * (Ahora NO es optimista; solo removemos al confirmar el delete)
 */
export const deleteDamage = createAsyncThunk<
  number,
  number,
  { state: RootState; rejectValue: DamageErrors }
>('damageTypes/delete', async (id, thunkAPI) => {
  try {
    await damageTypesApi.deleteDamage(id)
    return id
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

const damageTypesSlice = createSlice({
  name: 'damageTypes',
  initialState,
  reducers: {
    /**
     * loadDefaultDamage (sincrónico)
     * – antes combinaba damageDefault con el payload
     */
    loadDefaultDamage(state, action: PayloadAction<DamageTypeForm | undefined>) {
      state.damage = {
        ...damageDefault,
        ...(action.payload || {}),
      }
      state.errors = null
    },

    /**
     * loadDamage (desde la lista) – antes: loadDamage con getState()
     */
    loadDamageFromList(state, action: PayloadAction<number>) {
      const id = action.payload
      const found = state.list.find((d) => d.damageId === id)
      state.damage = found ? { ...found } : null
      state.errors = null
    },

    /**
     * resetStatuses – antes: RESET_STATUSES
     */
    resetStatuses(state) {
      state.statuses = {
        added: false,
        updated: false,
        deleted: false,
      }
      state.errMessage = null
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    // LIST
    builder
      .addCase(fetchDamageTypes.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(
        fetchDamageTypes.fulfilled,
        (state, action: PayloadAction<DamageType[]>) => {
          state.loadingList = false
          state.list = action.payload
        },
      )
      .addCase(fetchDamageTypes.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    // ADD
    builder
      .addCase(addDamage.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addDamage.fulfilled, (state, action) => {
        state.saving = false
        state.list.unshift(action.payload)
        state.damage = action.payload
        state.statuses.added = true
      })
      .addCase(addDamage.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    // UPDATE
    builder
      .addCase(saveDamage.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveDamage.fulfilled, (state, action) => {
        state.saving = false
        const record = action.payload
        const index = state.list.findIndex(
          (item) => item.damageId === record.damageId,
        )
        if (index >= 0) {
          state.list[index] = record
        } else {
          state.list.unshift(record)
        }
        state.damage = record
        state.statuses.updated = true
      })
      .addCase(saveDamage.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    // DELETE
    builder
      .addCase(deleteDamage.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deleteDamage.fulfilled, (state, action) => {
        state.deleting = false
        const id = action.payload
        state.list = state.list.filter((item) => item.damageId !== id)
        state.statuses.deleted = true
      })
      .addCase(deleteDamage.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })

    // EQUIPMENT TYPES
    builder
      .addCase(loadEquipmentTypes.pending, (state) => {
        state.loadingEquipmentTypes = true
        state.equipmentTypesError = null
      })
      .addCase(loadEquipmentTypes.fulfilled, (state, action) => {
        state.loadingEquipmentTypes = false
        state.equipmentTypesList = action.payload.equipmentTypesList
        state.equipmentTypesError = null
      })
      .addCase(loadEquipmentTypes.rejected, (state, action) => {
        state.loadingEquipmentTypes = false
        state.equipmentTypesError = action.payload as string
      })
  },
})

export const { loadDefaultDamage, loadDamageFromList, resetStatuses } =
  damageTypesSlice.actions

export default damageTypesSlice.reducer

// === Selectores recomendados ===
export const selectDamageTypesList = (state: RootState) =>
  state.damageTypes.list
export const selectDamageTypesCurrent = (state: RootState) =>
  state.damageTypes.damage
export const selectDamageTypesLoading = (state: RootState) =>
  state.damageTypes.loadingList
export const selectDamageTypesSaving = (state: RootState) =>
  state.damageTypes.saving
export const selectDamageTypesDeleting = (state: RootState) =>
  state.damageTypes.deleting
export const selectDamageTypesErrors = (state: RootState) =>
  state.damageTypes.errors
export const selectDamageTypesStatuses = (state: RootState) =>
  state.damageTypes.statuses
export const selectEquipmentTypesList = (state: RootState) =>
  state.damageTypes.equipmentTypesList
export const selectEquipmentTypesLoading = (state: RootState) =>
  state.damageTypes.loadingEquipmentTypes
