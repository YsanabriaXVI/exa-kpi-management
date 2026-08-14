import React, { useEffect, useState, useRef } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCloudUpload, cilTrash, cilCloudDownload, cilPlus } from '@coreui/icons'
import { attachmentsApi, Attachment } from '../../services/attachments.api'

interface AttachmentsProps {
  moduleId: number
  itemId: number
  canAdd?: boolean
  canDelete?: boolean
  canView?: boolean
}

const Attachments: React.FC<AttachmentsProps> = ({
  moduleId,
  itemId,
  canAdd = true,
  canDelete = true,
  canView = true,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const normalizeAttachments = (payload: any): Attachment[] => {
    if (!payload) return []
    if (Array.isArray(payload)) return payload
    // Some endpoints return keyed objects instead of arrays
    return Object.values(payload) as Attachment[]
  }

  const loadAttachments = async () => {
    if (!moduleId || !itemId) return
    setLoading(true)
    try {
      const data = await attachmentsApi.getAttachments(moduleId, itemId)
      setAttachments(normalizeAttachments(data))
    } catch (error) {
      console.error('Failed to load attachments', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttachments()
  }, [moduleId, itemId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      await attachmentsApi.addAttachment(moduleId, itemId, Array.from(files))
      loadAttachments()
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Failed to upload attachment', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return
    try {
      await attachmentsApi.deleteAttachment(id)
      loadAttachments()
    } catch (error) {
      console.error('Failed to delete attachment', error)
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      // Fetch with Authorization header (axios interceptor) so PHP endpoint sees the bearer token.
      const response = await attachmentsApi.downloadAttachment(attachment.attachment_id)
      const disposition = response.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : attachment.name || `attachment-${attachment.attachment_id}`
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download attachment, falling back to direct link', error)
      // Fallback: open direct URL so cookies (api_token) are sent if present.
      const url = attachmentsApi.getDownloadUrl(attachment.attachment_id)
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener'
      link.download = attachment.name || `attachment-${attachment.attachment_id}`
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  if (!moduleId || !itemId) return null

  return (
    <CCard className="mb-3">
      <CCardHeader>
        <CIcon icon={cilCloudUpload} className="me-2" />
        <strong>Attached Files</strong>
      </CCardHeader>
      <CCardBody>
        {loading ? (
          <div className="text-center py-3">
            <CSpinner size="sm" />
          </div>
        ) : (
                  <div className="attachments-list mb-3">
                    {attachments.length === 0 ? (
                      <div className="text-muted text-center py-3">No attachments yet.</div>
                    ) : (
                      attachments.map((attachment) => (
                        <div key={attachment.attachment_id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                          <div className="d-flex align-items-center">
                            <div className="me-3">
                              <div className="fw-semibold">{attachment.name}</div>
                              <div className="small text-muted">
                                Created by {attachment.create_user.first_name} {attachment.create_user.last_name} on{' '}
                                {formatDate(attachment.create_date)}
                              </div>
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <CButton
                              color="success"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(attachment)}
                              title="Download"
                            >
                          <CIcon icon={cilCloudDownload} />
                        </CButton>
                        {canDelete && (
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(attachment.attachment_id)}
                            title="Delete"
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

        {canAdd && (
          <div className="mt-3">
            <div className="d-flex justify-content-end">
              <CButton
                color="primary"
                size="sm"
                className="text-white"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilPlus} className="me-2" />}
                Upload File
              </CButton>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleUpload}
                multiple
              />
            </div>
          </div>
        )}
      </CCardBody>

    </CCard>
  )
}

export default Attachments
