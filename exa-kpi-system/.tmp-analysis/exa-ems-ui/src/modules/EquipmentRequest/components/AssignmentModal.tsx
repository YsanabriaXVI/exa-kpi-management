import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react-pro'

type Props = {
  visible: boolean
  onClose: () => void
}

export function AssignmentModal({ visible, onClose }: Props) {
  return (
    <CModal visible={visible} onClose={onClose} size="lg" alignment="center">
      <CModalHeader>
        <CModalTitle>Assign Equipment</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="text-medium-emphasis">
          Assignment UI was a placeholder in the legacy module. Wire this modal to the inventory assignment flow when ready.
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Close
        </CButton>
        <CButton color="primary" disabled>
          Save
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
