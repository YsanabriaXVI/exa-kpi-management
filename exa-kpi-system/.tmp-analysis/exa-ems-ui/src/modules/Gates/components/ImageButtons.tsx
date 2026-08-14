import React, { Fragment, useMemo, useState } from 'react'
import { CButton, CCol } from '@coreui/react'
import ConfirmationModal from 'src/components/ConfirmationModal'

type Props = {
  isInsert: 'new' | 'existing' | string
  index: number
  selectedFile: any[] | Record<number, any>

  damagePrefix?: string

  handleRemoveImage?: (index: number) => void
  handlePreviewImage: (index: number) => void

  fileInputRef?: HTMLInputElement | null
  setFileInputRef?: (el: HTMLInputElement | null) => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void
}

export default function ImageButtons({
  isInsert,
  index,
  selectedFile,
  damagePrefix,
  handleRemoveImage,
  handlePreviewImage,
  fileInputRef,
  setFileInputRef,
  handleFileChange,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const hasFile = useMemo(() => {
    try {
      return Array.isArray(selectedFile) ? !!selectedFile[index] : !!(selectedFile as any)?.[index]
    } catch {
      return false
    }
  }, [selectedFile, index])

  const confirmMessage = useMemo(() => {
    const prefix = damagePrefix ? `${damagePrefix} ` : ''
    return `Are you sure you want to delete image on ${prefix}damage?`
  }, [damagePrefix])

  return (
    <Fragment>
      {isInsert === 'new' ? (
        <CCol xs={3}>
          <CButton color="success" size="sm" onClick={() => fileInputRef?.click()}>
            <i className="fa fa-camera" />
          </CButton>
          <input
            type="file"
            ref={(el) => setFileInputRef?.(el)}
            onChange={(e) => handleFileChange(e, index)}
            style={{ display: 'none' }}
          />
        </CCol>
      ) : (
        <CCol xs={3}>
          <CButton color="primary" size="sm" onClick={() => handlePreviewImage(index)}>
            <i className="fa fa-eye" />
          </CButton>
        </CCol>
      )}

      {hasFile && (
        <Fragment>
          <CCol xs={3}>
            <CButton
              size="sm"
              color="danger"
              onClick={() => {
                if (!handleRemoveImage) return
                setConfirmOpen(true)
              }}
            >
              <i className="fa fa-trash" />
            </CButton>
          </CCol>

          <CCol xs={3}>
            <CButton color="primary" size="sm" onClick={() => handlePreviewImage(index)}>
              <i className="fa fa-eye" />
            </CButton>
          </CCol>
        </Fragment>
      )}

      <ConfirmationModal
        visible={confirmOpen}
        title="Delete Confirmation"
        message={confirmMessage}
        confirmText="Delete"
        cancelText="Cancel"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          handleRemoveImage?.(index)
        }}
      />
    </Fragment>
  )
}