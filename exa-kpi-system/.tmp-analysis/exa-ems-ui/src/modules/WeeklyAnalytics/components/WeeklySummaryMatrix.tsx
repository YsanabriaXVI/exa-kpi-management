/**
 * Weekly Summary Matrix Component
 * Displays matrix/grid report data with highlighting for negative values
 */

import React, { useState } from 'react'
import { CTable, CCollapse, CButton, CCard, CCardHeader, CCardBody } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilChevronBottom, cilChevronTop, cilGrid } from '@coreui/icons'
import type { WeeklyAnalyticsMatrixData } from '../types'
import './WeeklyAnalytics.scss'

interface WeeklySummaryMatrixProps {
  data: WeeklyAnalyticsMatrixData
}

const WeeklySummaryMatrix: React.FC<WeeklySummaryMatrixProps> = ({ data }) => {
  const [collapsed, setCollapsed] = useState(true) // Start collapsed since matrices are large

  // Get matrix content (handle both nested and flat structures)
  const matrixContent = data.table || data
  const header = matrixContent.header || []
  const columns = matrixContent.columns || []
  const footer = matrixContent.footer || []

  if (!header.length && !columns.length) {
    return (
      <div className="weekly-summary-matrix">
        <CCard className="mb-4 shadow-sm border-0">
          <CCardHeader>
            <CIcon icon={cilGrid} className="me-2" />
            <strong>{data.title}</strong>
          </CCardHeader>
          <CCardBody>
            <div className="alert alert-info mb-0 text-center">
              No matrix data available for this section.
            </div>
          </CCardBody>
        </CCard>
      </div>
    )
  }

  // Helper function to check if value is negative
  const isNegativeValue = (value: any): boolean => {
    if (typeof value === 'string') {
      // Check for negative numbers, including currency formatted ones like "Lps -1,234.00"
      const cleanedValue = value.replace(/[^0-9.-]/g, '')
      return cleanedValue.includes('-')
    }
    if (typeof value === 'number') {
      return value < 0
    }
    return false
  }

  return (
    <div className="weekly-summary-matrix">
      <CCard className="mb-4 shadow-sm border-0">
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div>
            <CIcon icon={cilGrid} className="me-2" />
            <strong>{data.title}</strong>
            <span className="ms-2 text-muted small">
              ({columns.length} rows × {header.length} columns)
            </span>
          </div>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            className="btn-collapse"
            onClick={() => setCollapsed(!collapsed)}
          >
            <CIcon icon={collapsed ? cilChevronBottom : cilChevronTop} />
            {collapsed ? ' Expand' : ' Collapse'}
          </CButton>
        </CCardHeader>

        <CCollapse visible={!collapsed}>
          <CCardBody className="p-0">
            <div className="table-scroll-container" style={{ maxHeight: '600px' }}>
              <CTable
                hover
                bordered
                small
                className="mb-0"
                style={{ fontSize: '0.75rem' }}
              >
                <thead>
                  <tr>
                    {header.map((head, idx) => (
                      <th 
                        key={idx} 
                        className="text-nowrap text-center"
                        style={{ 
                          minWidth: idx === 0 ? '180px' : '100px',
                          position: idx === 0 ? 'sticky' : 'static',
                          left: idx === 0 ? 0 : 'auto',
                          zIndex: idx === 0 ? 3 : 2
                        }}
                      >
                        {head || 'Subdivision'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {columns.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => {
                        const cellStr = cell?.toString() || ''
                        const isNegative = isNegativeValue(cell)
                        const isFirstCol = cellIdx === 0
                        
                        return (
                          <td 
                            key={cellIdx} 
                            className={`text-nowrap ${isNegative ? 'text-danger' : ''} ${isFirstCol ? 'fw-medium' : 'text-end'}`}
                            style={{
                              position: isFirstCol ? 'sticky' : 'static',
                              left: isFirstCol ? 0 : 'auto',
                              zIndex: isFirstCol ? 1 : 0
                            }}
                          >
                            {cellStr || '-'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                {footer.length > 0 && (
                  <tfoot>
                    <tr>
                      {footer.map((cell, idx) => {
                        const cellStr = cell?.toString() || ''
                        const isNegative = isNegativeValue(cell)
                        const isFirstCol = idx === 0
                        
                        return (
                          <td 
                            key={idx} 
                            className={`text-nowrap ${isNegative ? 'text-danger' : ''} ${isFirstCol ? '' : 'text-end'}`}
                            style={{
                              position: isFirstCol ? 'sticky' : 'static',
                              left: isFirstCol ? 0 : 'auto',
                              zIndex: isFirstCol ? 1 : 0
                            }}
                          >
                            <strong>{cellStr || '-'}</strong>
                          </td>
                        )
                      })}
                    </tr>
                  </tfoot>
                )}
              </CTable>
            </div>
            <div className="scroll-hint text-muted small p-2 text-center border-top">
              <em>Scroll horizontally to view all columns. First column and header are sticky.</em>
            </div>
          </CCardBody>
        </CCollapse>
      </CCard>
    </div>
  )
}

export default WeeklySummaryMatrix

