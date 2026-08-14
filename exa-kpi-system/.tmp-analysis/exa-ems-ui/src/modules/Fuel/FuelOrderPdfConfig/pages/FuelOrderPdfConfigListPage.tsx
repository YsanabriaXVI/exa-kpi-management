import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilFilterX,
  cilOptions,
  cilDescription,
  cilCheck,
  cilX,
} from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ConfirmDialog from '../../../../components/ConfirmationModal'

import {
  deletePdfConfig,
  fetchPdfConfigs,
  resetStatuses,
  selectPdfConfigErrors,
  selectPdfConfigStatuses,
  selectPdfConfigList,
  selectPdfConfigLoadingList,
} from '../store/fuelOrderPdfConfig.slice'

import { permissionService, CREATE, UPDATE, DELETE } from '../../../../services/auth/permission.service'
import { MODULE_FORMAT_BUILDER } from '../../../../constants/modules'

const COLUMN_STORAGE_KEY = 'fuelOrderPdfConfig_visible_columns_v2'

const defaultColumns = ['configName', 'subdivisions', 'fuelPriceEnabled', 'importEnabled', 'totalEnabled']

const loadSavedColumns = () => {
  const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      /* ignore */
    }
  }
  return defaultColumns
}

const BoolCell: React.FC<{ value?: boolean }> = ({ value }) =>
  value ? (
    <CIcon icon={cilCheck} className="text-success" />
  ) : (
    <CIcon icon={cilX} className="text-danger" />
  )

const FuelOrderPdfConfigListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectPdfConfigList)
  const errors = useSelector(selectPdfConfigErrors)
  const statuses = useSelector(selectPdfConfigStatuses)
  const loading = useSelector(selectPdfConfigLoadingList)

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())
  const [searchValue, setSearchValue] = useState('')

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const canCreate = permissionService.checkPermission(MODULE_FORMAT_BUILDER, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_FORMAT_BUILDER, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_FORMAT_BUILDER, DELETE)

  useEffect(() => {
    dispatch(fetchPdfConfigs())
  }, [dispatch])

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    if (!errors) return
    const toast = (window as any).exaToast
    const msg = typeof errors === 'string' ? errors : 'An error occurred loading PDF Configurations'
    toast?.error ? toast.error('Error', msg) : console.error(msg)
  }, [errors])

  useEffect(() => {
    const toast = (window as any).exaToast
    if (statuses.added) toast?.success?.('Success', 'PDF Config was Added')
    if (statuses.updated) toast?.success?.('Success', 'PDF Config was Updated')
    if (statuses.deleted) toast?.success?.('Success', 'PDF Config was Deleted')

    if (statuses.added || statuses.updated || statuses.deleted) {
      dispatch(resetStatuses())
      dispatch(fetchPdfConfigs())
    }
  }, [statuses, dispatch])

  const handleOpenNew = () => canCreate && navigate('/fuel/settings/pdf-builder/new')
  const handleOpenEdit = (id: number) => canUpdate && navigate(`/fuel/settings/pdf-builder/${id}`)

  const handleAskDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await dispatch(deletePdfConfig(pendingDeleteId))
  }

  const tableItems = useMemo(() => list ?? [], [list])

  const handleTableFilterChange = (value: string) => {
    setSearchValue(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {}, 600)
  }

  const hasActiveFilters = searchValue.trim().length > 0

  const handleClearFilters = () => {
    setSearchValue('')
  }

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return tableItems
    return tableItems.filter((x: any) => {
      const haystack = [x.configName, x.subdivisions]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
      return haystack.includes(q)
    })
  }, [tableItems, searchValue])

  const columns = [
    { key: 'configName', label: 'Config Name', sorter: true, filter: true },
    { key: 'subdivisions', label: 'Subdivisions', sorter: true, filter: true },
    { key: 'fuelPriceEnabled', label: 'Fuel Price', sorter: false, filter: false },
    { key: 'importEnabled', label: 'Import', sorter: false, filter: false },
    { key: 'totalEnabled', label: 'Total', sorter: false, filter: false },
    { key: 'actions', label: 'Actions', sorter: false, filter: false },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key),
  )

  return (
    <CContainer fluid>
      <PageHero
        kicker="Fuel Settings"
        icon={cilDescription}
        title="PDF Builder"
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
                    .filter((col) => col.key !== 'actions')
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
              <CButton color="primary" className="text-white" onClick={handleOpenNew}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Config
              </CButton>
            )}
          </div>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          {errors && (
            <CAlert color="danger" className="mb-3">
              {typeof errors === 'string' ? errors : 'An error occurred loading PDF Configurations'}
            </CAlert>
          )}

          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto" className="mb-2 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
                <input
                  className="form-control w-auto"
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
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={handleClearFilters}
                  >
                    <CIcon icon={cilFilterX} className="me-1" />
                    Clear Filters
                  </button>
                )}
              </div>
            </CCol>
          </CRow>

          <CSmartTable
            items={filteredItems}
            columns={activeColumns}
            itemsPerPage={itemsPerPage}
            pagination
            loading={loading}
            columnSorter
            tableFilter={false}
            tableProps={{
              hover: true,
              striped: true,
              responsive: true,
              className: 'align-middle',
            }}
            scopedColumns={{
              fuelPriceEnabled: (item: any) => (
                <td className="text-center">
                  <BoolCell value={item.fuelPriceEnabled} />
                </td>
              ),
              importEnabled: (item: any) => (
                <td className="text-center">
                  <BoolCell value={item.importEnabled} />
                </td>
              ),
              totalEnabled: (item: any) => (
                <td className="text-center">
                  <BoolCell value={item.totalEnabled} />
                </td>
              ),
              actions: (item: any) => (
                <td>
                  {canUpdate && (
                    <CButton
                      color="warning"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(item.id)}
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
                      onClick={() => handleAskDelete(item.id)}
                      title="Delete"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  )}
                  {!canUpdate && !canDelete && (
                    <span className="text-muted small">View only</span>
                  )}
                </td>
              ),
            }}
          />
        </CCardBody>

        <div className="d-flex justify-content-end align-items-center pe-3 pb-2">
          <span className="me-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
          <CDropdown direction="dropup">
            <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
              {itemsPerPage}
            </CDropdownToggle>
            <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
              {[15, 20, 50, 100].map((n) => (
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
      </CCard>

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Confirmation"
        message="Are you sure you want to delete this PDF Config?"
        onClose={() => {
          setConfirmVisible(false)
          setPendingDeleteId(null)
        }}
        onConfirm={confirmDelete}
      />
    </CContainer>
  )
}

export default FuelOrderPdfConfigListPage
