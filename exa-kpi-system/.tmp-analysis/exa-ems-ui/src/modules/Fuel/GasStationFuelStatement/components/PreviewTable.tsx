import React, { useState } from 'react'
import { CSmartTable, CButton } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'
import { MODULE_SUPPLIER_FUEL_STATEMENT } from '../../../../constants/modules'
import { permissionService, DELETE } from '../../../../services/auth/permission.service'
import ConfirmationModal from '../../../../components/ConfirmationModal'
import type { InvoiceLine } from '../types/gasStationFuelStatement.types'

interface PreviewTableProps {
  rows: InvoiceLine[]
  paid: boolean
  isCreatePage: boolean
  onRemoveRows: (ids: string[]) => void
}

const COLUMNS = [
  { key: 'select', label: '', _style: { width: '40px' }, filter: false, sorter: false },
  { key: 'tripId', label: 'Trip ID', _style: { minWidth: '80px' } },
  { key: 'fuelOrderId', label: 'Fuel Order ID', _style: { minWidth: '100px' } },
  { key: 'gasStationReceiptTransactionId', label: 'Receipt ID', _style: { minWidth: '90px' } },
  { key: 'gasStationReceiptDocumentNo', label: 'Doc No.', _style: { minWidth: '90px' } },
  { key: 'uploadSessionId', label: 'Upload Session', _style: { minWidth: '110px' } },
  { key: 'assetType', label: 'Asset Type', _style: { minWidth: '100px' } },
  { key: 'series', label: 'Series', _style: { minWidth: '80px' } },
  { key: 'client', label: 'Client', _style: { minWidth: '100px' } },
  { key: 'subdivision', label: 'Subdivision', _style: { minWidth: '100px' } },
  { key: 'orderType', label: 'Order Type', _style: { minWidth: '100px' } },
  { key: 'fuelType', label: 'Fuel Type', _style: { minWidth: '90px' } },
  { key: 'fuelRequestLiters', label: 'Req. Liters', _style: { minWidth: '100px' } },
  { key: 'gsReceiptFuelSuppliedLiters', label: 'Supplied Liters', _style: { minWidth: '110px' } },
  { key: 'fuelPrice', label: 'Price/Liter', _style: { minWidth: '90px' } },
  { key: 'lempTotal', label: 'FO Total Lps', _style: { minWidth: '100px' } },
  { key: 'gsReceiptLempTotal', label: 'GS Total Lps', _style: { minWidth: '100px' } },
]

const PreviewTable: React.FC<PreviewTableProps> = ({ rows, paid, isCreatePage, onRemoveRows }) => {
  const canDelete = permissionService.checkPermission(MODULE_SUPPLIER_FUEL_STATEMENT, DELETE)
  const allowDelete = isCreatePage || (canDelete && !paid)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleRemove = () => {
    onRemoveRows(Array.from(selectedIds))
    setSelectedIds(new Set())
    setConfirmDelete(false)
  }

  const foTotalLps = rows.reduce((s, r) => s + (r.lempTotal ?? 0), 0)
  const foTotalDollar = rows.reduce((s, r) => s + (r.dollarTotal ?? 0), 0)
  const gsTotalLps = rows.reduce((s, r) => s + (r.gsReceiptLempTotal ?? 0), 0)
  const gsTotalDollar = rows.reduce((s, r) => s + (r.gsReceiptDollarTotal ?? 0), 0)

  return (
    <div className="mt-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Invoice Lines ({rows.length})</h6>
        {allowDelete && selectedIds.size > 0 && (
          <CButton color="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <CIcon icon={cilTrash} size="sm" /> Remove Selected ({selectedIds.size})
          </CButton>
        )}
      </div>
      <CSmartTable
        items={rows}
        columns={COLUMNS}
        itemsPerPage={15}
        pagination
        tableProps={{ responsive: true, striped: true, hover: true, bordered: true, size: 'sm' }}
        scopedColumns={{
          select: (item: InvoiceLine) => (
            <td>{allowDelete && <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />}</td>
          ),
          fuelPrice: (item: InvoiceLine) => <td>{item.fuelPrice?.toFixed(4)}</td>,
          fuelRequestLiters: (item: InvoiceLine) => <td>{item.fuelRequestLiters?.toFixed(2)}</td>,
          gsReceiptFuelSuppliedLiters: (item: InvoiceLine) => <td>{item.gsReceiptFuelSuppliedLiters?.toFixed(4)}</td>,
          lempTotal: (item: InvoiceLine) => <td>{item.lempTotal?.toFixed(4)}</td>,
          gsReceiptLempTotal: (item: InvoiceLine) => <td>{item.gsReceiptLempTotal?.toFixed(4)}</td>,
        }}
      />
      <div className="border-top pt-2 mt-2">
        <div className="row text-end">
          <div className="col"><strong>FO Total Lps:</strong> {foTotalLps.toFixed(4)}</div>
          <div className="col"><strong>GS Total Lps:</strong> {gsTotalLps.toFixed(4)}</div>
          <div className="col"><strong>FO Total $:</strong> {foTotalDollar.toFixed(4)}</div>
          <div className="col"><strong>GS Total $:</strong> {gsTotalDollar.toFixed(4)}</div>
          <div className="col"><strong>Invoices:</strong> {rows.length}</div>
        </div>
      </div>
      <ConfirmationModal visible={confirmDelete} title="Remove Rows"
        message={`Remove ${selectedIds.size} selected invoice line(s)?`}
        onConfirm={handleRemove} onCancel={() => setConfirmDelete(false)} />
    </div>
  )
}

export default PreviewTable
