import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormSelect,
  CRow,
  CSmartTable,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CPagination,
  CPaginationItem,
  CToaster,
  CToast,
  CToastBody,
  CToastClose,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilPlus, cilTrash, cilLibrary, cilWarning, cilSearch } from '@coreui/icons'
import PageHero from '../../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../../store'
import { loadOtherAssets, deleteOtherAsset, loadVehicleTypes, setPage, setPerPage } from '../store/otherAssets.slice'
import { loadCompanies } from '../../../Companies/store/companiesSlice'
import { loadSubdivisions } from '../../Subdivisions/store/subdivisions.slice'
import { permissionService, CREATE, UPDATE, DELETE, READ } from '../../../../services/auth/permission.service'
import { MODULE_OTHER_ASSETS } from '../../../../constants/modules'
import type { OtherAsset } from '../types'
import type { Company } from '../../Companies/types'
import type { Subdivision } from '../../Subdivisions/types'
import type { AttributeItem } from '../../../Attributes/types'

const OtherAssetsListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const { list, loading, vehicleTypes, pagination } = useSelector((state: RootState) => (state as any).otherAssets || {}) as {
    list: OtherAsset[]
    loading: boolean
    vehicleTypes: AttributeItem[]
    pagination: { page: number; perPage: number; total: number }
  }

  const { page, perPage, total } = pagination || { page: 1, perPage: 50, total: 0 }
  const pageCount = Math.max(1, Math.ceil(total / perPage))
  const companies = useSelector<RootState, Company[]>(
    (state) => ((state as any).companies?.companies as Company[]) || []
  )
  const subdivisions = useSelector<RootState, Subdivision[]>(
    (state) => ((state as any).subdivisions?.list as Subdivision[]) || []
  )

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_OTHER_ASSETS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_OTHER_ASSETS, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_OTHER_ASSETS, DELETE)
  const canRead = permissionService.checkPermission(MODULE_OTHER_ASSETS, READ)

  // Delete Modal State
  const [itemToDelete, setItemToDelete] = useState<OtherAsset | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Toasts
  const [toast, addToast] = useState<React.ReactElement | null>(null)
  const toaster = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    dispatch(loadOtherAssets({ page, perPage }))
  }, [dispatch, page, perPage])

  useEffect(() => {
    dispatch(loadCompanies())
    dispatch(loadSubdivisions())
    dispatch(loadVehicleTypes())
  }, [dispatch])

  const handlePageChange = useCallback((newPage: number) => {
    dispatch(setPage(newPage))
  }, [dispatch])

  const handlePerPageChange = useCallback((newPerPage: number) => {
    dispatch(setPerPage(newPerPage))
  }, [dispatch])

  const showToast = (message: string, color: 'success' | 'danger') => {
    addToast(
      <CToast autohide={true} visible={true} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  const handleDeleteClick = (item: OtherAsset) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    const id = itemToDelete.assetsid ?? itemToDelete.genericname1

    if (!id) return

    setDeleteLoading(true)
    try {
      await dispatch(deleteOtherAsset(id)).unwrap()
      showToast('Asset deleted successfully', 'success')
      setShowDeleteModal(false)
      setItemToDelete(null)
      dispatch(loadOtherAssets({ page, perPage }))
    } catch (error: any) {
        console.error('Failed to delete asset', error)
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete asset'
        showToast(errorMessage, 'danger')
    } finally {
      setDeleteLoading(false)
    }
  }

  const vehicleTypeMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(vehicleTypes as AttributeItem[] | undefined)?.forEach((item) => {
      const id = item?.attribute_item_id ?? (item as any)?.attributeItemId ?? (item as any)?.id
      if (id != null) {
        map.set(String(id), item?.name ?? '')
      }
    })
    return map
  }, [vehicleTypes])

  const tableData = useMemo(() => {
    if (!Array.isArray(list)) return []

    const assetTypeLabel = (type: string | number | undefined) => {
      const normalized = String(type ?? '').trim()
      if (normalized === '1') return 'People'
      if (normalized === '2') return 'Vehicle'
      if (normalized === '3') return 'Other'
      return normalized || '—'
    }

    return (list as OtherAsset[]).map((asset) => {
      const attrs = asset.attributes || {}
      const id = asset.assetsid ?? '—'
      const assetType = asset.otherAssetType ?? asset.genericname1
      const vehicleTypeId = attrs['134'] ?? asset.vehicleType
      const vehicleTypeLabel = vehicleTypeId ? vehicleTypeMap.get(String(vehicleTypeId)) || vehicleTypeId : '—'
      const companyName = companies.find((c) => c.company_id === asset.company_id)?.name ?? '—'
      const subdivisionName =
        subdivisions.find((s) => s.subdivision_id === (asset.subdivisionId ?? asset.subdivision_id))?.name ?? '—'
      const identification =
        attrs['194'] ?? attrs['137'] ?? attrs['206'] ?? attrs['asset_identification'] ?? attrs['serie'] ?? '—'

      return {
        ...asset,
        assetId: id,
        identification,
        assetTypeLabel: assetTypeLabel(assetType),
        vehicleTypeLabel: vehicleTypeLabel || '—',
        companyName,
        subdivisionName,
      }
    })
  }, [list, vehicleTypeMap, companies, subdivisions])

  const filteredTableData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return tableData

    return tableData.filter((item) => {
      const values = [
        item.assetId,
        item.identification,
        item.assetTypeLabel,
        item.vehicleTypeLabel,
        item.companyName,
        item.subdivisionName,
      ]
      return values.some((val) => String(val ?? '').toLowerCase().includes(query))
    })
  }, [searchTerm, tableData])

  const columns = [
    { key: 'assetId', label: 'ID', sorter: true, filter: true },
    { key: 'identification', label: 'Asset Identification', sorter: true, filter: true },
    { key: 'assetTypeLabel', label: 'Type', sorter: true, filter: true },
    { key: 'vehicleTypeLabel', label: 'Vehicle Type', sorter: true, filter: true },
    { key: 'companyName', label: 'Company', sorter: true, filter: true },
    { key: 'subdivisionName', label: 'Subdivision', sorter: true, filter: true },
    { key: 'actions', label: 'Actions' },
  ]

  const assetTypeBadgeColor = (label: string) => {
    const normalized = (label || '').toLowerCase()
    if (normalized.includes('people')) return 'info'
    if (normalized.includes('vehicle')) return 'primary'
    if (normalized.includes('other')) return 'warning'
    return 'secondary'
  }

  const scopedColumns = {
    assetTypeLabel: (item: OtherAsset & { assetTypeLabel: string }) => (
      <td>
        <CBadge color={assetTypeBadgeColor(item.assetTypeLabel)} shape="rounded-pill">
          {item.assetTypeLabel}
        </CBadge>
      </td>
    ),
    actions: (item: OtherAsset) => (
      <td className="text-nowrap">
        {canUpdate && (
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            className="me-2"
            onClick={() => navigate(`/assets/otherassets/${item.assetsid}`)}
            title="Edit"
          >
            <CIcon icon={cilPencil} />
          </CButton>
        )}
        {canRead && (
          <CButton
            color="info"
            variant="ghost"
            size="sm"
            className="me-2"
            onClick={() => navigate(`/assets/otherassets/${item.assetsid}?view=true`)}
            title="View"
          >
            <CIcon icon={cilSearch} />
          </CButton>
        )}
        {canDelete && (
          <CButton
            color="danger"
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(item)}
            title="Delete"
          >
            <CIcon icon={cilTrash} />
          </CButton>
        )}
        {!canUpdate && !canDelete && !canRead && (
          <span className="text-muted small">No actions</span>
        )}
      </td>
    ),
  }

  return (
    <CRow>
      <CCol xs={12}>
        <PageHero
          kicker="Assets"
          icon={cilLibrary}
          title="Other Assets"
          subtitle={`Manage people, vehicles, and other equipment migrated from legacy • ${total} items`}
          actions={
            canCreate && (
              <CButton color="primary" className="text-white" onClick={() => navigate('/assets/otherassets/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                New Asset
              </CButton>
            )
          }
        />
        <CCard className="shadow-sm border-0">
          <CCardBody>
            <CRow className="mb-3 align-items-center">
              <CCol xs={12} md={6} lg={4} className="mb-2 mb-md-0">
                <CFormInput
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search other assets"
                />
              </CCol>
            </CRow>

            <div className="table-responsive mt-3">
              <CSmartTable
                items={filteredTableData}
                columns={columns as any}
                loading={loading}
                scopedColumns={scopedColumns}
                columnFilter
                columnSorter
                tableProps={{
                  hover: true,
                  striped: true,
                  responsive: true,
                  className: 'align-middle',
                }}
              />
            </div>

            <CRow className="align-items-center mt-3">
              <CCol xs="auto">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-body-secondary small">Rows per page:</span>
                  <CFormSelect
                    size="sm"
                    style={{ width: '80px' }}
                    value={perPage}
                    onChange={(e) => handlePerPageChange(Number(e.target.value))}
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </CFormSelect>
                </div>
              </CCol>
              <CCol xs="auto" className="ms-auto">
                <div className="d-flex align-items-center gap-3">
                  <span className="text-body-secondary small">
                    {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
                  </span>
                  <CPagination size="sm" className="mb-0">
                    <CPaginationItem disabled={page <= 1} onClick={() => handlePageChange(1)}>
                      &laquo;
                    </CPaginationItem>
                    <CPaginationItem disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                      &lsaquo;
                    </CPaginationItem>
                    {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                      let p: number
                      if (pageCount <= 5) {
                        p = i + 1
                      } else if (page <= 3) {
                        p = i + 1
                      } else if (page >= pageCount - 2) {
                        p = pageCount - 4 + i
                      } else {
                        p = page - 2 + i
                      }
                      return (
                        <CPaginationItem key={p} active={p === page} onClick={() => handlePageChange(p)}>
                          {p}
                        </CPaginationItem>
                      )
                    })}
                    <CPaginationItem disabled={page >= pageCount} onClick={() => handlePageChange(page + 1)}>
                      &rsaquo;
                    </CPaginationItem>
                    <CPaginationItem disabled={page >= pageCount} onClick={() => handlePageChange(pageCount)}>
                      &raquo;
                    </CPaginationItem>
                  </CPagination>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader onClose={() => setShowDeleteModal(false)}>
          <CModalTitle className="text-danger">
            <CIcon icon={cilWarning} className="me-2" />
            Delete Asset
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete asset{' '}
          <strong>{itemToDelete?.assetsid || itemToDelete?.genericname1 || 'this item'}</strong>? This action cannot be
          undone.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={confirmDelete} disabled={deleteLoading} className="text-white">
            {deleteLoading ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      <CToaster ref={toaster} push={toast} placement="top-end" />
    </CRow>
  )
}

export default OtherAssetsListPage
