import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CCard, CCardBody, CCardHeader, CSmartTable, CButton,
  CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CFormInput,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilSettings } from '@coreui/icons'
import type { AppDispatch } from '../../../../store'
import { MODULE_SUPPLIER_FUEL_STATEMENT } from '../../../../constants/modules'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../../services/auth/permission.service'
import PageHero from '../../../../components/PageHero'
import ConfirmationModal from '../../../../components/ConfirmationModal'
import {
  fetchGasStationFuelStatementList,
  deleteGasStationFuelStatement,
  resetStatuses,
  selectGSFuelStmtList,
  selectGSFuelStmtLoadingList,
  selectGSFuelStmtStatuses,
} from '../store/gasStationFuelStatement.slice'

const STORAGE_KEY = 'gs_fuel_stmt_cols'

const ALL_COLUMNS = [
  { key: 'fuelStatementId', label: 'Fuel Statement ID', _style: { minWidth: '140px' } },
  { key: 'gasStationName', label: 'Gas Station', _style: { minWidth: '160px' } },
  { key: 'subdivisions', label: 'Subdivisions', _style: { minWidth: '160px' } },
  { key: 'reconciliations', label: 'Reconciliation Numbers', _style: { minWidth: '180px' } },
  { key: 'fuelOrders', label: 'Fuel Orders', _style: { minWidth: '140px' } },
  { key: 'actions', label: 'Actions', _style: { width: '120px' }, filter: false, sorter: false },
]

const DEFAULT_VISIBLE = ['fuelStatementId', 'gasStationName', 'subdivisions', 'reconciliations', 'fuelOrders', 'actions']

const GasStationFuelStatementListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const list = useSelector(selectGSFuelStmtList)
  const loading = useSelector(selectGSFuelStmtLoadingList)
  const statuses = useSelector(selectGSFuelStmtStatuses)

  const canCreate = permissionService.checkPermission(MODULE_SUPPLIER_FUEL_STATEMENT, CREATE)
  const canEdit = permissionService.checkPermission(MODULE_SUPPLIER_FUEL_STATEMENT, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_SUPPLIER_FUEL_STATEMENT, DELETE)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [filterValue, setFilterValue] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_VISIBLE
  })

  useEffect(() => {
    dispatch(fetchGasStationFuelStatementList())
  }, [dispatch])

  useEffect(() => {
    if (statuses.deleted) {
      const toast = (window as any).exaToast
      toast?.success?.('Success', 'Statement was deleted successfully')
      dispatch(fetchGasStationFuelStatementList())
      dispatch(resetStatuses())
    }
  }, [statuses.deleted, dispatch])

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
      dispatch(deleteGasStationFuelStatement(deleteId))
      setDeleteId(null)
    }
  }, [deleteId, dispatch])

  const filteredItems = filterValue
    ? list.filter((item) =>
        Object.values(item).some(
          (v) => v != null && String(v).toLowerCase().includes(filterValue.toLowerCase()),
        ),
      )
    : list

  return (
    <>
      <PageHero title="Gas Station Fuel Statement" />
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <CFormInput
              placeholder="Search..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="form-control w-auto"
            />
            {filterValue && (
              <CButton color="secondary" variant="outline" size="sm" onClick={() => setFilterValue('')} style={{ whiteSpace: 'nowrap' }}>
                Clear Filters
              </CButton>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            <CDropdown>
              <CDropdownToggle color="secondary" variant="outline" size="sm">
                <CIcon icon={cilSettings} size="sm" /> Columns
              </CDropdownToggle>
              <CDropdownMenu className="column-selector-dropdown">
                <div className="column-selector-list">
                  {ALL_COLUMNS.filter((c) => c.key !== 'actions').map((col) => (
                    <label key={col.key} className="dropdown-item d-flex align-items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </CDropdownMenu>
            </CDropdown>
            {canCreate && (
              <CButton color="primary" size="sm" onClick={() => navigate('/fuel/gas-station-fuel-statement/new')}>
                <CIcon icon={cilPlus} size="sm" /> New
              </CButton>
            )}
          </div>
        </CCardHeader>
        <CCardBody>
          <CSmartTable
            items={filteredItems}
            columns={columns}
            loading={loading}
            itemsPerPage={itemsPerPage}
            pagination
            sorter
            tableProps={{ responsive: true, striped: true, hover: true }}
            scopedColumns={{
              actions: (item: any) => (
                <td>
                  <div className="d-flex gap-1">
                    {canEdit && (
                      <CButton
                        color="info"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/fuel/gas-station-fuel-statement/${item.fuelStatementId}`)}
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
        </CCardBody>

        {/* Custom items-per-page selector */}
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
      <ConfirmationModal
        visible={deleteId != null}
        title="Delete Statement"
        message="Are you sure you want to delete this gas station fuel statement?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}

export default GasStationFuelStatementListPage
