import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormSelect,
  CFormSwitch,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSmartTable,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCalculator, cilPlus, cilPencil, cilTrash, cilCheckAlt, cilMinus } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import {
  useGetChargeConfigsQuery,
  useActivateChargeConfigMutation,
  useDeactivateChargeConfigMutation,
  useDeleteChargeConfigMutation,
} from '../api/paymentCoreApi'
import type { ChargeConfigListItem, ChargeConfigListParams, AppliesToType } from '../types.v2'

const ALL_CHARGE_TYPES = ['calculated', 'flexible'] as const
const ALL_APPLIES_TO: AppliesToType[] = ['SUBDIVISION', 'TRUCK', 'DRIVER', 'SUBDIVISION_TRUCK', 'SUBDIVISION_DRIVER', 'CLIENT']

const ChargeConfigListPage: React.FC = () => {
  const { t } = useTranslation('payments')
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [chargeTypeFilter, setChargeTypeFilter] = useState('')
  const [appliesToFilter, setAppliesToFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const queryParams: ChargeConfigListParams = useMemo(() => ({
    page,
    pageSize,
    ...(chargeTypeFilter ? { chargeType: chargeTypeFilter } : {}),
    ...(appliesToFilter ? { appliesToType: appliesToFilter } : {}),
    ...(activeFilter ? { isActive: activeFilter } : {}),
  }), [page, pageSize, chargeTypeFilter, appliesToFilter, activeFilter])

  const { data, isLoading, isFetching } = useGetChargeConfigsQuery(queryParams)

  const [activateConfig] = useActivateChargeConfigMutation()
  const [deactivateConfig] = useDeactivateChargeConfigMutation()
  const [deleteConfig, { isLoading: isDeleting }] = useDeleteChargeConfigMutation()

  const [deleteTarget, setDeleteTarget] = useState<ChargeConfigListItem | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const items = data?.data ?? []
  const meta = data?.meta ?? { total: 0, page: 1, perPage: 20, lastPage: 1 }

  const handleToggleActive = async (item: ChargeConfigListItem) => {
    try {
      if (item.active) {
        await deactivateConfig(item.id).unwrap()
      } else {
        await activateConfig(item.id).unwrap()
      }
    } catch {
      // handled by RTK Query
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteConfig(deleteTarget.id).unwrap()
      setDeleteTarget(null)
      setDeleteError('')
    } catch (err: any) {
      if (err?.status === 409) {
        setDeleteError(t('chargeConfig.deleteConflict'))
      } else {
        setDeleteTarget(null)
        setDeleteError('')
      }
    }
  }

  const columns = [
    { key: 'name', label: t('chargeConfig.columns.name'), sorter: true },
    { key: 'chargeType', label: t('chargeConfig.columns.type') },
    { key: 'entryType', label: t('chargeConfig.columns.entry') },
    { key: 'appliesTo', label: t('chargeConfig.columns.appliesTo') },
    { key: 'costType', label: t('chargeConfig.columns.costType') },
    { key: 'mandatory', label: t('chargeConfig.columns.mandatory') },
    { key: 'active', label: t('chargeConfig.columns.active') },
    { key: 'scopeCount', label: t('chargeConfig.columns.scopes') },
    { key: 'createdAt', label: t('chargeConfig.columns.created'), sorter: true },
    { key: 'actions', label: t('chargeConfig.columns.actions') },
  ]

  const scopedColumns = {
    name: (item: ChargeConfigListItem) => (
      <td><strong>{item.name}</strong></td>
    ),
    chargeType: (item: ChargeConfigListItem) => (
      <td>
        <CBadge color={item.chargeType === 'calculated' ? 'info' : 'primary'} shape="rounded-pill">
          {t(`chargeConfig.chargeType.${item.chargeType}`)}
        </CBadge>
      </td>
    ),
    entryType: (item: ChargeConfigListItem) => (
      <td>
        <CBadge color={item.entryType === 'DEBIT' ? 'danger' : 'success'}>
          {t(`chargeConfig.entry.${item.entryType}`)}
        </CBadge>
      </td>
    ),
    appliesTo: (item: ChargeConfigListItem) => (
      <td>
        <CBadge color="secondary" textColor="dark">
          {t(`chargeConfig.appliesToType.${item.appliesTo}`)}
        </CBadge>
      </td>
    ),
    costType: (item: ChargeConfigListItem) => (
      <td>{t(`chargeConfig.costTypeValue.${item.costType}`)}</td>
    ),
    mandatory: (item: ChargeConfigListItem) => (
      <td className="text-center">
        {item.mandatory
          ? <CIcon icon={cilCheckAlt} className="text-success" />
          : <CIcon icon={cilMinus} className="text-body-secondary" />}
      </td>
    ),
    active: (item: ChargeConfigListItem) => (
      <td>
        <CFormSwitch
          checked={item.active}
          onChange={() => handleToggleActive(item)}
        />
      </td>
    ),
    scopeCount: (item: ChargeConfigListItem) => (
      <td>{item.scopeCount}</td>
    ),
    createdAt: (item: ChargeConfigListItem) => (
      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
    ),
    actions: (item: ChargeConfigListItem) => (
      <td className="text-nowrap">
        <CButton
          color="info"
          variant="ghost"
          size="sm"
          className="me-1"
          onClick={() => navigate(`/administrator/charge-configs/${item.id}`)}
          title={t('actions.edit')}
        >
          <CIcon icon={cilPencil} />
        </CButton>
        <CButton
          color="danger"
          variant="ghost"
          size="sm"
          onClick={() => { setDeleteTarget(item); setDeleteError('') }}
          title={t('actions.delete')}
        >
          <CIcon icon={cilTrash} />
        </CButton>
      </td>
    ),
  }

  return (
    <>
      <PageHero
        kicker="Operations"
        icon={cilCalculator}
        title={t('chargeConfig.title')}
        subtitle={t('chargeConfig.subtitle')}
        actions={
          <CButton color="primary" className="text-white" onClick={() => navigate('/administrator/charge-configs/new')}>
            <CIcon icon={cilPlus} className="me-2" />
            {t('chargeConfig.newConfig')}
          </CButton>
        }
      />

      <CRow>
        <CCol xs={12}>
          <CCard className="shadow-sm border-0">
            <CCardBody>
              <CRow className="mb-3 g-2 align-items-center">
                <CCol xs={12} md={3}>
                  <CFormSelect
                    size="sm"
                    value={chargeTypeFilter}
                    onChange={(e) => { setChargeTypeFilter(e.target.value); setPage(1) }}
                  >
                    <option value="">{t('chargeConfig.filters.allTypes')}</option>
                    {ALL_CHARGE_TYPES.map((ct) => (
                      <option key={ct} value={ct}>{t(`chargeConfig.chargeType.${ct}`)}</option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={3}>
                  <CFormSelect
                    size="sm"
                    value={appliesToFilter}
                    onChange={(e) => { setAppliesToFilter(e.target.value); setPage(1) }}
                  >
                    <option value="">{t('chargeConfig.filters.allEntities')}</option>
                    {ALL_APPLIES_TO.map((at) => (
                      <option key={at} value={at}>{t(`chargeConfig.appliesToType.${at}`)}</option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={3}>
                  <CFormSelect
                    size="sm"
                    value={activeFilter}
                    onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}
                  >
                    <option value="">{t('chargeConfig.filters.allStatuses')}</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </CFormSelect>
                </CCol>
                {isFetching && (
                  <CCol xs="auto">
                    <CSpinner size="sm" />
                  </CCol>
                )}
              </CRow>

              <div className="table-responsive">
                <CSmartTable
                  items={items}
                  columns={columns as any}
                  itemsPerPage={pageSize}
                  activePage={page}
                  loading={isLoading}
                  scopedColumns={scopedColumns}
                  noItemsLabel={t('chargeConfig.empty')}
                  onActivePageChange={(val) => setPage(val)}
                  tableProps={{
                    hover: true,
                    striped: true,
                    responsive: true,
                    className: 'align-middle',
                  }}
                  paginationProps={{
                    pages: meta.lastPage,
                    activePage: meta.page,
                  }}
                />
              </div>

              {meta.total > 0 && (
                <div className="text-body-secondary small mt-2">
                  {t('common.total', { count: meta.total })}
                </div>
              )}
            </CCardBody>
            <div className="d-flex justify-content-end align-items-center pe-3 pb-2">
              <span className="me-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
              <CDropdown direction="dropup">
                <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
                  {pageSize}
                </CDropdownToggle>
                <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
                  {[15, 20, 50, 100].map((n) => (
                    <CDropdownItem
                      key={n}
                      active={n === pageSize}
                      onClick={() => { setPageSize(n); setPage(1) }}
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
      </CRow>

      {/* Delete Confirmation Modal */}
      <CModal alignment="center" visible={deleteTarget !== null} onClose={() => { setDeleteTarget(null); setDeleteError('') }}>
        <CModalHeader closeButton>
          <CModalTitle>{t('confirm.title')}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {deleteTarget && t('chargeConfig.confirmDelete', { name: deleteTarget.name })}
          {deleteError && (
            <div className="text-danger mt-2">{deleteError}</div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteError('') }}>
            {t('confirm.cancel')}
          </CButton>
          <CButton
            color="danger"
            className="text-white"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? <CSpinner size="sm" /> : t('actions.delete')}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default ChargeConfigListPage
