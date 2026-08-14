import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilXCircle } from '@coreui/icons'
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react-pro'

export default function ErrorModal(props: any) {
  const { showErrorModal, setShowErrorModal, errorMessage } = props

  return (
    <CModal
      visible={showErrorModal}
      onClose={() => setShowErrorModal(false)}
      alignment="center"
      backdrop="static"
    >
      <CModalHeader
        style={{
          backgroundColor: 'rgba(var(--cui-danger-rgb), 0.30)',
          color: 'var(--cui-danger)', 
          borderBottom: '1px solid var(--cui-danger-border-subtle)',
        }}
      >
        <CModalTitle>
          <CIcon icon={cilXCircle} className="me-2" size="lg" />
          Error
        </CModalTitle>
      </CModalHeader>

      <CModalBody
        style={{
          backgroundColor: 'rgba(var(--cui-danger-rgb), 0.10)',
          color: 'var(--cui-body-color)',
        }}
      >
        <p className="mb-0">{errorMessage}</p>
      </CModalBody>

      <CModalFooter className="d-flex justify-content-end">
        <CButton color="secondary" onClick={() => setShowErrorModal(false)}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
