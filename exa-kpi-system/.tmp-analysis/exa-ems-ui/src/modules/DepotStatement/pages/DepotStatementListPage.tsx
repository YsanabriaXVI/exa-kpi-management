import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { deleteStatement as deleteRentalStatement } from '../store/rentalStatement.slice'
import { deleteStorageStatement } from '../store/storageStatement.slice'
import { clearRentalStatementErrors } from '../store/rentalStatement.slice'
import { clearStorageStatementErrors } from '../store/storageStatement.slice'
import SuccessMessageModal from 'src/components/SuccessMessageModal'
import { permissionService, UPDATE, CREATE, DELETE } from '../../../services/auth/permission.service'
import { MODULE_DEPOTSTATEMENT } from 'src/constants/modules'
import { cilSearch, cilPlus } from '@coreui/icons'

import {
  CContainer,
  CCard,
  CCardBody,
  CButton,
  CSmartTable,
  CRow,
  CCol,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CCollapse,
  CBadge,
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'
import { cilOptions, cilPencil, cilTrash } from '@coreui/icons'

import type { AppDispatch } from '../../../store'
import PageHero from '../../../components/PageHero'

import { loadDepotStatementsList, clearStatementErrors } from '../store/global.slice'
import ErrorModal from 'src/components/ErrorMessageModal'
import ConfirmDialog from '../../../components/ConfirmationModal'

const COLUMN_STORAGE_KEY = 'depotStatements_visible_columns'

const loadSavedColumns = () => {
  const saved = sessionStorage.getItem(COLUMN_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return ['depotStatementId', 'statementTypeName', 'clientName']
    }
  }
  return ['depotStatementId', 'statementTypeName', 'clientName']
}

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A'
  return new Date(value).toISOString().split('T')[0]
}

const DepotStatementListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const { list, loading, error: globalError } = useSelector((state: any) => state.depotStatement);
  console.log('depotStatement list: ', list);
  const rentalError = useSelector((s: any) => s.rentalDepotStatement?.errors ?? false)
  const storageError = useSelector((s: any) => s.storageDepotStatement?.errors ?? false)

  const [searchValue, setSearchValue] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadSavedColumns())

  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<any>(null)

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [expandedRows, setExpandedRows] = useState<number[]>([])

  const canCreate = permissionService.checkPermission(MODULE_DEPOTSTATEMENT, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_DEPOTSTATEMENT, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_DEPOTSTATEMENT, DELETE)

  useEffect(() => {
    dispatch(loadDepotStatementsList())
    dispatch(clearStatementErrors())
  }, [dispatch])

  useEffect(() => {
    if (globalError) {
      setErrorMessage(globalError)
      setShowErrorModal(true)
    }

    if (rentalError) {
      setErrorMessage(rentalError)
      setShowErrorModal(true)
    }

    if (storageError) {
      setErrorMessage(storageError)
      setShowErrorModal(true)
    }
  }, [globalError, rentalError, storageError])

  useEffect(() => {
    sessionStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return list

    return list.filter((x: any) => {
      const haystack = [
        x.depotStatementId,
        x.statementTypeName,
        x.clientName,
        x.taxRate,
        x.total,
      ]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')

      return haystack.includes(q)
    })
  }, [list, searchValue])

  const toggleErrorModal = (show: boolean) => {
    setShowErrorModal(show)

    if (!show) {
      dispatch(clearStatementErrors())
      dispatch(clearRentalStatementErrors())
      dispatch(clearStorageStatementErrors())
    }
  }

  const toggleDetails = (depotStatementId: number) => {
    setExpandedRows((prev) =>
      prev.includes(depotStatementId)
        ? prev.filter((id) => id !== depotStatementId)
        : [...prev, depotStatementId]
    )
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return

    const type = pendingDelete.statement_type?.flat_name_id

    try {
      if (type === 'rental') {
        const res = await dispatch(deleteRentalStatement(pendingDelete.depotStatementId))
        if (res?.meta?.requestStatus === 'fulfilled') {
          dispatch(loadDepotStatementsList())
          setSuccessMessage(`Rental depot statement #${res?.meta?.arg} deleted successfully`)
          setShowSuccessModal(true)
        }
      }

      if (type === 'storage') {
        const res = await dispatch(deleteStorageStatement(pendingDelete.depotStatementId))
        if (res?.meta?.requestStatus === 'fulfilled') {
          dispatch(loadDepotStatementsList())
          setSuccessMessage(`Storage depot statement #${res?.meta?.arg} deleted successfully`)
          setShowSuccessModal(true)
        }
      }

      setConfirmVisible(false)
      setPendingDelete(null)
    } catch (error) {
      console.log('error', error)
    }
  }

  const columns = [
    { key: 'depotStatementId', label: 'Statement ID', sorter: true },
    { key: 'statementTypeName', label: 'Type', sorter: true },
    { key: 'clientName', label: 'Client', sorter: true },
    { key: 'taxRate', label: 'Tax Rate', sorter: true },
    { key: 'total', label: 'Total', sorter: true },
    /* {
      key: 'show_details',
      label: 'Details',
      filter: false,
      sorter: false,
    }, */
    { key: 'actions', label: 'Actions', sorter: false, filter: false },
  ]

  const activeColumns = columns.filter(
    (col) => col.key === 'actions' || col.key === 'show_details' || visibleColumns.includes(col.key)
  )

  const toggleSuccessModal = (show: boolean) => {
    setShowSuccessModal(show)
    if (!show) {
      setSuccessMessage('')
    }
  }

  const renderActions = (row: any) => {
    return (
      <div className="d-flex align-items-center gap-2 flex-nowrap">
        <CButton
          color="secondary"
          variant="outline"
          shape="square"
          size="sm"
          onClick={() => toggleDetails(row.depotStatementId)}
        >
          {expandedRows.includes(row.depotStatementId) ? 'Hide' : 'Show'}
        </CButton>
        <CButton
          size="sm"
          color="info"
          variant="ghost"
          onClick={() =>
            navigate(
              `/depot-main/depot-statement/${row.depotStatementId}/${row.statement_type?.flat_name_id}`,
              { state: { viewMode: true } }
            )
          }
          title="View"
        >
          <CIcon icon={cilSearch} />
        </CButton>

        {canUpdate && (
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(
                `/depot-main/depot-statement/${row.depotStatementId}/${row.statement_type?.flat_name_id}`
              )
            }
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
            onClick={() => {
              setPendingDelete(row)
              setConfirmVisible(true)
            }}
            title="Delete"
          >
            <CIcon icon={cilTrash} />
          </CButton>
        )}
      </div>
    )
  }

  return (
    <CContainer fluid>
      <PageHero
        kicker="Depot"
        title="Depot Statements"
        subtitle="Manage storage and rental statements"
        actions={
          <div className="d-flex gap-2">
            <CDropdown>
              <CDropdownToggle color="secondary" variant="outline">
                <CIcon icon={cilOptions} className="me-2" />
                Visible Columns ({visibleColumns.length})
              </CDropdownToggle>

              <CDropdownMenu className="p-3">
                {columns
                  .filter((c) => c.key !== 'actions' && c.key !== 'show_details')
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
              </CDropdownMenu>
            </CDropdown>

            {canCreate && (
              <CButton
                color="primary"
                className="text-white"
                onClick={() => navigate('/depot-main/depot-statement/new')}
              >
                <CIcon icon={cilPlus} className="me-2" />
                New Statement
              </CButton>
            )}
          </div>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardBody>
          {globalError && (
            <div className="alert alert-danger">
              {typeof globalError === 'string' ? globalError : 'Error loading Depot Statements'}
            </div>
          )}

          <CRow className="mb-3 align-items-center">
            <CCol xs={12} md="auto">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 me-2">Search:</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Search..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  style={{ minWidth: '250px' }}
                />
              </div>
            </CCol>
          </CRow>

          <CSmartTable
            items={filteredItems}
            columns={activeColumns}
            loading={loading}
            pagination
            columnSorter
            columnFilter
            tableProps={{
              hover: true,
              striped: true,
              responsive: true,
              className: 'align-middle',
            }}
            scopedColumns={{
              total: (item: any) => <td><strong>{item.total ?? 'N/A'}</strong></td>,

              taxRate: (item: any) => <td>{item.taxRate ?? 'N/A'}</td>,

              actions: (item: any) => <td>{renderActions(item)}</td>,

              details: (item: any) => {
                const isExpanded = expandedRows.includes(item.depotStatementId)
                const isStorage = item.statement_type?.flat_name_id === 'storage'
                const isRental = item.statement_type?.flat_name_id === 'rental'

                return (
                  <CCollapse visible={isExpanded}>
                    <CCardBody className="p-4">
                      <h5 className="mb-3">Depot Statement Details</h5>

                      <CRow className="g-3">
                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-1">STATEMENT ID</strong>
                          <span>{item.depotStatementId}</span>
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-1">START DATE</strong>
                          <span>{formatDate(item.startDate)}</span>
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-1">CLIENT</strong>
                          <span>{item.clientName}</span>
                        </CCol>

                        
                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-1">TAX RATE</strong>
                          <span>{item.taxRate ?? 'N/A'}</span>
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-1">TYPE</strong>
                          <span>{item.statementTypeName}</span>
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-1">END DATE</strong>
                          <span>{formatDate(item.endDate)}</span>
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-1">EXCHANGE RATE</strong>
                          <span>{item.exchangeRate ?? 'N/A'}</span>
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-1">PAID</strong>
                          <span>
                            <CBadge color={item.paid ? 'success' : 'warning'}>
                              {item.paid ? 'Yes' : 'No'}
                            </CBadge>
                          </span>
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-1">COMMENTS</strong>
                          <span>{item.comments || 'No comments'}</span>
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-1">TOTAL</strong>
                          <span>{item.total ?? 'N/A'}</span>
                        </CCol>

                      </CRow>

                      <hr className="my-4" />

                      <CRow className="g-3">
                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-2">DEPOTS</strong>
                          {item.depots?.length ? (
                            <ul className="mb-0 ps-3">
                              {item.depots.map((depot: any) => (
                                <li key={depot.DSDepotId}>{depot.Depot.depotName}</li>
                              ))}
                            </ul>
                          ) : (
                            <span>N/A</span>
                          )}
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-2">WEEKS</strong>
                          {item.weeks?.length ? (
                            <ul className="mb-0 ps-3">
                              {item.weeks.map((week: any) => (
                                <li key={week.DSWeekId}>{week.week_data.weekyear} - W {week.week_data.weekno}</li>
                              ))}
                            </ul>
                          ) : (
                            <span>N/A</span>
                          )}
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-2">JOBS</strong>
                          {item.jobs?.length ? (
                            <ul className="mb-0 ps-3">
                              {item.jobs.map((job: any) => (
                                <li key={job.DSJobId}>{job.AttributeItem.name}</li>
                              ))}
                            </ul>
                          ) : (
                            <span>N/A</span>
                          )}
                        </CCol>

                        <CCol md={3}>
                          <strong className="d-block text-body-secondary mb-2">GATE IDs</strong>
                          {((item.invoiceLines?.length ?? 0) > 0 || (item.DSRentalComboInvoiceLines?.length ?? 0) > 0) ? (
                            <ul className="mb-0 ps-3">
                              {[
                                ...new Set([
                                  ...(item.invoiceLines ?? []).map((line: any) => line.gateId),
                                  ...(item.DSRentalComboInvoiceLines ?? []).map((line: any) => line.gateId),
                                ].filter((gateId) => gateId != null)),
                              ].map((gateId) => (
                                <li key={gateId}>{gateId}</li>
                              ))}
                            </ul>
                          ) : (
                            <span>N/A</span>
                          )}
                        </CCol>
                      </CRow>

                      <div className="mt-4 d-flex align-items-center gap-2 flex-wrap">
                        <CButton
                          size="sm"
                          color="info"
                          onClick={() =>
                            navigate(
                              `/depot-main/depot-statement/${item.depotStatementId}/${item.statement_type?.flat_name_id}`,
                              { state: { viewMode: true } }
                            )
                          }
                        >
                          <CIcon icon={cilSearch} className="me-1" />
                          View
                        </CButton>

                        {canUpdate && (
                          <CButton
                            size="sm"
                            color="primary"
                            onClick={() =>
                              navigate(
                                `/depot-main/depot-statement/${item.depotStatementId}/${item.statement_type?.flat_name_id}`
                              )
                            }
                          >
                            <CIcon icon={cilPencil} className="me-1" />
                            Edit
                          </CButton>
                        )}

                        {canDelete && (
                          <CButton
                            size="sm"
                            color="danger"
                            variant="outline"
                            onClick={() => {
                              setPendingDelete(item)
                              setConfirmVisible(true)
                            }}
                          >
                            <CIcon icon={cilTrash} className="me-1" />
                            Delete
                          </CButton>
                        )}
                      </div>
                    </CCardBody>
                  </CCollapse>
                )
              },
            }}
          />
        </CCardBody>
      </CCard>

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Confirmation"
        message="Are you sure you want to delete this record?"
        onClose={() => {
          setConfirmVisible(false)
          setPendingDelete(null)
        }}
        onConfirm={confirmDelete}
      />

      <ErrorModal
        showErrorModal={showErrorModal}
        setShowErrorModal={(arg: boolean) => toggleErrorModal(arg)}
        errorMessage={errorMessage}
      />

      <SuccessMessageModal
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={(arg: boolean) => toggleSuccessModal(arg)}
        successMessage={successMessage}
      />
    </CContainer>
  )
}

export default DepotStatementListPage