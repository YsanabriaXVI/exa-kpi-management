/**
 * Authentication Redux Slice
 * Modern Redux Toolkit implementation with TypeScript
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authAPI } from '../../services/auth/auth.api'
import { authStorage, type User, type UserDetails } from '../../services/auth/auth.storage'

// State interface
export interface AuthState {
  user: User | null
  details: UserDetails | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  loginAttempts: number
}

// Initial state
const initialState: AuthState = {
  user: authStorage.getUser(),
  details: authStorage.getDetails(),
  isAuthenticated: authStorage.isAuthenticated(),
  isLoading: false,
  error: null,
  loginAttempts: 0,
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials)
      
      // Save token and user
      authStorage.saveToken({
        access_token: response.access_token,
        token_type: response.token_type,
        expires_in: response.expires_in,
        refresh_token: response.refresh_token,
      })
      authStorage.saveUser(response.user)
      authStorage.saveLegacyCookies(
        {
          access_token: response.access_token,
          token_type: response.token_type,
          expires_in: response.expires_in,
          refresh_token: response.refresh_token,
        },
        response.user,
      )

      // Get user details
      const details = await authAPI.getUserDetails()
      authStorage.saveDetails(details)

      return {
        user: response.user,
        details,
      }
    } catch (error: any) {
      // Extract error message from various possible formats
      let message = 'Login failed'
      
      if (error.response?.data) {
        const data = error.response.data
        // Try different error message formats
        message = data.error_description || data.message || data.error || message
      } else if (error.message) {
        message = error.message
      }
      
      // Check for specific HTTP status messages
      if (error.response?.status === 401) {
        message = 'Invalid username or password'
      } else if (error.response?.status === 500) {
        message = 'Server error. Please try again later.'
      } else if (error.code === 'ECONNABORTED') {
        message = 'Request timeout. Please check your connection.'
      } else if (error.code === 'ERR_NETWORK') {
        message = 'Network error. Please check your connection.'
      }
      
      return rejectWithValue(message)
    }
  },
)

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authAPI.logout()
  authStorage.clearAuth()
})

export const loadUserDetails = createAsyncThunk('auth/loadDetails', async (_, { rejectWithValue }) => {
  try {
    const details = await authAPI.getUserDetails()
    authStorage.saveDetails(details)
    return details
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to load user details'
    return rejectWithValue(message)
  }
})

export const changeCompany = createAsyncThunk(
  'auth/changeCompany',
  async (companyId: number, { getState, rejectWithValue }) => {
    try {
      await authAPI.changeCompany(companyId)
      
      // Update user's current company
      const state = getState() as { auth: AuthState }
      if (state.auth.user) {
        const updatedUser = { ...state.auth.user, current_company: companyId }
        authStorage.saveUser(updatedUser)
        return updatedUser
      }
      
      return null
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to change company'
      return rejectWithValue(message)
    }
  },
)

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
      authStorage.saveUser(action.payload)
    },
    checkAuth: (state) => {
      state.isAuthenticated = authStorage.isAuthenticated()
      state.user = authStorage.getUser()
      state.details = authStorage.getDetails()
    },
    /**
     * Force logout - used by axios interceptor on 401/403
     * Clears all auth state immediately without API call
     */
    forceLogout: (state) => {
      authStorage.clearAuth()
      state.isAuthenticated = false
      state.user = null
      state.details = null
      state.error = null
      state.loginAttempts = 0
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.details = action.payload.details
        state.error = null
        state.loginAttempts = 0
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.user = null
        state.error = action.payload as string
        state.loginAttempts += 1
      })

    // Logout
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false
        state.user = null
        state.details = null
        state.error = null
        state.loginAttempts = 0
      })

    // Load user details
    builder
      .addCase(loadUserDetails.pending, (state) => {
        state.isLoading = true
      })
      .addCase(loadUserDetails.fulfilled, (state, action) => {
        state.isLoading = false
        state.details = action.payload
      })
      .addCase(loadUserDetails.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Change company
    builder
      .addCase(changeCompany.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload
        }
      })
      .addCase(changeCompany.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const { clearError, setUser, checkAuth, forceLogout } = authSlice.actions
export default authSlice.reducer
