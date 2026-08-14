import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import PageHero from '../../../components/PageHero'
import DateFormatter from '../../../helpers/IsoDateFormatter'
import '../styles/PartsOverview.css'

import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CCollapse,
  CDropdownItem
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'

import { loadPartsList, deletePart } from '../store/partsAndSectionsSlice'
import SuccessMessageModal from 'src/components/SuccessMessageModal'

import { PartsAndSectionsListParams, PartsAndSectionsRow } from '../types';

import ConfirmDialog from '../../../components/ConfirmationModal';

import {
  cilPuzzle,
  cilFilterX,
  cilOptions,
  cilPlus,
  cilSearch,
  cilPencil,
  cilTrash
} from '@coreui/icons'

import type { AppDispatch, RootState } from '../../../store'
import { MODULE_PARTS_SECTIONS, getModuleIdByName } from '../../../constants/modules'
import { permissionService, UPDATE, CREATE, DELETE } from '../../../services/auth/permission.service'

const STORAGE_KEY = 'partsNsections_api_params'
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
const COLUMN_STORAGE_KEY = 'partsNsections_visible_columns'

const buildPageList = (current: number, total: number, maxLength = 5) => {
  if (total <= 0) return [1]
  const safeMax = Math.max(1, maxLength)
  const half = Math.floor(safeMax / 2)
  let start = Math.max(1, current - half)
  let end = Math.min(total, start + safeMax - 1)

  if (end - start + 1 < safeMax) {
    start = Math.max(1, end - safeMax + 1)
  }

  const pages: number[] = []
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  return pages
}


const loadSavedColumns = () => {
  const saved = sessionStorage.getItem(COLUMN_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (error) {
        console.error('Failed to parse column preferences', error)
      }
    }
    return [
      'partName',
      'description',
      'equipmentType',
      'equipmentSizeType',
    ];
}

const loadSavedParams = (): PartsAndSectionsListParams => {
  const saved = sessionStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      const validRows = ITEMS_PER_PAGE_OPTIONS.includes(parsed.rows) ? parsed.rows : 10
      return {
        filter: [],
        search: null,
        match: null,
        rows: validRows,
        first: 0,
        sortField: parsed.sortField || 'part',
        sortOrder: parsed.sortOrder || -1,
        filters: {},
      }
    } catch (error) {
      console.error('Failed to parse stored params', error)
    }
  }
  return {
    filter: [],
    search: null,
    match: null,
    rows: 20,
    first: 0,
    sortField: 'part',
    sortOrder: -1,
    filters: {},
  }
}

