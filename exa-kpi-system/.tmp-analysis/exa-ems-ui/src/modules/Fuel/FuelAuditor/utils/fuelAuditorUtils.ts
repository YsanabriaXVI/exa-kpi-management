import type { FuelOrderSummary } from '../types/fuelAuditor.types'

// Gas Supplier payment status IDs
export const GAS_NOT_READY = 1604
export const GAS_READY = 1605
export const GAS_INVOICE_RECEIVED = 1606
export const GAS_INVOICE_PAID = 1607
export const GAS_NOT_APPLY = 1759

// Subdivision payment status IDs
export const SUB_NOT_READY = 1608
export const SUB_READY = 1609
export const SUB_DEDUCTED = 1610
export const SUB_DECLARED = 1611
export const SUB_NOT_APPLY = 1758

export type StatusGroup = 'not_ready' | 'ready' | 'declared' | 'completed' | 'not_apply' | 'unknown'

export function getStatusGroup(statusId: number | null | undefined): StatusGroup {
  if (statusId == null) return 'unknown'
  if (statusId === GAS_NOT_READY || statusId === SUB_NOT_READY) return 'not_ready'
  if (statusId === GAS_READY || statusId === SUB_READY) return 'ready'
  if (statusId === GAS_INVOICE_RECEIVED || statusId === SUB_DECLARED) return 'declared'
  if (statusId === GAS_INVOICE_PAID || statusId === SUB_DEDUCTED) return 'completed'
  if (statusId === GAS_NOT_APPLY || statusId === SUB_NOT_APPLY) return 'not_apply'
  return 'unknown'
}

interface StatusListItem {
  attributeItemId?: number
  flat_name_id?: string
}

/**
 * Full validation for payment status transitions, matching legacy business rules.
 *
 * Checks performed:
 * 1. Approval — order must be Approved before setting to Not Ready
 * 2. Reconciliation — order must be Reconciled before setting to Ready
 * 3. Statement — order must be in a Statement before setting to Declared/Invoice Received
 * 4. Statement lock — cannot revert to Ready/Not Ready while in a Statement
 */
export function validatePaymentStatusChange(
  fuelOrder: FuelOrderSummary | null | undefined,
  fieldName: 'gas_supplier_payment_status' | 'subdivision_payment_status',
  newStatusValue: number,
  fuelOrderStatusList?: StatusListItem[],
): { valid: boolean; message?: string } {
  if (!fuelOrder) return { valid: true }

  const newStatus = Number(newStatusValue)
  const group = getStatusGroup(newStatus)
  const isSubdivision = fieldName === 'subdivision_payment_status'

  const isApproved = (): boolean => {
    if (!fuelOrder.statusFuelOrder) return false
    if (fuelOrderStatusList && fuelOrderStatusList.length > 0) {
      const s = fuelOrderStatusList.find(
        (x) => x.attributeItemId === Number(fuelOrder.statusFuelOrder),
      )
      return !!(s && s.flat_name_id === 'approved')
    }
    return false
  }

  const hasReconciliation = (): boolean => {
    return !!(
      (fuelOrder.fuelAuditor && fuelOrder.fuelAuditor.fuelOrderId) ||
      fuelOrder.gasStationTransactionId
    )
  }

  const isInStatement = (): boolean => {
    return isSubdivision
      ? !!fuelOrder.fuelStatementId
      : !!(fuelOrder.gasSupplierStatementId || fuelOrder.gasStationStatementId)
  }

  if (group === 'not_ready') {
    if (!isApproved()) {
      return {
        valid: false,
        message: 'Order must be Approved to be set to Not Ready.',
      }
    }
  }

  if (group === 'ready') {
    if (!hasReconciliation()) {
      return {
        valid: false,
        message: 'Order must be Reconciled to be set to Ready.',
      }
    }
  }

  if (group === 'declared') {
    if (!isInStatement()) {
      return {
        valid: false,
        message:
          'Order must be included in a Statement to be set to Declared/Invoice Received.',
      }
    }
  }

  if (isInStatement()) {
    if (group === 'not_ready' || group === 'ready') {
      return {
        valid: false,
        message:
          'Cannot revert status to Ready/Not Ready while Order is in a Statement. Remove from statement first.',
      }
    }
  }

  return { valid: true }
}

/**
 * Simplified validation for bulk operations where the full fuelOrder context
 * is not available. Only allows transitions between not_ready and ready.
 */
export function validateSimpleStatusTransition(
  currentStatusId: number | null | undefined,
  newStatusId: number,
): { valid: boolean; message?: string } {
  const currentGroup = getStatusGroup(currentStatusId)
  const newGroup = getStatusGroup(newStatusId)

  if (currentGroup === 'completed') {
    return { valid: false, message: 'Cannot change status once it has been Paid/Deducted.' }
  }

  if (currentGroup === 'declared') {
    if (newGroup === 'not_ready' || newGroup === 'ready') {
      return { valid: false, message: 'Cannot revert from Declared/Invoice Received.' }
    }
    return { valid: true }
  }

  if (currentGroup === 'ready' && newGroup === 'completed') {
    return { valid: true }
  }

  if (
    (currentGroup === 'not_ready' || currentGroup === 'unknown' || currentGroup === 'not_apply') &&
    (newGroup === 'ready' || newGroup === 'not_ready' || newGroup === 'not_apply')
  ) {
    return { valid: true }
  }

  if (currentGroup === 'not_ready' && newGroup === 'completed') {
    return { valid: false, message: 'Must change to "Ready" before "Paid/Deducted".' }
  }

  return { valid: true }
}
