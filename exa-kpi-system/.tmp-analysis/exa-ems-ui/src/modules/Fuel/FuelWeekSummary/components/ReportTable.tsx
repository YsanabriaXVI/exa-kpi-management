import React from 'react'
import { CCard, CCardBody, CCardHeader, CSmartTable } from '@coreui/react-pro'
import { useNavigate } from 'react-router-dom'
import type { SummaryRow } from '../types/fuelWeekSummary.types'

interface ReportTableProps {
  data: SummaryRow[]
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatWeekDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

const COLUMNS = [
  { key: 'rowNum', label: '#', _style: { width: '50px' }, sorter: false, filter: false },
  { key: 'weekname', label: 'Week', _style: { minWidth: '100px' } },
  { key: 'fuelOrderId', label: 'Fuel Order ID', _style: { minWidth: '110px' } },
  { key: 'tripId', label: 'Trip ID', _style: { minWidth: '80px' } },
  { key: 'gasStation', label: 'Gas Station', _style: { minWidth: '140px' } },
  { key: 'client', label: 'Client', _style: { minWidth: '120px' } },
  { key: 'subdivision', label: 'Subdivision', _style: { minWidth: '120px' } },
  { key: 'internalSupplier', label: 'Internal Supplier', _style: { minWidth: '130px' } },
  { key: 'dateSchedule', label: 'Date Schedule', _style: { minWidth: '150px' } },
  { key: 'orderType', label: 'Order Type', _style: { minWidth: '110px' } },
  { key: 'assetType', label: 'Asset Type', _style: { minWidth: '100px' } },
  { key: 'plate', label: 'Plate', _style: { minWidth: '90px' } },
  { key: 'fuelRequestLtr', label: 'Fuel Req (L)', _style: { minWidth: '100px' } },
  { key: 'reconciliationStatus', label: 'Recon. Status', _style: { minWidth: '120px' } },
  { key: 'subdivision_payment_status', label: 'Fuel Stmt Status', _style: { minWidth: '130px' } },
  { key: 'gas_supplier_payment_status', label: 'GS Stmt Status', _style: { minWidth: '130px' } },
]

const ReportTable: React.FC<ReportTableProps> = ({ data }) => {
  const navigate = useNavigate()

  const uniqueWeeks = Array.from(
    new Map(data.map((r) => [r.weekno, r])).values(),
  )
  const weekSubtitle = uniqueWeeks
    .map((r) => `Week #${r.weekno} (${formatWeekDate(r.weekStartDate)} - ${formatWeekDate(r.weekEndDate)})`)
    .join(' | ')

  const itemsWithRowNum = data.map((item, i) => ({ ...item, rowNum: i + 1 }))

  return (
    <CCard>
      <CCardHeader>
        <strong>Week Summary Display</strong>
      </CCardHeader>
      <CCardBody>
        <h6>Week Summary</h6>
        {weekSubtitle && <p className="text-body-secondary" style={{ fontSize: '0.85rem' }}>{weekSubtitle}</p>}
        <div className="mb-2">
          <span className="badge bg-info">{data.length.toLocaleString()} results found</span>
        </div>
        <CSmartTable
          items={itemsWithRowNum}
          columns={COLUMNS}
          itemsPerPage={15}
          itemsPerPageSelect
          pagination
          sorter
          columnFilter
          tableProps={{ responsive: true, striped: true, hover: true, bordered: true, size: 'sm' }}
          scopedColumns={{
            fuelOrderId: (item: any) => (
              <td>
                <a
                  href={`/fuel/fuelorder/${item.fuelOrderId}`}
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/fuel/fuelorder/${item.fuelOrderId}`)
                  }}
                  className="text-primary"
                >
                  {item.fuelOrderId}
                </a>
              </td>
            ),
            dateSchedule: (item: any) => <td>{formatDate(item.dateSchedule)}</td>,
            fuelRequestLtr: (item: any) => <td>{item.fuelRequestLtr}</td>,
          }}
        />
      </CCardBody>
    </CCard>
  )
}

export default ReportTable
