/**
 * Users Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { usersAPI } from '../api/users.api'
import type { UsersState, User, UserListParams } from '../types'

/**
 * Initial State
 */
const initialState: UsersState = {
  users: [],
  currentUser: null,
  roles: [],
  clients: [],
  subdivisions: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  total: 0,
}

/**
 * Async Thunks
 */

// Fetch all users
export const loadUsersList = createAsyncThunk(
  'users/loadUsersList',
  async (params: UserListParams, { rejectWithValue }) => {
    try {
      const response = await usersAPI.getUsersList(params)

      // Ensure all users have profiles
      if (response.data && Array.isArray(response.data)) {
        response.data = response.data.map((user: any) => {
          if (!user.profile) {
            user.profile = {
              job_title: '',
              phone: '',
              ext: '',
              address: '',
              city: '',
              zipcode: '',
              state: '',
              country: '',
            }
          }
          return user
        })
      }

      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const toIdArray = (items: any[], key: string) => {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => {
      if (item == null) {
        return null
      }
      if (typeof item === 'object') {
        const value = item[key] ?? item[`${key.replace('_id', '')}_id`] ?? item.id ?? item.value
        return typeof value === 'number' ? value : Number(value)
      }
      return typeof item === 'number' ? item : Number(item)
    })
    .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))
}

const normalizeCompanyRoleEntries = (entries: any[]) => {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries
    .map((entry, index) => {
      if (!entry) {
        return null
      }

      const companySource = entry.company ?? entry.company_id ?? entry.companyId
      const companyId =
        typeof companySource === 'object'
          ? companySource.company_id ?? companySource.id ?? companySource.value
          : companySource
      const roleSource = entry.role ?? entry.role_id ?? entry.roleId
      const roleId =
        typeof roleSource === 'object'
          ? roleSource.role_id ?? roleSource.id ?? roleSource.value
          : roleSource

      if (!companyId || !roleId) {
        return null
      }

      const company =
        typeof entry.company === 'object' && entry.company
          ? {
            company_id: Number(companyId),
            name:
              entry.company.name ??
              entry.company.label ??
              `Company ${companyId}`,
          }
          : {
            company_id: Number(companyId),
            name: entry.company_name ?? `Company ${companyId}`,
          }

      const role =
        typeof entry.role === 'object' && entry.role
          ? {
            role_id: Number(roleId),
            name: entry.role.name ?? entry.role.label ?? `Role ${roleId}`,
          }
          : {
            role_id: Number(roleId),
            name: entry.role_name ?? `Role ${roleId}`,
          }

      return {
        company_item_id:
          entry.company_item_id ?? entry.id ?? entry.user_role_company_id ?? `item_${index}`,
        company,
        role,
      }
    })
    .filter((item): item is { company_item_id: any; company: any; role: any } => Boolean(item))
}

// Fetch single user
export const loadUser = createAsyncThunk(
  'users/loadUser',
  async (id: number, { rejectWithValue }) => {
    try {
      console.log('📥 loadUser thunk called with ID:', id)

      const response = await usersAPI.getUser(id)

      console.log('📦 Raw user data from API:', response)

      // Ensure profile exists
      if (!response.profile) {
        console.log('⚠️ No profile found, creating default profile')
        response.profile = {
          job_title: '',
          phone: '',
          ext: '',
          address: '',
          city: '',
          zipcode: '',
          state: '',
          country: '',
        }
      }

      const apiClients = Array.isArray(response.clients) ? response.clients : []
      const apiSubdivisions = Array.isArray(response.subdivisions) ? response.subdivisions : []

      // Normalize clients arrays so multiselect receives ids + descriptive lists
      response.clients = toIdArray(apiClients, 'client_id')
      if (!Array.isArray(response.clientsList) || response.clientsList.length === 0) {
        response.clientsList = apiClients.filter(
          (client) => client && typeof client === 'object' && 'client_id' in client
        )
      }
      if (!Array.isArray(response.clientsList)) {
        response.clientsList = []
      }

      // Normalize subdivisions arrays so multiselect receives ids + descriptive lists
      response.subdivisions = toIdArray(apiSubdivisions, 'subdivision_id')
      if (!Array.isArray(response.subdivisionsList) || response.subdivisionsList.length === 0) {
        response.subdivisionsList = apiSubdivisions.filter(
          (subdivision) => subdivision && typeof subdivision === 'object' && 'subdivision_id' in subdivision
        )
      }
      if (!Array.isArray(response.subdivisionsList)) {
        response.subdivisionsList = []
      }

      response.user_role_companies = normalizeCompanyRoleEntries(response.user_role_companies)

      console.log('✅ User data ready:', response)

      return response
    } catch (error: any) {
      console.error('❌ loadUser thunk error:', error)
      return rejectWithValue(error.message)
    }
  }
)

