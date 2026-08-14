import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as Yup from 'yup'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CContainer,
  CSmartTable,
  CSpinner,
  CBadge,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilHome, cilPencil, cilTrash, cilPlus, cilOptions, cilCloudDownload } from '@coreui/icons'

import type { AppDispatch, RootState } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ErrorMessageModal from 'src/components/ErrorMessageModal'
import ConfirmDialog from '../../../../components/ConfirmationModal'
import Comments from '../../../../components/Comments/Comments'
import Attachments from '../../../../components/Attachments/Attachments'
import exportToXlsx from '../../../../utils/exportToXlsx'

import GasSupplierFormComponent, { type GasSupplierFormValue } from '../components/GasSupplierForm'
import { loadAllLocationItems } from '../../../LocationItems/store/locationItemsSlice'

import {
  addSupplier,
  fetchSupplier,
  saveSupplier,
  loadDefaultSupplier,
  fetchStores,
  deleteStore,
  resetChildStatuses,
  selectCurrentSupplier,
  selectGasSupplierSaving,
  selectSupplierLoadingCurrent,
  selectStores,
  selectStoresLoading,
  selectChildStatuses,
} from '../store/gasSupplier.slice'

import { permissionService, UPDATE, DELETE } from '../../../../services/auth/permission.service'
import { MODULE_GASSUPPLIER, getModuleIdByName } from '../../../../constants/modules'

const schema = Yup.object({
  name: Yup.string().trim().min(1, '* name is required').required('* name is required'),
  address: Yup.string().trim().min(1, '* address is required').required('* address is required'),
  email: Yup.string().email('* invalid email').nullable(),
  phone: Yup.string().matches(/^\+?[1-9]\d{1,14}$/, '* invalid phone number').nullable(),
  creditDays: Yup.number().typeError('* must be a number').min(0).nullable(),
  countryId: Yup.number().min(1, '* country is required').required('* country is required'),
  departmentId: Yup.number().min(1, '* department is required').required('* department is required'),
  cityId: Yup.number().min(1, '* city is required').required('* city is required'),
})

const getErrorMessage = (payload: any): string => {
  if (!payload) return 'Something went wrong!'
  if (typeof payload === 'string') return payload
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (typeof first?.message === 'string') return first.message
  }
  if (typeof payload?.message === 'string') return payload.message
  return 'Something went wrong!'
}

const STORE_COLUMN_STORAGE_KEY = 'gasStore_visible_columns'
const ALL_STORE_COLUMNS = [
  { key: 'gasStationsId', label: 'ID', sorter: true, filter: true },
  { key: 'name', label: 'Name', sorter: true, filter: true },
  { key: 'creditDays', label: 'Credit Days', sorter: true, filter: true },
  { key: 'phone', label: 'Phone', sorter: true, filter: true },
  { key: 'email', label: 'Email', sorter: true, filter: true },
  { key: 'country_format', label: 'Country', sorter: true, filter: true },
  { key: 'department_format', label: 'Department', sorter: true, filter: true },
  { key: 'city_format', label: 'City', sorter: true, filter: true },
  { key: 'company_format', label: 'Company', sorter: true, filter: true },
  { key: 'createdAtFormat', label: 'Created', sorter: true, filter: true },
  { key: 'updatedAtFormat', label: 'Updated', sorter: true, filter: true },
  { key: 'active', label: 'Active', sorter: true, filter: false },
  { key: 'actions', label: 'Actions', sorter: false, filter: false },
]

const DEFAULT_STORE_COLUMNS = [
  'gasStationsId', 'name', 'creditDays', 'phone', 'email',
  'country_format', 'department_format', 'city_format', 'company_format', 'active',
]

