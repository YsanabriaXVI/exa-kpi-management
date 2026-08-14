import React, { useState, useCallback, useEffect, useRef } from 'react'
import { CBadge, CButton, CSmartTable } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'
import { MODULE_SUBDIVISION_FUEL_STATEMENT } from '../../../../constants/modules'
import { permissionService, DELETE } from '../../../../services/auth/permission.service'
import ConfirmationModal from '../../../../components/ConfirmationModal'
import type { InvoiceLine } from '../types/subdivisionFuelStatement.types'

interface PreviewTableProps {
  rows: InvoiceLine[]
  deducted: boolean
  isCreatePage: boolean
  onRemoveRows: (ids: string[]) => void
}

const noWrap = { whiteSpace: 'nowrap' as const }

const COLUMNS = [
  { key: 'tripId', label: 'Trip ID', _style: noWrap },
  { key: 'fuelOrderId', label: 'Fuel Order ID', _style: noWrap },
  { key: 'formattedDateScheduled', label: 'Date', _style: noWrap },
  { key: 'gasStationReceiptTransactionId', label: 'Receipt ID', _style: noWrap },
  { key: 'gasStationReceiptDocumentNo', label: 'Doc No.', _style: noWrap },
  { key: 'statementId', label: 'Statement ID', _style: noWrap },
  { key: 'assetType', label: 'Asset Type', _style: noWrap },
  { key: 'orderType', label: 'Order Type', _style: noWrap },
  { key: 'internalSupplier', label: 'Internal Supplier', _style: noWrap },
  { key: 'series', label: 'Series', _style: noWrap },
  { key: 'client', label: 'Client', _style: noWrap },
  { key: 'city', label: 'City', _style: noWrap },
  { key: 'station', label: 'Station', _style: noWrap },
  { key: 'fuelType', label: 'Fuel Type', _style: noWrap },
  { key: 'fuelRequestLiters', label: 'Req. Liters', _style: noWrap },
  { key: 'gsReceiptFuelSuppliedLiters', label: 'Supplied Liters', _style: noWrap },
  { key: 'fuelPrice', label: 'Price/Liter', _style: noWrap },
  { key: 'lempTotal', label: 'FO Total Lps', _style: noWrap },
  { key: 'gsReceiptLempTotal', label: 'GS Total Lps', _style: noWrap },
]

const PreviewTable: React.FC<PreviewTableProps> = ({ rows, deducted, isCreatePage, onRemoveRows }) => {
  const canDelete = permissionService.checkPermission(MODULE_SUBDIVISION_FUEL_STATEMENT, DELETE)
  const allowDelete = isCreatePage || (canDelete && !deducted)
  const [selectedItems, setSelectedItems] = useState<InvoiceLine[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const prevRowCount = useRef(rows.length)

  useEffect(() => {
    if (rows.length !== prevRowCount.current) {
      setSelectedItems([])
      prevRowCount.current = rows.length
    }
  }, [rows.length])

  const handleSelectedItemsChange = useCallback((items: any[]) => {
    const rowIds = new Set(rows.map(r => r.id))
    setSelectedItems((items as InvoiceLine[]).filter(i => rowIds.has(i.id)))
  }, [rows])

  const handleRemove = () => {
    onRemoveRows(selectedItems.map((item) => item.id))
    setSelectedItems([])
    setConfirmDelete(false)
  }

  return (
    <div>
      {/* Bulk action bar */}
      {allowDelete && selectedItems.length > 0 && (
        <div className="d-flex align-items-center gap-3 p-2 mb-2 rounded" style={{ background: 'var(--cui-danger-bg-subtle, #fde8e8)' }}>
          <CBadge color="danger" shape="rounded-pill" className="px-3 py-2">
            {selectedItems.length} selected
          </CBadge>
          <CButton color="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <CIcon icon={cilTrash} size="sm" className="me-1" /> Remove Selected
          </CButton>
        </div>
      )}

      <CSmartTable
        items={rows}
        columns={COLUMNS}
        columnFilter
        columnSorter
        itemsPerPage={15}
        itemsPerPageOptions={[10, 15, 25, 50]}
        itemsPerPageLabel="Per page:"
        pagination
        selectable={allowDelete}
        selectAll={allowDelete}
        selected={selectedItems}
        onSelectedItemsChange={handleSelectedItemsChange}
        tableProps={{ responsive: true, striped: true, hover: true, bordered: true }}
        scopedColumns={{
          fuelPrice: (item: InvoiceLine) => <td>{item.fuelPrice?.toFixed(4)}</td>,
          fuelRequestLiters: (item: InvoiceLine) => <td>{item.fuelRequestLiters?.toFixed(2)}</td>,
          gsReceiptFuelSuppliedLiters: (item: InvoiceLine) => <td>{item.gsReceiptFuelSuppliedLiters?.toFixed(4)}</td>,
          lempTotal: (item: InvoiceLine) => <td>{item.lempTotal?.toFixed(4)}</td>,
          gsReceiptLempTotal: (item: InvoiceLine) => <td>{item.gsReceiptLempTotal?.toFixed(4)}</td>,
        }}
      />

      {/* Totals Footer */}
      {rows.length > 0 && (
        <div className="border-top pt-3 mt-2">
          <div className="d-flex flex-column align-items-end gap-1" style={{ fontSize: '0.9rem' }}>
            <div><strong>Fuel Order Total Lps:</strong> <span className="text-primary ms-2">{rows.reduce((s, r) => s + (r.lempTotal ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div><strong>Gas Station Receipt Total Lps:</strong> <span className="ms-2">{rows.reduce((s, r) => s + (r.gsReceiptLempTotal ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div><strong>Fuel Order Total $:</strong> <span className="text-success ms-2">{rows.reduce((s, r) => s + (r.dollarTotal ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div><strong>Gas Station Receipt Total $:</strong> <span className="ms-2">{rows.reduce((s, r) => s + (r.gsReceiptDollarTotal ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div><strong>Total Invoices:</strong> <span className="ms-2">{rows.length}</span></div>
          </div>
        </div>
      )}

      <ConfirmationModal
        visible={confirmDelete}
        title="Remove Invoice Lines"
        message={`Remove ${selectedItems.length} selected invoice line(s) from this statement?`}
        onConfirm={handleRemove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

export default PreviewTable
