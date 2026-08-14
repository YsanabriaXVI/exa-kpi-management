import React, { useState, useMemo } from 'react'
import { CTable, CTableBody, CTableHead, CTableHeaderCell, CTableRow, CTableDataCell, CFormInput, CFormCheck, CPagination, CPaginationItem, CRow, CCol, CFormSelect } from '@coreui/react-pro'
import { SubdivisionStatementTableData } from '../types'
import CIcon from '@coreui/icons-react'
import { cilChevronLeft, cilChevronRight } from '@coreui/icons'

interface SubdivisionStatementTableProps {
  data: SubdivisionStatementTableData | null
  loading?: boolean
  notes?: string
  showNotes?: boolean
  subdivisionName?: string
  onSelectionChange?: (selected: Array<{ index: number; trip: any }>) => void
}

const SubdivisionStatementTable: React.FC<SubdivisionStatementTableProps> = ({ data, loading, notes, showNotes, subdivisionName, onSelectionChange }) => {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Safe access to data properties
  const trips = data?.trips || []
  const header = data?.header || []
  const footer = data?.footer || []
  const total = data?.total || []
  const columns = data?.columns || []

  // Filter trips based on input
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true
        const tripValue = String(trip[key] || '').toLowerCase()
        return tripValue.includes(value.toLowerCase())
      })
    })
  }, [trips, filters])

  // Pagination logic
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage) || 1
  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTrips.slice(start, start + itemsPerPage)
  }, [filteredTrips, currentPage, itemsPerPage])

  // Selection logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(filteredTrips.map((_, index) => index))
      setSelectedRows(allIndices)
      if (onSelectionChange) {
        onSelectionChange(filteredTrips.map((trip, index) => ({ index, trip })))
      }
    } else {
      setSelectedRows(new Set())
      onSelectionChange?.([])
    }
  }

  const handleSelectRow = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(index)
    } else {
      newSelected.delete(index)
    }
    setSelectedRows(newSelected)
    if (onSelectionChange) {
      const selected = Array.from(newSelected).map((i) => ({ index: i, trip: filteredTrips[i] }))
      onSelectionChange(selected)
    }
  }

  const handleFilterChange = (column: string, value: string) => {
    setFilters((prev) => ({ ...prev, [column]: value }))
    setCurrentPage(1) // Reset to first page on filter change
  }

  if (loading) {
    return <div className="text-center p-3">Loading table data...</div>
  }

  if (!data || !data.trips || data.trips.length === 0) {
    return <div className="text-center p-3 text-muted">No trips data available.</div>
  }

  // Helper to render the header section (Invoice #, Date, etc.)
  const renderHeaderSection = () => {
    if (!header || header.length === 0) return null
    return (
      <div className="p-3 mb-3 rounded bg-body border text-body">
        <CRow className="g-3">
          <CCol md={8} className="d-flex align-items-center bg-body rounded">
            <div>
              <strong>{subdivisionName || 'Subdivision'}</strong>
            </div>
          </CCol>
          <CCol md={4} className="p-2 rounded border bg-body text-body">
            {header.map((item, index) => (
              <div key={index} className="d-flex justify-content-between mb-1">
                <strong>{item.title}:</strong>
                <span>{item.value}</span>
              </div>
            ))}
          </CCol>
        </CRow>
      </div>
    )
  }

  return (
    <div className="subdivision-statement-table">
      {renderHeaderSection()}

      <div className="table-responsive mb-3">
        <CTable hover striped bordered responsive className="mb-0 border bg-body" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell className="text-center" style={{ width: '40px' }}>
                <CFormCheck
                  checked={selectedRows.size === filteredTrips.length && filteredTrips.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </CTableHeaderCell>
              <CTableHeaderCell className="text-center" style={{ width: '50px' }}>#</CTableHeaderCell>
              {columns.map((col) => (
                <CTableHeaderCell key={col} style={{ minWidth: '150px' }}>
                  <div className="d-flex flex-column gap-2">
                    <span>{col.replace(/_/g, ' ').replace('Trip ', '')}</span>
                    <CFormInput
                      size="sm"
                      className="w-100"
                      placeholder={`Filter ${col.replace(/_/g, ' ')}`}
                      value={filters[col] || ''}
                      onChange={(e) => handleFilterChange(col, e.target.value)}
                    />
                  </div>
                </CTableHeaderCell>
              ))}
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {paginatedTrips.map((trip, index) => {
              const actualIndex = (currentPage - 1) * itemsPerPage + index
              return (
                <CTableRow key={index}>
                  <CTableDataCell className="text-center">
                    <CFormCheck
                      checked={selectedRows.has(actualIndex)}
                      onChange={(e) => handleSelectRow(actualIndex, e.target.checked)}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-center">{actualIndex + 1}</CTableDataCell>
                  {columns.map((col) => (
                    <CTableDataCell key={col}>{trip[col]}</CTableDataCell>
                  ))}
                </CTableRow>
              )
            })}
            
            {/* Totals Row */}
            <CTableRow className="fw-bold">
              <CTableDataCell colSpan={2}></CTableDataCell>
              {/* Using total array safely */}
               {(total || []).map((val, index) => (
                <CTableDataCell key={index}>{val}</CTableDataCell>
              ))}
            </CTableRow>

            {/* Notes Row */}
            {showNotes && notes && (
              <CTableRow>
                <CTableDataCell colSpan={columns.length + 2} className="p-3">
                  <strong>Notes:</strong> {notes}
                </CTableDataCell>
              </CTableRow>
            )}

            {/* Footer Rows (Subtotal, Tax, Total Due, etc.) */}
            {footer.map((item, index) => (
              <CTableRow key={index}>
                <CTableDataCell colSpan={columns.length + 1} className="text-end fw-bold">
                  {item.title}:
                </CTableDataCell>
                <CTableDataCell className="fw-bold">{item.value}</CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </div>

      {/* Pagination Controls */}
      <div className="d-flex justify-content-between align-items-center bg-body border rounded p-2">
        <div className="d-flex align-items-center gap-2">
          <span>Show</span>
          <CFormSelect 
            size="sm" 
            style={{ width: '70px' }} 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </CFormSelect>
          <span>entries</span>
        </div>

        <CPagination align="center" aria-label="Page navigation" className="mb-0">
          <CPaginationItem 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            <CIcon icon={cilChevronLeft} />
          </CPaginationItem>
          {/* Simple pagination */}
          <CPaginationItem active>{currentPage}</CPaginationItem>
          <CPaginationItem disabled>of {totalPages}</CPaginationItem>
          
          <CPaginationItem 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >
            <CIcon icon={cilChevronRight} />
          </CPaginationItem>
        </CPagination>
      </div>
    </div>
  )
}

export default SubdivisionStatementTable
