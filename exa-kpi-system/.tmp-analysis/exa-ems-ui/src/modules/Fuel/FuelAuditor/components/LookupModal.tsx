import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CButton,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CSpinner,
} from '@coreui/react-pro'

import type { AppDispatch } from '../../../../store'
import type { GasStationTransaction, FuelOrderSummary } from '../types/fuelAuditor.types'
import {
  searchUnlinkedFuelOrders,
  selectFuelAuditorSearchResults,
} from '../store/fuelAuditor.slice'

interface Props {
  isOpen: boolean
  toggle: () => void
  onSelect: (order: FuelOrderSummary) => void
  transactionData?: GasStationTransaction | null
}

const LookupModal: React.FC<Props> = ({ isOpen, toggle, onSelect, transactionData }) => {
  const dispatch = useDispatch<AppDispatch>()
  const results = useSelector(selectFuelAuditorSearchResults)

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (isOpen && transactionData) {
      setSearching(true)
      dispatch(
        searchUnlinkedFuelOrders({
          transactionData: {
            gasStationsId: transactionData.gasStationsId,
            licensePlate: transactionData.licensePlate,
            fuelType: transactionData.fuelType,
            quantity: transactionData.quantity,
            unitPrice: transactionData.unitPrice,
          },
        }),
      ).finally(() => setSearching(false))
    }
  }, [isOpen, transactionData, dispatch])

  const handleSearch = useCallback(() => {
    setSearching(true)
    dispatch(searchUnlinkedFuelOrders({ query })).finally(() =>
      setSearching(false),
    )
  }, [dispatch, query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <CModal visible={isOpen} onClose={toggle} size="lg" alignment="center">
      <CModalHeader>
        <CModalTitle>Search Fuel Orders</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="d-flex gap-2 mb-3">
          <CFormInput
            placeholder="Search by plate, station, trip ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <CButton color="primary" onClick={handleSearch} disabled={searching}>
            {searching ? <CSpinner size="sm" /> : 'Search'}
          </CButton>
        </div>

        {results.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <CTable small hover bordered>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Order ID</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Station</CTableHeaderCell>
                  <CTableHeaderCell>Plate</CTableHeaderCell>
                  <CTableHeaderCell>Trip ID</CTableHeaderCell>
                  <CTableHeaderCell>Unit Price</CTableHeaderCell>
                  <CTableHeaderCell>Qty (Ltr)</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {results.map((order) => (
                  <CTableRow
                    key={order.fuelOrderId}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelect(order)}
                    className="hover-bg-light"
                  >
                    <CTableDataCell>{order.fuelOrderId}</CTableDataCell>
                    <CTableDataCell>{order.dateSchedule ?? '-'}</CTableDataCell>
                    <CTableDataCell>{order.gasStationName ?? '-'}</CTableDataCell>
                    <CTableDataCell>{order.plate ?? '-'}</CTableDataCell>
                    <CTableDataCell>{order.tripsid ?? '-'}</CTableDataCell>
                    <CTableDataCell>
                      {order.unitPrice ?? order.fuelPrice?.price ?? '-'}
                    </CTableDataCell>
                    <CTableDataCell>{order.fuelRequestLtr ?? '-'}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        ) : (
          <p className="text-muted text-center py-3">
            {searching ? 'Searching...' : 'No results. Try a different search.'}
          </p>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={toggle}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default LookupModal
