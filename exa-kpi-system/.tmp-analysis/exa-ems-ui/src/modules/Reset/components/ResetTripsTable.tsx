import React, { useMemo, useState } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CFormCheck,
  CButton,
  CFormInput,
  CPagination,
  CPaginationItem,
  CFormSelect,
  CCardFooter,
  CFormSwitch,
} from '@coreui/react-pro'

import { cilTrash, cilChevronLeft, cilChevronRight, cilPlus } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import ResetModal from './ResetModal'

interface ResetTripsTableProps {
  trips: any[]
  toggleTrip: (id: number) => void
  deleteSelected: () => void
}

export default function ResetTripsTable({
  trips,
  toggleTrip,
  deleteSelected,
}: ResetTripsTableProps) {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showTable, setShowTable] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState<'trips' | 'fuel' | 'gates' | null>(null)

  const columns = [
    { key: 'tripId', label: 'Trip ID' },
    { key: 'tripDate', label: 'Trip Date' },
    { key: 'route', label: 'Route' },
    { key: 'fuelOrderId', label: 'Fuel Order ID' },
    { key: 'gasStation', label: 'Gas Station' },
    { key: 'dateFuelOrder', label: 'Date Fuel Order' },
    { key: 'gateOut', label: 'Gate Out' },
    { key: 'dateGateOut', label: 'Date Gate Out' },
    { key: 'gateIn', label: 'Gate In' },
    { key: 'dateGateIn', label: 'Date Gate In' },
    { key: 'odometer', label: 'Odometer / Hourmeter' },
    { key: 'kms', label: 'KMS' },
    { key: 'reqLiters', label: 'Req. Liters' },
    { key: 'literInTank', label: 'Liters in Tank' },
    { key: 'gpsLitersInTank', label: 'GPS Liters in Tank' },
    { key: 'suppliedLiters', label: 'Supplied Liters' },
    { key: 'litersConsumption', label: 'Liters Consumption' },
    { key: 'gpsLitersConsumption', label: 'GPS Liters Consumption' },
    { key: 'kmPerLiterEms', label: 'KM/Liter EMS' },
  ]

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true
        const tripValue = String(trip?.[key] ?? '').toLowerCase()
        return tripValue.includes(value.toLowerCase())
      })
    })
  }, [trips, filters])

  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage) || 1

  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTrips.slice(start, start + itemsPerPage)
  }, [filteredTrips, currentPage, itemsPerPage])

  const selectedCount = trips.filter((t) => t.selected).length

  const allFilteredSelected =
    filteredTrips.length > 0 &&
    filteredTrips.every((trip) => trips.find((t) => t.id === trip.id)?.selected)

  const handleFilterChange = (column: string, value: string) => {
    setFilters((prev) => ({ ...prev, [column]: value }))
    setCurrentPage(1)
  }

  const handleSelectAll = (checked: boolean) => {
    filteredTrips.forEach((trip) => {
      const original = trips.find((t) => t.id === trip.id)
      const isSelected = Boolean(original?.selected)

      if (checked && !isSelected) toggleTrip(trip.id)
      if (!checked && isSelected) toggleTrip(trip.id)
    })
  }

  const formatColumnLabel = (col: string) => {
    return col
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim()
  }

  const openModal = (type: 'trips' | 'fuel' | 'gates') => {
    setModalType(type)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setModalType(null)
  }

  return (
    <CCard className="mb-3 shadow-sm">
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex justify-content-between align-items-center gap-3">
            <strong>Trips Information</strong>

            <CFormSwitch
              label={showTable ? 'Hide Table' : 'Show Table'}
              checked={showTable}
              onChange={(e) => setShowTable(e.target.checked)}
            />
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <CButton color="success" onClick={() => openModal('trips')}>
              <CIcon icon={cilPlus} className="me-1" />
              Add Trips
            </CButton>

            <CButton color="success" onClick={() => openModal('fuel')}>
              <CIcon icon={cilPlus} className="me-1" />
              Add Fuel Order
            </CButton>

            <CButton color="success" onClick={() => openModal('gates')}>
              <CIcon icon={cilPlus} className="me-1" />
              Add Gates
            </CButton>

            <CButton
              color="danger"
              disabled={selectedCount === 0}
              onClick={deleteSelected}
              className="text-white"
            >
              <CIcon icon={cilTrash} className="me-1" />
              Delete Selected ({selectedCount})
            </CButton>
          </div>
        </div>
      </CCardHeader>

      {showTable && (
        <div className={showTable ? 'd-block' : 'd-none'}>
          <CCardBody>
            <div className="table-responsive mb-3">
              <CTable
                hover
                striped
                bordered
                responsive
                className="mb-0 border bg-body"
                style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: '40px' }} />
                    <CTableHeaderCell style={{ width: '50px' }}>#</CTableHeaderCell>

                    {columns.map((col) => (
                      <CTableHeaderCell key={col.key} style={{ minWidth: '150px' }}>
                        <div className="d-flex flex-column gap-2">
                          <span>{col.label}</span>

                          <CFormInput
                            size="sm"
                            placeholder={`Filter ${col.label}`}
                            value={filters[col.key] || ''}
                            onChange={(e) => handleFilterChange(col.key, e.target.value)}
                          />
                        </div>
                      </CTableHeaderCell>
                    ))}
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {paginatedTrips.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell
                        colSpan={columns.length + 2}
                        className="text-center text-muted py-4"
                      >
                        No trips data available.
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    paginatedTrips.map((trip, index) => {
                      const actualIndex = (currentPage - 1) * itemsPerPage + index

                      return (
                        <CTableRow key={trip.id ?? index}>
                          <CTableDataCell className="text-center">
                            <CFormCheck
                              checked={!!trip.selected}
                              onChange={() => toggleTrip(trip.id)}
                            />
                          </CTableDataCell>

                          <CTableDataCell className="text-center">{actualIndex + 1}</CTableDataCell>

                          {columns.map((col) => (
                            <CTableDataCell key={col.key}>{trip?.[col.key] ?? '-'}</CTableDataCell>
                          ))}

                          <CTableDataCell className="text-center">
                            <CButton color="danger" size="sm">
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })
                  )}
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
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                >
                  <CIcon icon={cilChevronLeft} />
                </CPaginationItem>
                {/* Simple pagination */}
                <CPaginationItem active>{currentPage}</CPaginationItem>
                <CPaginationItem disabled>of {totalPages}</CPaginationItem>

                <CPaginationItem
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                >
                  <CIcon icon={cilChevronRight} />
                </CPaginationItem>
              </CPagination>
            </div>
          </CCardBody>
        </div>
      )}
      <ResetModal visible={modalVisible} onClose={closeModal} type={modalType} />
    </CCard>
  )
}
