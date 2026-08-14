import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  CPagination,
  CPaginationItem,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilPlus, cilOptions, cilLibrary, cilTrash, cilChevronLeft, cilChevronRight, cilFilter } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../store'
import { loadStatementsPaginated, deleteStatement } from '../store/subdivisionStatements.slice'
import type { SubdivisionStatement } from '../types'
import { permissionService, CREATE, UPDATE } from '../../../services/auth/permission.service'

import { MODULE_SUBDIVISION } from '../../../constants/modules'

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

const SubdivisionStatementsListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { list = [], total = 0, loading } = useSelector((state: RootState) => (state as any).subdivisionStatements || {})

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [deletingId, setDeletingId] = useState<number | string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<number | string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'paymentId',
    'subdivision_name',
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

  const canCreate = permissionService.checkPermission(MODULE_SUBDIVISION, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_SUBDIVISION, UPDATE)
  const canDelete = canUpdate

  // Debounce search to avoid hammering the API on every keystroke
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 400)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchTerm])

  // Fetch data from backend whenever page, limit, or search changes
  const fetchStatements = useCallback(() => {
    const offset = (currentPage - 1) * itemsPerPage
    dispatch(loadStatementsPaginated({ limit: itemsPerPage, offset, search: debouncedSearch || undefined }))
  }, [dispatch, currentPage, itemsPerPage, debouncedSearch])

  useEffect(() => {
    fetchStatements()
  }, [fetchStatements])

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))

  const columns = [
    { key: 'paymentId', label: 'ID', sorter: true, filter: false },
    { key: 'subdivision_name', label: 'Subdivision', sorter: true, filter: false },
    { key: 'format_name', label: 'Format', sorter: true, filter: false },
    { key: 'invoicenumber', label: 'Ref #', sorter: true, filter: false },
    { key: 'trip_count', label: 'Trips #', sorter: true, filter: false },
    { key: 'inv_total_km_display', label: 'Total Kms', sorter: true, filter: false },
    { key: 'inv_total_rate_km_lps_display', label: 'Total Km/Rate Lps', sorter: true, filter: false },
    { key: 'inv_total_km_rate_d_display', label: 'Total Km/Rate $', sorter: true, filter: false },
    { key: 'inv_othercharges_display', label: 'Other Charges', sorter: true, filter: false },
    { key: 'inv_subtotal_display', label: 'Sub Total', sorter: true, filter: false },
    { key: 'inv_tax_display', label: 'Total Taxes', sorter: true, filter: false },
    { key: 'currencyrate', label: 'Rate', sorter: true, filter: false },
    { key: 'inv_final_total_display', label: 'Total', sorter: true, filter: false },
    { key: 'status_display', label: 'Status', sorter: true, filter: false },
    { key: 'create_date_display', label: 'Date', sorter: true, filter: false },
    { key: 'actions', label: 'Actions' },
  ]

  const tableItems = useMemo(() => {
    return (list as SubdivisionStatement[]).map((item) => {
      const money = (val: any, formatted: any) => {
        const base = formatted ?? val
        if (base === null || base === undefined || base === '') return '—'
        const num = Number(base)
        if (!isNaN(num)) {
          return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
        return base
      }
      const statusId = Number(item.statusid) || 0
      const paid = item.payment_module || item.pay_module_id
      const status_display = statusId === 4 ? 'Paid' : statusId === 3 ? 'Assigned' : statusId === 2 ? 'Ready' : paid ? 'Paid' : 'Open'
      const createDate = item.create_date_format
        ? item.create_date_format
        : item.create_date
        ? new Date(Number(item.create_date) * 1000).toLocaleDateString()
        : '—'

      const paymentId = item.paymentId ?? item.id

      return {
        ...item,
        paymentId,
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

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key as string) || col.key === 'paymentId'
  )

  const scopedColumns = {
    paymentId: (item: any) => (
      <td>
        <CBadge
          color="primary"
          shape="rounded-pill"
          role="button"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/operations/subdivision-statements/${item.paymentId}`)}
        >
          {item.paymentId}
        </CBadge>
      </td>
    ),
    status_display: (item: any) => {
      const label = item.status_display || '—'
      const colorMap: Record<string, string> = { Paid: 'success', Assigned: 'info', Ready: 'warning', Open: 'secondary' }
      return (
        <td>
          <CBadge color={colorMap[label] || 'secondary'}>
            {label}
          </CBadge>
        </td>
      )
    },
    actions: (item: any) => (
      <td className="text-nowrap">
        <CButton
          color="info"
          variant="ghost"
          size="sm"
          className="me-2"
          onClick={() => navigate(`/operations/subdivision-statements/${item.paymentId}?mode=view`)}
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
            onClick={() => navigate(`/operations/subdivision-statements/${item.paymentId}`)}
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
            disabled={deletingId === item.paymentId}
            onClick={() => setPendingDelete(item.paymentId)}
            title="Delete"
          >
            {deletingId === item.paymentId ? <span className="spinner-border spinner-border-sm" /> : <CIcon icon={cilTrash} />}
          </CButton>
        )}
      </td>
    ),
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
        <PageHero
          kicker="Operations"
          icon={cilLibrary}
          title="Subdivision Statements"
          subtitle="Manage subdivision statements with a clean, compact table."
          actions={
            canCreate ? (
              <CButton color="primary" className="text-white" onClick={() => navigate('/operations/subdivision-statements/new')}>
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
                  aria-label="Search subdivision statements"
                  size="sm"
                />
              </CCol>
              <CCol xs="auto" className="ms-auto">
                <CDropdown>
                  <CDropdownToggle color="secondary" variant="outline">
                    <CIcon icon={cilOptions} className="me-2" />
                    Visible Columns ({visibleColumns.length})
                  </CDropdownToggle>
                  <CDropdownMenu className="column-selector-dropdown p-3">
                    <small className="text-body-secondary fw-semibold d-block mb-2">Select columns to display</small>
                    {columns
                      .filter((col) => col.key !== 'actions' && col.key !== 'paymentId')
                      .map((col) => (
                        <div key={col.key as string} className="form-check py-1">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`statement-col-${col.key}`}
                            checked={visibleColumns.includes(col.key as string)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setVisibleColumns([...visibleColumns, col.key as string])
                              } else if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={`statement-col-${col.key}`}>
                            {col.label}
                          </label>
                        </div>
                      ))}
                  </CDropdownMenu>
                </CDropdown>
              </CCol>
            </CRow>

            <div className="mt-3" style={{ fontSize: '0.85rem' }}>
              <CSmartTable
                items={tableItems}
                columns={activeColumns as any}
                itemsPerPage={tableItems.length || itemsPerPage}
                pagination={false}
                columnSorter
                loading={loading}
                scopedColumns={scopedColumns}
                sorterValue={{ column: 'paymentId', state: 'desc' }}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'align-middle',
                  style: { whiteSpace: 'nowrap' },
                }}
              />
            </div>

            {/* Server-side pagination controls */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
                <CDropdown direction="dropup">
                  <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
                    {itemsPerPage}
                  </CDropdownToggle>
                  <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
                    {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                      <CDropdownItem
                        key={n}
                        active={n === itemsPerPage}
                        onClick={() => { setItemsPerPage(n); setCurrentPage(1) }}
                        style={{ padding: '0.5rem 1.25rem', cursor: 'pointer' }}
                      >
                        {n}
                      </CDropdownItem>
                    ))}
                  </CDropdownMenu>
                </CDropdown>
                <small className="text-body-secondary">
                  of {total} statements
                </small>
              </div>

              <CPagination align="center" aria-label="Page navigation" className="mb-0">
                <CPaginationItem
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <CIcon icon={cilChevronLeft} />
                </CPaginationItem>
                {getPageNumbers().map((page, idx) =>
                  page === '...' ? (
                    <CPaginationItem key={`ellipsis-${idx}`} disabled>...</CPaginationItem>
                  ) : (
                    <CPaginationItem
                      key={page}
                      active={page === currentPage}
                      onClick={() => setCurrentPage(page as number)}
                      disabled={loading}
                    >
                      {page}
                    </CPaginationItem>
                  )
                )}
                <CPaginationItem
                  disabled={currentPage === totalPages || loading}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <CIcon icon={cilChevronRight} />
                </CPaginationItem>
              </CPagination>
            </div>
          </CCardBody>
        </CCard>
        </CCol>
      </CRow>
      <CModal alignment="center" visible={pendingDelete !== null} onClose={() => setPendingDelete(null)}>
        <CModalHeader closeButton>
          <CModalTitle>Delete Statement</CModalTitle>
        </CModalHeader>
        <CModalBody>Are you sure you want to delete subdivision statement #{pendingDelete}?</CModalBody>
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
              dispatch(deleteStatement(pendingDelete))
                .unwrap()
                .then(() => {
                  // Refresh current page after deletion
                  fetchStatements()
                })
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

export default SubdivisionStatementsListPage
