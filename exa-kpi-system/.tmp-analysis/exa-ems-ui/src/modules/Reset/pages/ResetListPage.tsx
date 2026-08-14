import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CSmartTable,
  CCardHeader,
  CCol,
  CContainer,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CRow,
  CBadge,
} from '@coreui/react-pro'
import type { AppDispatch } from '../../../store'
import CIcon from '@coreui/icons-react'
import PageHero from '../../../components/PageHero'
import { cilPlus, cilPencil, cilFilterX, cilOptions, cilSync } from '@coreui/icons'

import { fetchResets } from '../store/reset.slice'

const COLUMN_STORAGE_KEY = 'reset_visible_columns'

const ResetListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  // redux state
  const { list, loading } = useSelector((state: any) => state.reset)

  // UI state
  const [searchValue, setSearchValue] = useState('')
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const loadSavedColumns = () => {
    const saved = sessionStorage.getItem(COLUMN_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // ignore
      }
    }
    return ['equipmentId', 'equipmentType', 'startDate', 'endDate', 'status']
  }

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns)

  useEffect(() => {
    sessionStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  // initial load
  useEffect(() => {
    dispatch(fetchResets())
  }, [dispatch])

  const handleOpenNew = () => navigate('/operations/reset/new')
  const handleOpenEdit = (id: number) => navigate(`/operations/reset/${id}`)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <CBadge color="success">Complete</CBadge>
      case 'pending':
        return <CBadge color="warning">Pending</CBadge>
      case 'cancel':
        return <CBadge color="danger">Cancel</CBadge>
      default:
        return <CBadge color="secondary">{status}</CBadge>
    }
  }

  const tableItems = useMemo(() => {
    return (list || []).map((item: any) => ({
      ...item,
      tripsCount: Array.isArray(item.trips) ? item.trips.length : 0,
    }))
  }, [list])

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return tableItems

    return tableItems.filter((x: any) =>
      [x.equipmentId, x.equipmentType, x.startDate, x.endDate, x.status, x.tripsCount]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
        .includes(q),
    )
  }, [tableItems, searchValue])

  const columns = [
    { key: 'equipmentId', label: 'Equipment' },
    { key: 'equipmentType', label: 'Type' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'status', label: 'Status' },
    { key: 'tripsCount', label: 'Trips' },
    { key: 'actions', label: 'Actions', filter: false, sorter: false },
  ]

  const activeColumns = useMemo(
    () => columns.filter((col) => col.key === 'actions' || visibleColumns.includes(col.key)),
    [visibleColumns],
  )

  const handleTableFilterChange = (value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {}, 600)
  }

  const handleColumnFilterChange = useCallback((filters: Record<string, any>) => {
    setColumnFilterValues(filters)
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => {}, 600)
  }, [])

  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter((key) => {
    const val = columnFilterValues[key]
    return Array.isArray(val) ? val.length > 0 : String(val ?? '').trim().length > 0
  }).length

  const hasSearchFilter = searchValue.trim().length > 0
  const totalActiveFilters = activeColumnFiltersCount + (hasSearchFilter ? 1 : 0)

  const handleClearFilters = () => {
    setSearchValue('')
    setColumnFilterValues({})
  }

  const renderActions = (item: any) => (
    <div className="action-buttons">
      <CButton
        color="primary"
        variant="ghost"
        size="sm"
        onClick={() => handleOpenEdit(item.id)}
        title="Edit"
      >
        <CIcon icon={cilPencil} />
      </CButton>
    </div>
  )

  const heroActions = (
    <div className="d-flex gap-2">
      <CDropdown>
        <CDropdownToggle color="secondary" variant="outline">
          <CIcon icon={cilOptions} className="me-2" />
          Visible Columns ({visibleColumns.length})
        </CDropdownToggle>

        <CDropdownMenu className="column-selector-dropdown p-3">
          {columns
            .filter((col) => col.key !== 'actions')
            .map((col) => (
              <div key={col.key} className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={visibleColumns.includes(col.key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setVisibleColumns([...visibleColumns, col.key])
                    } else if (visibleColumns.length > 1) {
                      setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                    }
                  }}
                />
                <label className="form-check-label">{col.label}</label>
              </div>
            ))}
        </CDropdownMenu>
      </CDropdown>

      <CButton color="primary" className="text-white" onClick={handleOpenNew}>
        <CIcon icon={cilPlus} className="me-2" />
        New Reset
      </CButton>
    </div>
  )

  return (
    <CContainer fluid>
      <PageHero kicker="OPERATIONS" icon={cilSync} title="Resets" actions={heroActions} />

      <CCard>

        <CCardBody>
          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
                <input
                  className="form-control"
                  placeholder="Search..."
                  value={searchValue}
                  onChange={(e) => handleTableFilterChange(e.target.value)}
                />
              </div>
            </CCol>

            {totalActiveFilters > 0 && (
              <CCol xs={12} md="auto">
                <CButton color="danger" variant="outline" size="sm" onClick={handleClearFilters}>
                  <CIcon icon={cilFilterX} className="me-1" />
                  Clear Filters ({totalActiveFilters})
                </CButton>
              </CCol>
            )}
          </CRow>

          <div className="table-responsive mt-3">
            <CSmartTable
              items={filteredItems}
              columns={activeColumns}
              itemsPerPage={20}
              pagination
              itemsPerPageSelect={false}
              loading={loading}
              columnFilter
              columnSorter
              columnFilterValue={columnFilterValues}
              tableFilter={false}
              onColumnFilterChange={handleColumnFilterChange}
              tableProps={{
                hover: true,
                striped: true,
                responsive: true,
                className: 'trips-table align-middle',
              }}
              scopedColumns={{
                status: (item: any) => <td>{getStatusBadge(item.status)}</td>,
                actions: (item: any) => <td>{renderActions(item)}</td>,
              }}
            />
          </div>
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default ResetListPage
