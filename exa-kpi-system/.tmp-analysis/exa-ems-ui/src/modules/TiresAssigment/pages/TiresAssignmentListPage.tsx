// src/modules/TiresAssignment/pages/TiresAssignmentListPage.tsx

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CSmartTable,
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
import { cilPlus, cilPencil, cilFilterX, cilOptions, cilAlbum } from '@coreui/icons'

import {
  fetchTiresAssignments,
  selectTiresAssignments,
  selectTiresAssignmentLoading,
} from '../store/tiresAssignment.slice'

const COLUMN_STORAGE_KEY = 'tires_assignment_visible_columns'

const TiresAssignmentListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectTiresAssignments)
  const loading = useSelector(selectTiresAssignmentLoading)

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

    return ['seriesNumber', 'brandName', 'year', 'depth', 'tireTypeName', 'ownedText', 'statusName']
  }

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns)

  useEffect(() => {
    sessionStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    dispatch(fetchTiresAssignments())
  }, [dispatch])

  const handleOpenNew = () => navigate('/mr/tires/new')

  const handleOpenEdit = (serialNo: string) => {
    if (!serialNo) return
    navigate(`/mr/tires/${encodeURIComponent(serialNo)}`)
  }

  const tableItems = useMemo(() => {
    return (list || []).map((item: any) => {
      const serialNo = String(item.serialNo ?? item.seriesNumber ?? '')
        .trim()
        .toUpperCase()

      return {
        ...item,
        serialNo,
        seriesNumber: serialNo,
        brandName: item.brandName ?? item.brand ?? '',
        year: item.year ?? '',
        depth: item.depth ?? '',
        tireTypeName: item.tireTypeName ?? item.tireType ?? item.tireTypeId ?? '',
        ownedText: item.owned || item.owner ? 'Yes' : 'No',
        assignmentText: item.isAssigned ? 'Assigned' : 'Available',
        assignedToId: item.assignedToName ?? item.assignedToId ?? '',
        positionId: item.positionName ?? item.positionId ?? '',
        statusName: item.statusName ?? item.statusId ?? item.status ?? '',
      }
    })
  }, [list])

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()

    if (!q) return tableItems

    return tableItems.filter((x: any) =>
      [
        x.tiresId,
        x.serialNo,
        x.seriesNumber,
        x.brandName,
        x.year,
        x.depth,
        x.tireTypeName,
        x.ownedText,
        x.assignmentText,
        x.assignedToId,
        x.positionId,
        x.statusName,
      ]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
        .includes(q),
    )
  }, [tableItems, searchValue])

  const columns = [
    { key: 'seriesNumber', label: 'Serial No.' },
    { key: 'brandName', label: 'Brand' },
    { key: 'year', label: 'Year' },
    { key: 'depth', label: 'Depth' },
    { key: 'tireTypeName', label: 'Tire Type' },
    { key: 'ownedText', label: 'Owned' },
    { key: 'assignmentText', label: 'Assignment' },
    { key: 'assignedToId', label: 'Assigned To' },
    { key: 'positionId', label: 'Position' },
    { key: 'statusName', label: 'Status' },
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
        onClick={() => handleOpenEdit(item.serialNo ?? item.seriesNumber)}
        title="Edit"
        disabled={!item.serialNo && !item.seriesNumber}
      >
        <CIcon icon={cilPencil} />
      </CButton>
    </div>
  )

  const renderAssignment = (item: any) => (
    <td>
      {item.isAssigned ? (
        <CBadge color="primary">Assigned</CBadge>
      ) : (
        <CBadge color="success">Available</CBadge>
      )}
    </td>
  )

  const renderStatus = (item: any) => (
    <td>
      <CBadge color={item.statusName ? 'info' : 'secondary'}>{item.statusName || '-'}</CBadge>
    </td>
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
                      setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
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
        New Tire
      </CButton>
    </div>
  )

  return (
    <CContainer fluid>
      <PageHero kicker="M&R" icon={cilAlbum} title="Tires" actions={heroActions} />

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
                assignmentText: renderAssignment,
                statusName: renderStatus,
                actions: (item: any) => <td>{renderActions(item)}</td>,
              }}
            />
          </div>
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default TiresAssignmentListPage
