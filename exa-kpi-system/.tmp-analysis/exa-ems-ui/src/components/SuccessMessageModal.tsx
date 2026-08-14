import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import CIcon from '@coreui/icons-react'

import {
  cilCheckCircle
} from '@coreui/icons'

import {
  CCol,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'

export default function SuccessMessageModal(props: any) {

const { 
    showSuccessModal, 
    setShowSuccessModal, 
    successMessage,
} = props;

  return (
        <CModal visible={showSuccessModal} onClose={() => setShowSuccessModal(false)} alignment="center" backdrop="static">
              <CModalHeader style={{
                  backgroundColor: 'rgba(var(--cui-success-rgb), 0.35)', // brighter
                  color: 'var(--cui-body-color)',
                  borderBottom: '1px solid rgba(var(--cui-success-rgb), 0.55)',
                }}>
                <CModalTitle>
                  <CIcon icon={cilCheckCircle} className="text-success me-2" size="lg" />
                  Success!
                </CModalTitle>
              </CModalHeader>
              <CModalBody style={{
                backgroundColor: 'rgba(var(--cui-success-rgb), 0.10)',
                color: 'var(--cui-body-color)',
              }}>
                <p className="mb-0">
                  {successMessage}
                </p>
              </CModalBody>
              <CModalFooter className="d-flex justify-content-between">
                <CButton color="secondary" onClick={() => {setShowSuccessModal(false)}}>
                  Close
                </CButton>
              </CModalFooter>
            </CModal>
  )
}
