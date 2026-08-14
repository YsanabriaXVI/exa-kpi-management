/**
 * Profile API Service
 */

import apiClient from '../../../services/api/axios.config'
import type { UpdateProfilePayload } from '../types'

export const profileAPI = {
  /**
   * Update user profile
   */
  updateProfile: async (data: UpdateProfilePayload) => {
    const response = await apiClient.put(`/user-service/users/${data.user_id}`, data)
    return response.data
  },

  /**
   * Get current user profile
   */
  getMyProfile: async () => {
    const response = await apiClient.get('/user-service/user/me')
    return response.data
  },
}

