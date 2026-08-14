import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {  ChecklistBuilderOverviewRow, ChecklistListParams } from '../types'
import { MODULE_CHECKLIST_BUILDER } from 'src/constants/modules'
import { permissionService, UPDATE, CREATE, DELETE } from '../../../services/auth/permission.service'
import PageHero from '../../../components/PageHero'
import type { AppDispatch, RootState } from '../../../store'
import { loadChecklists, deleteChecklist } from '../store/checklistBuilderSlice'
import ConfirmDialog from '../../../components/ConfirmationModal';
import SuccessMessageModal from 'src/components/SuccessMessageModal'
import DateFormatter from '../../../helpers/IsoDateFormatter'
import '../styles/ChecklistOverview.css'

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
  CBadge,
  CCollapse,
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'

import {
  cilOptions,
  cilPlus,
  cilSearch,
  cilPencil,
  cilTrash,
  cilList,
  cilFilterX
} from '@coreui/icons'

const STORAGE_KEY = 'checklist_api_params'
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
const COLUMN_STORAGE_KEY = 'checklist_visible_columns'


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
      'checkListName',
      'equipmentSizeType',
      'gateType',
      'isOwnedEquipment',
      'isDefaultConfig',
      'active',
      'depots',
      'clients'
    ];
}

  const loadSavedParams = (): ChecklistListParams => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const validRows = ITEMS_PER_PAGE_OPTIONS.includes(parsed.rows) ? parsed.rows : 20
        return {
          filter: [],
          search: null,
          match: null,
          rows: validRows,
          first: 0,
          sortField: parsed.sortField || 'checklist',
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
      sortField: 'checklist',
      sortOrder: -1,
      filters: {},
    }
  }

export default function ChecklistBuilderListPage() {

  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { list, errors, isLoading, total } = useSelector((state: RootState) => state.checklistBuilder);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns());
  const [columnFilterValues, setColumnFilterValues] = useState<Record<string, any>>({});
  const [apiParams, setApiParams] = useState<ChecklistListParams>(loadSavedParams())
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const [searchValue, setSearchValue] = useState(apiParams.search || '')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [expandedRows, setExpandedRows] = useState<number[]>([])
  const [showDialog, setShowDialog] = useState(false);
  const [dialogOptions, setDialogOptions] = useState({
    title: "",
    message: "Are you sure you want to delete this record?",
    onConfirm: null as null | (() => void)
  });

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_CHECKLIST_BUILDER, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_CHECKLIST_BUILDER, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_CHECKLIST_BUILDER, DELETE)

  useEffect(() => {
      dispatch(loadChecklists())
  }, [])


  const filteredTotal = total;
  const validRows = apiParams.rows && apiParams.rows > 0 ? apiParams.rows : 20
  const currentPage = Math.floor(apiParams.first / validRows) + 1
  const totalPages = Math.max(1, Math.ceil(filteredTotal / validRows))
  //const manualPaginationPages = buildPageList(currentPage, totalPages)

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

    const handleTableFilterChange = (value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setApiParams((prev) => ({ ...prev, search: value || null, first: 0 }))
    }, 600)
  }

  const columns = [
    {
      key: 'checkListName',
      label: 'Checklist Name',
      sorter: true,
      filter: true,
    },
    {
      key: 'gateType',
      label: 'Gate',
      sorter: true,
      filter: true,
    },
    {
      key: 'equipmentSizeType',
      label: 'Equipment Size/Type',
      sorter: true,
      filter: true,
    },
    {
      key: 'isOwnedEquipment',
      label: 'Owned Equipment',
      sorter: true,
      filter: true,
    },
    {
      key: 'depots',
      label: 'Depots',
      sorter: true,
      filter: true,
    },
    {
      key: 'clients',
      label: 'Clients',
      sorter: true,
      filter: true,
    },
    {
      key: 'isDefaultConfig',
      label: 'Default Configuration',
      sorter: true,
      filter: true,
    },
    {
      key: 'active',
      filter: true,
      label: 'Status',
      sorter: true,
    },
    {
      key: 'createdBy',
      label: 'Created By',
      sorter: true,
      filter: true,
    },
    {
      key: 'createDate',
      label: 'Created At',
      sorter: true,
      filter: true,
    },
    {
      key: 'show_details',
      label: '',
      filter: false,
      sorter: false,
    },
    { key: 'actions', label: 'Actions', sorter: false, filter: false },
  ];

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  setDialogOptions({ title, message, onConfirm });
  setShowDialog(true);
};

const toggleDetails = (checkListBuilderId: number) => {
  setExpandedRows((prev) =>
    prev.includes(checkListBuilderId) ? prev.filter((id) => id !== checkListBuilderId) : [...prev, checkListBuilderId]
  )
}

const activeColumns = columns.filter(
  (col) => col.key === 'actions' || visibleColumns.includes(col.key)
)

