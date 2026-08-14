import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CButton,
  CCol,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCloudUpload } from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import {
  clearSignature,
  fetchUserSignature,
  loadUserFromList,
  uploadSignature,
  selectSignatureUser,
  selectSignature,
  selectSignatureUploading,
  selectSignatureLoadingSignature,
} from '../store/fuelOrderSignature.slice'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

interface SignatureUploadModalProps {
  visible: boolean
  userId: number | null
  onClose: () => void
}

const SignatureUploadModal: React.FC<SignatureUploadModalProps> = ({
  visible,
  userId,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector(selectSignatureUser)
  const signature = useSelector(selectSignature)
  const uploading = useSelector(selectSignatureUploading)
  const loadingSignature = useSelector(selectSignatureLoadingSignature)

  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  useEffect(() => {
    if (visible && userId != null) {
      dispatch(clearSignature())
      dispatch(loadUserFromList(userId))
      dispatch(fetchUserSignature(userId))
      setDraftFile(null)
      setPreviewUrl(null)
      setDragOver(false)
    }
  }, [visible, userId, dispatch])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const acceptFile = useCallback(
    (file: File): boolean => {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        const toast = (window as any).exaToast
        toast?.error?.(
          'Invalid File',
          `Only PNG, JPEG, WebP, and GIF images are allowed. Got: ${file.type || 'unknown'}`,
        )
        return false
      }
      setDraftFile(file)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(file))
      return true
    },
    [previewUrl],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!acceptFile(file) && fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [acceptFile],
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) setDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) acceptFile(file)
    },
    [acceptFile],
  )

  const handleSave = useCallback(async () => {
    if (!draftFile || !user) return
    await dispatch(uploadSignature({ file: draftFile, userId: user.userid }))
    onClose()
  }, [draftFile, user, dispatch, onClose])

  const handleClose = useCallback(() => {
    setDraftFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setDragOver(false)
    onClose()
  }, [onClose, previewUrl])

  const displayUrl = previewUrl ?? signature?.url ?? null

  return (
    <CModal visible={visible} onClose={handleClose} alignment="center">
      <CModalHeader>
        <CModalTitle>Add Signature</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CRow className="g-3">
          <CCol xs={12}>
            <CFormInput
              label="User"
              value={user?.username ?? ''}
              disabled
              readOnly
            />
          </CCol>
          <CCol xs={12}>
            <CFormInput
              label="Email"
              value={user?.email ?? ''}
              disabled
              readOnly
            />
          </CCol>
          <CCol xs={12}>
            <label className="form-label">Signature Image</label>
            {loadingSignature ? (
              <div className="text-center py-3">
                <CSpinner size="sm" />
                <span className="ms-2">Loading signature...</span>
              </div>
            ) : (
              <>
                {displayUrl && (
                  <div className="mb-2 p-2 border rounded text-center bg-light">
                    <img
                      src={displayUrl}
                      alt="Signature"
                      style={{ maxWidth: '100%', maxHeight: 160 }}
                    />
                  </div>
                )}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
                  }}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className="d-flex flex-column align-items-center justify-content-center rounded"
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--cui-primary)' : 'var(--cui-border-color)'}`,
                    backgroundColor: dragOver ? 'rgba(var(--cui-primary-rgb), 0.06)' : 'transparent',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                >
                  <CIcon
                    icon={cilCloudUpload}
                    size="xl"
                    className="mb-2"
                    style={{ color: dragOver ? 'var(--cui-primary)' : 'var(--cui-text-disabled)' }}
                  />
                  {draftFile ? (
                    <span className="text-body-secondary small">{draftFile.name}</span>
                  ) : (
                    <span className="text-body-secondary small">
                      Drag an image here or click to browse
                    </span>
                  )}
                  <span className="text-body-tertiary" style={{ fontSize: '0.75rem' }}>
                    PNG, JPEG, WebP, or GIF
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              </>
            )}
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={handleClose}>
          Close
        </CButton>
        <CButton
          color="primary"
          className="text-white"
          onClick={handleSave}
          disabled={!draftFile || uploading}
        >
          {uploading && <CSpinner size="sm" className="me-2" />}
          Save
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default SignatureUploadModal
