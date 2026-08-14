import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
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
import { loadIncidents, deleteIncident } from '../store/incidents.slice'
import type { Incident } from '../types'
import { permissionService, CREATE, UPDATE } from '../../../services/auth/permission.service'
import { MODULE_INCIDENTS } from '../../../constants/modules'

const IncidentsListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const params = useParams<{ module?: string; id?: string }>()
  const { list = [], loading } = useSelector((state: RootState) => (state as any).incidents || {})

  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<number | string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<number | string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'incident_id',
    'subject',
    'incident_type_obj_format',
    'incident_cause_obj_format',
    'responsible_data_format',
    'driver_name',
    'truck_plate',
    'trip_id',
    'event_date_format',
    'subdivision_name',
    'client_name',
    'gas_supplier_name',
  ])

  const canCreate = permissionService.checkPermission(MODULE_INCIDENTS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_INCIDENTS, UPDATE)
  const canDelete = canUpdate

  useEffect(() => {
    dispatch(loadIncidents(params?.module ? { module: params.module, id: params.id } : undefined))
  }, [dispatch, params.module, params.id])

  const columns = [
    { key: 'incident_id', label: 'ID', sorter: true, filter: true },
    { key: 'subject', label: 'Subject', sorter: true, filter: true },
    { key: 'incident_type_obj_format', label: 'Incident Type', sorter: true, filter: true },
    { key: 'incident_cause_obj_format', label: 'Incident Cause', sorter: true, filter: true },
    { key: 'responsible_data_format', label: 'Responsible', sorter: true, filter: true },
    { key: 'driver_name', label: 'Driver', sorter: true, filter: true },
    { key: 'truck_plate', label: 'Truck', sorter: true, filter: true },
    { key: 'chassis_no', label: 'Chassis', sorter: true, filter: true },
    { key: 'genset_no', label: 'Genset', sorter: true, filter: true },
    { key: 'trip_id', label: 'Trip #', sorter: true, filter: true },
    { key: 'event_date_format', label: 'Incident Date', sorter: true, filter: true },
    { key: 'subdivision_name', label: 'Subdivision', sorter: true, filter: true },
    { key: 'client_name', label: 'Client', sorter: true, filter: true },
    { key: 'gas_supplier_name', label: 'Gas Supplier', sorter: true, filter: true },
    { key: 'actions', label: 'Actions' },
  ]

  const tableItems = useMemo(() => {
    return (list as Incident[]).map((item) => {
      const join = (raw?: string, formatted?: string) => formatted || raw || '—'
      return {
        ...item,
        incident_type_obj_format: join(item.incident_type, item.incident_type_obj_format),
        incident_cause_obj_format: join(item.incident_cause, item.incident_cause_obj_format),
        responsible_data_format: join(item.responsible, item.responsible_data_format),
        driver_name: item.driver_name || '—',
        truck_plate: item.truck_plate || '—',
        chassis_no: item.chassis_no || '—',
        genset_no: item.genset_no || '—',
        subdivision_name: item.subdivision_name || '—',
        client_name: item.client_name || '—',
        gas_supplier_name: item.gas_supplier_name || '—',
        event_date_format:
          item.event_date_format ||
          (item.event_date ? new Date(Number(item.event_date) * 1000).toLocaleDateString() : '—'),
      }
    })
  }, [list])

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return tableItems
    return (tableItems as any[]).filter((item: any) =>
      [
        item.incident_id,
        item.subject,
        item.incident_type_obj_format,
        item.incident_cause_obj_format,
        item.responsible_data_format,
        item.driver_name,
        item.truck_plate,
        item.chassis_no,
        item.genset_no,
        item.trip_id,
        item.event_date_format,
        item.subdivision_name,
        item.client_name,
        item.gas_supplier_name,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    )
  }, [tableItems, searchTerm])

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || visibleColumns.includes(col.key as string) || col.key === 'incident_id'
  )

  const scopedColumns = {
    incident_id: (item: any) => (
      <td>
        <CBadge color="primary" shape="rounded-pill">
          {item.incident_id}
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
          onClick={() => navigate(`/operations/incidents/${item.incident_id}?mode=view`)}
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
            onClick={() => navigate(`/operations/incidents/${item.incident_id}`)}
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
            disabled={deletingId === item.incident_id}
            onClick={() => setPendingDelete(item.incident_id)}
            title="Delete"
          >
            {deletingId === item.incident_id ? <span className="spinner-border spinner-border-sm" /> : <CIcon icon={cilTrash} />}
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
            title="Incidents"
            subtitle="Manage incident reports with filters and exports."
            actions={
              canCreate ? (
                <CButton color="primary" className="text-white" onClick={() => navigate('/operations/incidents/new')}>
                  <CIcon icon={cilPlus} className="me-2" />
                  New Incident
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
                    placeholder="Search incidents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search incidents"
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
                        .filter((col) => col.key !== 'actions' && col.key !== 'incident_id')
                        .map((col) => (
                          <div key={col.key as string} className="form-check py-1">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`incident-col-${col.key}`}
                              checked={visibleColumns.includes(col.key as string)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setVisibleColumns([...visibleColumns, col.key as string])
                                } else if (visibleColumns.length > 1) {
                                  setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                                }
                              }}
                            />
                            <label className="form-check-label" htmlFor={`incident-col-${col.key}`}>
                              {col.label}
                            </label>
                          </div>
                        ))}
                    </CDropdownMenu>
                  </CDropdown>
                </CCol>
              </CRow>

              <CSmartTable
                cleaner
                clickableRows
                columns={activeColumns}
                columnFilter
                columnSorter
                items={filteredItems}
                itemsPerPage={itemsPerPage}
                itemsPerPageSelect={false}
                loading={loading}
                pagination
                scopedColumns={scopedColumns}
                tableProps={{
                  hover: true,
                  responsive: true,
                  striped: true,
                  className: 'mb-0',
                }}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal visible={pendingDelete !== null} alignment="center" onClose={() => setPendingDelete(null)}>
        <CModalHeader>
          <CModalTitle>Delete Incident</CModalTitle>
        </CModalHeader>
        <CModalBody>Are you sure you want to delete this incident?</CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setPendingDelete(null)}>
            Cancel
          </CButton>
          <CButton
            color="danger"
            className="text-white"
            disabled={deletingId !== null}
            onClick={async () => {
              if (!pendingDelete) return
              setDeletingId(pendingDelete)
              try {
                await dispatch(deleteIncident(pendingDelete)).unwrap()
              } catch (err) {
                // swallow; error handled in slice
              } finally {
                setDeletingId(null)
                setPendingDelete(null)
              }
            }}
          >
            Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default IncidentsListPage
