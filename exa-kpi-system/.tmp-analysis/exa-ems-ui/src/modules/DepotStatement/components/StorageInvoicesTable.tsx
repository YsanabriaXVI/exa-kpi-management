import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CFormCheck,
  CRow,
  CSmartTable,
} from '@coreui/react-pro'
import '../styles/DepotDisplay.css'

import ConfirmDialog from 'src/components/ConfirmationModal'
import { StorageInvoiceDepotGroup } from '../types/storageStatement.types'

interface ServiceRow {
  id: string | number
  rowId: string
  depotId?: number
  depot?: string
  equipmentNumber?: string
  equipmentType?: string
  equipmentSize?: string | null
  sizeOrType?: string | null
  gensetType?: string | null
  gateCreateDate?: string
  job?: string
  billingCycles?: string
  daysToInvoice?: number | string
  freeDaysAvailable?: number | string
  totalDays?: number | string
  unitPrice?: number | string
  subtotal?: number | string
  taxRate?: number | string
  taxes?: number | string
  total?: number | string
  [key: string]: unknown
}

interface DeletedServiceItem {
  [key: string]: unknown
}

interface DepotDisplayProps {
  depotGroup: StorageInvoiceDepotGroup
  onAddDeletedItems: (items: DeletedServiceItem[]) => void
  exchangeRate: number
  onDeleteItems: (
    depotName: string,
    selectedIds: Array<string | number>
  ) => void
  isEdit: boolean
}

