import React from 'react'
import { CRow, CCol, CFormLabel, CFormSelect, CFormInput } from '@coreui/react-pro'
import { MODULE_SUBDIVISION_FUEL_STATEMENT } from '../../../../constants/modules'
import { permissionService, UPDATE_STATUS } from '../../../../services/auth/permission.service'

interface PaymentInfoBoxProps {
  data: any
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

const PaymentInfoBox: React.FC<PaymentInfoBoxProps> = ({ data, onChange }) => {
  if (!data) return null

  const canUpdateStatus = permissionService.checkPermission(MODULE_SUBDIVISION_FUEL_STATEMENT, UPDATE_STATUS)
  const isLinkedToPayment = !!data.paymentModuleId
  const statusDisabled = !canUpdateStatus || isLinkedToPayment
  const currentStatus = data.deducted === 1 ? 'DEDUCTED' : 'PENDING'

  return (
    <div className="mb-3">
      <h6>Payment Information</h6>
      <CRow className="mb-2">
        <CCol sm={4}><CFormLabel className="text-body-secondary">Payment Status</CFormLabel></CCol>
        <CCol sm={8}>
          <CFormSelect
            name="paymentStatus"
            value={currentStatus}
            onChange={onChange as any}
            disabled={statusDisabled}
          >
            <option value="PENDING">Pending</option>
            <option value="DEDUCTED">Deducted</option>
          </CFormSelect>
        </CCol>
      </CRow>
      {data.paymentModuleId && (
        <CRow className="mb-2">
          <CCol sm={4}><CFormLabel className="text-body-secondary">Payment ID</CFormLabel></CCol>
          <CCol sm={8}><CFormInput value={data.paymentModuleId} disabled /></CCol>
        </CRow>
      )}
    </div>
  )
}

export default PaymentInfoBox
