/**
 * Weekly Summary Table Component
 * Displays tabular report data with header, body, and footer
 */

import React, { useState } from 'react'
import { CTable, CCollapse, CButton, CCard, CCardHeader, CCardBody } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilChevronBottom, cilChevronTop, cilList } from '@coreui/icons'
import { Link } from 'react-router-dom'
import type { WeeklyAnalyticsTableData } from '../types'
import './WeeklyAnalytics.scss'

interface WeeklySummaryTableProps {
  data: WeeklyAnalyticsTableData
}

const WeeklySummaryTable: React.FC<WeeklySummaryTableProps> = ({ data }) => {
  const [collapsed, setCollapsed] = useState(false)

  // Get table content (handle both nested and flat structures)
  const tableContent = data.table || data
  const header = tableContent.header || {}
  const columns = tableContent.columns || []
  const footer = tableContent.footer || {}
  const margin = tableContent.margin

  const headerKeys = Object.keys(header)

  if (headerKeys.length === 0) {
    return (
      <div className="weekly-summary-table">
        <CCard className="mb-4 shadow-sm border-0">
          <CCardHeader>
            <CIcon icon={cilList} className="me-2" />
            <strong>{data.title}</strong>
          </CCardHeader>
          <CCardBody>
            <div className="alert alert-info mb-0 text-center">
              No data available for this section.
            </div>
          </CCardBody>
        </CCard>
      </div>
    )
  }

  return (
    <div className="weekly-summary-table">
      <CCard className="mb-4 shadow-sm border-0">
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div>
            <CIcon icon={cilList} className="me-2" />
            <strong>{data.title}</strong>
            <span className="ms-2 text-muted small">({columns.length} rows)</span>
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
            <div className="table-scroll-container">
              <CTable
                hover
                bordered
                small
                responsive
                className="mb-0"
                style={{ fontSize: '0.8rem' }}
              >
                <thead>
                  <tr>
                    {headerKeys.map((key) => (
                      <th 
                        key={key} 
                        className="text-start text-nowrap"
                      >
                        {header[key]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {columns.length > 0 ? (
                    <>
                      {columns.map((column, idx) => (
                        <tr key={idx}>
                          {headerKeys.map((key) => {
                            const value = column[key]
                            let content = value ?? '-'

                            // Handle special link cases
                            if (header[key] === 'Invoice #' && value) {
                              content = (
                                <Link to={`/operations/client-statements/${value}`}>{value}</Link>
                              )
                            } else if (header[key] === 'Statement #' && value) {
                              content = (
                                <Link to={`/operations/subdivision-statements/${value}`}>{value}</Link>
                              )
                            }

                            // Determine alignment based on content
                            const isNumeric = typeof value === 'number' || 
                              (typeof value === 'string' && (value.startsWith('$') || value.startsWith('Lps') || !isNaN(parseFloat(value.replace(/,/g, '')))))

                            return (
                              <td 
                                key={key} 
                                className={`text-nowrap ${isNumeric ? 'text-end' : 'text-start'}`}
                              >
                                {content}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </>
                  ) : (
                    <tr>
                      <td colSpan={headerKeys.length} className="text-center py-4">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
                {columns.length > 0 && (
                  <tfoot>
                    {/* Footer Row */}
                    <tr>
                      {headerKeys.map((key) => (
                        <td key={key} className="text-nowrap">
                          <strong>{footer[key] ?? ''}</strong>
                        </td>
                      ))}
                    </tr>
                    {/* Margin Row (if exists) */}
                    {margin && (
                      <tr className="table-warning">
                        {headerKeys.map((key) => (
                          <td key={key} className="text-nowrap">
                            <strong>{margin[key] ?? ''}</strong>
                          </td>
                        ))}
                      </tr>
                    )}
                  </tfoot>
                )}
              </CTable>
            </div>
          </CCardBody>
        </CCollapse>
      </CCard>
    </div>
  )
}

export default WeeklySummaryTable

