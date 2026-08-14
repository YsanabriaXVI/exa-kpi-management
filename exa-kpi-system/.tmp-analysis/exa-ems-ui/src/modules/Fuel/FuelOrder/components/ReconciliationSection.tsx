import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableRow,
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'
import { cilCheck, cilX } from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import type { FuelOrderForm, ReconciliationPayload } from '../types/fuelOrder.types'
import {
  addReconciliation,
  updateReconciliation,
  deleteReconciliation,
  syncFuelPrice,
  resetReconciliationStatuses,
  updateReconciliationForm,
  resetReconciliationForm,
  selectFuelOrderPaymentMethods,
  selectFuelOrderReconciliationForm,
  selectFuelOrderSettings,
  selectFuelOrderFuelTypes,
} from '../store/fuelOrder.slice'
import { permissionService, CREATE, DELETE, READ } from '../../../../services/auth/permission.service'
import { MODULE_FUEL_ORDER_RECONCILIATION } from '../../../../constants/modules'
import ConfirmDialog from '../../../../components/ConfirmationModal'

interface Props {
  fuelOrder: FuelOrderForm
  disabled: boolean
  isApprovedOrder?: boolean
}

const emptyReconciliation: ReconciliationPayload = {
  fuelOrderId: 0,
  licensePlate: '',
  fuelType: '',
  measureUnit: 'Liter',
  unitPrice: 0,
  quantity: 0,
  currency: 'LPS',
  amount: 0,
  transactionId: '',
  documentNumber: '',
  paymentMethod: '',
  dateTime: '',
}

