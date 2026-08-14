/**
 * useAuth Hook
 * Modern React hook for authentication
 */

import { useSelector, useDispatch } from 'react-redux'
import { useCallback } from 'react'
import type { RootState, AppDispatch } from '../store'
import { loginUser, logoutUser, clearError, forceLogout as forceLogoutAction } from '../store/slices/authSlice'

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>()
  const auth = useSelector((state: RootState) => state.auth)

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await dispatch(loginUser({ username, password }))
      return result
    },
    [dispatch],
  )

  const logout = useCallback(async () => {
    await dispatch(logoutUser())
    // Note: Redirect is handled by the component using this hook
    // to avoid double reloads
  }, [dispatch])

  const clearAuthError = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  const forceLogout = useCallback(() => {
    dispatch(forceLogoutAction())
  }, [dispatch])

  return {
    user: auth.user,
    details: auth.details,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    login,
    logout,
    forceLogout,
    clearError: clearAuthError,
  }
}

