import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CRow,
  CSmartTable,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilOptions, cilPencil, cilPlus, cilTrash } from '@coreui/icons'
import type { RootState, AppDispatch } from '../../../store'
import { deleteWeek, loadWeeks } from '../store/weeksSlice'
import type { Week } from '../types'
import './WeeksList.scss'

import PageHero from '../../../components/PageHero'

const ACTIVE_STATUS_ID = 1

const WeeksListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { weeks, loading, error } = useSelector((state: RootState) => (state as any).weeks)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'week_id',
    'week_no',
    'week_year',
    'start_date',
    'end_date',
    'active',
    'updated_by',
    'updated_at',
  ])
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Week | null>(null)
  const errorMessage = useMemo(
    () => (error ? extractErrorMessage(error, 'Failed to load weeks') : null),
    [error]
  )
  const [deleteLoading, setDeleteLoading] = useState(false)

  const extractErrorMessage = (payload: any, fallback = 'An unexpected error occurred') => {
    if (!payload) return fallback
    if (typeof payload === 'string') return payload
    if (payload.message && typeof payload.message === 'string') return payload.message
    const data = payload.data ?? payload.response?.data
    if (typeof data === 'string') return data
    if (data?.message && typeof data.message === 'string') return data.message
    if (data && typeof data === 'object') {
      const firstKey = Object.keys(data)[0]
      const firstValue = firstKey ? data[firstKey] : null
      if (typeof firstValue === 'string') return firstValue
      if (Array.isArray(firstValue) && firstValue.length > 0 && typeof firstValue[0] === 'string') {
        return firstValue[0]
      }
    }
    return fallback
  }

  useEffect(() => {
    dispatch(loadWeeks())
  }, [dispatch])

  const filteredWeeks = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return weeks.filter((week: Week) => {
      if (!search) return true
      return (
        String(week.week_no ?? '').toLowerCase().includes(search) ||
        String(week.week_year ?? '').toLowerCase().includes(search) ||
        (week.start_date_display || week.start_date || '').toLowerCase().includes(search) ||
        (week.end_date_display || week.end_date || '').toLowerCase().includes(search) ||
        (week.update_user?.full_name || '').toLowerCase().includes(search)
      )
    })
  }, [weeks, searchTerm])

  const tableItems = useMemo(
    () =>
      filteredWeeks.map((w: any) => ({
        ...w,
        start_date: w.start_date_display || w.start_date || '—',
        end_date: w.end_date_display || w.end_date || '—',
        updated_by: w.update_user?.full_name || '—',
        updated_at: w.update_date_format || '—',
      })),
    [filteredWeeks]
  )

  const columns = [
    { key: 'week_id', label: 'ID', filter: true, sorter: true },
    { key: 'week_no', label: 'Week #', filter: true, sorter: true },
    { key: 'week_year', label: 'Year', filter: true, sorter: true },
    { key: 'start_date', label: 'Start Date', filter: true, sorter: true },
    { key: 'end_date', label: 'End Date', filter: true, sorter: true },
    { key: 'active', label: 'Active', filter: true, sorter: true },
    { key: 'updated_by', label: 'Updated By', filter: true, sorter: true },
    { key: 'updated_at', label: 'Last Update', filter: true, sorter: true },
    { key: 'actions', label: 'Actions', filter: false, sorter: false },
  ]

  const activeColumns = columns.filter((col) => col.key === 'actions' || visibleColumns.includes(col.key as string))

  const scopedColumns = {
    active: (item: any) => {
      const active = Number(item.active ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID
      return (
        <td>
          <CBadge color={active ? 'success' : 'secondary'} shape="rounded-pill">
            {active ? 'Active' : 'Inactive'}
          </CBadge>
        </td>
      )
    },
    actions: (item: any) => (
      <td>
        <div className="action-buttons">
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            title="Edit"
            onClick={() => navigate(`/modules/weeks/edit/${item.week_id}`)}
          >
            <CIcon icon={cilPencil} />
          </CButton>
          <CButton
            color="danger"
            variant="ghost"
            size="sm"
            title="Delete"
            onClick={() => {
              setDeleteTarget(item)
              setDeleteModalVisible(true)
            }}
          >
            <CIcon icon={cilTrash} />
          </CButton>
        </div>
      </td>
    ),
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.week_id) {
      setDeleteModalVisible(false)
      return
    }
    setDeleteLoading(true)
    try {
      await dispatch(deleteWeek(deleteTarget.week_id)).unwrap()
      setToast(
        <CToast autohide delay={4000} color="success" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>Week deleted.</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>
      )
      setDeleteModalVisible(false)
      setDeleteTarget(null)
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to delete week')
      setToast(
        <CToast autohide delay={5000} color="danger" className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>{message}</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCloseDelete = () => {
    if (deleteLoading) return
    setDeleteModalVisible(false)
    setDeleteTarget(null)
  }

  return (
    <CRow className="g-3">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <CCol xs={12}>
        <PageHero
          title="All Weeks"
          subtitle={
            searchTerm
              ? `Showing ${filteredWeeks.length} of ${weeks.length}`
              : `All Weeks (${weeks.length})`
          }
          kicker="Weeks Management"
          icon={cilCalendar}
          actions={
            <div className="d-flex gap-2">
              <CDropdown>
                <CDropdownToggle color="secondary" variant="outline">
                  <CIcon icon={cilOptions} className="me-2" />
                  Visible Columns ({visibleColumns.length})
                </CDropdownToggle>
                <CDropdownMenu className="column-selector-dropdown">
                  <div className="px-3 py-2">
                    <small className="text-body-secondary fw-semibold">SELECT COLUMNS TO DISPLAY</small>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="column-selector-list px-3 py-2">
                    {columns
                      .filter((col) => col.key !== 'actions')
                      .map((col) => (
                        <div key={col.key as string} className="form-check py-1">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`weeks-col-${col.key}`}
                            checked={visibleColumns.includes(col.key as string)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setVisibleColumns([...visibleColumns, col.key as string])
                              } else if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter((key) => key !== col.key))
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={`weeks-col-${col.key}`}>
                            {col.label}
                          </label>
                        </div>
                      ))}
                  </div>
                </CDropdownMenu>
              </CDropdown>
              <CButton color="primary" className="text-white" onClick={() => navigate('/modules/weeks/create')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add
              </CButton>
            </div>
          }
        />
        <CCard className="mb-4 shadow-sm">
          <CCardBody>
            {errorMessage && <CAlert color="danger">{errorMessage}</CAlert>}
            <CRow className="mb-3 align-items-center g-2">
              <CCol xs={12} md={6} lg={4}>
                <CFormInput
                  type="text"
                  placeholder="Search by week, year, dates, user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CCol>
            </CRow>

            <div className="table-responsive mt-3">
              <CSmartTable
                columns={activeColumns}
                items={tableItems}
                itemsPerPage={itemsPerPage}
                pagination
                columnFilter
                sorterValue={{ column: 'week_id', state: 'desc' }}
                columnSorter
                scopedColumns={scopedColumns}
                loading={loading}
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'weeks-table align-middle',
                }}
              />
            </div>

            {!loading && !weeks.length && (
              <div className="text-center py-5 text-body-secondary">
                <h5>No weeks found</h5>
                <p>Use the "Add" button to create your first week.</p>
              </div>
            )}
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
      </CCol>

      <CModal visible={deleteModalVisible} onClose={handleCloseDelete} alignment="center">
        <CModalHeader closeButton={!deleteLoading}>
          <CModalTitle>Delete Week</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Are you sure you want to delete <strong>{deleteTarget?.week_no || 'this week'}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={handleCloseDelete} disabled={deleteLoading}>
            Cancel
          </CButton>
          <CButton color="danger" className="text-white" onClick={confirmDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default WeeksListPage
