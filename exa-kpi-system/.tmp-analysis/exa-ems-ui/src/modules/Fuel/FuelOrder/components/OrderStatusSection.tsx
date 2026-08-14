import React, { useMemo, useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
  CRow,
} from '@coreui/react-pro'

import type { AppDispatch } from '../../../../store'
import type { FuelOrderForm } from '../types/fuelOrder.types'
import {
  updateFuelOrderStatus,
  updatePaymentStatus,
  fetchFuelOrder,
  selectFuelOrderGasSupplierPaymentStatuses,
  selectFuelOrderSubdivisionPaymentStatuses,
  selectFuelOrderReconciliationStatusList,
} from '../store/fuelOrder.slice'
import { permissionService, UPDATE_STATUS } from '../../../../services/auth/permission.service'
import { MODULE_FUEL_ORDERS } from '../../../../constants/modules'

interface Props {
  value: FuelOrderForm
  disabled: boolean
  fuelOrderStatuses: any[]
}

const GS_STATEMENT_LOCKED_IDS = [1606, 1607, 1759]
const SUB_STATEMENT_LOCKED_IDS = [1610, 1611, 1758]
const GS_EDITABLE_FLAT_NAMES = ['not_ready_to_pay', 'ready_to_pay']
const SUB_EDITABLE_FLAT_NAMES = ['not_ready_to_deduct', 'ready_to_deduct']

