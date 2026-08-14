/**
 * Attributes Redux Slice
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { attributesAPI } from '../api/attributes.api'
import type { Attribute, AttributeItem, AttributeListParams, AttributesState, FieldType } from '../types'
import { ACTIVE_STATUS_ID, DROPDOWN_FIELD_TYPE_ID } from '../constants'

const toErrorPayload = (error: any, fallback: string) =>
  error?.response?.data?.message ??
  error?.response?.data ??
  error?.message ??
  fallback

const buildDefaultAttribute = (): Attribute => ({
  attribute_id: undefined,
  name: '',
  module_id: undefined,
  module: undefined,
  field_type_id: undefined,
  type: undefined,
  integral: 0,
  required: 0,
  row: 0,
  order: 0,
  column: null,
  status: { id: ACTIVE_STATUS_ID, name: 'ACTIVE' },
  primary_key: null,
  secondary_key: null,
  items: [],
})

const initialState: AttributesState = {
  attributes: [],
  currentAttribute: buildDefaultAttribute(),
  modules: [],
  fieldTypes: [],
  loading: false,
  error: null,
  total: 0,
}

const isDropdownType = (fieldTypes: FieldType[], typeId?: number, typeName?: string) => {
  if (typeId === DROPDOWN_FIELD_TYPE_ID) return true
  const fromCatalog = fieldTypes.find((ft) => ft.field_type_id === typeId)
  const label = typeName || fromCatalog?.name
  if (!label) return false
  const normalized = label.toLowerCase()
  return normalized.includes('dropdown') || normalized.includes('select') || normalized.includes('list')
}

const selectFieldTypeName = (fieldTypes: FieldType[], typeId?: number) =>
  fieldTypes.find((ft) => ft.field_type_id === typeId)?.name

const withItemsIfNeeded = async (
  attribute: Attribute,
  items: AttributeItem[] | undefined,
  fieldTypes: FieldType[]
): Promise<Attribute> => {
  const typeId = attribute.field_type_id ?? attribute.type?.field_type_id
  const typeName = attribute.type?.name || selectFieldTypeName(fieldTypes, typeId)
  if (isDropdownType(fieldTypes, typeId, typeName) && Array.isArray(items) && items.length && attribute.attribute_id) {
    const savedItems = await attributesAPI.saveAttributeItems(attribute.attribute_id, items)
    return { ...attribute, items: savedItems }
  }
  return attribute
}

export const loadAttributesList = createAsyncThunk(
  'attributes/loadAttributesList',
  async (params: AttributeListParams | undefined, { rejectWithValue }) => {
    try {
      return await attributesAPI.getAttributesList(params || {})
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to load attributes'))
    }
  }
)

const mergeAttribute = (target: Attribute, source?: Attribute) => {
  if (!source) return target
  const pickTruthyNumber = (primary?: any, fallback?: any) => {
    const primaryNum = primary != null ? Number(primary) : undefined
    const fallbackNum = fallback != null ? Number(fallback) : undefined
    if (primaryNum === 0 && fallbackNum === 1) return 1
    if (primaryNum != null && !Number.isNaN(primaryNum)) return primaryNum
    return fallbackNum
  }

  return {
    ...target,
    name: target.name || source.name,
    module_id: target.module_id ?? source.module_id,
    module: target.module || source.module,
    field_type_id: target.field_type_id ?? source.field_type_id,
    type: target.type || source.type,
    integral: pickTruthyNumber(target.integral, source.integral),
    required: pickTruthyNumber(target.required, source.required),
    row: pickTruthyNumber(target.row, source.row),
    order: pickTruthyNumber(target.order, source.order),
    column: pickTruthyNumber(target.column, source.column),
    status: target.status || source.status,
    primary_key: pickTruthyNumber(target.primary_key, source.primary_key),
    secondary_key: pickTruthyNumber(target.secondary_key, source.secondary_key),
  }
}

export const loadAttribute = createAsyncThunk(
  'attributes/loadAttribute',
  async (id: number, { rejectWithValue, getState }) => {
    try {
      const incoming = await attributesAPI.getAttribute(id)

      // If the detail endpoint is missing module/type info, try to hydrate from existing list or a fresh list call.
      const state: any = getState()
      const listFromState: Attribute[] = state.attributes?.attributes || []
      const localMatch = listFromState.find((attr) => attr.attribute_id === id)

      let merged = mergeAttribute(incoming, localMatch)
      if ((!merged.module_id || !merged.field_type_id) && !localMatch) {
        try {
          const listResponse = await attributesAPI.getAttributesList({ rows: 500, first: 0 })
          const remoteMatch = listResponse.data.find((attr) => attr.attribute_id === id)
          merged = mergeAttribute(merged, remoteMatch)
        } catch (err) {
          console.warn('Unable to hydrate attribute from list:', err)
        }
      }

      return merged
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to load attribute'))
    }
  }
)

export const loadModules = createAsyncThunk('attributes/loadModules', async (_, { rejectWithValue }) => {
  try {
    return await attributesAPI.getModules()
  } catch (error: any) {
    return rejectWithValue(toErrorPayload(error, 'Failed to load modules list'))
  }
})

export const loadFieldTypes = createAsyncThunk(
  'attributes/loadFieldTypes',
  async (_, { rejectWithValue }) => {
    try {
      return await attributesAPI.getFieldTypes()
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to load field types'))
    }
  }
)

export const createAttribute = createAsyncThunk(
  'attributes/createAttribute',
  async (attribute: Attribute, { rejectWithValue, getState }) => {
    try {
      const state: any = getState()
      const created = await attributesAPI.createAttribute(attribute)
      const withItems = await withItemsIfNeeded(created, attribute.items, state.attributes?.fieldTypes || [])
      return withItems
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to create attribute'))
    }
  }
)

export const updateAttribute = createAsyncThunk(
  'attributes/updateAttribute',
  async ({ id, attribute }: { id: number; attribute: Attribute }, { rejectWithValue, getState }) => {
    try {
      const state: any = getState()
      const updated = await attributesAPI.updateAttribute(id, attribute)
      const withItems = await withItemsIfNeeded(updated, attribute.items, state.attributes?.fieldTypes || [])
      return withItems
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to update attribute'))
    }
  }
)

export const deleteAttribute = createAsyncThunk(
  'attributes/deleteAttribute',
  async (id: number, { rejectWithValue }) => {
    try {
      await attributesAPI.deleteAttribute(id)
      return id
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to delete attribute'))
    }
  }
)

export const saveAttributeItems = createAsyncThunk(
  'attributes/saveAttributeItems',
  async ({ attributeId, items }: { attributeId: number; items: AttributeItem[] }, { rejectWithValue }) => {
    try {
      const savedItems = await attributesAPI.saveAttributeItems(attributeId, items)
      return { attributeId, items: savedItems }
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to save attribute items'))
    }
  }
)

const attributesSlice = createSlice({
  name: 'attributes',
  initialState,
  reducers: {
    clearCurrentAttribute: (state) => {
      state.currentAttribute = null
    },
    setDefaultAttribute: (state) => {
      state.currentAttribute = buildDefaultAttribute()
      state.error = null
    },
    clearAttributeError: (state) => {
      state.error = null
    },
    setAttributeItems: (state, action) => {
      if (state.currentAttribute) {
        state.currentAttribute.items = action.payload
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAttributesList.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadAttributesList.fulfilled, (state, action) => {
        state.loading = false
        state.attributes = action.payload.data
        state.total = action.payload.total ?? action.payload.data.length
      })
      .addCase(loadAttributesList.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to load attributes'
      })

      .addCase(loadAttribute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadAttribute.fulfilled, (state, action) => {
        state.loading = false
        state.currentAttribute = action.payload
      })
      .addCase(loadAttribute.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to load attribute'
      })

      .addCase(createAttribute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createAttribute.fulfilled, (state, action) => {
        state.loading = false
        state.currentAttribute = action.payload
        state.attributes = [...state.attributes, action.payload]
      })
      .addCase(createAttribute.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to create attribute'
      })

      .addCase(updateAttribute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateAttribute.fulfilled, (state, action) => {
        state.loading = false
        state.currentAttribute = action.payload
        state.attributes = state.attributes.map((attr) =>
          attr.attribute_id === action.payload.attribute_id ? action.payload : attr
        )
      })
      .addCase(updateAttribute.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to update attribute'
      })

      .addCase(deleteAttribute.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteAttribute.fulfilled, (state, action) => {
        state.loading = false
        state.attributes = state.attributes.filter(
          (attr) => attr.attribute_id !== (action.payload as number)
        )
      })
      .addCase(deleteAttribute.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as any) || 'Failed to delete attribute'
      })

      .addCase(loadModules.fulfilled, (state, action) => {
        state.modules = action.payload
      })
      .addCase(loadFieldTypes.fulfilled, (state, action) => {
        state.fieldTypes = action.payload
      })

      .addCase(saveAttributeItems.fulfilled, (state, action) => {
        if (
          state.currentAttribute &&
          state.currentAttribute.attribute_id === action.payload.attributeId
        ) {
          state.currentAttribute.items = action.payload.items
        }
        state.attributes = state.attributes.map((attr) =>
          attr.attribute_id === action.payload.attributeId
            ? { ...attr, items: action.payload.items }
            : attr
        )
      })
  },
})

export const {
  clearCurrentAttribute,
  setDefaultAttribute,
  clearAttributeError,
  setAttributeItems,
} = attributesSlice.actions

export default attributesSlice.reducer
