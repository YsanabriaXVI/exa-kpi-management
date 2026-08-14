/**
 * Authentication API Service
 * Modern async/await API calls for authentication
 */

import apiClient from '../api/axios.config'
import type { AuthToken, User, UserDetails } from './auth.storage'

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  user: User
}

export interface UserMeResponse {
  user: any
  actions: any[]
}

class AuthAPI {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Use the same OAuth client credentials as legacy React 18 app
    const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || '1_1l29yg3q0ev4wosgwssccs00o4g44ko4ockgcwowgwwo88cg04'
    const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET || '45diujtrpyww04s84w8sc0swgkgsckc0cco4os800g0gw4cw8s'
    
    const response = await apiClient.post<{status: string, code: number, data: LoginResponse}>('/auth/user', {
      username: credentials.username,
      password: credentials.password,
      client_id: CLIENT_ID,
      grant_type: 'password',
      client_secret: CLIENT_SECRET,
    })

    // API wraps response in { status, code, data } - extract the actual data
    return response.data.data
  }

  /**
   * Get current user details
   */
  async getUserDetails(): Promise<UserDetails> {
    const response = await apiClient.get<{status: string, code: number, data: UserMeResponse}>('/users/me')
    
    // API wraps response in { status, code, data } - extract the actual data
    const { user, actions } = response.data.data

    // Transform companies data
    const companies: Record<string, any> = {}
    if (user.user_role_companies) {
      user.user_role_companies.forEach((companyRole: any) => {
        companies[companyRole.company.company_id] = {
          company: companyRole.company,
          role: companyRole.role,
        }
      })
    }

    return {
      details: user,
      actions,
      companies,
      errors: null,
    }
  }

  /**
   * Logout user (client-side only for now)
   */
  async logout(): Promise<void> {
    // If you have a backend logout endpoint, call it here
    // await apiClient.post('/auth/logout')
    return Promise.resolve()
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email })
  }

  /**
   * Reset password with token
   */
  async resetPassword(password: string, token: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/forgot-password/confirm', {
      password,
      token,
    })

    return response.data
  }

  /**
   * Change current company
   */
  async changeCompany(companyId: number): Promise<void> {
    await apiClient.get(`/users/change-user-company/${companyId}`)
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthToken> {
    const response = await apiClient.post<AuthToken>('/auth/refresh', {
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    })

    return response.data
  }
}

// Export singleton instance
export const authAPI = new AuthAPI()

