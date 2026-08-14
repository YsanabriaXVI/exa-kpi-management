import React, { useState } from 'react'
import {
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CButton, CSmartTable,
} from '@coreui/react-pro'
import type { InvoiceLine } from '../types/subdivisionFuelStatement.types'

interface AddFuelOrderModalProps {
  visible: boolean
  onClose: () => void
  invoiceLines: InvoiceLine[]
  onAdd: (lines: InvoiceLine[]) => void
}

const COLUMNS = [
  { key: 'select', label: '', _style: { width: '40px' }, filter: false, sorter: false },
  { key: 'tripId', label: 'Trip ID' },
  { key: 'fuelOrderId', label: 'Fuel Order ID' },
  { key: 'formattedDateScheduled', label: 'Date' },
  { key: 'plate', label: 'Plate' },
  { key: 'driverName', label: 'Driver' },
  { key: 'assetType', label: 'Asset Type' },
  { key: 'orderType', label: 'Order Type' },
  { key: 'station', label: 'Station' },
  { key: 'fuelType', label: 'Fuel Type' },
  { key: 'measureUnit', label: 'Unit' },
  { key: 'fuelRequestLiters', label: 'Req. Liters' },
  { key: 'gsReceiptFuelSuppliedLiters', label: 'Supplied Liters' },
  { key: 'unitPrice', label: 'Unit Price' },
  { key: 'lempTotal', label: 'FO Total Lps' },
  { key: 'gsReceiptLempTotal', label: 'GS Total Lps' },
  { key: 'dollarTotal', label: 'Total USD' },
  { key: 'reconciliationStatus', label: 'Recon Status' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'orderStatus', label: 'Order Status' },
]

const AddFuelOrderModal: React.FC<AddFuelOrderModalProps> = ({
  visible, onClose, invoiceLines, onAdd,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === invoiceLines.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(invoiceLines.map((r) => r.id)))
  }

  const handleAdd = () => {
    const selected = invoiceLines.filter((r) => selectedIds.has(r.id))
    onAdd(selected)
    setSelectedIds(new Set())
    onClose()
  }

  return (
    <CModal visible={visible} onClose={onClose} size="xl" scrollable>
      <CModalHeader>
        <CModalTitle>Add Fuel Orders</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {invoiceLines.length === 0 ? (
          <p className="text-muted">No additional invoice lines available.</p>
        ) : (
          <CSmartTable
            items={invoiceLines}
            columns={COLUMNS}
            itemsPerPage={15}
            pagination
            tableProps={{ responsive: true, striped: true, hover: true, bordered: true, size: 'sm' }}
            scopedColumns={{
              select: (item: InvoiceLine) => (
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                  />
                </td>
              ),
              fuelRequestLiters: (item: InvoiceLine) => <td>{item.fuelRequestLiters?.toFixed(2)}</td>,
              gsReceiptFuelSuppliedLiters: (item: InvoiceLine) => <td>{item.gsReceiptFuelSuppliedLiters?.toFixed(4)}</td>,
              lempTotal: (item: InvoiceLine) => <td>{item.lempTotal?.toFixed(4)}</td>,
              gsReceiptLempTotal: (item: InvoiceLine) => <td>{item.gsReceiptLempTotal?.toFixed(4)}</td>,
            }}
          />
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={handleSelectAll}>
          {selectedIds.size === invoiceLines.length ? 'Deselect All' : 'Select All'}
        </CButton>
        <CButton color="secondary" onClick={onClose}>Close</CButton>
        <CButton color="primary" disabled={selectedIds.size === 0} onClick={handleAdd}>
          Add to Statement ({selectedIds.size})
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default AddFuelOrderModal
