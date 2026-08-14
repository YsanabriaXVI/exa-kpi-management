import apiClient from './api/axios.config'

export interface Attachment {
  attachment_id: number
  module_id: number
  item_id: number
  name: string
  type: string
  url: string
  create_date: number
  create_user: {
    first_name: string
    last_name: string
  }
}

export const attachmentsApi = {
  getAttachments: async (moduleId: number, itemId: number) => {
    const response = await apiClient.get<any>(`/attachments/${moduleId}/${itemId}`)
    return response.data?.attachments || response.data?.data?.attachments || []
  },

  addAttachment: async (moduleId: number, itemId: number, files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('attachment', file)
    })
    const response = await apiClient.post(`/attachments/${moduleId}/${itemId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  deleteAttachment: async (attachmentId: number) => {
    const response = await apiClient.delete(`/attachments/${attachmentId}`)
    return response.data
  },

  downloadAttachment: async (attachmentId: number) => {
    const response = await apiClient.get(`/attachments/${attachmentId}/download`, {
      responseType: 'blob',
      withCredentials: true,
    })
    return response
  },

  getDownloadUrl: (attachmentId: number) => {
    const base = apiClient.defaults.baseURL?.replace(/\/+$/, '') || ''
    return `${base}/attachments/${attachmentId}/download`
  },

  toAbsoluteUrl: (url: string) => {
    if (!url) return url
    const isAbsolute = /^https?:\/\//i.test(url)
    if (isAbsolute) return url
    const base = apiClient.defaults.baseURL?.replace(/\/+$/, '') || ''
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`
  },
}
