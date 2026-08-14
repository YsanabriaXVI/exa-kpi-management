// src/modules/ItemTypes/store/itemTypes.slice.ts
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../store'
import type { ItemType, ItemTypeForm, ItemTypesErrors } from '../types/itemTypes.types'
import { itemTypesApi } from '../api/itemTypes.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface ItemTypesState {
  list: ItemType[]
  item: ItemTypeForm | null
  errors: ItemTypesErrors
  statuses: StatusFlags
  loadingList: boolean
  saving: boolean
  deleting: boolean
}

const itemDefault: ItemTypeForm = {
  ISOCode: undefined,
  description: undefined,
  status: 1,
  active: 1,
}

const initialState: ItemTypesState = {
  list: [],
  item: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  saving: false,
  deleting: false,
}

export const fetchItemTypes = createAsyncThunk<
  ItemType[],
  void,
  { rejectValue: ItemTypesErrors }
>('itemTypes/fetchList', async (_arg, thunkAPI) => {
  try {
    return await itemTypesApi.fetchItemTypes()
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const addItemType = createAsyncThunk<
  ItemType,
  ItemTypeForm,
  { rejectValue: ItemTypesErrors }
>('itemTypes/add', async (form, thunkAPI) => {
  try {
    return await itemTypesApi.createItemType(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const saveItemType = createAsyncThunk<
  ItemType,
  ItemTypeForm,
  { rejectValue: ItemTypesErrors }
>('itemTypes/save', async (form, thunkAPI) => {
  try {
    return await itemTypesApi.updateItemType(form)
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

export const deleteItemType = createAsyncThunk<
  number,
  number,
  { rejectValue: ItemTypesErrors }
>('itemTypes/delete', async (id, thunkAPI) => {
  try {
    await itemTypesApi.deleteItemType(id)
    return id
  } catch (err: any) {
    const errors = err?.response?.data?.errors ?? err?.data?.errors ?? err
    return thunkAPI.rejectWithValue(errors)
  }
})

const itemTypesSlice = createSlice({
  name: 'itemTypes',
  initialState,
  reducers: {
    loadDefaultItem(state, action: PayloadAction<ItemTypeForm | undefined>) {
      state.item = { ...itemDefault, ...(action.payload || {}) }
      state.errors = null
    },

    loadItemFromList(state, action: PayloadAction<number>) {
      const id = action.payload
      const found = state.list.find((x) => x.itemTypeId === id)
      state.item = found ? { ...found } : null
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
      .addCase(fetchItemTypes.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchItemTypes.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload
      })
      .addCase(fetchItemTypes.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    // ADD
    builder
      .addCase(addItemType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addItemType.fulfilled, (state, action) => {
        state.saving = false
        state.list.unshift(action.payload)
        state.item = action.payload
        state.statuses.added = true
      })
      .addCase(addItemType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    // UPDATE
    builder
      .addCase(saveItemType.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveItemType.fulfilled, (state, action) => {
        state.saving = false
        const idx = state.list.findIndex((x) => x.itemTypeId === action.payload.itemTypeId)
        if (idx >= 0) state.list.splice(idx, 1, action.payload)
        state.item = action.payload
        state.statuses.updated = true
      })
      .addCase(saveItemType.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload ?? action.error
      })

    // DELETE
    builder
      .addCase(deleteItemType.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deleteItemType.fulfilled, (state, action) => {
        state.deleting = false
        state.list = state.list.filter((x) => x.itemTypeId !== action.payload)
        state.statuses.deleted = true
      })
      .addCase(deleteItemType.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const { loadDefaultItem, loadItemFromList, resetStatuses } = itemTypesSlice.actions
export default itemTypesSlice.reducer

// selectors
export const selectItemTypesList = (s: RootState) => s.itemTypes.list
export const selectItemTypeCurrent = (s: RootState) => s.itemTypes.item
export const selectItemTypesErrors = (s: RootState) => s.itemTypes.errors
export const selectItemTypesStatuses = (s: RootState) => s.itemTypes.statuses
export const selectItemTypesLoadingList = (s: RootState) => s.itemTypes.loadingList
export const selectItemTypesSaving = (s: RootState) => s.itemTypes.saving
export const selectItemTypesDeleting = (s: RootState) => s.itemTypes.deleting
