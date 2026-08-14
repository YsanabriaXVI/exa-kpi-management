/**
 * Users API Service
 * Handles all API calls for Users module
 */

import apiClient from '../../../services/api/axios.config'
import type { User, UserListParams } from '../types'

/**
 * Helper function to convert field names from snake_case to camelCase
 */
const snakeToCamel = (str: string): string => {
  const parts = str.split('_')
  return parts
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join('')
}

/**
 * Transform frontend params to backend format
 * The backend expects a simple object, not complex nested structures
 */
const transformSearchParams = (params: UserListParams) => {
  // The backend accepts empty object {} for listing all users
  // Or a simple search params object for filtering
  const transformed: any = {}

  // Only add params if they have values
  if (params.search) {
    transformed.search = params.search
  }

  if (params.sortField) {
    transformed.sortField = params.sortField
    transformed.sortOrder = params.sortOrder || -1
  }

  if (params.filters && Object.keys(params.filters).length > 0) {
    // Flatten filters into the main object
    Object.keys(params.filters).forEach(field => {
      const filterValue = params.filters![field]
      if (filterValue && filterValue.trim() !== '') {
        transformed[field] = filterValue
      }
    })
  }

  return transformed
}

class UsersAPI {
  /**
   * Get paginated list of users with filters
   */
  async getUsersList(params: UserListParams) {
    try {
      const backendParams = transformSearchParams(params)

      console.log('🔍 Fetching Users with params:', backendParams)

      // Backend uses POST /users/search
      const response = await apiClient.post<any>('/users/search', backendParams, {
        headers: {
          'Route-Type': 'admin'
        }
      })

      console.log('✅ Users API Response:', response.data)

      // Backend returns: { data: { users: [...] }, total: 127 }
      const users = response.data?.data?.users || []
      const total = response.data?.total || users.length

      return {
        data: users,
        total: total,
        pagination: {
          page: Math.floor(params.first / params.rows) + 1,
          limit: params.rows,
          total: total,
        }
      }
    } catch (error: any) {
      console.error('❌ Users API Error:', error.response?.data || error.message)
      return {
        data: [],
        total: 0,
        pagination: {
          page: 1,
          limit: params.rows || 20,
          total: 0,
        }
      }
    }
  }

  /**
   * Get single user by ID
   */
  async getUser(id: number): Promise<User> {
    try {
      console.log('🔍 Fetching User with ID:', id)

      const response = await apiClient.get<any>(
        `/users/${id}`,
        {
          headers: {
            'Route-Type': 'admin'
          }
        }
      )

      console.log('✅ User API Response Data:', response.data)

      // The API returns: { status, code, data: { user: {...} } }
      const userData = response.data?.data?.user || response.data?.user || response.data
      console.log('✅ Extracted User Data:', userData)

      return userData
    } catch (error: any) {
      console.error('❌ User API Error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch user')
    }
  }

  /**
   * Create new user
   */
  async createUser(userData: Partial<User>): Promise<User> {
    try {
      console.log('➕ Creating user with data:', userData)

      // Transform data for backend
      const transformedData = this.transformUserForBackend(userData)

      console.log('📤 Sending to API:', transformedData)

      const response = await apiClient.post<any>(
        '/users',
        transformedData,
        {
          headers: {
            'Route-Type': 'admin'
          }
        }
      )

      console.log('✅ Create user response:', response.data)

      // Extract user data from wrapper: { status, code, data: { user: {...} } }
      const createdUser = response.data?.data?.user || response.data?.user || response.data?.data || response.data
      console.log('✅ Extracted created user:', createdUser)

      return createdUser
    } catch (error: any) {
      console.error('❌ Create user error:', error.response?.data || error.message)
      throw error
    }
  }

  /**
   * Update existing user
   */
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    try {
      console.log('✏️ Updating user ID:', id, 'with data:', userData)

      // Transform data for backend
      const transformedData = this.transformUserForBackend(userData)

      console.log('📤 Sending to API:', transformedData)

      const response = await apiClient.put<any>(
        `/users/${id}`,
        transformedData,
        {
          headers: {
            'Route-Type': 'admin'
          }
        }
      )

      console.log('✅ Update user response:', response.data)

      // Extract user data from wrapper: { status, code, data: { user: {...} } }
      const updatedUser = response.data?.data?.user || response.data?.user || response.data?.data || response.data
      console.log('✅ Extracted updated user:', updatedUser)

      return updatedUser
    } catch (error: any) {
      console.error('❌ Update user error:', error.response?.data || error.message)
      throw error
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<void> {
    try {
      await apiClient.delete(`/users/${id}`, {
        headers: {
          'Route-Type': 'admin'
        }
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete user')
    }
  }

  /**
   * Change user status
   */
  async changeUserStatus(id: number, statusId: number): Promise<User> {
    try {
      const response = await apiClient.put<{ user: User }>(
        `/users/${id}`,
        {
          user_id: id,
          status: statusId
        },
        {
          headers: {
            'Route-Type': 'admin'
          }
        }
      )
      return response.data.user
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to change user status')
    }
  }

  /**
   * Get user roles
   */
  async getRoles(): Promise<any[]> {
    try {
      console.log('🔍 Fetching User Roles...')
      const response = await apiClient.get<any>('/roles', {
        headers: {
          'Route-Type': 'admin'
        }
      })

      console.log('✅ Roles API Response:', response.data)
      return (
        response.data?.roles ||
        response.data?.data?.roles ||
        response.data?.data ||
        []
      )
    } catch (error: any) {
      console.error('❌ Roles API Error:', error.response?.data || error.message)
      return []
    }
  }

  /**
   * Get clients list
   */
  async getClients(): Promise<any[]> {
    try {
      console.log('🔍 Fetching Clients...')
      const response = await apiClient.get<any>('/clients', {
        headers: {
          'Route-Type': 'admin'
        }
      })

      console.log('✅ Clients API Response:', response.data)
      return response.data?.clients || response.data?.data?.clients || response.data || []
    } catch (error: any) {
      console.error('❌ Clients API Error:', error.response?.data || error.message)
      return []
    }
  }

  /**
   * Get subdivisions list
   */
  async getSubdivisions(): Promise<any[]> {
    try {
      console.log('🔍 Fetching Subdivisions...')
      const response = await apiClient.get<any>('/subdivisions', {
        headers: {
          'Route-Type': 'admin'
        }
      })

      console.log('✅ Subdivisions API Response:', response.data)
      return response.data?.subdivisions || response.data?.data?.subdivisions || response.data || []
    } catch (error: any) {
      console.error('❌ Subdivisions API Error:', error.response?.data || error.message)
      return []
    }
  }

  /**
   * Transform user data for backend (fix company role structure)
   */
  private transformUserForBackend(userData: Partial<User>): any {
    const transformed = { ...userData }

    // Transform status object to status ID
    if (transformed.status && typeof transformed.status === 'object') {
      transformed.status = (transformed.status as any).id
    }

    // Transform user_role_companies
    if (transformed.user_role_companies) {
      transformed.user_role_companies = transformed.user_role_companies.map(urc => ({
        company: typeof urc.company === 'object' ? urc.company.company_id : urc.company,
        role: typeof urc.role === 'object' ? urc.role.role_id : urc.role
      }))
    }

    // Driver mapping: send only the id; 0 clears it, absent key leaves it unchanged
    delete transformed.driver
    if ('driver_id' in transformed) {
      transformed.driver_id = transformed.driver_id ? Number(transformed.driver_id) : 0
    }

    return transformed
  }
}

export const usersAPI = new UsersAPI()
