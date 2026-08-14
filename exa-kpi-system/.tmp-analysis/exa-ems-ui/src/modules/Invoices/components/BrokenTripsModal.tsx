import React from 'react'
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilWarning } from '@coreui/icons'

interface BrokenTripsModalProps {
  visible: boolean
  onClose: () => void
  trips: {
    trip_id: string
    route: string
    kilometer: number
    price: number
    internal_supplier_name: string | null
  }[]
}

const BrokenTripsModal: React.FC<BrokenTripsModalProps> = ({ visible, onClose, trips }) => {
  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle className="text-danger">
          <CIcon icon={cilWarning} className="me-2" />
          Broken Trips
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p>The following trips have issues and cannot be included in the statement:</p>
        <CTable hover striped responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Trip ID</CTableHeaderCell>
              <CTableHeaderCell>Route</CTableHeaderCell>
              <CTableHeaderCell>Kilometer</CTableHeaderCell>
              <CTableHeaderCell>Price</CTableHeaderCell>
              <CTableHeaderCell>Supplier</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {trips.map((trip) => (
              <CTableRow key={trip.trip_id}>
                <CTableDataCell>{trip.trip_id}</CTableDataCell>
                <CTableDataCell>{trip.route}</CTableDataCell>
                <CTableDataCell>{trip.kilometer}</CTableDataCell>
                <CTableDataCell>{trip.price}</CTableDataCell>
                <CTableDataCell>{trip.internal_supplier_name || '-'}</CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default BrokenTripsModal
