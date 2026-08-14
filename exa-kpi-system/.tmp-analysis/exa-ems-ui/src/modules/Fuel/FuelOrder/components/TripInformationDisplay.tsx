import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableRow,
} from '@coreui/react-pro'

import type { TripDetail, RouteLeg } from '../types/fuelOrder.types'

interface Props {
  tripDetail: TripDetail | null
  routeLegs?: RouteLeg[]
  disabled?: boolean
  onAddRoute?: () => void
  onRemoveRoute?: () => void
}

const TripInformationDisplay: React.FC<Props> = ({
  tripDetail,
  routeLegs = [],
  disabled = false,
  onAddRoute,
  onRemoveRoute,
}) => {
  if (!tripDetail) return null

  const rows = [
    ['Trip No.', tripDetail.tripsid],
    ['Work Order', (tripDetail as any).workorderid ?? (tripDetail as any).workOrderId],
    ['Reference', tripDetail.referenceNumber],
    ['Client', tripDetail.clientName],
    ['Route', tripDetail.routeName],
    ['Pickup City', tripDetail.pickupCity],
    ['Delivery City', tripDetail.deliveryCity],
    ['Return City', (tripDetail as any).returnCity ?? (tripDetail as any).returncity],
    ['Subdivision', tripDetail.subdivisionName],
    ['Inventory', tripDetail.inventoryName],
    ['Cargo', tripDetail.cargoDescription],
  ].filter(([, v]) => v != null && v !== '')

  const hasRouteLegs = routeLegs.length > 0
  const hasConnectedCity = !!(tripDetail as any)?.citycid
  const showAddRoute = !hasRouteLegs && !hasConnectedCity && onAddRoute
  const showRemoveRoute = hasRouteLegs && onRemoveRoute

  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>Trip Information</strong>
        {!disabled && (showAddRoute || showRemoveRoute) && (
          <div>
            {showAddRoute && (
              <CButton color="primary" size="sm" onClick={onAddRoute}>
                Add Route
              </CButton>
            )}
            {showRemoveRoute && (
              <CButton color="danger" size="sm" onClick={onRemoveRoute}>
                Remove Route
              </CButton>
            )}
          </div>
        )}
      </CCardHeader>
      <CCardBody>
        <CTable small bordered>
          <CTableBody>
            {rows.map(([label, value]) => (
              <CTableRow key={String(label)}>
                <CTableDataCell className="fw-semibold" style={{ width: '180px' }}>
                  {label}
                </CTableDataCell>
                <CTableDataCell className="bg-light text-muted">
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

export default TripInformationDisplay
