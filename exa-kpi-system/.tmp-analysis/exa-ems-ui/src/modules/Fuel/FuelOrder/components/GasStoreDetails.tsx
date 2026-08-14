import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableRow,
} from '@coreui/react-pro'

import type { GasStationInfo } from '../types/fuelOrder.types'

interface Props {
  gasStation: GasStationInfo | null
}

const GasStoreDetails: React.FC<Props> = ({ gasStation }) => {
  if (!gasStation) return null

  const rows = [
    ['Station', gasStation.name],
    ['Email', gasStation.email],
    ['Phone', gasStation.phone],
    ['Address', gasStation.address],
    ['City', gasStation.cityName],
    ['Department', gasStation.departmentName],
    ['Parent', gasStation.parentName],
  ].filter(([, v]) => v != null && v !== '')

  return (
    <CCard className="mb-3">
      <CCardHeader>
        <strong>Gas Station Details</strong>
      </CCardHeader>
      <CCardBody>
        <CTable small bordered>
          <CTableBody>
            {rows.map(([label, value]) => (
              <CTableRow key={String(label)}>
                <CTableDataCell className="fw-semibold" style={{ width: '140px' }}>
                  {label}
                </CTableDataCell>
                <CTableDataCell className="bg-body-secondary text-body-secondary">
                  {String(value)}
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

export default GasStoreDetails
