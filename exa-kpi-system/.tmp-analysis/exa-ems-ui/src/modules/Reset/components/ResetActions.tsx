import { CCardFooter, CButton } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave } from '@coreui/icons'

export default function ResetActions({ isValid, onSave }: any) {
  return (
    <CCardFooter className="d-flex justify-content-end gap-2">
      <CButton color="secondary" variant="outline">
        Cancel
      </CButton>

      <CButton color="primary" className="text-white">
        <CIcon icon={cilSave} className="me-2" />
        Save
      </CButton>
    </CCardFooter>
  )
}
