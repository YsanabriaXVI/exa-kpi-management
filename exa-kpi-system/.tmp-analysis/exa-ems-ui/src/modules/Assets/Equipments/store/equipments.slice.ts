import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { EquipmentKind, EquipmentsState, Equipment, EquipmentListItem } from '../types'
import { equipmentsAPI } from '../api/equipments.api'

const buildState = (): EquipmentsState => ({
  chassis: { list: [], current: null, loading: false, error: null, formAttributes: [], attributesLoading: false },
  genset: { list: [], current: null, loading: false, error: null, formAttributes: [], attributesLoading: false },
})

const initialState: EquipmentsState = buildState()

export const loadEquipments = createAsyncThunk<
  { kind: EquipmentKind; items: EquipmentListItem[] },
  EquipmentKind,
  { rejectValue: string }
>('equipments/loadList', async (kind, { rejectWithValue }) => {
  try {
    const items = await equipmentsAPI.list(kind)
    return { kind, items }
  } catch (error: any) {
    return rejectWithValue(error.response?.data || error.message)
  }
})

export const loadEquipment = createAsyncThunk<{ kind: EquipmentKind; item: Equipment }, { kind: EquipmentKind; id: number | string }, { rejectValue: string }>(
  'equipments/loadOne',
  async ({ kind, id }, { rejectWithValue }) => {
    try {
      const item = await equipmentsAPI.get(kind, id)
      return { kind, item }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load equipment')
    }
  }
)

export const createEquipment = createAsyncThunk<{ kind: EquipmentKind; item: Equipment }, { kind: EquipmentKind; payload: any }, { rejectValue: string }>(
  'equipments/create',
  async ({ kind, payload }, { rejectWithValue }) => {
    try {
      const item = await equipmentsAPI.create(kind, payload)
      return { kind, item }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create equipment')
    }
  }
)

export const updateEquipment = createAsyncThunk<
  { kind: EquipmentKind; item: Equipment },
  { kind: EquipmentKind; id: number | string; payload: any },
  { rejectValue: string }
>('equipments/update', async ({ kind, id, payload }, { rejectWithValue }) => {
  try {
    const item = await equipmentsAPI.update(kind, id, payload)
    return { kind, item }
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to update equipment')
  }
})

export const deleteEquipment = createAsyncThunk<{ kind: EquipmentKind; id: number | string }, { kind: EquipmentKind; id: number | string }, { rejectValue: string }>(
  'equipments/delete',
  async ({ kind, id }, { rejectWithValue }) => {
    try {
      await equipmentsAPI.remove(kind, id)
      return { kind, id }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete equipment')
    }
  }
)

export const loadEquipmentAttributes = createAsyncThunk<
  { kind: EquipmentKind; attributes: any[] },
  EquipmentKind,
  { rejectValue: string }
>('equipments/loadAttributes', async (kind, { rejectWithValue }) => {
  try {
    const attributes = await equipmentsAPI.getAttributes(kind)
    return { kind, attributes }
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to load attributes')
  }
})

export const loadEquipmentSizes = createAsyncThunk<any[], void, { rejectValue: string }>(
  'equipments/loadSizes',
  async (_, { rejectWithValue }) => {
    try {
      const sizes = await equipmentsAPI.getEquipmentSizes()
      return sizes
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load equipment sizes')
    }
  }
)

export const loadGenericAttributeItems = createAsyncThunk<
  { key: string; items: any[] },
  { attributeFlatNameId: string; moduleFlatNameId: string; key: string },
  { rejectValue: string }
>('equipments/loadGenericAttributeItems', async ({ attributeFlatNameId, moduleFlatNameId, key }, { rejectWithValue }) => {
  try {
    const items = await equipmentsAPI.getAttributeItems(attributeFlatNameId, moduleFlatNameId)
    return { key, items }
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to load attribute items')
  }
})

