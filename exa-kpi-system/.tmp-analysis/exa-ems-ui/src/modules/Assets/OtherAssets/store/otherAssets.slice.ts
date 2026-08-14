import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { AttributeItem } from '../../../Attributes/types'
import { otherAssetsAPI } from '../api/otherAssets.api'
import type { OtherAsset, OtherAssetsState, AttributeField } from '../types'

const initialState: OtherAssetsState = {
  list: [],
  current: null,
  loading: false,
  error: null,
  pagination: { page: 1, perPage: 50, total: 0 },
  formAttributes: [],
  attributesLoading: false,
  vehicleTypes: [],
  vehicleTypesLoading: false,
}

import { authStorage } from '../../../../services/auth/auth.storage'
import { permissionService } from '../../../../services/auth/permission.service'
import { MODULE_OTHER_ASSETS } from '../../../../constants/modules'

const VIEW_ALL_SUBDIVISIONS = 'View All Subdivisions'

export const loadOtherAssets = createAsyncThunk<
  { list: OtherAsset[]; total: number },
  { page?: number; perPage?: number } | void,
  { rejectValue: string }
>(
  'otherAssets/loadList',
  async (params, { rejectWithValue }) => {
    try {
      const page = (params && params.page) || 1
      const perPage = (params && params.perPage) || 50
      const offset = (page - 1) * perPage

      const { data: result, total } = await otherAssetsAPI.getList({ offset, limit: perPage })

      const details = authStorage.getDetails()
      const userSubdivisions = details?.details?.subdivisions || []

      const allowedSubdivisionIds = userSubdivisions
        .map((s: any) => Number(s.subdivision_id))
        .filter((v: number) => !Number.isNaN(v))

      const hasScopedSubdivisions = allowedSubdivisionIds.length > 0

      const canViewAllSubdivisions =
        permissionService.checkPermission(MODULE_OTHER_ASSETS, VIEW_ALL_SUBDIVISIONS) ||
        permissionService.checkPermission(MODULE_OTHER_ASSETS, 'All Subdivision')

      if (canViewAllSubdivisions) {
        return { list: result, total }
      }

      if (!hasScopedSubdivisions) {
        return { list: [], total: 0 }
      }

      const filtered = result.filter((item) => {
        const itemSubId = item.subdivisionId ?? item.subdivision_id
        const hasSubdivision =
          itemSubId !== null &&
          itemSubId !== undefined &&
          itemSubId !== '' &&
          itemSubId !== 0
        if (!hasSubdivision) return false
        return allowedSubdivisionIds.includes(Number(itemSubId))
      })

      return { list: filtered, total }
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to load other assets')
    }
  }
)

export const loadOtherAsset = createAsyncThunk<OtherAsset, number | string, { rejectValue: string }>(
  'otherAssets/loadOne',
  async (id, { rejectWithValue }) => {
    try {
      return await otherAssetsAPI.getById(id)
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to load other asset')
    }
  }
)

export const createOtherAsset = createAsyncThunk<OtherAsset, any, { rejectValue: string }>(
  'otherAssets/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await otherAssetsAPI.create(payload)
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to create other asset')
    }
  }
)

export const updateOtherAsset = createAsyncThunk<
  OtherAsset,
  { id: number | string; payload: any },
  { rejectValue: string }
>('otherAssets/update', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await otherAssetsAPI.update(id, payload)
  } catch (error: any) {
    return rejectWithValue(error.response?.data || error.message || 'Failed to update other asset')
  }
})

export const deleteOtherAsset = createAsyncThunk<number | string, number | string, { rejectValue: string }>(
  'otherAssets/delete',
  async (id, { rejectWithValue }) => {
    try {
      await otherAssetsAPI.delete(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to delete other asset')
    }
  }
)

export const loadOtherAssetsAttributes = createAsyncThunk<
  AttributeField[],
  { otherAssetType: string; vehicleTypeId?: string },
  { rejectValue: string }
>('otherAssets/loadAttributes', async ({ otherAssetType, vehicleTypeId }, { rejectWithValue }) => {
  try {
    return await otherAssetsAPI.getFormAttributes(otherAssetType, vehicleTypeId)
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to load attribute schema')
  }
})

export const loadVehicleTypes = createAsyncThunk<AttributeItem[], void, { rejectValue: string }>(
  'otherAssets/loadVehicleTypes',
  async (_, { rejectWithValue }) => {
    try {
      return await otherAssetsAPI.getVehicleTypes()
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load vehicle types')
    }
  }
)

const otherAssetsSlice = createSlice({
  name: 'otherAssets',
  initialState,
  reducers: {
    clearCurrentOtherAsset: (state) => {
      state.current = null
    },
    clearOtherAssetsError: (state) => {
      state.error = null
    },
    resetFormAttributes: (state) => {
      state.formAttributes = []
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload
    },
    setPerPage: (state, action) => {
      state.pagination.perPage = action.payload
      state.pagination.page = 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOtherAssets.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadOtherAssets.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.list
        state.pagination.total = action.payload.total
      })
      .addCase(loadOtherAssets.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load other assets'
      })

      .addCase(loadOtherAsset.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadOtherAsset.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
      })
      .addCase(loadOtherAsset.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load other asset'
      })

      .addCase(createOtherAsset.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createOtherAsset.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
        state.list = [action.payload, ...(state.list || [])]
      })
      .addCase(createOtherAsset.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to create other asset'
      })

      .addCase(updateOtherAsset.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateOtherAsset.fulfilled, (state, action) => {
        state.loading = false
        state.current = action.payload
        const payloadId = action.payload.assetsid ?? action.payload.genericname1
        state.list = state.list.map((asset) =>
          (asset.assetsid ?? asset.genericname1) === payloadId ? action.payload : asset
        )
      })
      .addCase(updateOtherAsset.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to update other asset'
      })

      .addCase(deleteOtherAsset.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteOtherAsset.fulfilled, (state, action) => {
        state.loading = false
        state.list = state.list.filter((asset) => asset.assetsid !== action.payload)
      })
      .addCase(deleteOtherAsset.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to delete other asset'
      })

      .addCase(loadOtherAssetsAttributes.pending, (state) => {
        state.attributesLoading = true
      })
      .addCase(loadOtherAssetsAttributes.fulfilled, (state, action) => {
        state.attributesLoading = false
        state.formAttributes = action.payload
      })
      .addCase(loadOtherAssetsAttributes.rejected, (state, action) => {
        state.attributesLoading = false
        state.error = (action.payload as string) || 'Failed to load attributes'
      })

      .addCase(loadVehicleTypes.pending, (state) => {
        state.vehicleTypesLoading = true
      })
      .addCase(loadVehicleTypes.fulfilled, (state, action) => {
        state.vehicleTypesLoading = false
        state.vehicleTypes = action.payload
      })
      .addCase(loadVehicleTypes.rejected, (state, action) => {
        state.vehicleTypesLoading = false
        state.error = (action.payload as string) || 'Failed to load vehicle types'
      })
  },
})

export const { clearCurrentOtherAsset, clearOtherAssetsError, resetFormAttributes, setPage, setPerPage } = otherAssetsSlice.actions
export default otherAssetsSlice.reducer
