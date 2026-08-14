import React from 'react'
import {
  CBadge,
  CButton,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilZoom } from '@coreui/icons'
import { DepotSetup } from '../types'

import { MODULE_DEPOT_SETUP } from '../../../../constants/modules'
import { 
  permissionService, 
  UPDATE,
  CREATE,
  READ,
  DELETE } from '../../../../services/auth/permission.service'


const canCreateSetup = permissionService.checkPermission(MODULE_DEPOT_SETUP, CREATE)
const canUpdateSetup = permissionService.checkPermission(MODULE_DEPOT_SETUP, UPDATE)
const canDeleteSetup = permissionService.checkPermission(MODULE_DEPOT_SETUP, DELETE)
const canReadSetup = permissionService.checkPermission(MODULE_DEPOT_SETUP, READ)


interface DepotSetupTableProps {
  setups?: DepotSetup[]
  loading?: boolean
  error?: string | null
  onEdit?: (setupId: number | string) => void
  onView?: (setupId: number | string) => void
  onToggleActive?: (setup: DepotSetup) => void
  togglingSetupId?: number | null
}

const isActiveFlag = (value: any) => value === true || value === 1 || value === '1'
const booleanLabel = (value: any) => (isActiveFlag(value) ? 'Yes' : 'No')

const DepotSetupTable: React.FC<DepotSetupTableProps> = ({
  setups = [],
  loading,
  error,
  onEdit,
  onView,
  onToggleActive,
  togglingSetupId,
}) => {
  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <CSpinner size="sm" />
        <span className="text-body-secondary">Loading depot setups...</span>
      </div>
    )
  }

  if (error) {
    return <div className="text-danger fw-semibold">{error}</div>
  }

  if (!setups.length) {
    return <div className="text-body-secondary">No depot setups configured yet.</div>
  }

  return (
    <div className="table-responsive">
      <CTable align="middle" className="mb-0">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell scope="col">Depot</CTableHeaderCell>
            <CTableHeaderCell scope="col">Location</CTableHeaderCell>
            <CTableHeaderCell scope="col" className="text-center">
              EDI
            </CTableHeaderCell>
            <CTableHeaderCell scope="col" className="text-center">
              Email Notifications
            </CTableHeaderCell>
            <CTableHeaderCell scope="col" className="text-center">
              Images on Email
            </CTableHeaderCell>
            <CTableHeaderCell scope="col" className="text-center">
              Tax Rate
            </CTableHeaderCell>
            <CTableHeaderCell scope="col" className="text-center">
              Status
            </CTableHeaderCell>
            <CTableHeaderCell scope="col" className="text-center">
              Actions
            </CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {setups.map((setup) => {
            const setupId = setup.setupId ?? setup.depotId ?? setup.clientId ?? Math.random()
            const depotName = setup.depot?.depotName || `Depot ${setup.depotId ?? setupId}`
            const locationName =
              setup.depot?.location?.name || (setup as any).location?.name || (setup as any).location_name || '—'
            const taxRate =
              setup.taxRate !== undefined && setup.taxRate !== null && setup.taxRate !== ''
                ? `${setup.taxRate}%`
                : '—'
            const active = isActiveFlag(setup.active)
            const isToggling = togglingSetupId === setup.setupId

            return (
              <CTableRow key={setupId}>
                <CTableDataCell>{depotName}</CTableDataCell>
                <CTableDataCell>{locationName}</CTableDataCell>
                <CTableDataCell className="text-center">{booleanLabel(setup.ediGateCode)}</CTableDataCell>
                <CTableDataCell className="text-center">{booleanLabel(setup.emailNotification)}</CTableDataCell>
                <CTableDataCell className="text-center">{booleanLabel(setup.imagesOnEmail)}</CTableDataCell>
                <CTableDataCell className="text-center">{taxRate}</CTableDataCell>
                <CTableDataCell className="text-center">
                  <CBadge color={active ? 'success' : 'secondary'} shape="rounded-pill">
                    {active ? 'Enabled' : 'Disabled'}
                  </CBadge>
                </CTableDataCell>
                <CTableDataCell className="text-center">
                  <div className="d-inline-flex gap-2">
                { canReadSetup && <CButton
                  size="sm"
                  color="info"
                  variant="ghost"
                  disabled={!onView || !setup.setupId}
                  onClick={() => onView && setup.setupId && onView(setup.setupId)}
                  title="View"
                >
                <CIcon icon={cilZoom} />
                </CButton>}
                    { canUpdateSetup && <CButton
                      color="primary"
                      variant="ghost"
                      size="sm"
                      disabled={!onEdit}
                      onClick={() => onEdit && setup.setupId && onEdit(setup.setupId)}
                    >
                      <CIcon icon={cilPencil} />
                    </CButton>}
                    { canUpdateSetup &&<CButton
                      color={active ? 'danger' : 'success'}
                      size="sm"
                      variant="outline"
                      disabled={!onToggleActive || !setup.setupId}
                      onClick={() => onToggleActive && onToggleActive(setup)}
                    >
                      {isToggling ? <CSpinner size="sm" /> : active ? 'Disable' : 'Enable'}
                    </CButton>}
                  </div>
                </CTableDataCell>
              </CTableRow>
            )
          })}
        </CTableBody>
      </CTable>
    </div>
  )
}

export default DepotSetupTable
