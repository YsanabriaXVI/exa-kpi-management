import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CRow,
  CCol,
  CFormSelect,
  CFormCheck,
  CSmartTable,
} from '@coreui/react-pro'
import '../styles/DepotDisplay.css'

import ConfirmDialog from 'src/components/ConfirmationModal'

type ProratedOption = '1' | '2'

export interface RentalInvoiceRow {
  id: string
  depotId: number
  depot: string
  comboLabel?: string
  dateOut?: string
  dateIn?: string
  billingRange?: string
  chassisNo?: string | null
  containerNo?: string | null
  gensetNo?: string | null
  periodLabel?: string
  comboPrice?: number
  proratedLabel?: string
  proratedOptionId?: number
  prorated?: number
  duration?: number
  total?: number
  subtotal?: number
  taxes?: number
  [key: string]: unknown
}

interface TotalsRow {
  USD: string
  LPS: string
}

interface SwalOptions {
  title: string
  text: string
  type?: string
  showCancelButton?: boolean
  confirmButtonText?: string
  cancelButtonText?: string
  onConfirm?: () => void
}

interface PendingDelete {
  tableKey: string
  tableIndex: number
  depotName: string
  selectedIds: string[]
}

interface RentalInvoicesTableProps {
  data: RentalInvoiceRow[][]
  exchangeRate: number | string
  handleChange: (
    event: React.ChangeEvent<HTMLSelectElement>,
    field: string,
    tableIndex: number,
    rowIndex: number
  ) => void
  onDeleteItems: (tableKey: string, selectedIds: Array<string | number>) => void
  swal: (options: SwalOptions) => void
  isEdit: boolean
}

