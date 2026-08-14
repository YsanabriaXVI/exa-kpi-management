// src/modules/Reset/components/ResetModal.tsx

import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilWarning, cilPlus, cilTruck, cilNotes, cilTablet } from '@coreui/icons'

interface Props {
  visible: boolean
  onClose: () => void
  type: 'trips' | 'fuel' | 'gates' | null

  // opcional (solo usado en trips por ahora)
  trips?: {
    trip_id: string
    route: string
    kilometer: number
    price: number
    internal_supplier_name: string | null
  }[]
}

const ResetModal: React.FC<Props> = ({ visible, onClose, type, trips = [] }) => {
  // 🔹 Dynamic title
  const getTitle = () => {
    switch (type) {
      case 'trips':
        return 'Add Trips'
      case 'fuel':
        return 'Add Fuel Order'
      case 'gates':
        return 'Add Gates'
      default:
        return ''
    }
  }

  // 🔹 Icon opcional
  const getIcon = () => {
    if (type === 'trips') return cilTruck
    else if (type === 'fuel') return cilNotes
    else if (type === 'gates') return cilTablet
    return cilPlus
  }

  // 🔹 Body dinámico
  const renderBody = () => {
    switch (type) {
      case 'trips':
        return (
          <>
            <p className="text-muted">
              Add Trips associated with the team that are not present in the Trips Information table:
            </p>

            <CTable hover striped responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Trip ID</CTableHeaderCell>
                  <CTableHeaderCell>Route</CTableHeaderCell>
                  <CTableHeaderCell>Kilometer</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Supplier</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {trips.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={5} className="text-center text-muted">
                      No Trips available
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  trips.map((trip) => (
                    <CTableRow key={trip.trip_id}>
                      <CTableDataCell>{trip.trip_id}</CTableDataCell>
                      <CTableDataCell>{trip.route}</CTableDataCell>
                      <CTableDataCell>{trip.kilometer}</CTableDataCell>
                      <CTableDataCell>{trip.date}</CTableDataCell>
                      <CTableDataCell>{trip.internal_supplier_name || '-'}</CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          </>
        )

      case 'fuel':
        return (
          <>
            <p className="text-muted">
              Add Fuel Orders associated with the equipment that are not present in the Trips Information table:
            </p>

            <CTable hover striped responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Fuel Order ID</CTableHeaderCell>
                  <CTableHeaderCell>Trip ID</CTableHeaderCell>
                  <CTableHeaderCell>Supplied</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {trips.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={5} className="text-center text-muted">
                      No Fuel Orders available
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  trips.map((trip) => (
                    <CTableRow key={trip.trip_id}>
                      <CTableDataCell>{trip.fuelOrder_id}</CTableDataCell>
                      <CTableDataCell>{trip.trip_id}</CTableDataCell>
                      <CTableDataCell>{trip.supplied}</CTableDataCell>
                      <CTableDataCell>{trip.date}</CTableDataCell>
                      <CTableDataCell>{trip.status}</CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          </>
        )

      case 'gates':
        return (
          <>
            <p className="text-muted">
              Add Gates In associated with the equipment that are not present in the Trips Information table:
            </p>

            <CTable hover striped responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Gate In</CTableHeaderCell>
                  <CTableHeaderCell>Trip ID</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {trips.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={5} className="text-center text-muted">
                      No Gates In available
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  trips.map((trip) => (
                    <CTableRow key={trip.trip_id}>
                      <CTableDataCell>{trip.gateIn_id}</CTableDataCell>
                      <CTableDataCell>{trip.trip_id}</CTableDataCell>
                      <CTableDataCell>{trip.date}</CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          </>
        )

      default:
        return <div className="text-muted text-center">No content</div>
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle>
          <CIcon icon={getIcon()} className="me-2" />
          {getTitle()}
        </CModalTitle>
      </CModalHeader>

      <CModalBody>{renderBody()}</CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>

        {/* 🔹 Acción futura */}
        <CButton color="primary" className="text-white">
          Save
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ResetModal
