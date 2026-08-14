/**
 * Axios Configuration with Interceptors
 * Modern API client setup with automatic token management and session expiration handling
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { authStorage } from '../auth/auth.storage'

const runtimeEnvApi =
  typeof window !== 'undefined' && (window as unknown as { __ENV__?: { VITE_API_URL?: string } }).__ENV__?.VITE_API_URL

// API Base URL - Will be configured via environment variables
// Default to HTTPS to avoid mixed-content issues if env var is missing
const API_BASE_URL =
  runtimeEnvApi && !runtimeEnvApi.startsWith('$')
    ? runtimeEnvApi
    : import.meta.env.VITE_API_URL || 'https://stg.exasa.net/api'

// Log API configuration for debugging
console.log('🌐 API Base URL:', API_BASE_URL)

// Store reference to logout handler
// This will be set by the app initialization
let logoutHandler: (() => void) | null = null

/**
 * Set the logout handler to be called when session expires
 * This is called from the main app setup
 */
export const setLogoutHandler = (handler: () => void) => {
  logoutHandler = handler
}

// Create Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Request Interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authStorage.getToken()

    if (token?.access_token) {
      config.headers.Authorization = `Bearer ${token.access_token}`
      console.log('🔑 Token attached to request:', config.url, 'Token:', token.access_token.substring(0, 20) + '...')
    } else {
      console.log('⚠️  No token found for request:', config.url)
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  },
)

// Track if we're already handling a logout to prevent multiple redirects
let isLoggingOut = false

// Response Interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    const requestUrl = error.config?.url || ''
    const status = error.response?.status

    // Handle 401 Unauthorized (Session Expired / Invalid Token)
    if (status === 401) {
      // Don't handle 401 for login requests - let the login component handle it
      const isLoginRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/oauth/token')

      if (!isLoginRequest && !isLoggingOut) {
        isLoggingOut = true
        console.warn('🔒 Session expired - logging out user')

        // Clear auth storage
        authStorage.clearAuth()

        // Call logout handler if available (this will dispatch Redux action)
        if (logoutHandler) {
          logoutHandler()
        }

        // Show user-friendly message
        const message = error.response?.data?.message || 'Your session has expired. Please log in again.'
        console.log('⚠️  Session expired:', message)

        // Redirect to login page after a brief delay to allow state cleanup
        setTimeout(() => {
          if (!window.location.hash.includes('/login')) {
            window.location.hash = '#/login'
            // Show notification if toast service is available
            if (window.exaToast) {
              window.exaToast.warning('Session Expired', message)
            }
          }
          isLoggingOut = false
        }, 100)
      }
    }

    // Handle 403 Forbidden (Insufficient Permissions / Blocked)
    if (status === 403) {
      console.error('🚫 Access forbidden:', error.response?.data)

      const isAuthRequest = requestUrl.includes('/auth/')

      // If it's an auth request returning 403, treat it as session expired
      if (isAuthRequest && !isLoggingOut) {
        isLoggingOut = true
        console.warn('🔒 Access forbidden on auth request - logging out user')

        authStorage.clearAuth()

        if (logoutHandler) {
          logoutHandler()
        }

        setTimeout(() => {
          if (!window.location.hash.includes('/login')) {
            window.location.hash = '#/login'
            if (window.exaToast) {
              window.exaToast.error('Access Denied', 'Your access has been revoked. Please contact your administrator.')
            }
          }
          isLoggingOut = false
        }, 100)
      } else {
        // For non-auth 403s, just log and let the component handle it
        console.warn('⚠️  Insufficient permissions for:', requestUrl)
      }
    }

    // Handle 500 Server Error
    if (status === 500) {
      console.error('❌ Server error:', error.response?.data)
    }

    // Handle Network Errors
    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 Network error - unable to reach server')
    }

    return Promise.reject(error)
  },
)

export default apiClient
