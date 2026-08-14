// ConfirmDialog.tsx
import React from 'react'
import { CModal, CModalBody, CButton } from '@coreui/react-pro'
import ximage from '../assets/images/icons8-x-48.png';

interface ConfirmDialogProps {
  visible: boolean
  title?: string
  message?: string
  onClose: () => void
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title = 'Delete Confirmation',
  message = 'Are you sure you want to delete this record?',
  onClose,
  onConfirm,
  confirmText = 'Delete',
  cancelText = 'Cancel',
}) => {
  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      className="delete-confirm-modal"
    >
      <CModalBody className="text-center py-5">
        <div className="mb-3">
          <img src={ximage} alt="Delete icon" />
        </div>

        <h4 className="fw-bold mb-3">{title}</h4>

        <p className="text-muted mb-4">
          {message}
        </p>

        <div className="d-flex justify-content-center gap-3">
          <CButton
            color="secondary"
            onClick={onClose}
          >
            {cancelText}
          </CButton>

          <CButton
            color="danger"
            className="text-white"
            onClick={() => {
              if (onConfirm) onConfirm()
              onClose()
            }}
          >
            {confirmText}
          </CButton>
        </div>
      </CModalBody>
    </CModal>
  )
}

export default ConfirmDialog
