import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormTextarea,
  CSpinner,
  CAvatar,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCommentBubble, cilPencil, cilTrash, cilSave, cilX } from '@coreui/icons'
import { commentsApi, Comment } from '../../services/comments.api'

interface CommentsProps {
  moduleId: number
  itemId: number
  canAdd?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

const Comments: React.FC<CommentsProps> = ({
  moduleId,
  itemId,
  canAdd = true,
  canEdit = true,
  canDelete = true,
}) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const normalizeComments = (payload: any): Comment[] => {
    if (!payload) return []
    if (Array.isArray(payload)) return payload
    // Some endpoints return keyed objects instead of arrays
    return Object.values(payload) as Comment[]
  }

  const loadComments = async () => {
    if (!moduleId || !itemId) return
    setLoading(true)
    try {
      const data = await commentsApi.getComments(moduleId, itemId)
      setComments(normalizeComments(data))
    } catch (error) {
      console.error('Failed to load comments', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComments()
  }, [moduleId, itemId])

  const handleAdd = async () => {
    if (!newComment.trim()) return
    setSubmitting(true)
    try {
      await commentsApi.addComment(moduleId, itemId, newComment)
      setNewComment('')
      loadComments()
    } catch (error) {
      console.error('Failed to add comment', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: number) => {
    if (!editText.trim()) return
    setSubmitting(true)
    try {
      await commentsApi.updateComment(id, editText)
      setEditingId(null)
      setEditText('')
      loadComments()
    } catch (error) {
      console.error('Failed to update comment', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    try {
      await commentsApi.deleteComment(id)
      loadComments()
    } catch (error) {
      console.error('Failed to delete comment', error)
    }
  }

  const startEdit = (comment: Comment) => {
    setEditingId(comment.comment_id)
    setEditText(comment.comment)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const formatDate = (timestamp: number | string) => {
    const date = new Date(Number(timestamp) * 1000)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date)
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getRandomColor = (name: string) => {
    const colors = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark']
    const index = name.length % colors.length
    return colors[index]
  }

  if (!moduleId || !itemId) return null

  return (
    <CCard className="mb-3">
      <CCardHeader>
        <CIcon icon={cilCommentBubble} className="me-2" />
        <strong>Comments</strong>
      </CCardHeader>
      <CCardBody>
        {loading ? (
          <div className="text-center py-3">
            <CSpinner size="sm" />
          </div>
        ) : (
          <div className="comments-list mb-4">
            {comments.length === 0 ? (
              <div className="text-muted text-center py-3">No comments yet.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {comments.map((comment) => (
                  <div key={comment.comment_id} className="d-flex gap-3">
                    <CAvatar
                      color={getRandomColor(comment.update_user.first_name)}
                      textColor="white"
                      size="md"
                    >
                      {getInitials(comment.update_user.first_name, comment.update_user.last_name)}
                    </CAvatar>
                    <div className="flex-grow-1">
                      <div className="bg-body-secondary p-3 rounded-3 position-relative">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="fw-bold text-body">
                            {comment.update_user.first_name} {comment.update_user.last_name}
                          </div>
                          <small className="text-muted">{formatDate(comment.create_date)}</small>
                        </div>
                        
                        {editingId === comment.comment_id ? (
                          <div className="mt-2">
                            <CFormTextarea
                              rows={3}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="mb-2"
                            />
                            <div className="d-flex gap-2 justify-content-end">
                              <CButton
                                color="secondary"
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                disabled={submitting}
                              >
                                Cancel
                              </CButton>
                              <CButton
                                color="primary"
                                size="sm"
                                onClick={() => handleUpdate(comment.comment_id)}
                                disabled={submitting}
                              >
                                Save
                              </CButton>
                            </div>
                          </div>
                        ) : (
                          <div className="text-body" style={{ whiteSpace: 'pre-wrap' }}>
                            {comment.comment}
                          </div>
                        )}
                      </div>
                      
                      <div className="d-flex gap-2 mt-1 ms-2">
                        {canEdit && editingId !== comment.comment_id && (
                          <small
                            className="text-muted cursor-pointer hover-primary"
                            style={{ cursor: 'pointer' }}
                            onClick={() => startEdit(comment)}
                          >
                            Edit
                          </small>
                        )}
                        {canDelete && editingId !== comment.comment_id && (
                          <small
                            className="text-danger cursor-pointer"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleDelete(comment.comment_id)}
                          >
                            Delete
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {canAdd && (
          <div className="d-flex gap-3">
            <CAvatar color="secondary" textColor="white" size="md">
              <CIcon icon={cilPencil} />
            </CAvatar>
            <div className="flex-grow-1">
              <CFormTextarea
                rows={2}
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mb-2"
              />
              <div className="d-flex justify-content-end">
                <CButton
                  color="primary"
                  size="sm"
                  className="text-white"
                  onClick={handleAdd}
                  disabled={submitting || !newComment.trim()}
                >
                  Post Comment
                </CButton>
              </div>
            </div>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default Comments
