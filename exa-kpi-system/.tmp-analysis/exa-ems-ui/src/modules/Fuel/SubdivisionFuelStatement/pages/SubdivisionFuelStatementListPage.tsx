import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CBadge, CButton, CCard, CCardBody, CCol, CFormInput, CRow,
  CSmartTable, CSpinner,
  CDropdown, CDropdownToggle, CDropdownMenu,
  CPagination, CPaginationItem,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilSearch, cilFilterX, cilSettings } from '@coreui/icons'
import type { AppDispatch } from '../../../../store'
import { MODULE_SUBDIVISION_FUEL_STATEMENT } from '../../../../constants/modules'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../../services/auth/permission.service'
import PageHero from '../../../../components/PageHero'
import ConfirmationModal from '../../../../components/ConfirmationModal'
import {
  fetchSubdivisionFuelStatementList,
  deleteSubdivisionFuelStatement,
  resetStatuses,
  selectSubdivFuelStmtList,
  selectSubdivFuelStmtListMeta,
  selectSubdivFuelStmtLoadingList,
  selectSubdivFuelStmtStatuses,
} from '../store/subdivisionFuelStatement.slice'

type DeductedFilter = '' | 'deducted' | 'not_deducted'

const DEDUCTED_TABS: { key: DeductedFilter; label: string; color: string }[] = [
  { key: '', label: 'All', color: 'primary' },
  { key: 'deducted', label: 'Deducted', color: 'success' },
  { key: 'not_deducted', label: 'Not Deducted', color: 'warning' },
]

const STORAGE_KEY = 'subdiv_fuel_stmt_cols'
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const noWrap = { whiteSpace: 'nowrap' as const }

const ALL_COLUMNS = [
  { key: 'fuelStatementId', label: 'ID', _style: noWrap },
  { key: 'subdivisionName', label: 'Subdivision', _style: noWrap },
  { key: 'gasStations', label: 'Supplier', _style: noWrap },
  { key: 'linkedStatements', label: 'Statements', _style: noWrap },
  { key: 'fuelOrders', label: 'Fuel Orders', _style: noWrap },
  { key: 'deducted', label: 'Status', _style: noWrap, filter: false },
  { key: 'actions', label: 'Actions', _style: noWrap, filter: false, sorter: false },
]

const DEFAULT_VISIBLE = ['fuelStatementId', 'subdivisionName', 'gasStations', 'linkedStatements', 'fuelOrders', 'deducted', 'actions']

const SubdivisionFuelStatementListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const list = useSelector(selectSubdivFuelStmtList)
  const meta = useSelector(selectSubdivFuelStmtListMeta)
  const loading = useSelector(selectSubdivFuelStmtLoadingList)
  const statuses = useSelector(selectSubdivFuelStmtStatuses)

  const canCreate = permissionService.checkPermission(MODULE_SUBDIVISION_FUEL_STATEMENT, CREATE)
  const canEdit = permissionService.checkPermission(MODULE_SUBDIVISION_FUEL_STATEMENT, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_SUBDIVISION_FUEL_STATEMENT, DELETE)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deductedFilter, setDeductedFilter] = useState<DeductedFilter>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_VISIBLE
  })

  useEffect(() => {
    dispatch(fetchSubdivisionFuelStatementList({ page, pageSize }))
  }, [dispatch, page, pageSize])

  useEffect(() => {
    if (statuses.deleted) {
      const toast = (window as any).exaToast
      toast?.success?.('Success', 'Statement was deleted successfully')
      dispatch(fetchSubdivisionFuelStatementList({ page, pageSize }))
      dispatch(resetStatuses())
    }
  }, [statuses.deleted, dispatch, page, pageSize])

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => {
      const next = prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const columns = ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key))

  const handleDelete = useCallback(() => {
    if (deleteId != null) {
      dispatch(deleteSubdivisionFuelStatement(deleteId))
      setDeleteId(null)
    }
  }, [deleteId, dispatch])

  const filteredItems = useMemo(() => {
    let items = list

    if (deductedFilter === 'deducted') {
      items = items.filter((i: any) => i.deducted === 1)
    } else if (deductedFilter === 'not_deducted') {
      items = items.filter((i: any) => i.deducted !== 1)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      items = items.filter((item: any) => {
        if (String(item.fuelStatementId ?? '').includes(term)) return true
        if ((item.subdivisionName ?? '').toLowerCase().includes(term)) return true
        if ((item.gasStations ?? '').toLowerCase().includes(term)) return true
        if ((item.linkedStatements ?? '').toLowerCase().includes(term)) return true
        return false
      })
    }

    return items
  }, [list, deductedFilter, searchTerm])

  const hasFilters = deductedFilter || searchTerm

  const clearAllFilters = useCallback(() => {
    setDeductedFilter('')
    setSearchTerm('')
  }, [])

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setPage(1)
  }, [])

  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const start = Math.max(1, page - 2)
    const end = Math.min(meta.lastPage, page + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }, [page, meta.lastPage])

  return (
    <>
      <PageHero
        kicker="FUEL"
        title="Subdivision Fuel Statement"
        subtitle="Manage fuel statement records by subdivision."
        highlights={[
          { label: 'Total', value: String(meta.total), color: 'primary' },
        ]}
        actions={canCreate ? (
          <CButton color="primary" onClick={() => navigate('/fuel/subdivision-fuel-statement/new')}>
            <CIcon icon={cilPlus} className="me-1" /> New Statement
          </CButton>
        ) : undefined}
      />

      <CCard className="shadow-sm border-0 mb-4">
        <CCardBody>
          {/* Toolbar */}
          <CRow className="mb-3 align-items-center">
            <CCol xs="auto">
              <CBadge color="dark" shape="rounded-pill" className="px-3 py-2" style={{ fontSize: '0.85rem' }}>
                RECORDS {meta.total}
              </CBadge>
              {loading && <CSpinner size="sm" className="ms-2" />}
            </CCol>
            <CCol>
              <div className="d-flex justify-content-end align-items-center gap-2">
                <div className="position-relative">
                  <CIcon icon={cilSearch} className="position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <CFormInput
                    placeholder="Search by ID, subdivision, or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: 32, minWidth: 280 }}
                  />
                </div>
                <CDropdown>
                  <CDropdownToggle color="secondary" variant="outline" size="sm">
                    <CIcon icon={cilSettings} size="sm" /> Columns
                  </CDropdownToggle>
                  <CDropdownMenu>
                    {ALL_COLUMNS.filter((c) => c.key !== 'actions').map((col) => (
                      <label key={col.key} className="dropdown-item d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(col.key)}
                          onChange={() => toggleColumn(col.key)}
                        />
                        {col.label}
                      </label>
                    ))}
                  </CDropdownMenu>
                </CDropdown>
                {hasFilters && (
                  <CButton color="secondary" variant="ghost" size="sm" onClick={clearAllFilters}>
                    <CIcon icon={cilFilterX} size="sm" className="me-1" /> Clear Filters
                  </CButton>
                )}
              </div>
            </CCol>
          </CRow>

          {/* Filter Panel */}
          <CRow className="mb-3">
            <CCol md={6}>
              <div className="mb-1 text-body-secondary fw-semibold" style={{ fontSize: '0.8rem' }}>Status</div>
              <div className="d-flex flex-wrap gap-1">
                {DEDUCTED_TABS.map((tab) => (
                  <CBadge
                    key={tab.key}
                    color={deductedFilter === tab.key ? tab.color : 'light'}
                    textColor={deductedFilter === tab.key ? 'white' : 'dark'}
                    shape="rounded-pill"
                    role="button"
                    className="px-3 py-2"
                    style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                    onClick={() => { setDeductedFilter(tab.key) }}
                  >
                    {tab.label}
                  </CBadge>
                ))}
              </div>
            </CCol>
          </CRow>

          {/* Active Filters Summary */}
          {hasFilters && (
            <div className="d-flex flex-wrap gap-1 mb-3">
              {deductedFilter && (
                <CBadge color="info" shape="rounded-pill" className="d-flex align-items-center gap-1 px-2 py-1">
                  Status: {deductedFilter === 'deducted' ? 'Deducted' : 'Not Deducted'}
                  <CIcon icon={cilFilterX} size="sm" role="button" onClick={() => setDeductedFilter('')} style={{ cursor: 'pointer' }} />
                </CBadge>
              )}
              {searchTerm && (
                <CBadge color="info" shape="rounded-pill" className="d-flex align-items-center gap-1 px-2 py-1">
                  Search: &quot;{searchTerm}&quot;
                  <CIcon icon={cilFilterX} size="sm" role="button" onClick={() => setSearchTerm('')} style={{ cursor: 'pointer' }} />
                </CBadge>
              )}
            </div>
          )}

          {/* Table */}
          <CSmartTable
            items={filteredItems}
            columns={columns}
            loading={loading}
            columnFilter
            columnSorter
            tableProps={{ responsive: true, striped: true, hover: true, bordered: true }}
            scopedColumns={{
              fuelStatementId: (item: any) => (
                <td>
                  <CBadge
                    color="primary"
                    shape="rounded-pill"
                    role="button"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/fuel/subdivision-fuel-statement/${item.fuelStatementId}`)}
                  >
                    {item.fuelStatementId}
                  </CBadge>
                </td>
              ),
              deducted: (item: any) => (
                <td>
                  <CBadge color={item.deducted === 1 ? 'success' : 'warning'} shape="rounded-pill">
                    {item.deducted === 1 ? 'Deducted' : 'Not Deducted'}
                  </CBadge>
                </td>
              ),
              actions: (item: any) => (
                <td>
                  <div className="d-flex gap-1">
                    {canEdit && (
                      <CButton
                        color="info"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/fuel/subdivision-fuel-statement/${item.fuelStatementId}`)}
                      >
                        <CIcon icon={cilPencil} size="sm" />
                      </CButton>
                    )}
                    {canDelete && (
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(item.fuelStatementId)}
                      >
                        <CIcon icon={cilTrash} size="sm" />
                      </CButton>
                    )}
                  </div>
                </td>
              ),
            }}
          />

          {/* Server-side Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="d-flex align-items-center gap-2">
              <span className="text-body-secondary" style={{ fontSize: '0.85rem' }}>Items per page:</span>
              <CDropdown direction="dropup">
                <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '4rem' }}>
                  {pageSize}
                </CDropdownToggle>
                <CDropdownMenu style={{ minWidth: '4rem' }}>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      className={`dropdown-item${n === pageSize ? ' active' : ''}`}
                      onClick={() => handlePageSizeChange(n)}
                    >
                      {n}
                    </button>
                  ))}
                </CDropdownMenu>
              </CDropdown>
              <span className="text-body-secondary" style={{ fontSize: '0.85rem' }}>
                Page {meta.page} of {meta.lastPage}
              </span>
            </div>
            <CPagination size="sm" aria-label="Pagination">
              <CPaginationItem disabled={page <= 1} onClick={() => setPage(1)} aria-label="First">
                &laquo;
              </CPaginationItem>
              <CPaginationItem disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous">
                &lsaquo;
              </CPaginationItem>
              {pageNumbers.map((p) => (
                <CPaginationItem key={p} active={p === page} onClick={() => setPage(p)}>
                  {p}
                </CPaginationItem>
              ))}
              <CPaginationItem disabled={page >= meta.lastPage} onClick={() => setPage(page + 1)} aria-label="Next">
                &rsaquo;
              </CPaginationItem>
              <CPaginationItem disabled={page >= meta.lastPage} onClick={() => setPage(meta.lastPage)} aria-label="Last">
                &raquo;
              </CPaginationItem>
            </CPagination>
          </div>
        </CCardBody>
      </CCard>

      <ConfirmationModal
        visible={deleteId != null}
        title="Delete Statement"
        message="Are you sure you want to delete this subdivision fuel statement?"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </>
  )
}

export default SubdivisionFuelStatementListPage