// Create user
export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await usersAPI.createUser(userData)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Update user
export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, userData }: { id: number; userData: Partial<User> }, { rejectWithValue }) => {
    try {
      const response = await usersAPI.updateUser(id, userData)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Delete user
export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id: number, { rejectWithValue }) => {
    try {
      await usersAPI.deleteUser(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Change user status
export const changeUserStatus = createAsyncThunk(
  'users/changeUserStatus',
  async ({ userId, statusId }: { userId: number; statusId: number }, { rejectWithValue }) => {
    try {
      const response = await usersAPI.changeUserStatus(userId, statusId)
      return { userId, user: response }
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Fetch roles
export const loadRoles = createAsyncThunk(
  'users/loadRoles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await usersAPI.getRoles()
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Fetch clients
export const loadClients = createAsyncThunk(
  'users/loadClients',
  async (_, { rejectWithValue }) => {
    try {
      const response = await usersAPI.getClients()
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Fetch subdivisions
export const loadSubdivisions = createAsyncThunk(
  'users/loadSubdivisions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await usersAPI.getSubdivisions()
      return response
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

/**
 * Users Slice
 */
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearCurrentUser: (state) => {
      state.currentUser = null
    },
    clearErrors: (state) => {
      state.error = null
    },
    setDefaultUser: (state) => {
      state.currentUser = {
        email: '',
        first_name: '',
        last_name: '',
        status: { name: 'ACTIVE', id: 1 },
        profile: {
          job_title: '',
          phone: '',
          ext: '',
          address: '',
          city: '',
          zipcode: '',
          state: '',
          country: '',
        },
        user_role_companies: [],
        clients: [],
        subdivisions: [],
        clientsList: [],
        subdivisionsList: [],
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Load Users List
      .addCase(loadUsersList.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadUsersList.fulfilled, (state, action) => {
        state.loading = false
        state.users = action.payload.data || []
        state.total = action.payload.total || 0
        state.pagination = action.payload.pagination || state.pagination
      })
      .addCase(loadUsersList.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // Load Single User
      .addCase(loadUser.pending, (state) => {
        console.log('⏳ loadUser.pending - Loading user...')
        state.loading = true
        state.error = null
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        console.log('✅ loadUser.fulfilled - User loaded successfully:', action.payload)
        state.loading = false
        state.currentUser = action.payload
      })
      .addCase(loadUser.rejected, (state, action) => {
        console.error('❌ loadUser.rejected - Failed to load user:', action.payload)
        state.loading = false
        state.error = action.payload as string
      })

      // Create User
      .addCase(createUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false
        state.users.push(action.payload)
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false
        const payload = action.payload as any
        state.error = typeof payload === 'string' ? payload : (payload?.message || 'Failed to create user')
      })

      // Update User
      .addCase(updateUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false
        const index = state.users.findIndex((u) => u.user_id === action.payload.user_id)
        if (index !== -1) {
          state.users[index] = action.payload
        }
        state.currentUser = action.payload
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false
        const payload = action.payload as any
        state.error = typeof payload === 'string' ? payload : (payload?.message || 'Failed to update user')
      })

      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false
        state.users = state.users.filter((u) => u.user_id !== action.payload)
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // Change User Status
      .addCase(changeUserStatus.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => u.user_id === action.payload.userId)
        if (index !== -1) {
          state.users[index] = action.payload.user
        }
      })

      // Load Roles
      .addCase(loadRoles.fulfilled, (state, action) => {
        state.roles = action.payload
      })

      // Load Clients
      .addCase(loadClients.fulfilled, (state, action) => {
        state.clients = action.payload
      })

      // Load Subdivisions
      .addCase(loadSubdivisions.fulfilled, (state, action) => {
        state.subdivisions = action.payload
      })
  },
})

export const { clearCurrentUser, clearErrors, setDefaultUser } = usersSlice.actions

export default usersSlice.reducer
