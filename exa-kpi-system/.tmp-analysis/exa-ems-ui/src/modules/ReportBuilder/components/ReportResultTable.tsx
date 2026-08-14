/**
 * Report Result Table Component
 * Displays generated report data in a table format
 */

import React, { useState } from 'react'
import { CTable, CCollapse, CButton } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilChevronBottom, cilChevronTop } from '@coreui/icons'

interface ReportResultTableProps {
  title: string
  columns: string[]
  rows: any[][]
  totals?: any[]
}

/**
 * Format date string to be more human-readable
 * Converts "10-15-2025" or "2025-10-15" to "Oct 15"
 */
const formatColumnDate = (value: string): string => {
  if (!value || typeof value !== 'string') return value
  
  // Check if it looks like a date (MM-DD-YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.)
  const datePatterns = [
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,  // MM-DD-YYYY or DD-MM-YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,  // YYYY-MM-DD
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
  ]
  
  for (const pattern of datePatterns) {
    const match = value.match(pattern)
    if (match) {
      try {
        // Try to parse the date
        const date = new Date(value.replace(/-/g, '/'))
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      } catch {
        // If parsing fails, return original
      }
    }
  }
  
  return value
}

const ReportResultTable: React.FC<ReportResultTableProps> = ({ title, columns, rows, totals }) => {
  const [collapsed, setCollapsed] = useState(false)

  // Format column headers (dates become more readable)
  const formattedColumns = columns.map(formatColumnDate)

  return (
    <div className="mb-4">
      {/* Section Header - matching the incident form pattern */}
      <div 
        className="d-flex align-items-center justify-content-between mb-3 pb-2"
        style={{ borderBottom: '2px solid var(--cui-border-color)' }}
      >
        <div>
          <div 
            className="text-uppercase fw-semibold"
            style={{ 
              letterSpacing: '0.05em', 
              fontSize: '0.7rem', 
              fontWeight: 600,
              color: 'var(--cui-body-color)',
              opacity: 0.6
            }}
          >
            Report Section
          </div>
          <h6 className="mb-0 fw-bold">{title}</h6>
        </div>
        <CButton
          color="secondary"
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          <CIcon icon={collapsed ? cilChevronBottom : cilChevronTop} className="me-1" />
          {collapsed ? 'Expand' : 'Collapse'}
        </CButton>
      </div>

      <CCollapse visible={!collapsed}>
        <div 
          className="table-responsive" 
          style={{ 
            maxHeight: '500px', 
            overflowX: 'auto',
            overflowY: 'auto',
            border: '1px solid var(--cui-border-color)',
            borderRadius: '0.375rem'
          }}
        >
          <CTable
            hover
            bordered
            small
            className="mb-0"
            style={{ fontSize: '0.8rem' }}
          >
            <thead 
              className="table-light" 
              style={{ position: 'sticky', top: 0, zIndex: 2 }}
            >
              <tr>
                {formattedColumns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={idx === 0 ? 'text-start' : 'text-end'}
                    style={{ 
                      whiteSpace: 'nowrap',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--cui-tertiary-bg)',
                      ...(idx === 0 ? { 
                        position: 'sticky', 
                        left: 0, 
                        zIndex: 3,
                        minWidth: '120px',
                        boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
                      } : {
                        minWidth: '70px'
                      })
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                <>
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td 
                          key={cellIdx} 
                          className={cellIdx === 0 ? 'text-start' : 'text-end'}
                          style={{ 
                            whiteSpace: 'nowrap',
                            padding: '0.4rem 0.75rem',
                            ...(cellIdx === 0 ? { 
                              position: 'sticky', 
                              left: 0, 
                              backgroundColor: 'var(--cui-body-bg)',
                              fontWeight: 500,
                              boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                              zIndex: 1
                            } : {})
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {totals && totals.length > 0 && (
                    <tr 
                      className="table-secondary"
                      style={{ 
                        position: 'sticky', 
                        bottom: 0,
                        borderTop: '2px solid var(--cui-border-color)'
                      }}
                    >
                      {totals.map((cell, idx) => (
                        <td 
                          key={idx} 
                          className={idx === 0 ? 'text-start' : 'text-end'}
                          style={{ 
                            whiteSpace: 'nowrap',
                            padding: '0.5rem 0.75rem',
                            fontWeight: 700,
                            ...(idx === 0 ? { 
                              position: 'sticky', 
                              left: 0, 
                              backgroundColor: 'var(--cui-tertiary-bg)',
                              boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                              zIndex: 1
                            } : {
                              backgroundColor: 'var(--cui-tertiary-bg)'
                            })
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan={columns.length} className="text-center py-4 text-muted">
                    No data available for this section
                  </td>
                </tr>
              )}
            </tbody>
          </CTable>
        </div>
        <div className="text-end mt-2">
          <small className="text-muted">
            {rows.length} row{rows.length !== 1 ? 's' : ''} • Scroll horizontally to see all data
          </small>
        </div>
      </CCollapse>
    </div>
  )
}

export default ReportResultTable

