// src/modules/EquipmentSize/store/equipmentSize.slice.ts
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../store'
import type {
  EquipmentSize,
  EquipmentSizeErrors,
  EquipmentSizeForm,
  EquipmentType,
  AxleItem,
} from '../types/equipmentSize.types'

import { equipmentSizeApi } from '../api/equipmentSize.api'
import { equipmentTypesApi } from '../../DamageTypes/api/equipmentTypes.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface EquipmentSizeState {
  list: EquipmentSize[]
  current: EquipmentSizeForm | null
  errors: EquipmentSizeErrors
  statuses: StatusFlags

  loadingList: boolean
  loadingCurrent: boolean
  saving: boolean
  deleting: boolean

  equipmentTypesList: EquipmentType[]
  loadingEquipmentTypes: boolean
  equipmentTypesError: string | null

  axlesList: AxleItem[]
  loadingAxles: boolean
  axlesError: string | null
}

const sizeDefault: EquipmentSizeForm = {
  equipmentTypeId: undefined,
  sizeType: '',
  description: '',
  axieId: undefined,
  extendable: 0,
  fridge: 0,
  isoCode1: '',
  isoCode2: '',
  isoCode3: '',
  isoCode4: '',
  isoCode5: '',
  isoCode6: '',
  isoCode7: '',
  isoCode8: '',
  isoCode9: '',
  isoCode10: '',
  status: 1,
  active: 1,
}

const initialState: EquipmentSizeState = {
  list: [],
  current: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },

  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,

  equipmentTypesList: [],
  loadingEquipmentTypes: false,
  equipmentTypesError: null,

  axlesList: [],
  loadingAxles: false,
  axlesError: null,
}

// -------- THUNKS --------

export const fetchEquipmentSizes = createAsyncThunk<
  EquipmentSize[],
  void,
  { rejectValue: EquipmentSizeErrors }
>('equipmentSize/fetchList', async (_arg, thunkAPI) => {
  try {
    return await equipmentSizeApi.fetchSizes()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const fetchEquipmentSizeById = createAsyncThunk<
  EquipmentSize,
  number,
  { rejectValue: EquipmentSizeErrors }
>('equipmentSize/fetchById', async (id, thunkAPI) => {
  try {
    return await equipmentSizeApi.fetchSizeById(id)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const addEquipmentSize = createAsyncThunk<
  EquipmentSize,
  EquipmentSizeForm,
  { rejectValue: EquipmentSizeErrors }
>('equipmentSize/add', async (form, thunkAPI) => {
  try {
    return await equipmentSizeApi.createSize(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const saveEquipmentSize = createAsyncThunk<
  EquipmentSize,
  EquipmentSizeForm,
  { rejectValue: EquipmentSizeErrors }
>('equipmentSize/save', async (form, thunkAPI) => {
  try {
    return await equipmentSizeApi.updateSize(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const deleteEquipmentSize = createAsyncThunk<
  number,
  number,
  { state: RootState; rejectValue: EquipmentSizeErrors }
>('equipmentSize/delete', async (id, thunkAPI) => {
  try {
    await equipmentSizeApi.deleteSize(id)
    return id
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const loadEquipmentTypes = createAsyncThunk(
  'equipmentSize/loadEquipmentTypes',
  async (_: void, { rejectWithValue }) => {
    try {
      return await equipmentTypesApi.loadEquipmentTypes() // { equipmentTypesList }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load equipment types')
    }
  },
)

export const loadAxles = createAsyncThunk(
  'equipmentSize/loadAxles',
  async (_: void, { rejectWithValue }) => {
    try {
      const axlesList = await equipmentSizeApi.fetchAxles()
      return { axlesList }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load axles')
    }
  },
)

// -------- SLICE --------

const equipmentSizeSlice = createSlice({
  name: 'equipmentSize',
  initialState,
  reducers: {
    loadDefaultEquipmentSize(state, action: PayloadAction<EquipmentSizeForm | undefined>) {
      state.current = { ...sizeDefault, ...(action.payload || {}) }
      state.errors = null
    },

    loadEquipmentSizeFromList(state, action: PayloadAction<number>) {
      const id = action.payload
      const found = state.list.find((x) => x.sizeEquipmentId === id)
      state.current = found ? { ...found } : null
      state.errors = null
    },

    clearCurrent(state) {
      state.current = null
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
      .addCase(fetchEquipmentSizes.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchEquipmentSizes.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload ?? []
      })
      .addCase(fetchEquipmentSizes.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    // CURRENT (byId)
    builder
      .addCase(fetchEquipmentSizeById.pending, (state) => {
        state.loadingCurrent = true
        state.errors = null
      })
      .addCase(fetchEquipmentSizeById.fulfilled, (state, action) => {
        state.loadingCurrent = false
        state.current = action.payload
      })
      .addCase(fetchEquipmentSizeById.rejected, (state, action) => {
        state.loadingCurrent = false
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

    // AXLES
    builder
      .addCase(loadAxles.pending, (state) => {
        state.loadingAxles = true
        state.axlesError = null
      })
      .addCase(loadAxles.fulfilled, (state, action: any) => {
        state.loadingAxles = false
        state.axlesList = action.payload?.axlesList ?? []
      })
      .addCase(loadAxles.rejected, (state, action: any) => {
        state.loadingAxles = false
        state.axlesError = action.payload ?? action.error?.message ?? 'Failed to load axles'
      })

    // ADD
    builder
      .addCase(addEquipmentSize.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addEquipmentSize.fulfilled, (state, action) => {
        state.saving = false
        state.list.unshift(action.payload)
        state.current = action.payload
        state.statuses.added = true
      })
      .addCase(addEquipmentSize.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    // UPDATE
    builder
      .addCase(saveEquipmentSize.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveEquipmentSize.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.list.findIndex((x) => x.sizeEquipmentId === action.payload.sizeEquipmentId)
        if (idx >= 0) state.list.splice(idx, 1, action.payload)
        state.current = action.payload
        state.statuses.updated = true
      })
      .addCase(saveEquipmentSize.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    // DELETE
    builder
      .addCase(deleteEquipmentSize.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deleteEquipmentSize.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter((x) => x.sizeEquipmentId !== action.payload)
        state.statuses.deleted = true
      })
      .addCase(deleteEquipmentSize.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const {
  loadDefaultEquipmentSize,
  loadEquipmentSizeFromList,
  clearCurrent,
  resetStatuses,
} = equipmentSizeSlice.actions

export default equipmentSizeSlice.reducer

// -------- SELECTORS --------
export const selectEquipmentSizesList = (s: RootState) => s.equipmentSize.list
export const selectEquipmentSizeCurrent = (s: RootState) => s.equipmentSize.current
export const selectEquipmentSizeErrors = (s: RootState) => s.equipmentSize.errors
export const selectEquipmentSizeStatuses = (s: RootState) => s.equipmentSize.statuses
export const selectEquipmentSizeSaving = (s: RootState) => s.equipmentSize.saving
export const selectEquipmentTypesList = (s: RootState) => s.equipmentSize.equipmentTypesList
export const selectAxlesList = (s: RootState) => s.equipmentSize.axlesList