const OrderStatusSection: React.FC<Props> = ({
  value,
  disabled,
  fuelOrderStatuses,
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const gasSupplierStatuses = useSelector(
    selectFuelOrderGasSupplierPaymentStatuses,
  )
  const subdivisionStatuses = useSelector(
    selectFuelOrderSubdivisionPaymentStatuses,
  )
  const reconciliationStatusList = useSelector(
    selectFuelOrderReconciliationStatusList,
  )

  const resolvedStatusName = useMemo(() => {
    if (value.statusFuelOrderName) return value.statusFuelOrderName
    const statusId = Number(value.statusFuelOrder)
    if (statusId && fuelOrderStatuses.length > 0) {
      const attr = fuelOrderStatuses.find(
        (s: any) => Number(s.attributeItemId ?? s.attribute_item_id) === statusId,
      )
      if (attr?.name) return attr.name
    }
    return 'Unknown'
  }, [value.statusFuelOrderName, value.statusFuelOrder, fuelOrderStatuses])

  const fuelOrderId = value.fuelOrderId
  if (!fuelOrderId) return null

  const reloadOrder = () => {
    dispatch(fetchFuelOrder(fuelOrderId))
  }

  const handleApprove = async () => {
    await dispatch(updateFuelOrderStatus({ orderId: fuelOrderId, action: 'approve' }))
    reloadOrder()
  }

  const handleReject = async () => {
    await dispatch(updateFuelOrderStatus({ orderId: fuelOrderId, action: 'reject' }))
    reloadOrder()
  }

  const handleCancel = async () => {
    await dispatch(updateFuelOrderStatus({ orderId: fuelOrderId, action: 'cancel' }))
    reloadOrder()
  }

  const handlePaymentStatusSave = (
    gsStatus?: number,
    subStatus?: number,
  ) => {
    dispatch(
      updatePaymentStatus({
        fuelOrderId,
        gasSupplierPaymentStatus: gsStatus,
        subdivisionPaymentStatus: subStatus,
      }),
    )
  }

  const canUpdateStatus = permissionService.checkPermission(MODULE_FUEL_ORDERS, UPDATE_STATUS)

  const statusNameLower = resolvedStatusName.toLowerCase()
  const isPending = statusNameLower.includes('pending')
  const isRejected = statusNameLower.includes('rejected')

  const showApproveReject = isPending && !disabled && canUpdateStatus
  const showCancel = (isPending || isRejected) && !disabled && canUpdateStatus

  // Gap 3: Payment status editability based on reconciliation existence and statement locks
  const transactions = (value as any).GasStationTransactions ?? (value as any).fuelAuditor
  const hasReconciliation = Array.isArray(transactions)
    ? transactions.length > 0
    : !!transactions

  const reconciliationNotMatched = (() => {
    if (!hasReconciliation) return false
    const first = Array.isArray(transactions) ? transactions[0] : transactions
    const recStatus = first?.reconciliationStatus ?? first?.statusReconciliationName ?? ''
    return typeof recStatus === 'string'
      ? !recStatus.toLowerCase().includes('matched')
      : true
  })()

  const editablePaymentStatus = hasReconciliation && reconciliationNotMatched

  const gsStatusId = Number(value.gasSupplierPaymentStatus) || 0
  const subStatusId = Number(value.subdivisionPaymentStatus) || 0
  const gsLockedByStatement = GS_STATEMENT_LOCKED_IDS.includes(gsStatusId)
  const subLockedByStatement = SUB_STATEMENT_LOCKED_IDS.includes(subStatusId)

  const isGsPaymentEditable = editablePaymentStatus && !gsLockedByStatement
  const isSubPaymentEditable = editablePaymentStatus && !subLockedByStatement

  const [localGsStatus, setLocalGsStatus] = useState<number | undefined>(gsStatusId || undefined)
  const [localSubStatus, setLocalSubStatus] = useState<number | undefined>(subStatusId || undefined)
  const [paymentDirty, setPaymentDirty] = useState(false)

  useEffect(() => {
    setLocalGsStatus(gsStatusId || undefined)
    setLocalSubStatus(subStatusId || undefined)
    setPaymentDirty(false)
  }, [gsStatusId, subStatusId])

  // Gap 4: Filter payment status options to valid transitions
  const filteredGsStatuses = useMemo(() => {
    if (!isGsPaymentEditable) return gasSupplierStatuses
    return gasSupplierStatuses.filter((s: any) => {
      const fn = s.flat_name_id ?? s.flatNameId ?? ''
      return GS_EDITABLE_FLAT_NAMES.includes(fn) ||
        s.name?.toLowerCase()?.includes('not ready to pay') ||
        s.name?.toLowerCase()?.includes('ready to pay')
    })
  }, [gasSupplierStatuses, isGsPaymentEditable])

  const filteredSubStatuses = useMemo(() => {
    if (!isSubPaymentEditable) return subdivisionStatuses
    return subdivisionStatuses.filter((s: any) => {
      const fn = s.flat_name_id ?? s.flatNameId ?? ''
      return SUB_EDITABLE_FLAT_NAMES.includes(fn) ||
        s.name?.toLowerCase()?.includes('not ready to deduct') ||
        s.name?.toLowerCase()?.includes('ready to deduct')
    })
  }, [subdivisionStatuses, isSubPaymentEditable])

  const resolvedReconciliationName = useMemo(() => {
    if (value.statusReconciliationName) return value.statusReconciliationName
    const statusId = Number(
      (value as any).statusReconciliation ?? (value as any).reconciliationStatus,
    )
    if (statusId && reconciliationStatusList.length > 0) {
      const attr = reconciliationStatusList.find(
        (s: any) => Number(s.attributeItemId ?? s.attribute_item_id) === statusId,
      )
      if (attr?.name) return attr.name
    }
    if (statusId && fuelOrderStatuses.length > 0) {
      const attr = fuelOrderStatuses.find(
        (s: any) => Number(s.attributeItemId ?? s.attribute_item_id) === statusId,
      )
      if (attr?.name) return attr.name
    }
    return ''
  }, [value, reconciliationStatusList, fuelOrderStatuses])

  return (
    <CCard className="mb-3">
      <CCardHeader>
        <strong>Order Status</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3 align-items-center">
          <CCol sm={4}>
            <label className="form-label mb-0">Status</label>
          </CCol>
          <CCol sm={8}>
            <CFormSelect value={resolvedStatusName} disabled>
              <option>{resolvedStatusName}</option>
            </CFormSelect>
          </CCol>
        </CRow>

        <CRow className="mb-3 align-items-center">
          <CCol sm={4}>
            <label className="form-label mb-0">Reconciliation Status</label>
          </CCol>
          <CCol sm={8}>
            <CFormSelect value={resolvedReconciliationName || ''} disabled>
              <option value="">{resolvedReconciliationName || 'N/A'}</option>
            </CFormSelect>
          </CCol>
        </CRow>

        <CRow className="mb-3 align-items-center">
          <CCol sm={4}>
            <label className="form-label mb-0">Gas Supplier Payment Status</label>
          </CCol>
          <CCol sm={8}>
            <CFormSelect
              value={localGsStatus ?? ''}
              disabled={!isGsPaymentEditable}
              onChange={(e) => {
                setLocalGsStatus(Number(e.target.value) || undefined)
                setPaymentDirty(true)
              }}
            >
              <option value="">Select...</option>
              {filteredGsStatuses.map((s: any) => (
                <option
                  key={s.attributeItemId}
                  value={s.attributeItemId}
                >
                  {s.name}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>

        <CRow className="mb-3 align-items-center">
          <CCol sm={4}>
            <label className="form-label mb-0">Subdivision Payment Status</label>
          </CCol>
          <CCol sm={8}>
            <CFormSelect
              value={localSubStatus ?? ''}
              disabled={!isSubPaymentEditable}
              onChange={(e) => {
                setLocalSubStatus(Number(e.target.value) || undefined)
                setPaymentDirty(true)
              }}
            >
              <option value="">Select...</option>
              {filteredSubStatuses.map((s: any) => (
                <option
                  key={s.attributeItemId}
                  value={s.attributeItemId}
                >
                  {s.name}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol>
            <div className="d-flex gap-2">
              {(isGsPaymentEditable || isSubPaymentEditable) && (
                <CButton
                  color="info"
                  size="sm"
                  disabled={!paymentDirty}
                  onClick={() => {
                    handlePaymentStatusSave(localGsStatus, localSubStatus)
                    setPaymentDirty(false)
                  }}
                >
                  Save
                </CButton>
              )}
              {showApproveReject && (
                <>
                  <CButton color="success" size="sm" onClick={handleApprove}>
                    Approve
                  </CButton>
                  <CButton color="danger" size="sm" onClick={handleReject}>
                    Reject
                  </CButton>
                </>
              )}
              {showCancel && (
                <CButton color="secondary" size="sm" onClick={handleCancel}>
                  Cancel
                </CButton>
              )}
            </div>
          </CCol>
        </CRow>

        {value.fuelStatementId && (
          <div className="mb-2">
            <a href={`/fuel/subdivision-fuel-statement/${value.fuelStatementId}`}>
              View Fuel Statement #{value.fuelStatementId}
            </a>
          </div>
        )}
        {value.gasStationStatementId && (
          <div className="mb-3">
            <a
              href={`/fuel/gas-station-fuel-statement/${value.gasStationStatementId}`}
            >
              View Gas Station Statement #{value.gasStationStatementId}
            </a>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default OrderStatusSection
