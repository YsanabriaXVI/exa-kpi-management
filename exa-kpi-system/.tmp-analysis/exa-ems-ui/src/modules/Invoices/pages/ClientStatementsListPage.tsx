import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilPlus, cilOptions, cilLibrary, cilTrash, cilFilter } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../store'
import { loadInvoices, deleteInvoice } from '../store/invoices.slice'
import type { Invoice } from '../types'
import { permissionService, CREATE, UPDATE } from '../../../services/auth/permission.service'
import './ClientStatementsListPage.scss'

import { MODULE_INVOICE } from '../../../constants/modules'

const ClientStatementsListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { list = [], loading } = useSelector((state: RootState) => (state as any).invoices || {})

  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<number | string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<number | string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'invoice_id',
    'client_name',
    'format_name',
    'invoicenumber',
    'trip_count',
    'inv_total_km_display',
    'inv_total_rate_km_lps_display',
    'inv_total_km_rate_d_display',
    'inv_othercharges_display',
    'inv_subtotal_display',
    'inv_tax_display',
    'currencyrate',
    'inv_final_total_display',
    'status_display',
    'create_date_display',
  ])

  const canCreate = permissionService.checkPermission(MODULE_INVOICE, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_INVOICE, UPDATE)
  const canDelete = canUpdate

  useEffect(() => {
    dispatch(loadInvoices())
  }, [dispatch])

  const columns = [
    { key: 'invoice_id', label: 'ID', sorter: true, filter: true },
    { key: 'client_name', label: 'Client', sorter: true, filter: true },
    { key: 'format_name', label: 'Format', sorter: true, filter: true },
    { key: 'invoicenumber', label: 'Ref #', sorter: true, filter: true },
    { key: 'trips_count', label: 'Trips #', sorter: true, filter: true },
    { key: 'inv_total_km_display', label: 'Total Kms', sorter: true, filter: true },
    { key: 'inv_total_rate_km_lps_display', label: 'Total Km/Rate Lps', sorter: true, filter: true },
    { key: 'inv_total_km_rate_d_display', label: 'Total Km/Rate $', sorter: true, filter: true },
    { key: 'inv_othercharges_display', label: 'Other Charges', sorter: true, filter: true },
    { key: 'inv_subtotal_display', label: 'Sub Total', sorter: true, filter: true },
    { key: 'inv_tax_display', label: 'Total Taxes', sorter: true, filter: true },
    { key: 'currencyrate', label: 'Rate', sorter: true, filter: true },
    { key: 'inv_final_total_display', label: 'Total', sorter: true, filter: true },
    { key: 'status_display', label: 'Status', sorter: true, filter: true },
    { key: 'create_date_display', label: 'Date', sorter: true, filter: true },
    { key: 'actions', label: 'Actions' },
  ]

  const tableItems = useMemo(() => {
    return (list as Invoice[]).map((item) => {
      const fmt = (raw: any, formatted: any) => {
        if (formatted !== undefined && formatted !== null && formatted !== '') return formatted
        if (raw !== undefined && raw !== null && raw !== '') return raw
        return '—'
      }
      const money = (val: any, formatted: any) => {
        const base = formatted ?? val
        if (base === null || base === undefined || base === '') return '—'
        const num = Number(base)
        if (!isNaN(num)) {
          return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
        return base
      }
      const paid = item.payment_module || item.pay_module_id
      const status_display = paid ? 'Paid' : 'Not Paid'
      const createDate = item.create_date_format
        ? item.create_date_format
        : item.create_date
        ? new Date(Number(item.create_date) * 1000).toLocaleDateString()
        : '—'
      return {
        ...item,
        inv_total_km_display: item.inv_total_km ?? '—',
        inv_total_rate_km_lps_display: money(item.inv_total_rate_km_lps, item.inv_total_rate_km_lps_format),
        inv_total_km_rate_d_display: money(item.inv_total_km_rate_d, item.inv_total_km_rate_d_format),
        inv_othercharges_display: money(item.inv_othercharges, item.inv_othercharges_format),
        inv_subtotal_display: money(item.inv_subtotal, item.inv_subtotal_format),
        inv_tax_display: money(item.inv_tax, item.inv_tax_format),
        inv_final_total_display: money(item.inv_final_total, item.inv_final_total_format),
        status_display,
        create_date_display: createDate,
      }
    })
  }, [list])

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return tableItems
    return (tableItems as any[]).filter((item: any) =>
      [
        item.invoice_id,
        item.client_name,
        item.format_name,
        item.currencyrate,
        item.inv_final_total_display,
        item.inv_total_rate_km_lps_display,
        item.inv_total_km_rate_d_display,
        item.inv_othercharges_display,
        item.inv_subtotal_display,
        item.inv_tax_display,
        item.inv_total_km_display,
        item.invoicenumber,
        item.trip_count,
        item.status_display,
        item.create_date_display,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    )
  }, [tableItems, searchTerm])

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key as string) || col.key === 'invoice_id'
  )

  const scopedColumns = {
    invoice_id: (item: any) => (
      <td>
        <CBadge color="primary" shape="rounded-pill">
          {item.invoice_id}
        </CBadge>
      </td>
    ),
    status_display: (item: any) => (
      <td>
        <CBadge color={String(item.status_display || '').toLowerCase().includes('paid') ? 'success' : 'secondary'}>
          {item.status_display || '—'}
        </CBadge>
      </td>
    ),
    actions: (item: any) => (
      <td className="text-nowrap">
        <CButton
          color="info"
          variant="ghost"
          size="sm"
          className="me-2"
          onClick={() => navigate(`/operations/client-statements/${item.invoice_id}?mode=view`)}
          title="View"
        >
          <CIcon icon={cilFilter} />
        </CButton>
        {canUpdate && (
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            className="me-2"
            onClick={() => navigate(`/operations/client-statements/${item.invoice_id}`)}
            title="Edit"
          >
            <CIcon icon={cilPencil} />
          </CButton>
        )}
        {canDelete && (
          <CButton
            color="danger"
            variant="ghost"
            size="sm"
            disabled={deletingId === item.invoice_id}
            onClick={() => setPendingDelete(item.invoice_id)}
            title="Delete"
          >
            {deletingId === item.invoice_id ? <span className="spinner-border spinner-border-sm" /> : <CIcon icon={cilTrash} />}
          </CButton>
        )}
      </td>
    ),
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
        <PageHero
          kicker="Operations"
          icon={cilLibrary}
          title="Client Statements"
          subtitle="Manage client statements with a clean, compact table."
          actions={
            canCreate ? (
              <CButton color="primary" className="text-white" onClick={() => navigate('/operations/client-statements/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                New Statement
              </CButton>
            ) : undefined
          }
        />
        <CCard className="shadow-sm border-0">
          <CCardBody>
            <CRow className="mb-3 align-items-center">
              <CCol xs={12} md={6} lg={4} className="mb-2 mb-md-0">
                <CFormInput
                  type="text"
                  placeholder="Search statements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search client statements"
                  size="sm"
                />
              </CCol>
              <CCol xs="auto" className="ms-auto d-flex align-items-center gap-2">
                <span className="text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
                <CDropdown direction="dropup">
                  <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
                    {itemsPerPage}
                  </CDropdownToggle>
                  <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
                    {[5, 10, 20, 50, 100].map((n) => (
                      <CDropdownItem
                        key={n}
                        active={n === itemsPerPage}
                        onClick={() => setItemsPerPage(n)}
                        style={{ padding: '0.5rem 1.25rem', cursor: 'pointer' }}
                      >
                        {n}
                      </CDropdownItem>
                    ))}
                  </CDropdownMenu>
                </CDropdown>
                <CDropdown>
                  <CDropdownToggle color="secondary" variant="outline">
                    <CIcon icon={cilOptions} className="me-2" />
                    Visible Columns ({visibleColumns.length})
                  </CDropdownToggle>
                  <CDropdownMenu className="column-selector-dropdown p-3">
                    <small className="text-body-secondary fw-semibold d-block mb-2">Select columns to display</small>
                    {columns
                      .filter((col) => col.key !== 'actions' && col.key !== 'invoice_id')
                      .map((col) => (
                        <div key={col.key as string} className="form-check py-1">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`invoice-col-${col.key}`}
                            checked={visibleColumns.includes(col.key as string)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setVisibleColumns([...visibleColumns, col.key as string])
                              } else if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={`invoice-col-${col.key}`}>
                            {col.label}
                          </label>
                        </div>
                      ))}
                  </CDropdownMenu>
                </CDropdown>
              </CCol>
            </CRow>

            <div className="table-responsive mt-3" style={{ fontSize: '0.85rem' }}>
              <CSmartTable
                items={filteredItems}
                columns={activeColumns as any}
                itemsPerPage={itemsPerPage}
                itemsPerPageSelect={false}
                pagination
                columnFilter
                columnSorter
                loading={loading}
                scopedColumns={scopedColumns}
                sorterValue={{ column: 'invoice_id', state: 'desc' }}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'align-middle',
                  style: { whiteSpace: 'nowrap' },
                }}
              />
            </div>
          </CCardBody>
        </CCard>
        </CCol>
      </CRow>
      <CModal alignment="center" visible={pendingDelete !== null} onClose={() => setPendingDelete(null)}>
        <CModalHeader closeButton>
          <CModalTitle>Delete Statement</CModalTitle>
        </CModalHeader>
        <CModalBody>Are you sure you want to delete client statement #{pendingDelete}?</CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setPendingDelete(null)}>
            Cancel
          </CButton>
          <CButton
            color="danger"
            className="text-white"
            disabled={deletingId !== null}
            onClick={() => {
              if (!pendingDelete) return
              setDeletingId(pendingDelete)
              dispatch(deleteInvoice(pendingDelete))
                .unwrap()
                .catch(() => {
                  // leave list unchanged on failure
                })
                .finally(() => {
                  setDeletingId(null)
                  setPendingDelete(null)
                })
            }}
          >
            Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default ClientStatementsListPage