const renderActions = (row: ChecklistBuilderOverviewRow) => {
    const isExpanded = expandedRows.includes(row.checkListBuilderId
  )
    return (
      <div className="d-flex gap-2">
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          onClick={() => toggleDetails(row.checkListBuilderId)}
        >
        {isExpanded ? 'Hide' : 'Show'}
        </CButton>
        <CButton
          size="sm"
          color="info"
          variant="ghost"
          onClick={() => navigate(`/depot/checklist-builder/${row.checkListBuilderId}`, { state: { viewMode: true } })}
          title="View"
        >
          <CIcon icon={cilSearch} />
        </CButton>
        {canUpdate && (
          <CButton
            size="sm"
            color="primary"
            variant="ghost"
            onClick={() => navigate(`/depot/checklist-builder/${row.checkListBuilderId}`)}
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
              result = await dispatch(deleteChecklist(row.checkListBuilderId));
            if (result.meta.requestStatus === 'fulfilled') {
              setSuccessMessage("Checklist deleted successfully!");
              setShowSuccessModal(true);
            } else {
              throw new Error(result.payload || 'Failed to delete checklist builder');
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

const scopedColumns = {
  active: (item: any) => {
    const isActive = String(item.status || '').toLowerCase() === 'yes' || item.active === 1
    return (
      <td>
        <CBadge color={isActive ? 'success' : 'secondary'} shape="rounded-pill">
          {isActive ? 'Active' : 'Inactive'}
        </CBadge>
      </td>
    )
  },
  show_details: (item: any) => {
    return (
      <td className="py-2">
        <CButton
          color="primary"
          variant="outline"
          shape="square"
          size="sm"
          onClick={() => {
            toggleDetails(item.checkListBuilderId)
          }}
        >
          {expandedRows.includes(item.checkListBuilderId) ? 'Hide' : 'Show'}
        </CButton>
      </td>
    )
  },
  actions: (item: ChecklistBuilderOverviewRow) => <td>{renderActions(item)}</td>,
  details: (item: any) => {
            return (
              <CCollapse visible={expandedRows.includes(item.checkListBuilderId)}>
                <CCardBody className="p-4">
                  <h5 className="mb-3 checklist-details">Checklist Details</h5>
                  <CRow className="g-3">
                    <CCol md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-body-secondary mb-1">CHECKLIST ID</strong>
                        <span>{item.checkListBuilderId}</span>
                      </div>
                    </CCol>
                    <CCol md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-body-secondary mb-1">CHECKLIST NAME</strong>
                        <span>{item.checkListName}</span>
                      </div>
                    </CCol>
                    <CCol md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-body-secondary mb-1">GATE TYPE</strong>
                        <span>{item.gateType}</span>
                      </div>
                    </CCol>
                    <CCol md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-body-secondary mb-1">EQUIPMENT SIZE/TYPE</strong>
                        <span>{item.equipmentSizeType}</span>
                      </div>
                    </CCol>
                    <CCol md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-body-secondary mb-1">OWNED EQUIPMENT</strong>
                        <span>{item.isOwnedEquipment}</span>
                      </div>
                    </CCol>
                    <CCol md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-body-secondary mb-1">DEPOTS</strong>
                        <span>{item.depots}</span>
                      </div>
                    </CCol>
                    <CCol md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-body-secondary mb-1">SET AS DEFAULT</strong>
                        <span>{item.isDefaultConfig === 1 ? 'YES' : 'NO'}</span>
                      </div>
                    </CCol>
                    <CCol md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-body-secondary mb-1">CLIENTS</strong>
                        <span>{item.clients}</span>
                      </div>
                    </CCol>
                    <CCol md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-body-secondary mb-1">ACTIVE</strong>
                        <span>{item.active === 1 ? 'YES' : 'NO'}</span>
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
                      onClick={() => navigate(`/depot/checklist-builder/${item.checkListBuilderId}`)}
                    >
                      <CIcon icon={cilPencil} className="me-1" />
                      Edit Checklist
                    </CButton>}
                    { canDelete && 
                    <CButton
                      size="sm"
                      color="danger"
                      variant="outline"
                      onClick={() => 
                        showConfirm("Delete Confirmation", "Are you sure you want to delete this record?", async() => {
                        let result: any;
                        result = await dispatch(deleteChecklist(item.checkListBuilderId));
                      if (result.meta.requestStatus === 'fulfilled') {
                        setSuccessMessage("Checklist deleted successfully!");
                        setShowSuccessModal(true);
                      } else {
                        throw new Error(result.payload || 'Failed to delete checklist builder');
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

return (
    <CRow className="g-3">
      <CCol xs={12}>
        <PageHero 
          kicker="Checklist Builder"
          icon={cilList}
          title="Checklist Builder"
          subtitle={`Manage your equipment inspection checklists`}
          actions={<div className="d-flex gap-2">
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
                      <CButton color="primary" className="text-white" onClick={() => navigate('/depot/checklist-builder/new')}>
                        <CIcon icon={cilPlus} className="me-2" />
                        New Checklist
                      </CButton>
                    )}
                  </div>}
        />
      </CCol>
      <CCard className="mb-4 shadow-sm trips-card">
        <CCardBody>       
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
                items={list}
                itemsPerPage={10}
                loading={false}
                pagination={false}
                itemsPerPageSelect={false}
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
  )
}

