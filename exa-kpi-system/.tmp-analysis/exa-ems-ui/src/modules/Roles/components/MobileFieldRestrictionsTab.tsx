import React from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSwitch,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilMobile } from '@coreui/icons'
import { MOBILE_FIELD_CATALOG, APP_TYPE_LABELS, APP_TYPES } from '../data/mobileFieldCatalog'
import type { AppType } from '../data/mobileFieldCatalog'

interface MobileFieldRestrictionsTabProps {
  restrictions: Record<string, string[]>
  onChange: (restrictions: Record<string, string[]>) => void
}

const MobileFieldRestrictionsTab: React.FC<MobileFieldRestrictionsTabProps> = ({
  restrictions,
  onChange,
}) => {
  const isFieldHidden = (appType: AppType, fieldKey: string): boolean => {
    return restrictions[appType]?.includes(fieldKey) ?? false
  }

  const toggleField = (appType: AppType, fieldKey: string) => {
    const current = restrictions[appType] || []
    const updated = current.includes(fieldKey)
      ? current.filter((k) => k !== fieldKey)
      : [...current, fieldKey]
    onChange({ ...restrictions, [appType]: updated })
  }

  const showAll = (appType: AppType) => {
    onChange({ ...restrictions, [appType]: [] })
  }

  const hideAll = (appType: AppType) => {
    const allKeys = MOBILE_FIELD_CATALOG[appType].map((f) => f.key)
    onChange({ ...restrictions, [appType]: allKeys })
  }

  const getHiddenCount = (appType: AppType): number => {
    return (restrictions[appType] || []).length
  }

  return (
    <CRow className="g-3">
      <CCol xs={12}>
        <p className="text-body-secondary mb-3">
          Configure which fields are visible in each mobile app. Fields are visible by default —
          toggle off to hide them for this role.
        </p>
      </CCol>
      {APP_TYPES.map((appType) => {
        const fields = MOBILE_FIELD_CATALOG[appType]
        const hiddenCount = getHiddenCount(appType)

        return (
          <CCol xs={12} key={appType}>
            <CCard className="mb-0">
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <CIcon icon={cilMobile} />
                  <strong>{APP_TYPE_LABELS[appType]}</strong>
                  {hiddenCount > 0 && (
                    <CBadge color="warning" shape="rounded-pill">
                      {hiddenCount} hidden
                    </CBadge>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <CButton
                    color="success"
                    variant="ghost"
                    size="sm"
                    onClick={() => showAll(appType)}
                  >
                    Show All
                  </CButton>
                  <CButton
                    color="danger"
                    variant="ghost"
                    size="sm"
                    onClick={() => hideAll(appType)}
                  >
                    Hide All
                  </CButton>
                </div>
              </CCardHeader>
              <CCardBody className="p-0">
                <CTable small hover responsive className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: '40%' }}>Field</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '30%' }}>Section</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '30%', textAlign: 'center' }}>
                        Visible
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {fields.map((field) => {
                      const hidden = isFieldHidden(appType, field.key)
                      return (
                        <CTableRow key={field.key}>
                          <CTableDataCell className="align-middle">
                            <span className={hidden ? 'text-body-secondary' : ''}>
                              {field.label}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell className="align-middle text-body-secondary">
                            {field.section}
                          </CTableDataCell>
                          <CTableDataCell className="align-middle text-center">
                            <CFormSwitch
                              checked={!hidden}
                              onChange={() => toggleField(appType, field.key)}
                            />
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </CCol>
        )
      })}
    </CRow>
  )
}

export default MobileFieldRestrictionsTab
