import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
} from  '@coreui/react-pro'

interface PaymentInfoData {
  paymentStatus?: string | null
  paymentId?: string | number | null
  paymentDate?: string | null
}

interface PaymentInfoBoxProps {
  data?: PaymentInfoData
}

const toInputValue = (value?: string | number | null): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

const PaymentInfoBox: React.FC<PaymentInfoBoxProps> = ({
  data = {
    paymentStatus: 'Not Paid',
    paymentId: '00000000',
    paymentDate: '00-00-0000',
  },
}) => {
  return (
    <CCard>
      <CCardHeader>
        <i className="fa fa-money fa-lg me-2" />
        <strong>Payment Information</strong>
      </CCardHeader>

      <CCardBody>
        <CRow className="mb-3 align-items-center">
          <CCol md={4}>
            <CFormLabel htmlFor="paymentStatus">Statement Status</CFormLabel>
          </CCol>
          <CCol md={8}>
            <CFormInput
              id="paymentStatus"
              name="paymentStatus"
              value={toInputValue(data.paymentStatus)}
              disabled
            />
          </CCol>
        </CRow>

        <CRow className="mb-3 align-items-center">
          <CCol md={4}>
            <CFormLabel htmlFor="paymentId">Payment ID</CFormLabel>
          </CCol>
          <CCol md={8}>
            <CFormInput
              id="paymentId"
              name="paymentId"
              value={toInputValue(data.paymentId)}
              disabled
            />
          </CCol>
        </CRow>

        <CRow className="mb-3 align-items-center">
          <CCol md={4}>
            <CFormLabel htmlFor="paymentDate">Payment Date</CFormLabel>
          </CCol>
          <CCol md={8}>
            <CFormInput
              id="paymentDate"
              name="paymentDate"
              value={toInputValue(data.paymentDate)}
              disabled
            />
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default PaymentInfoBox