const ReconciliationSection: React.FC<Props> = ({ fuelOrder, disabled, isApprovedOrder }) => {
  const dispatch = useDispatch<AppDispatch>()
  const paymentMethods = useSelector(selectFuelOrderPaymentMethods)
  const reduxFormData = useSelector(selectFuelOrderReconciliationForm)
  const settings = useSelector(selectFuelOrderSettings)
  const fuelTypesList = useSelector(selectFuelOrderFuelTypes)

  const existingReconciliation = (fuelOrder as any).fuelAuditor
  const hasExistingTransaction = !!existingReconciliation?.gasStationTransactionId

  const formData: ReconciliationPayload = reduxFormData ?? {
    ...emptyReconciliation,
    fuelOrderId: fuelOrder.fuelOrderId ?? 0,
    licensePlate: fuelOrder.plate ?? '',
  }

  useEffect(() => {
    if (!reduxFormData) {
      if (hasExistingTransaction) {
        // GAP 21: Populate from existing transaction data
        const txn = existingReconciliation
        dispatch(resetReconciliationForm({
          fuelOrderId: fuelOrder.fuelOrderId ?? 0,
          licensePlate: txn.licensePlate ?? fuelOrder.plate ?? '',
          fuelType: txn.fuelType ?? '',
          measureUnit: txn.measureUnit ?? 'Liter',
          unitPrice: txn.unitPrice ?? 0,
          quantity: txn.quantity ?? 0,
          currency: txn.currency ?? 'LPS',
          amount: txn.amount ?? 0,
          transactionId: txn.transactionId ?? '',
          documentNumber: txn.documentNumber ?? '',
          paymentMethod: txn.paymentMethod ?? '',
          dateTime: txn.dateTime ?? '',
        }))
      } else {
        dispatch(resetReconciliationForm({
          ...emptyReconciliation,
          fuelOrderId: fuelOrder.fuelOrderId ?? 0,
          licensePlate: fuelOrder.plate ?? '',
        }))
      }
    }
  }, [dispatch, reduxFormData, fuelOrder.fuelOrderId, fuelOrder.plate, hasExistingTransaction])

  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const fuelOrderId = fuelOrder.fuelOrderId
  if (!fuelOrderId) return null

  const canReadReconciliation = permissionService.checkPermission(MODULE_FUEL_ORDER_RECONCILIATION, READ)
  const canCreateReconciliation = permissionService.checkPermission(MODULE_FUEL_ORDER_RECONCILIATION, CREATE)
  const canDeleteReconciliation = permissionService.checkPermission(MODULE_FUEL_ORDER_RECONCILIATION, DELETE)

  const statusName = fuelOrder.statusFuelOrderName?.toLowerCase() ?? ''
  const isApprovedStatus =
    isApprovedOrder === true ||
    statusName.includes('approved') ||
    statusName.includes('pending') ||
    statusName.includes('cancel')

  if (!canReadReconciliation || !isApprovedStatus) return null

  // Legacy behavior: receipt fields are editable when the receipt is empty, even on approved orders
  const receiptFieldsDisabled = hasExistingTransaction || (disabled && !isApprovedOrder)

  // GAP 4: Use dynamic exchange rate from fuel price data instead of hardcoded value
  const dynamicExchangeRate =
    (fuelOrder as any).fuelPrice?.fuelPriceLocationWeek?.exchangeRate ??
    (fuelOrder as any).fuelPrice?.exchangeRate
  const exchangeRate = Number(dynamicExchangeRate) || 24.5
  const LITERS_PER_GALLON = 3.785
  const GALLONS_PER_LITER = 0.264172

  const calcAmount = (up: number, qty: number) =>
    Math.round(up * qty * 10000) / 10000

  const setRecField = (field: string, value: any) => {
    const updates: Partial<ReconciliationPayload> = { [field]: value }

    if (field === 'unitPrice' || field === 'quantity') {
      const up = field === 'unitPrice' ? (Number(value) || 0) : (Number(formData.unitPrice) || 0)
      const qty = field === 'quantity' ? (Number(value) || 0) : (Number(formData.quantity) || 0)
      updates.amount = calcAmount(up, qty)
    }

    if (field === 'currency') {
      const prevCurrency = formData.currency
      const newCurrency = value as string
      if (prevCurrency && newCurrency && prevCurrency !== newCurrency) {
        const prevUp = Number(formData.unitPrice) || 0
        if (newCurrency === 'USD' && prevCurrency === 'LPS') {
          updates.unitPrice = parseFloat((prevUp / exchangeRate).toFixed(4))
        } else if (newCurrency === 'LPS' && prevCurrency === 'USD') {
          updates.unitPrice = parseFloat((prevUp * exchangeRate).toFixed(4))
        }
        updates.amount = calcAmount(Number(updates.unitPrice ?? formData.unitPrice) || 0, Number(formData.quantity) || 0)
      }
    }

    if (field === 'measureUnit') {
      const prevUnit = formData.measureUnit
      const newUnit = value as string
      const qty = Number(formData.quantity) || 0
      if (prevUnit && newUnit && prevUnit !== newUnit && qty > 0) {
        if (newUnit === 'Liter' && prevUnit === 'Gallon') {
          updates.quantity = parseFloat((qty * LITERS_PER_GALLON).toFixed(2))
        } else if (newUnit === 'Gallon' && prevUnit === 'Liter') {
          updates.quantity = parseFloat((qty * GALLONS_PER_LITER).toFixed(2))
        }
        updates.amount = calcAmount(Number(updates.unitPrice ?? formData.unitPrice) || 0, Number(updates.quantity ?? formData.quantity) || 0)
      }
    }

    dispatch(updateReconciliationForm(updates))
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validateReconciliation = (): boolean => {
    const errs: Record<string, string> = {}
    if (!formData.transactionId?.trim()) errs.transactionId = 'Required'
    if (!formData.documentNumber?.trim()) errs.documentNumber = 'Required'
    if (!formData.paymentMethod?.trim()) errs.paymentMethod = 'Required'
    if (!formData.dateTime) errs.dateTime = 'Required'
    if (!formData.fuelType?.trim()) errs.fuelType = 'Required'
    if (!formData.measureUnit?.trim()) errs.measureUnit = 'Required'
    if (Number(formData.unitPrice) < 0) errs.unitPrice = 'Must be >= 0'
    if (Number(formData.quantity) < 0) errs.quantity = 'Must be >= 0'
    if (!formData.currency?.trim()) errs.currency = 'Required'
    if (Number(formData.amount) < 0) errs.amount = 'Must be >= 0'
    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validateReconciliation()) return
    const payload = { ...formData, fuelOrderId }
    if (hasExistingTransaction) {
      dispatch(
        updateReconciliation({
          transactionId: existingReconciliation.gasStationTransactionId,
          data: payload,
        }),
      )
    } else {
      dispatch(addReconciliation(payload))
    }
  }

  const handleDelete = (transactionId: number) => {
    setPendingDeleteId(transactionId)
    setConfirmDeleteVisible(true)
  }

  const confirmDeleteAction = async () => {
    if (pendingDeleteId) {
      await dispatch(deleteReconciliation(pendingDeleteId))
      dispatch(resetReconciliationStatuses())
    }
  }

  const handleSyncPrice = () => {
    dispatch(syncFuelPrice(fuelOrderId))
  }

  const unitPrice = fuelOrder.unitPrice ?? (fuelOrder as any).fuelPrice?.price ?? 0
  const fuelRequestLtr = fuelOrder.fuelRequestLtr ?? fuelOrder.fuelRequestLiters ?? 0
  const orderAmount = unitPrice * (fuelRequestLtr as number)
  const orderFuelTypeName = fuelOrder.fuelTypeName ||
    fuelTypesList.find(ft => ft.attributeItemId === Number(fuelOrder.fuelType))?.name || '-'
  const orderMeasureUnit = 'Liter'
  const orderCurrency = (fuelOrder as any).fuelPrice?.currency ?? 'LPS'

  const buildComparisonItems = () => {
    const variationMin = Number(settings?.fuelSupplyVariationMin ?? settings?.fuelVariationMin) || 0
    const variationMax = Number(settings?.fuelSupplyVariationMax ?? settings?.fuelVariationMax) || 0
    const orderQty = Number(fuelRequestLtr) || 0
    const receiptQty = Number(formData.quantity) || 0
    const receiptAmount = Number(formData.amount) || 0

    const items: { label: string; isMatch: boolean; statusText: string }[] = []

    const plateMatch = formData.licensePlate === fuelOrder.plate
    items.push({
      label: 'Plate',
      isMatch: plateMatch,
      statusText: plateMatch
        ? 'Match'
        : `Mismatch: expected ${fuelOrder.plate || '-'}, got ${formData.licensePlate || '-'}`,
    })

    const fuelTypeMatch = formData.fuelType === orderFuelTypeName
    items.push({
      label: 'Fuel Type',
      isMatch: fuelTypeMatch,
      statusText: fuelTypeMatch
        ? 'Match'
        : `Mismatch: expected ${orderFuelTypeName}, got ${formData.fuelType || '-'}`,
    })

    const measureUnitMatch = formData.measureUnit === orderMeasureUnit
    items.push({
      label: 'Measure Unit',
      isMatch: measureUnitMatch,
      statusText: measureUnitMatch
        ? 'Match'
        : `Mismatch: expected ${orderMeasureUnit}, got ${formData.measureUnit || '-'}`,
    })

    const unitPriceMatch = Math.abs((formData.unitPrice ?? 0) - unitPrice) < 0.01
    items.push({
      label: 'Unit Price',
      isMatch: unitPriceMatch,
      statusText: unitPriceMatch
        ? 'Match'
        : `Mismatch: expected ${unitPrice} ${orderCurrency}, got ${formData.unitPrice ?? 0} ${orderCurrency}`,
    })

    let qtyMatch: boolean
    let qtyText: string
    if (!receiptQty && !orderQty) {
      qtyMatch = true
      qtyText = 'Match'
    } else if (variationMin || variationMax) {
      const minAllowed = orderQty - (orderQty * variationMin / 100)
      const maxAllowed = orderQty + (orderQty * variationMax / 100)
      qtyMatch = receiptQty >= minAllowed && receiptQty <= maxAllowed
      qtyText = qtyMatch
        ? 'Match'
        : `Mismatch: expected ${minAllowed.toFixed(2)} to ${maxAllowed.toFixed(2)} liters, got ${receiptQty} liters`
    } else {
      qtyMatch = Math.abs(receiptQty - orderQty) < 0.01
      qtyText = qtyMatch
        ? 'Match'
        : `Mismatch: expected ${orderQty} liters, got ${receiptQty} liters`
    }
    items.push({ label: 'Quantity', isMatch: qtyMatch, statusText: qtyText })

    const currencyMatch = formData.currency === orderCurrency
    items.push({
      label: 'Currency',
      isMatch: currencyMatch,
      statusText: currencyMatch
        ? 'Match'
        : `Mismatch: expected ${orderCurrency}, got ${formData.currency || '-'}`,
    })

    let amtMatch: boolean
    let amtText: string
    if (!receiptAmount && !orderAmount) {
      amtMatch = true
      amtText = 'Match'
    } else if ((variationMin || variationMax) && unitPrice > 0) {
      const minQty = orderQty - (orderQty * variationMin / 100)
      const maxQty = orderQty + (orderQty * variationMax / 100)
      const minAmount = unitPrice * minQty
      const maxAmount = unitPrice * maxQty
      amtMatch = receiptAmount >= minAmount && receiptAmount <= maxAmount
      amtText = amtMatch
        ? 'Match'
        : `Mismatch: expected ${minAmount.toFixed(2)} to ${maxAmount.toFixed(2)} ${orderCurrency}, got ${receiptAmount} ${orderCurrency}`
    } else {
      amtMatch = Math.abs(receiptAmount - orderAmount) < 0.01
      amtText = amtMatch
        ? 'Match'
        : `Mismatch: expected ${orderAmount.toFixed(2)} ${orderCurrency}, got ${receiptAmount} ${orderCurrency}`
    }
    items.push({ label: 'Amount', isMatch: amtMatch, statusText: amtText })

    return items
  }

  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>Fuel Auditor Reconciliation</strong>
        {!disabled && (
          <CButton color="info" size="sm" onClick={handleSyncPrice}>
            Sync Price
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3">
          <CCol md={4}>
            <CCard className="h-100">
              <CCardHeader className="py-2 d-flex justify-content-between align-items-center">
                <small className="fw-semibold">Gas Station Receipt</small>
                {hasExistingTransaction && (
                  <a
                    href={`/fuel/fuel-auditor/${existingReconciliation.gasStationTransactionId}`}
                    className="small"
                  >
                    View Transaction #{existingReconciliation.gasStationTransactionId}
                  </a>
                )}
              </CCardHeader>
              <CCardBody>
                <div className="mb-2">
                  <CFormLabel className="small mb-1">Plate</CFormLabel>
                  <CFormInput
                    size="sm"
                    type="text"
                    value={formData.licensePlate}
                    disabled={receiptFieldsDisabled}
                    onChange={(e) => setRecField('licensePlate', e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  {/* GAP 11: Fuel Type as select dropdown instead of free text */}
                  <CFormLabel className="small mb-1">Fuel Type</CFormLabel>
                  <CFormSelect
                    size="sm"
                    value={formData.fuelType}
                    disabled={receiptFieldsDisabled}
                    invalid={!!validationErrors.fuelType}
                    onChange={(e) => setRecField('fuelType', e.target.value)}
                  >
                    <option value="">Select...</option>
                    {fuelTypesList.map((ft: any) => (
                      <option key={ft.attributeItemId} value={ft.name}>
                        {ft.name}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
                <div className="mb-2">
                  <CFormLabel className="small mb-1">Measure Unit</CFormLabel>
                  <CFormSelect
                    size="sm"
                    value={formData.measureUnit}
                    disabled
                    onChange={(e) => setRecField('measureUnit', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Liter">Liter</option>
                    <option value="Gallon">Gallon</option>
                  </CFormSelect>
                </div>
                <div className="mb-2">
                  <CFormLabel className="small mb-1">Unit Price</CFormLabel>
                  <CFormInput
                    size="sm"
                    type="number"
                    step="0.01"
                    value={formData.unitPrice ?? ''}
                    disabled={receiptFieldsDisabled}
                    invalid={!!validationErrors.unitPrice}
                    onChange={(e) =>
                      setRecField('unitPrice', Number(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="mb-2">
                  <CFormLabel className="small mb-1">Quantity</CFormLabel>
                  <CFormInput
                    size="sm"
                    type="number"
                    step="0.01"
                    value={formData.quantity ?? ''}
                    disabled={receiptFieldsDisabled}
                    invalid={!!validationErrors.quantity}
                    onChange={(e) =>
                      setRecField('quantity', Number(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="mb-2">
                  <CFormLabel className="small mb-1">Currency</CFormLabel>
                  <CFormSelect
                    size="sm"
                    value={formData.currency}
                    disabled
                    onChange={(e) => setRecField('currency', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="LPS">LPS</option>
                    <option value="USD">USD</option>
                  </CFormSelect>
                </div>
                <div className="mb-2">
                  <CFormLabel className="small mb-1">Amount</CFormLabel>
                  <CFormInput
                    size="sm"
                    type="number"
                    step="0.01"
                    value={formData.amount ?? ''}
                    disabled={receiptFieldsDisabled}
                    invalid={!!validationErrors.amount}
                    onChange={(e) =>
                      setRecField('amount', Number(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="mb-2">
                  <CFormLabel className="small mb-1">Transaction ID</CFormLabel>
                  <CFormInput
                    size="sm"
                    value={formData.transactionId}
                    disabled={receiptFieldsDisabled}
                    invalid={!!validationErrors.transactionId}
                    onChange={(e) =>
                      setRecField('transactionId', e.target.value)
                    }
                  />
                </div>
                <div className="mb-2">
                  <CFormLabel className="small mb-1">Document #</CFormLabel>
                  <CFormInput
                    size="sm"
                    value={formData.documentNumber}
                    disabled={receiptFieldsDisabled}
                    invalid={!!validationErrors.documentNumber}
                    onChange={(e) =>
                      setRecField('documentNumber', e.target.value)
                    }
                  />
                </div>
                <div className="mb-2">
                  <CFormLabel className="small mb-1">Payment Method</CFormLabel>
                  <CFormSelect
                    size="sm"
                    value={formData.paymentMethod}
                    disabled={receiptFieldsDisabled}
                    invalid={!!validationErrors.paymentMethod}
                    onChange={(e) =>
                      setRecField('paymentMethod', e.target.value)
                    }
                  >
                    <option value="">Select...</option>
                    {paymentMethods.map((pm: any) => (
                      <option
                        key={pm.attributeItemId}
                        value={pm.name}
                      >
                        {pm.name}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
                <div className="mb-2">
                  <CFormLabel className="small mb-1">Date/Time</CFormLabel>
                  <CFormInput
                    size="sm"
                    type="datetime-local"
                    value={formData.dateTime}
                    disabled={receiptFieldsDisabled}
                    invalid={!!validationErrors.dateTime}
                    onChange={(e) => setRecField('dateTime', e.target.value)}
                  />
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol md={4}>
            <CCard className="h-100">
              <CCardHeader className="py-2">
                <small className="fw-semibold">Fuel Order Data</small>
              </CCardHeader>
              <CCardBody>
                <CTable small bordered>
                  <CTableBody>
                    <CTableRow>
                      <CTableDataCell className="fw-semibold">Plate</CTableDataCell>
                      <CTableDataCell>{fuelOrder.plate ?? '-'}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell className="fw-semibold">Fuel Type</CTableDataCell>
                      <CTableDataCell>{orderFuelTypeName}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell className="fw-semibold">Measure Unit</CTableDataCell>
                      <CTableDataCell>{orderMeasureUnit}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell className="fw-semibold">Unit Price</CTableDataCell>
                      <CTableDataCell>{unitPrice || '-'}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell className="fw-semibold">Quantity (Ltr)</CTableDataCell>
                      <CTableDataCell>{fuelRequestLtr || '-'}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell className="fw-semibold">Currency</CTableDataCell>
                      <CTableDataCell>{orderCurrency}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell className="fw-semibold">Amount</CTableDataCell>
                      <CTableDataCell>
                        {orderAmount ? orderAmount.toFixed(2) : '-'}
                      </CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol md={4}>
            <CCard className="h-100">
              <CCardHeader className="py-2">
                <small className="fw-semibold">Comparison</small>
              </CCardHeader>
              <CCardBody className="p-2">
                {buildComparisonItems().map((item) => (
                  <div
                    key={item.label}
                    className="d-flex align-items-start py-2 px-1"
                    style={{ borderBottom: '1px solid #dee2e6' }}
                  >
                    <CIcon
                      icon={item.isMatch ? cilCheck : cilX}
                      className={item.isMatch ? 'text-success me-2' : 'text-danger me-2'}
                      style={{ flexShrink: 0, marginTop: 2, width: 16, height: 16 }}
                    />
                    <div>
                      <span className="fw-semibold small">{item.label}: </span>
                      <span className={`small ${item.isMatch ? 'text-success' : 'text-danger'}`}>
                        {item.statusText}
                      </span>
                    </div>
                  </div>
                ))}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>

        {(!disabled || isApprovedOrder) && (
          <div className="d-flex gap-2 mt-3">
            {canCreateReconciliation && (
              <CButton color="primary" size="sm" onClick={handleSave}>
                {hasExistingTransaction
                  ? 'Update Reconciliation'
                  : 'Create Reconciliation'}
              </CButton>
            )}
            {hasExistingTransaction && canDeleteReconciliation && (
              <CButton
                color="danger"
                size="sm"
                onClick={() =>
                  handleDelete(existingReconciliation.gasStationTransactionId)
                }
              >
                Delete Reconciliation
              </CButton>
            )}
          </div>
        )}
      </CCardBody>

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete Reconciliation"
        message="Are you sure you want to delete this reconciliation?"
        onClose={() => {
          setConfirmDeleteVisible(false)
          setPendingDeleteId(null)
        }}
        onConfirm={confirmDeleteAction}
      />
    </CCard>
  )
}

export default ReconciliationSection
