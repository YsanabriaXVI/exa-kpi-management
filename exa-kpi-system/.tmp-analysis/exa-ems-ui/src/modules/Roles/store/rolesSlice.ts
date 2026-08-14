import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { rolesAPI } from '../api/roles.api'
import type { Role, RolesState } from '../types'
import type { RootState } from '../../../store'

const initialState: RolesState = {
  roles: [],
  currentRole: null,
  loading: false,
  error: null,
}

const toErrorPayload = (error: any, fallback: string) =>
  error?.response?.data?.message ??
  error?.response?.data ??
  error?.message ??
  fallback

export const loadRolesList = createAsyncThunk('roles/loadRolesList', async (_, { rejectWithValue }) => {
  try {
    const roles = await rolesAPI.getRoles()
    return roles
  } catch (error: any) {
    return rejectWithValue(toErrorPayload(error, 'Failed to load roles'))
  }
})

export const loadRole = createAsyncThunk<
  { role: Role; snapshot?: Role[] },
  number,
  { state: RootState }
>(
  'roles/loadRole',
  async (id, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState
      let sourceRoles = state.roles.roles
      let fetched = false
      if (!Array.isArray(sourceRoles) || sourceRoles.length === 0) {
        sourceRoles = await rolesAPI.getRoles()
        fetched = true
      }
      const role = sourceRoles.find((item) => item.role_id === id)
      if (!role) {
        throw new Error('Role not found')
      }
      return {
        role,
        snapshot: fetched ? sourceRoles : undefined,
      }
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to load role'))
    }
  }
)

export const createRole = createAsyncThunk('roles/createRole', async (roleData: Partial<Role>, { rejectWithValue }) => {
  try {
    const role = await rolesAPI.createRole(roleData)
    return role
  } catch (error: any) {
    return rejectWithValue(toErrorPayload(error, 'Failed to create role'))
  }
})

export const updateRole = createAsyncThunk(
  'roles/updateRole',
  async ({ id, roleData }: { id: number; roleData: Partial<Role> }, { rejectWithValue }) => {
    try {
      const role = await rolesAPI.updateRole(id, roleData)
      return role
    } catch (error: any) {
      return rejectWithValue(toErrorPayload(error, 'Failed to update role'))
    }
  }
)

export const deleteRole = createAsyncThunk('roles/deleteRole', async (id: number, { rejectWithValue }) => {
  try {
    await rolesAPI.deleteRole(id)
    return id
  } catch (error: any) {
    return rejectWithValue(toErrorPayload(error, 'Failed to delete role'))
  }
})

const defaultRole: Role = {
  name: '',
  status: { id: 1, name: 'ACTIVE' },
  description: '',
  permissions: {},
}

const rolesSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    setDefaultRole: (state) => {
      state.currentRole = { ...defaultRole }
    },
    clearRoleError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadRolesList.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadRolesList.fulfilled, (state, action) => {
        state.loading = false
        state.roles = action.payload
      })
      .addCase(loadRolesList.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as any
      })
      .addCase(loadRole.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadRole.fulfilled, (state, action) => {
        state.loading = false
        state.currentRole = action.payload.role
        if (action.payload.snapshot) {
          state.roles = action.payload.snapshot
        }
      })
      .addCase(loadRole.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as any
      })
      .addCase(createRole.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.loading = false
        state.roles.push(action.payload)
        state.currentRole = action.payload
      })
      .addCase(createRole.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as any
      })
      .addCase(updateRole.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.roles.findIndex((role) => role.role_id === action.payload.role_id)
        if (idx !== -1) {
          state.roles[idx] = action.payload
        }
        state.currentRole = action.payload
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as any
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.roles = state.roles.filter((role) => role.role_id !== action.payload)
      })
  },
})

export const { setDefaultRole, clearRoleError } = rolesSlice.actions

export default rolesSlice.reducer