const loadSavedStoreColumns = () => {
  const saved = localStorage.getItem(STORE_COLUMN_STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return DEFAULT_STORE_COLUMNS
}

const GasSupplierEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null
  const moduleId = getModuleIdByName(MODULE_GASSUPPLIER)
  const viewMode = (location.state as any)?.viewMode === true

  const saving = useSelector(selectGasSupplierSaving)
  const loadingCurrent = useSelector(selectSupplierLoadingCurrent)
  const current = useSelector(selectCurrentSupplier)
  const stores = useSelector(selectStores)
  const storesLoading = useSelector(selectStoresLoading)
  const childStatuses = useSelector(selectChildStatuses)
  const locationData = useSelector((s: RootState) => (s as any).locationitems?.data)

  const canUpdate = permissionService.checkPermission(MODULE_GASSUPPLIER, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_GASSUPPLIER, DELETE)

  const [value, setValue] = useState<GasSupplierFormValue>({
    name: '', address: '', email: '', phone: '', creditDays: '',
    countryId: 0, departmentId: 0, cityId: 0, status: 1, active: 0,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteStoreId, setPendingDeleteStoreId] = useState<number | null>(null)
  const [visibleStoreColumns, setVisibleStoreColumns] = useState<string[]>(loadSavedStoreColumns())

  useEffect(() => {
    dispatch(loadAllLocationItems())
    if (isEdit && editId) {
      dispatch(fetchSupplier(editId))
      dispatch(fetchStores(editId))
    } else {
      dispatch(loadDefaultSupplier())
    }
  }, [dispatch, isEdit, editId])

  useEffect(() => {
    if (!current) return
    setValue({
      name: current.name ?? '',
      address: current.address ?? '',
      email: current.email ?? '',
      phone: current.phone ?? '',
      creditDays: String(current.creditDays ?? ''),
      countryId: current.countryId ?? 0,
      departmentId: current.departmentId ?? 0,
      cityId: current.cityId ?? 0,
      status: current.status ?? 1,
      active: current.active ? 1 : 0,
    })
  }, [current])

  useEffect(() => {
    const toast = (window as any).exaToast
    if (childStatuses.deleted) {
      toast?.success?.('Success', 'Gas Store was Deleted')
      dispatch(resetChildStatuses())
      if (editId) dispatch(fetchStores(editId))
    }
  }, [childStatuses, dispatch, editId])

  useEffect(() => {
    localStorage.setItem(STORE_COLUMN_STORAGE_KEY, JSON.stringify(visibleStoreColumns))
  }, [visibleStoreColumns])

  const setField = (field: keyof GasSupplierFormValue, v: any) =>
    setValue((prev) => ({ ...prev, [field]: v }))

  const hasError = (field: keyof GasSupplierFormValue) =>
    !!touched[field] && !!errors[field]

  const handleReset = () => {
    setValue({
      name: '', address: '', email: '', phone: '', creditDays: '',
      countryId: 0, departmentId: 0, cityId: 0, status: 1, active: 0,
    })
    setErrors({})
    setTouched({})
  }

  const validate = async () => {
    try {
      setErrors({})
      await schema.validate(value, { abortEarly: false })
      return true
    } catch (err: any) {
      const formatted: Record<string, string> = {}
      ;(err?.inner ?? []).forEach((e: any) => {
        if (e?.path) formatted[e.path] = e.message
      })
      setErrors(formatted)
      return false
    }
  }

  const handleSave = async () => {
    try {
      setTouched({
        name: true, address: true, email: true, phone: true, creditDays: true,
        countryId: true, departmentId: true, cityId: true,
      })
      const ok = await validate()
      if (!ok) return

      const payload: any = { ...value }
      if (isEdit && editId) payload.gasStationsParentId = editId
      payload.subdivisions = current?.subdivisions ?? []

      const result = isEdit
        ? await dispatch(saveSupplier(payload))
        : await dispatch(addSupplier(payload))

      if (result?.meta?.requestStatus === 'rejected') {
        setErrorMessage(getErrorMessage((result as any)?.payload))
        setShowErrorModal(true)
        return
      }
      if (result?.meta?.requestStatus === 'fulfilled') {
        const toast = (window as any).exaToast
        toast?.success?.('Success', isEdit ? 'Data was Updated!' : 'Data was Added!')
        navigate('/fuel/gas-supplier')
        return
      }
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err?.message || err))
      setShowErrorModal(true)
    }
  }

  const handleAskDeleteStore = (storeId: number) => {
    if (!canDelete) return
    setPendingDeleteStoreId(storeId)
    setConfirmVisible(true)
  }

  const confirmDeleteStore = async () => {
    if (!pendingDeleteStoreId || !editId) return
    await dispatch(deleteStore({ id: pendingDeleteStoreId, parentId: editId }))
  }

  const activeStoreColumns = ALL_STORE_COLUMNS.filter(
    (col) => col.key === 'actions' || visibleStoreColumns.includes(col.key),
  )

  const handleStoreExportXlsx = async () => {
    const exportColumns = activeStoreColumns
      .filter((col) => col.key !== 'actions')
      .map((col) => ({ key: col.key, label: col.label }))
    await exportToXlsx({
      columns: exportColumns,
      rows: stores ?? [],
      fileName: `gas_stores_${current?.name ?? 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Gas Stores',
    })
  }

  return (
    <CContainer fluid>
      <CCol xs={12}>
        <PageHero
          kicker={viewMode ? 'View Gas Supplier' : isEdit ? 'Edit Gas Supplier' : 'New Gas Supplier'}
          icon={cilHome}
          title="Gas Suppliers"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Gas Supplier Details</strong>
        </CCardHeader>
        <CCardBody>
          {(isEdit && loadingCurrent) || !locationData ? (
            <div className="d-flex justify-content-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <GasSupplierFormComponent
              value={value}
              disabled={viewMode || saving || !canUpdate}
              errors={errors}
              setTouched={setTouched}
              setField={setField}
              hasError={hasError}
              onSubmit={viewMode ? undefined : handleSave}
              onReset={viewMode ? undefined : handleReset}
            />
          )}
        </CCardBody>
        {!viewMode && (
          <CCardFooter className="d-flex justify-content-between">
            <CButton
              onClick={() => navigate('/fuel/gas-supplier')}
              disabled={saving}
              style={{
                borderColor: '#c0392b',
                color: '#c0392b',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.background = 'rgba(192,57,43,0.12)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.background = 'transparent'
              }}
            >
              Cancel
            </CButton>
            {canUpdate && (
              <CButton color="primary" className="text-white" onClick={handleSave} disabled={saving}>
                <CIcon icon={cilSave} className="me-2" />
                {saving ? 'Saving...' : 'Save'}
              </CButton>
            )}
          </CCardFooter>
        )}
      </CCard>

      {isEdit && editId && (
        <CCard className="mb-4 shadow-sm">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Gas Stores of {current?.name ?? ''}</strong>
            <div className="d-flex gap-2">
              <CDropdown>
                <CDropdownToggle color="secondary" variant="outline" size="sm">
                  <CIcon icon={cilOptions} className="me-2" />
                  Columns ({visibleStoreColumns.length})
                </CDropdownToggle>
                <CDropdownMenu className="column-selector-dropdown">
                  <div className="px-3 py-2">
                    <small className="text-body-secondary fw-semibold">SELECT COLUMNS</small>
                  </div>
                  <div className="dropdown-divider" />
                  <div className="column-selector-list">
                    {ALL_STORE_COLUMNS.filter((col) => col.key !== 'actions').map((col) => (
                      <div key={col.key} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`col-store-${col.key}`}
                          checked={visibleStoreColumns.includes(col.key)}
                          onChange={(e) => {
                            if (e.target.checked) setVisibleStoreColumns([...visibleStoreColumns, col.key])
                            else if (visibleStoreColumns.length > 1) setVisibleStoreColumns(visibleStoreColumns.filter((k) => k !== col.key))
                          }}
                        />
                        <label className="form-check-label" htmlFor={`col-store-${col.key}`}>{col.label}</label>
                      </div>
                    ))}
                  </div>
                </CDropdownMenu>
              </CDropdown>
              <CButton color="success" variant="outline" size="sm" onClick={handleStoreExportXlsx} disabled={!stores?.length}>
                <CIcon icon={cilCloudDownload} className="me-2" />
                Export XLSX
              </CButton>
              {canUpdate && (
                <CButton color="primary" size="sm" className="text-white" onClick={() => navigate(`/fuel/gas-supplier/${editId}/new`)}>
                  <CIcon icon={cilPlus} className="me-2" />
                  New Gas Store
                </CButton>
              )}
            </div>
          </CCardHeader>
          <CCardBody>
            <CSmartTable
              items={stores}
              columns={activeStoreColumns}
              itemsPerPage={15}
              pagination
              itemsPerPageSelect
              itemsPerPageOptions={[15, 20, 50, 100]}
              loading={storesLoading}
              columnFilter
              columnSorter
              tableProps={{ hover: true, striped: true, responsive: true, className: 'align-middle' }}
              scopedColumns={{
                active: (item: any) => (
                  <td className="text-center">
                    <CBadge color={item.active ? 'success' : 'danger'}>
                      {item.active ? 'Active' : 'Inactive'}
                    </CBadge>
                  </td>
                ),
                actions: (item: any) => (
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.25rem' }}>
                      {canUpdate && (
                        <CButton color="primary" variant="ghost" size="sm" onClick={() => navigate(`/fuel/gas-supplier/${editId}/${item.gasStationsId}`)} title="Edit">
                          <CIcon icon={cilPencil} />
                        </CButton>
                      )}
                      {canDelete && (
                        <CButton color="danger" variant="ghost" size="sm" onClick={() => handleAskDeleteStore(item.gasStationsId)} title="Delete">
                          <CIcon icon={cilTrash} />
                        </CButton>
                      )}
                    </div>
                  </td>
                ),
              }}
            />
          </CCardBody>
        </CCard>
      )}

      {isEdit && editId && (
        <>
          <Comments moduleId={moduleId} itemId={editId} />
          <Attachments moduleId={moduleId} itemId={editId} />
        </>
      )}

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Confirmation"
        message="Are you sure you want to delete this gas store?"
        onClose={() => { setConfirmVisible(false); setPendingDeleteStoreId(null) }}
        onConfirm={confirmDeleteStore}
      />

      <ErrorMessageModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        errorMessage={errorMessage}
      />
    </CContainer>
  )
}

export default GasSupplierEditPage
