import type { PermissionKey } from '../types/permissions'

export interface ActionMetaOverride {
  key?: PermissionKey
  label?: string
  help?: string
}

const createMeta = (key: PermissionKey, label: string, help?: string): ActionMetaOverride => ({
  key,
  label,
  help,
})

export const ACTION_META_OVERRIDES: Record<string, ActionMetaOverride> = {
  read: createMeta('read', 'Read'),
  create: createMeta('create', 'Create'),
  update: createMeta('update', 'Update'),
  delete: createMeta('delete', 'Delete'),
  approve: createMeta('approve', 'Approve'),
  'status update': createMeta('statusUpdate', 'Status Update'),
  'comment read': createMeta('commentRead', 'Comment Read'),
  'comment update': createMeta('commentUpdate', 'Comment Update'),
  'attchment read': createMeta('attachmentRead', 'Attachment Read'),
  'attchment update': createMeta('attachmentUpdate', 'Attachment Update'),
  'admin invoice': createMeta('adminInvoice', 'Admin Invoice'),
  'admin statement': createMeta('adminStatement', 'Admin Statement'),
  'invoice price & km': createMeta('invoicePriceKm', 'Invoice Price & Km'),
  'statement price & km': createMeta('statementPriceKm', 'Statement Price & Km'),
  'request trip': createMeta('requestTrip', 'Request Trip'),
  'approve trip request': createMeta('approveTripRequest', 'Approve Trip Request'),
}

export const PERMISSION_ORDER: PermissionKey[] = [
  'read',
  'create',
  'update',
  'delete',
  'approve',
  'statusUpdate',
  'commentRead',
  'commentUpdate',
  'attachmentRead',
  'attachmentUpdate',
  'adminInvoice',
  'adminStatement',
  'invoicePriceKm',
  'statementPriceKm',
  'requestTrip',
  'approveTripRequest',
]

export const MODULE_SCOPEABLES = new Set<string>(['locations', 'other assets', 'container'])

export const SECTION_CONFIG: Record<
  string,
  {
    key: string
    title: string
    order: number
  }
> = {
  administrator: { key: 'administrator', title: 'Administrator', order: 1 },
  operations: { key: 'operations', title: 'Operations', order: 2 },
  assets: { key: 'assets', title: 'Assets', order: 3 },
  fuel: { key: 'fuel', title: 'Fuel', order: 4 },
  depots: { key: 'depots', title: 'Depots', order: 5 },
  reports: { key: 'reports', title: 'Reports', order: 6 },
  'mobile apps': { key: 'mobile apps', title: 'Mobile Apps', order: 7 },
}