const PartsAndSectionsListPage: React.FC = () => {

  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { list, errors, total, isLoading } = useSelector((state: RootState) => state.partsAndSections);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [apiParams, setApiParams] = useState<PartsAndSectionsListParams>(loadSavedParams())
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({})
  const [searchValue, setSearchValue] = useState(apiParams.search || '')
  const [expandedRows, setExpandedRows] = useState<number[]>([])
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)
    const [showDialog, setShowDialog] = useState(false);
    const [dialogOptions, setDialogOptions] = useState({
      title: "",
      message: "Are you sure you want to delete this record?",
      onConfirm: null as null | (() => void)
    });
  
  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_PARTS_SECTIONS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_PARTS_SECTIONS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_PARTS_SECTIONS, DELETE)

  const columns = [
    {
      key: 'partName',
      label: 'Part Name',
      sorter: true,
      filter: true,
    },
    {
      key: 'description',
      label: 'Description',
      sorter: true,
      filter: true,
    },
    {
      key: 'equipmentType',
      label: 'Equipment Type',
      sorter: true,
      filter: true,
    },
    {
      key: 'equipmentSizeType',
      label: 'Equipment Size/Type',
      sorter: true,
      filter: true,
    },
    { key: 'actions', label: 'Actions', sorter: false, filter: false },
  ];

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key)
  )

    const toggleDetails = (equipmentPartId: number) => {
    setExpandedRows((prev) =>
      prev.includes(equipmentPartId) ? prev.filter((id) => id !== equipmentPartId) : [...prev, equipmentPartId]
    )
  }

  useEffect(() => {
    dispatch(loadPartsList())
  }, [])


  const handleTableFilterChange = (value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setApiParams((prev) => ({ ...prev, search: value || null, first: 0 }))
    }, 600)
  }

    const handleSorterChange = (sorter: { column: string; state: 'asc' | 'desc' | 0 } | null) => {
    if (!sorter || sorter.state === 0) {
      setApiParams((prev) => ({ ...prev, sortField: 'equipmentPartId', sortOrder: -1, first: 0 }))
    } else {
      setApiParams((prev) => ({
        ...prev,
        sortField: sorter.column,
        sortOrder: sorter.state === 'asc' ? 1 : -1,
        first: 0,
      }))
    }
  }

    const handleColumnFilterChange = useCallback((filters: Record<string, any>) => {
      setColumnFilterValues(filters)
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
      filterDebounceRef.current = setTimeout(() => {
        const mapped: Record<string, any> = {}
        Object.keys(filters).forEach((key) => {
          const value = filters[key]
          if (Array.isArray(value) && value.length > 0) {
             mapped[key] = value // Pass array directly for multi-select
          } else if (typeof value === 'string' && value.trim()) {
            mapped[key] = value.trim()
          }
        })
        setApiParams((prev) => ({ ...prev, filters: mapped, first: 0 }))
      }, 600)
    }, [])

  const renderDate = (timestamp: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000) // Convert Unix timestamp to milliseconds
    
    const day = String(date.getDate()).padStart(2, '0')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames[date.getMonth()]
    const year = String(date.getFullYear()).slice(-2)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${day}-${month}-${year} ${hours}:${minutes}`
  }


  const filteredTotal = total;
  const validRows = apiParams.rows && apiParams.rows > 0 ? apiParams.rows : 20
  const currentPage = Math.floor(apiParams.first / validRows) + 1
  const totalPages = Math.max(1, Math.ceil(filteredTotal / validRows))
  const manualPaginationPages = buildPageList(currentPage, totalPages)

  const activeColumnFiltersCount = Object.keys(columnFilterValues).filter(
    (key) => {
        const val = columnFilterValues[key]
        return Array.isArray(val) ? val.length > 0 : val?.trim()
    }
  ).length
  const hasSearchFilter = searchValue.trim().length > 0;
  const hasActiveFilters = activeColumnFiltersCount > 0 || hasSearchFilter;
  const totalActiveFilters = activeColumnFiltersCount + (hasSearchFilter ? 1 : 0);

    const handleClearFilters = () => {
    setSearchValue('')
    setColumnFilterValues({})
    setApiParams((prev) => ({
      ...prev,
      filter: [],
      search: null,
      filters: {},
      first: 0,
    }))
  }

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  setDialogOptions({ title, message, onConfirm });
  setShowDialog(true);
};

  const renderActions = (row: PartsAndSectionsRow) => {
    const isExpanded = expandedRows.includes(row.equipmentPartId
  )
    return (
      <div className="d-flex gap-2">
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          onClick={() => toggleDetails(row.equipmentPartId)}
        >
        {isExpanded ? 'Hide' : 'Show'}
        </CButton>
        <CButton
          size="sm"
          color="info"
          variant="ghost"
          onClick={() => navigate(`/depot/parts-and-sections/${row.equipmentPartId}`, { state: { viewMode: true } })}
          title="View"
        >
          <CIcon icon={cilSearch} />
        </CButton>
        {canUpdate && (
          <CButton
            size="sm"
            color="primary"
            variant="ghost"
            onClick={() => navigate(`/depot/parts-and-sections/${row.equipmentPartId}`)}
            title="Edit"
          >
            <CIcon icon={cilPencil} />
          </CButton>
        )}
        {canDelete && (
          <CButton
            size="sm"
            color="danger"
            variant="ghost"
            onClick={() => 
              showConfirm("Delete Confirmation", "Are you sure you want to delete this record?", async() => {
              let result: any;
              result = await dispatch(deletePart({id: row.equipmentPartId}))
              if (result.meta.requestStatus === 'fulfilled') {
              setSuccessMessage("Part deleted successfully!");
              setShowSuccessModal(true);
            } else {
              throw new Error(result.payload || 'Failed to delete parts and sections');
            }
            })}
            title="Delete"
          >
            <CIcon icon={cilTrash} />
          </CButton>
        )}
        {!canUpdate && (
          <span className="text-muted small">View only</span>
        )}
      </div>
    )
  }

  const scopedColumns = {
    actions: (item: PartsAndSectionsRow) => <td>{renderActions(item)}</td>,
    details: (item: any) => {
          return (
            <CCollapse visible={expandedRows.includes(item.equipmentPartId)}>
              <CCardBody className="p-4">
                <h5 className="mb-3 part-details">Part Details</h5>
                <CRow className="g-3">
                  <CCol md={6}>
                    <div className="mb-3">
                      <strong className="d-block text-body-secondary mb-1">EQUIPMENT PART ID</strong>
                      <span>{item.equipmentPartId}</span>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <strong className="d-block text-body-secondary mb-1">EQUIPMENT TYPE</strong>
                      <span>{item.equipmentType}</span>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <strong className="d-block text-body-secondary mb-1">PART NAME</strong>
                      <span>{item.partName}</span>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <strong className="d-block text-body-secondary mb-1">EQUIPMENT SIZE</strong>
                      <span>{item.equipmentSizeType}</span>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <strong className="d-block text-body-secondary mb-1">DESCRIPTION</strong>
                      <span>{item.description}</span>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <strong className="d-block text-body-secondary mb-1">SECTIONS</strong>
                      <span>{item?.sections_data?.length || 0}</span>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <strong className="d-block text-body-secondary mb-1">CREATED BY</strong>
                      <span>{`${item.createdUser.firstName} ${item.createdUser.lastName}`}</span>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <strong className="d-block text-body-secondary mb-1">CREATED AT</strong>
                      <span>{DateFormatter(item.createDate)}</span>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <strong className="d-block text-body-secondary mb-1">UPDATED BY</strong>
                      <span>{`${item.updatedUser.firstName} ${item.updatedUser.lastName}`}</span>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <strong className="d-block text-body-secondary mb-1">UPDATED AT</strong>
                      <span>{DateFormatter(item.updateDate)}</span>
                    </div>
                  </CCol>
                </CRow>
                <div className="mt-3 d-flex gap-2">
                  {canUpdate && 
                  <CButton
                    size="sm"
                    color="primary"
                    onClick={() => navigate(`/depot/parts-and-sections/${item.equipmentPartId}`)}
                  >
                    <CIcon icon={cilPencil} className="me-1" />
                    Edit Part
                  </CButton>}
                  { canDelete && 
                  <CButton
                    size="sm"
                    color="danger"
                    variant="outline"
                    onClick={() => 
                        showConfirm("Delete Confirmation", "Are you sure you want to delete this record?", async() => {
                        let result: any;
                        result = await dispatch(deletePart({id: item.equipmentPartId}))
                        if (result.meta.requestStatus === 'fulfilled') {
                        setSuccessMessage("Part deleted successfully!");
                        setShowSuccessModal(true);
                      } else {
                        throw new Error(result.payload || 'Failed to delete parts and sections');
                      }
                    })}
                    >
                    <CIcon icon={cilTrash} className="me-1" />
                    Delete
                  </CButton>}
                </div>
              </CCardBody>
            </CCollapse>
          )
        },
  }

  const safeList = Array.isArray(list) ? list : [];

  return (
    <CRow className="g-3">
      <CCol xs={12}>
        <PageHero 
          kicker="Parts & Sections"
          icon={cilPuzzle}
          title="Equipment Parts"
          subtitle={`Manage equipment parts and their sections.`}
          actions={
            <div className="d-flex gap-2">
              <CDropdown>
                <CDropdownToggle color="secondary" variant="outline">
                  <CIcon icon={cilOptions} className="me-2" />
                  Visible Columns ({visibleColumns.length})
                </CDropdownToggle>
                <CDropdownMenu className="column-selector-dropdown">
                  <div className="px-3 py-2">
                    <small className="text-body-secondary fw-semibold">SELECT COLUMNS</small>
                  </div>
                  <div className="dropdown-divider" />
                  <div className="column-selector-list">
                    {columns
                      .filter((col) => col.key !== 'actions' && col.key !== 'show_details')
                      .map((col) => (
                        <div key={col.key} className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`col-${col.key}`}
                            checked={visibleColumns.includes(col.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setVisibleColumns([...visibleColumns, col.key])
                              } else if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter((k) => k !== col.key))
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={`col-${col.key}`}>
                            {col.label}
                          </label>
                        </div>
                      ))}
                  </div>
                </CDropdownMenu>
              </CDropdown>
              {canCreate && (
                <CButton color="primary" className="text-white" onClick={() => navigate('/depot/parts-and-sections/new')}>
                  <CIcon icon={cilPlus} className="me-2" />
                  New Part
                </CButton>
              )}
            </div>
          }
        />
      </CCol>
      <CCard className="mb-4 shadow-sm trips-card">
        <CCardBody>
        <div className="d-flex justify-content-end align-items-center mb-2 pe-1">
          <span className="me-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
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
        </div>
          { errors && (
            <CAlert color="danger" className="mb-3">
              {errors}
            </CAlert>
          )}
          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto" className="mb-2 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Search..."
                  value={searchValue}
                  onChange={(e) => handleTableFilterChange(e.target.value)}
                  style={{ minWidth: '250px' }}
                />
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm d-flex align-items-center ms-3"
                    onClick={handleClearFilters}
                  >
                    <CIcon icon={cilFilterX} className="me-1" />
                    Clear Filters ({totalActiveFilters})
                  </button>
                )}
              </div>
            </CCol>
          </CRow>
          <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={safeList}
                loading={isLoading}
                itemsPerPage={itemsPerPage}
                itemsPerPageSelect={false}
                pagination
                columnFilter
                columnSorter
                columnFilterValue={columnFilterValues}
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'trips-table align-middle',
                }}
                tableFilter={false}
                onSorterChange={(sorter) => {
                  if (Array.isArray(sorter)) return
                  handleSorterChange(sorter as { column: string; state: 'asc' | 'desc' | 0 } | null)
                }}
                onColumnFilterChange={handleColumnFilterChange}
              />
            </div>
            <ConfirmDialog
              visible={showDialog}
              title={dialogOptions.title}
              message={dialogOptions.message}
              onClose={() => setShowDialog(false)}
              onConfirm={dialogOptions.onConfirm || undefined}
            />
            <SuccessMessageModal
              showSuccessModal={showSuccessModal}
              setShowSuccessModal={setShowSuccessModal}
              successMessage={successMessage}
          />
        </CCardBody>
      </CCard>
    </CRow>
  );
};

export default PartsAndSectionsListPage;
