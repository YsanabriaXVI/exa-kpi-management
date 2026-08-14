import React from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableRow,
} from '@coreui/react-pro'

interface Props {
  rows: [string, React.ReactNode][]
}

const InfoTable: React.FC<Props> = ({ rows }) => {
  return (
    <CTable className="fuel-auditor-info-table" responsive>
      <CTableBody>
        {rows
          .filter(([, v]) => v != null && v !== '')
          .map(([label, value]) => (
            <CTableRow key={label}>
              <CTableDataCell
                className="fuel-auditor-info-table__label"
              >
                {label}
              </CTableDataCell>
              <CTableDataCell className="fuel-auditor-info-table__value">
                {typeof value === 'object' ? value : String(value)}
              </CTableDataCell>
            </CTableRow>
          ))}
      </CTableBody>
    </CTable>
  )
}

export default InfoTable