const DepotDisplay: React.FC<DepotDisplayProps> = ({
  depotGroup,
  exchangeRate,
  onDeleteItems,
  isEdit,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [modalMessage, setModalMessage] = useState('')

  const tableItems = useMemo<ServiceRow[]>(() => {
    if ("invoiceLines" in depotGroup === false) return [];
    return (depotGroup?.invoiceLines ?? []).map((line: any) => ({
      ...line,
      rowId: String(line.id),
      sizeOrType:
        line.equipmentType === 'Genset'
          ? line.gensetType
          : line.equipmentSize,
    }))
  }, [depotGroup.invoiceLines])

  const selectedIdSet = useMemo(() => {
    return new Set(selectedIds)
  }, [selectedIds])

  useEffect(() => {
    const availableIds = new Set(tableItems.map((item) => item.rowId))

    setSelectedIds((prev) => {
      const next = prev.filter((id) => availableIds.has(id))

      if (next.length === prev.length) {
        return prev
      }

      return next
    })
  }, [tableItems])

  /* const summary = useMemo(() => {
    return (depotGroup?.invoiceLines ?? []).reduce(
      (acc, line: any) => {
        acc.subtotal += Number(line.subtotal || 0)
        acc.taxes += Number(line.taxes || 0)
        acc.total += Number(line.total || 0)

        return acc
      },
      {
        subtotal: 0,
        taxes: 0,
        total: 0,
      }
    )
  }, [depotGroup.invoiceLines]) */

  const summary = useMemo(() => {
    const { invoiceLines: data  } = depotGroup
    if (!data) return {
      subtotal: 0,
      taxes: 0,
      totalUSD: 0,
      totalLPS: 0
    };
  
    const subtotalValue = data.reduce(
      (acc, invoiceLine) => acc + Number(invoiceLine.subtotal || 0),
      0
    )
  
    const taxesValue = data.reduce(
      (acc, invoiceLine) => acc + Number(invoiceLine.taxes || 0),
      0
    )
  
    const totalUSDValue = subtotalValue + taxesValue;
  
    const totalLpsValue = Math.round(totalUSDValue * 100) / 100 * Number(exchangeRate);
  
    return {
      subtotal: subtotalValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      taxes: taxesValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      totalUSD: totalUSDValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      totalLPS: totalLpsValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    }
  }, [depotGroup.invoiceLines])

  const columns = useMemo(
    () => [
      { key: 'select', label: '', sorter: false, filter: false },
      { key: 'equipmentNumber', label: 'Equipment No.', sorter: true, filter: true },
      { key: 'equipmentType', label: 'Equipment Type', sorter: true, filter: true },
      { key: 'sizeOrType', label: 'Size/Type', sorter: true, filter: true },
      { key: 'gateCreateDate', label: 'Date In', sorter: true, filter: true },
      { key: 'job', label: 'Charge Type', sorter: true, filter: true },
      { key: 'gateId', label: 'Gate ID', sorter: true, filter: true },
      { key: 'billingCycles', label: 'Billing Range', sorter: true, filter: true },
      { key: 'daysToInvoice', label: 'Days', sorter: true, filter: true },
      { key: 'freeDaysAvailable', label: 'Free Days', sorter: true, filter: true },
      { key: 'totalDays', label: 'Total Days', sorter: true, filter: true },
      { key: 'unitPrice', label: 'Unit Price', sorter: true, filter: true },
      { key: 'subtotal', label: 'Total', sorter: true, filter: true },
    ],
    []
  )

  const toggleSelectedId = (id: string, checked: boolean) => {
    if (isEdit) return

    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id]
      }

      return prev.filter((selectedId) => selectedId !== id)
    })
  }

  const handleShowConfirm = () => {
      setModalMessage(
        `You are about to delete ${selectedIds.length} invoices?`
      )
      setShowConfirmDialog(true)
    }

    const allRowIds = useMemo(() => {
    return tableItems.map((item) => item.rowId)
  }, [tableItems])

  const allSelected = useMemo(() => {
    return allRowIds.length > 0 && allRowIds.every((id) => selectedIdSet.has(id))
  }, [allRowIds, selectedIdSet])

  const toggleSelectAll = (checked: boolean) => {
    if (isEdit) return

    if (checked) {
      setSelectedIds(allRowIds)
    } else {
      setSelectedIds([])
    }
  }

  const handleConfirmDelete = () => {
    const idsToDelete = [...selectedIds]

    setSelectedIds([])
    setShowConfirmDialog(false)
    setModalMessage('')

    onDeleteItems(depotGroup.depotName, idsToDelete)
  }

  return (
    <div className="depot-container">
      <CCard className="mb-3">
        <CCardHeader className="equipment-header">
          Depot: {depotGroup.depotName}
        </CCardHeader>

        <CCardBody>
        {!isEdit && tableItems.length > 0 && (
          <CRow className="mb-2">
            <CCol className="text-start">
              <CFormCheck
                id={`select-all-${depotGroup.depotName}`}
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
              />
            </CCol>
          </CRow>
        )}

        <CSmartTable
          items={tableItems}
          columns={columns}
          tableProps={{
            hover: true,
            responsive: true,
            striped: true,
          }}
          columnFilter
          columnSorter
          pagination
          itemsPerPage={10}
          scopedColumns={{
            select: (item: ServiceRow) => ( isEdit ? <td></td> :
              <td>
                <CFormCheck
                  checked={selectedIdSet.has(item.rowId)}
                  disabled={isEdit}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    toggleSelectedId(item.rowId, e.target.checked)
                  }
                />
              </td>
            ),
          }}
        />

        {selectedIds.length > 0 && (
          <CRow className="mb-3 mt-2">
            <CCol className="text-start">
              <CButton color="danger" onClick={handleShowConfirm}>
                Delete Selected ({selectedIds.length}) on {depotGroup.depotName}
              </CButton>
            </CCol>
          </CRow>
        )}
      </CCardBody>
          <div className="summary-footer">
                  <div className="summary">
                    <p>
                      <b>Subtotal: </b>$ {summary.subtotal}
                    </p>

                    <p>
                      <b>Taxes: </b>$ {summary.taxes}
                    </p>

                    <p>
                      <b>Total USD: </b>
                      <strong className="summary-total">
                        $ {summary.totalUSD}
                      </strong>
                    </p>

                    <p>
                      <b>Total Lps: </b>
                      <strong className="summary-total-lps">
                        L. {summary.totalLPS}
                      </strong>
                    </p>
                  </div>
                </div>
      </CCard>

      <ConfirmDialog
        visible={showConfirmDialog}
        message={modalMessage}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default DepotDisplay