const RentalInvoicesTable: React.FC<RentalInvoicesTableProps> = ({
  data,
  exchangeRate,
  handleChange,
  onDeleteItems,
  isEdit,
}) => {
  const [totals, setTotals] = useState<TotalsRow[]>([])
  const [subtotals, setSubtotals] = useState<string[]>([])
  const [taxes, setTaxes] = useState<string[]>([])

  const [selectedIdsByTable, setSelectedIdsByTable] = useState<
    Record<string, string[]>
  >({})

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  const numericExchangeRate = Number(exchangeRate) || 0

  useEffect(() => {
    const totalsArr: TotalsRow[] = data.map((dataset) => {
      let usd = 0
      let lps = 0

      dataset.forEach((item) => {
        const total = Number(item.total) || 0
        usd += total
      })

      const formattedTotalUSD = usd.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      const roundedUSD = Math.round(usd * 100) / 100

      lps = roundedUSD * numericExchangeRate;
      
      const formattedTotalLPS = lps.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      return {
        USD: formattedTotalUSD,
        LPS: formattedTotalLPS, 
      }
    })

    const subtotalsArr: number[] = data.map((dataset) => {
      let subtotal = 0

      dataset.forEach((item) => {
        const total = Number(item.subtotal) || 0
        subtotal += total
      })

      return subtotal
    })

    const taxesArr: number[] = data.map((dataset) => {
      let tax = 0

      dataset.forEach((item) => {
        const total = Number(item.taxes) || 0
        tax += total
      })

      return tax
    })

    const formattedSubtotals = subtotalsArr.map((subtotal) =>
      subtotal.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )

    const formattedTaxes = taxesArr.map((tax) =>
      tax.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )

    setTotals(totalsArr)
    setSubtotals(formattedSubtotals)
    setTaxes(formattedTaxes)
  }, [data, numericExchangeRate])

  useEffect(() => {
    const availableIdsByTable = new Map<string, Set<string>>()

    data.forEach((dataArr, tableIndex) => {
      if (!dataArr?.length) return

      const tableKey = `${dataArr[0].depotId}-${tableIndex}`

      availableIdsByTable.set(
        tableKey,
        new Set(dataArr.map((row) => String(row.id)))
      )
    })

    setSelectedIdsByTable((prev) => {
      let changed = false
      const next: Record<string, string[]> = {}

      Object.entries(prev).forEach(([tableKey, selectedIds]) => {
        const availableIds = availableIdsByTable.get(tableKey)

        if (!availableIds) {
          changed = true
          return
        }

        const filteredIds = selectedIds.filter((id) => availableIds.has(id))

        next[tableKey] = filteredIds

        if (filteredIds.length !== selectedIds.length) {
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [data])

  const toggleSelectedId = (
    tableKey: string,
    id: string,
    checked: boolean
  ) => {
    if (isEdit) return

    setSelectedIdsByTable((prev) => {
      const currentSelected = prev[tableKey] || []

      return {
        ...prev,
        [tableKey]: checked
          ? currentSelected.includes(id)
            ? currentSelected
            : [...currentSelected, id]
          : currentSelected.filter((selectedId) => selectedId !== id),
      }
    })
  }

  const toggleSelectAll = (
    tableKey: string,
    checked: boolean,
    allRowIds: string[]
  ) => {
    if (isEdit) return

    setSelectedIdsByTable((prev) => ({
      ...prev,
      [tableKey]: checked ? allRowIds : [],
    }))
  }

  const handleShowConfirm = (
    tableKey: string,
    tableIndex: number,
    depotName: string
  ) => {
    const selectedIds = selectedIdsByTable[tableKey] || []

    setPendingDelete({
      tableKey,
      tableIndex,
      depotName,
      selectedIds,
    })

    setModalMessage(
      `Are you sure you want to delete (${selectedIds.length}) invoice${
        selectedIds.length > 1 ? 's' : ''
      } from ${depotName}?`
    )

    setShowConfirmDialog(true)
  }

  const handleConfirmDelete = () => {
    if (!pendingDelete) return

    onDeleteItems(pendingDelete.tableKey, pendingDelete.selectedIds)

    setSelectedIdsByTable((prev) => ({
      ...prev,
      [pendingDelete.tableKey]: [],
    }))

    setShowConfirmDialog(false)
    setModalMessage('')
    setPendingDelete(null)
  }
  

  const handleCloseConfirmDialog = () => {
    setShowConfirmDialog(false)
    setModalMessage('')
    setPendingDelete(null)
  }

  const renderProratedSelect = (
    item: RentalInvoiceRow,
    tableIndex: number,
    rowIndex: number
  ) => {
    const value: ProratedOption = Number(item.prorated) === 0 ? '2' : '1'

    return (
      <CFormSelect
        value={value}
        onChange={(e) => handleChange(e, 'proratedLabel', tableIndex, rowIndex)}
        disabled={isEdit}
        options={[
          { label: 'Prorated', value: '1' },
          { label: 'Not Prorated', value: '2' },
        ]}
      />
    )
  }

  return (
    <div>
      <CCard>
        <CCardHeader>
          <strong>Rental Invoices Preview</strong>
        </CCardHeader>

        <CCardBody>
          {data.map((dataArr, tableIndex) => {
            if (!dataArr?.length) return null

            const tableId = dataArr[0].depotId
            const tableKey = `${tableId}-${tableIndex}`
            const depotName = dataArr[0].depot

            const selectedIds = selectedIdsByTable[tableKey] || []
            const selectedIdSet = new Set(selectedIds)

            const items = dataArr.map((row, rowIndex) => ({
              ...row,
              rowId: String(row.id),
              comboPrice:
                typeof row.comboPrice === 'number'
                  ? row.comboPrice.toLocaleString()
                  : row.comboPrice,
              total:
                typeof row.total === 'number'
                  ? row.total.toLocaleString()
                  : row.total,
              _rowIndex: rowIndex,
            }))

            const allRowIds = items.map((item) => item.rowId)

            const allSelected =
              allRowIds.length > 0 &&
              allRowIds.every((id) => selectedIdSet.has(id))

            const columns = [
              ...(!isEdit
                ? [
                    {
                      key: 'select',
                      label: '',
                      _style: { width: '40px' },
                      filter: false,
                      sorter: false,
                    },
                  ]
                : []),
              {
                key: 'comboLabel',
                label: 'Rental Combo',
                sorter: true,
                filter: true,
              },
              {
                key: 'dateOut',
                label: 'Date Out',
                sorter: true,
                filter: true,
              },
              {
                key: 'dateIn',
                label: 'Date In',
                sorter: true,
                filter: true,
              },
              {
                key: 'billingRange',
                label: 'Billing Range',
                sorter: true,
                filter: true,
              },
              {
                key: 'chassisNo',
                label: 'Chassis #',
                sorter: true,
                filter: true,
              },
              {
                key: 'containerNo',
                label: 'Container #',
                sorter: true,
                filter: true,
              },
              {
                key: 'gensetNo',
                label: 'Genset #',
                sorter: true,
                filter: true,
              },
              {
                key: 'comboPriceLabel',
                label: 'Combo Price',
                sorter: true,
                filter: true,
              },
              {
                key: 'proratedLabel',
                label: 'Closing',
                sorter: false,
                filter: false,
              },
              {
                key: 'durationLabel',
                label: 'Duration',
                sorter: true,
                filter: true,
              },
              {
                key: 'lineTotal',
                label: 'Total',
                sorter: true,
                filter: true,
              },
            ]

            return (
              <div key={tableKey} className="depot-container">
                <h5>Depot: {depotName}</h5>

                {!isEdit && items.length > 0 && (
                  <CRow className="mb-2">
                    <CCol className="text-start">
                      <CFormCheck
                        id={`select-all-${tableKey}`}
                        checked={allSelected}
                        onChange={(e) =>
                          toggleSelectAll(
                            tableKey,
                            e.target.checked,
                            allRowIds
                          )
                        }
                      />
                    </CCol>
                  </CRow>
                )}

                <CSmartTable
                  items={items}
                  columns={columns}
                  tableProps={{
                    hover: true,
                    responsive: true,
                    striped: true,
                    className: 'text-center',
                  }}
                  columnFilter
                  columnSorter
                  itemsPerPage={10}
                  pagination
                  scopedColumns={{
                    select: (item: any) => {
                      if (isEdit) return <td />

                      return (
                        <td>
                          <CFormCheck
                            checked={selectedIdSet.has(item.rowId)}
                            disabled={isEdit}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              toggleSelectedId(
                                tableKey,
                                item.rowId,
                                e.target.checked
                              )
                            }
                          />
                        </td>
                      )
                    },

                    proratedLabel: (item: any) => (
                      <td>
                        {renderProratedSelect(
                          item as RentalInvoiceRow,
                          tableIndex,
                          item._rowIndex
                        )}
                      </td>
                    ),
                  }}
                />

                {selectedIds.length > 0 && (
                  <CRow className="mb-3 mt-2">
                    <CCol className="text-start">
                      <CButton
                        color="danger"
                        onClick={() =>
                          handleShowConfirm(tableKey, tableIndex, depotName)
                        }
                      >
                        Delete Selected ({selectedIds.length}) on {depotName}
                      </CButton>
                    </CCol>
                  </CRow>
                )}

                <div className="summary-footer">
                  <div className="summary">
                    <p>
                      <b>Subtotal: </b>$ {subtotals[tableIndex] || 0}
                    </p>

                    <p>
                      <b>Taxes: </b>$ {taxes[tableIndex] || 0}
                    </p>

                    <p>
                      <b>Total USD: </b>
                      <strong className="summary-total">
                        $ {totals[tableIndex]?.USD || 0}
                      </strong>
                    </p>

                    <p>
                      <b>Total Lps: </b>
                      <strong className="summary-total-lps">
                        L. {totals[tableIndex]?.LPS || 0}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            )
          })}

          <ConfirmDialog
            visible={showConfirmDialog}
            message={modalMessage}
            onClose={handleCloseConfirmDialog}
            onConfirm={handleConfirmDelete}
          />
        </CCardBody>
      </CCard>
    </div>
  )
}

export default RentalInvoicesTable