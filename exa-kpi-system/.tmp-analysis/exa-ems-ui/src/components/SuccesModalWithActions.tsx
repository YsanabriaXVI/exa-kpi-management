import CIcon from '@coreui/icons-react'
import { cilCheckCircle } from '@coreui/icons'
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react-pro'

export default function SuccesModalWithActions(props: any) {
  const {
    showSuccessModal,
    setShowSuccessModal,
    savedData,
    recordIdKey,
    isEdit,
    successMessage,
    onClickCreateAnother,
    onClickContinueEditing,
    onClickBackToOverview,
  } = props

  return (
    <CModal
      visible={showSuccessModal}
      onClose={() => setShowSuccessModal(false)}
      alignment="center"
      backdrop="static"
    >
      <CModalHeader
        style={{
          backgroundColor: 'rgba(var(--cui-success-rgb), 0.35)', // brighter
          color: 'var(--cui-body-color)',
          borderBottom: '1px solid rgba(var(--cui-success-rgb), 0.55)',
        }}
      >

        <CModalTitle>
          <CIcon icon={cilCheckCircle} className="me-2" size="lg" />
          Success!
        </CModalTitle>
      </CModalHeader>

      <CModalBody
        style={{
          backgroundColor: 'rgba(var(--cui-success-rgb), 0.10)',
          color: 'var(--cui-body-color)',
        }}
      >
        <p className="mb-0">{successMessage}</p>
      </CModalBody>

      <CModalFooter className="d-flex justify-content-between">
        <CButton color="secondary" onClick={() => onClickBackToOverview()}>
          Back to List
        </CButton>

        <div className="d-flex gap-2">
          {!isEdit && (
            <CButton color="primary" className="text-white" onClick={() => onClickCreateAnother()}>
              Create Another
            </CButton>
          )}

          {savedData?.[recordIdKey] && (
            <CButton color="info" className="text-white" onClick={() => onClickContinueEditing()}>
              Continue Editing
            </CButton>
          )}
        </div>
      </CModalFooter>
    </CModal>
  )
}
