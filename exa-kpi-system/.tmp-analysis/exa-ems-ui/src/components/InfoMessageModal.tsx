import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilInfo } from '@coreui/icons'

import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react-pro'

export default function InfoModal(props: any) {
  const {
    showInfoModal,
    setInfoModal,
    infoMessage,
    title = 'Notice',
  } = props

  return ( //rgba(var(--cui-success-rgb), 0.15) !important;
    <CModal
      visible={showInfoModal}
      onClose={() => setInfoModal(false)}
      alignment="center"
      backdrop="static"
    >
      <CModalHeader style={{ backgroundColor: "rgba(var(--cui-primary-rgb), 0.55)", color: '#0D47A1' }}>
        <CModalTitle>
          <CIcon
            icon={cilInfo}
            className="me-2"
            size="lg"
            style={{ color: '#1976D2' }}
          />
          {title}
        </CModalTitle>
      </CModalHeader>

      <CModalBody style={{ backgroundColor: "rgba(var(--cui-primary-rgb), 0.15)", color: '#102A43' }}>
        <p className="mb-0">
          {infoMessage}
        </p>
      </CModalBody>

      <CModalFooter className="d-flex justify-content-end">
        <CButton color="secondary" onClick={() => setInfoModal(false)}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