const equipmentsSlice = createSlice({
  name: 'equipments',
  initialState,
  reducers: {
    clearEquipment(state, action) {
      const kind = action.payload as EquipmentKind
      state[kind].current = null
    },
    clearEquipmentError(state, action) {
      const kind = action.payload as EquipmentKind
      state[kind].error = null
    },
    resetEquipmentAttributes(state, action) {
      const kind = action.payload as EquipmentKind
      state[kind].formAttributes = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadEquipments.pending, (state, action) => {
        const kind = action.meta.arg
        state[kind].loading = true
        state[kind].error = null
      })
      .addCase(loadEquipments.fulfilled, (state, action) => {
        const { kind, items } = action.payload
        state[kind].loading = false
        state[kind].list = items
      })
      .addCase(loadEquipments.rejected, (state, action) => {
        const kind = action.meta.arg
        state[kind].loading = false
        state[kind].error = (action.payload as string) || 'Failed to load equipments'
      })

      .addCase(loadEquipment.pending, (state, action) => {
        const kind = action.meta.arg.kind
        state[kind].loading = true
        state[kind].error = null
      })
      .addCase(loadEquipment.fulfilled, (state, action) => {
        const { kind, item } = action.payload
        state[kind].loading = false
        state[kind].current = item
      })
      .addCase(loadEquipment.rejected, (state, action) => {
        const kind = action.meta.arg.kind
        state[kind].loading = false
        state[kind].error = (action.payload as string) || 'Failed to load equipment'
      })

      .addCase(createEquipment.pending, (state, action) => {
        const kind = action.meta.arg.kind
        state[kind].loading = true
        state[kind].error = null
      })
      .addCase(createEquipment.fulfilled, (state, action) => {
        const { kind, item } = action.payload
        state[kind].loading = false
        state[kind].current = item
        state[kind].list = [item, ...(state[kind].list || [])]
      })
      .addCase(createEquipment.rejected, (state, action) => {
        const kind = action.meta.arg.kind
        state[kind].loading = false
        state[kind].error = (action.payload as string) || 'Failed to create equipment'
      })

      .addCase(updateEquipment.pending, (state, action) => {
        const kind = action.meta.arg.kind
        state[kind].loading = true
        state[kind].error = null
      })
      .addCase(updateEquipment.fulfilled, (state, action) => {
        const { kind, item } = action.payload
        state[kind].loading = false
        state[kind].current = item
        const id = item.assetsid ?? item.asset_id
        state[kind].list = state[kind].list.map((eq) => ((eq.assetsid ?? eq.asset_id) === id ? item : eq))
      })
      .addCase(updateEquipment.rejected, (state, action) => {
        const kind = action.meta.arg.kind
        state[kind].loading = false
        state[kind].error = (action.payload as string) || 'Failed to update equipment'
      })

      .addCase(deleteEquipment.pending, (state, action) => {
        const kind = action.meta.arg.kind
        state[kind].loading = true
        state[kind].error = null
      })
      .addCase(deleteEquipment.fulfilled, (state, action) => {
        const { kind, id } = action.payload
        state[kind].loading = false
        state[kind].list = state[kind].list.filter((eq) => (eq.assetsid ?? eq.asset_id) !== id)
      })
      .addCase(deleteEquipment.rejected, (state, action) => {
        const kind = action.meta.arg.kind
        state[kind].loading = false
        state[kind].error = (action.payload as string) || 'Failed to delete equipment'
      })

      .addCase(loadEquipmentAttributes.pending, (state, action) => {
        const kind = action.meta.arg
        state[kind].attributesLoading = true
      })
      .addCase(loadEquipmentAttributes.fulfilled, (state, action) => {
        const { kind, attributes } = action.payload
        state[kind].attributesLoading = false
        state[kind].formAttributes = attributes
      })
      .addCase(loadEquipmentAttributes.rejected, (state, action) => {
        const kind = action.meta.arg
        state[kind].attributesLoading = false
        state[kind].error = (action.payload as string) || 'Failed to load attributes'
      })

      .addCase(loadEquipmentSizes.fulfilled, (state, action) => {
        state.chassis.equipmentSizes = action.payload
        state.genset.equipmentSizes = action.payload
      })
      .addCase(loadGenericAttributeItems.fulfilled, (state, action) => {
        const { key, items } = action.payload
        if (!state.chassis.genericAttributeItems) state.chassis.genericAttributeItems = {}
        if (!state.genset.genericAttributeItems) state.genset.genericAttributeItems = {}
        state.chassis.genericAttributeItems[key] = items
        state.genset.genericAttributeItems[key] = items
      })
  },
})

export const { clearEquipment, clearEquipmentError, resetEquipmentAttributes } = equipmentsSlice.actions
export default equipmentsSlice.reducer
