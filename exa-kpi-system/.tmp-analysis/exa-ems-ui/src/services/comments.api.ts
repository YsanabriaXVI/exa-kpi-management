import apiClient from './api/axios.config'

export interface Comment {
  comment_id: number
  module_id: number
  item_id: number
  comment: string
  create_date: number
  update_user: {
    first_name: string
    last_name: string
  }
}

export const commentsApi = {
  getComments: async (moduleId: number, itemId: number) => {
    const response = await apiClient.get<any>(`/comments/${moduleId}/${itemId}`)
    // Handle potential nested data structure (response.data.data.comments)
    return response.data?.comments || response.data?.data?.comments || []
  },

  addComment: async (moduleId: number, itemId: number, comment: string) => {
    const response = await apiClient.post(`/comments/${moduleId}/${itemId}`, { comment })
    return response.data
  },

  updateComment: async (commentId: number, comment: string) => {
    const response = await apiClient.put(`/comments/${commentId}`, { comment })
    return response.data
  },

  deleteComment: async (commentId: number) => {
    const response = await apiClient.delete(`/comments/${commentId}`)
    return response.data
  }
}

