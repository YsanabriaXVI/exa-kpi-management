import type { GroupDefinition, PermissionKey } from '../types/permissions'

const order: PermissionKey[] = [
  'read',
  'create',
  'update',
  'delete',
  'approve',
  'commentRead',
  'commentUpdate',
  'attachmentRead',
  'attachmentUpdate',
  'adminStatement',
  'adminInvoice',
  'invoicePriceKm',
  'statementPriceKm'
]

const catalog = require('../data/permissionCatalog.ts') as { PERMISSION_CATALOG: GroupDefinition[] }

for (const group of catalog.PERMISSION_CATALOG) {
  for (const module of group.modules) {
    const keys = module.permissions.map((p) => p.key)
    const unique = new Set(keys)
    if (unique.size !== keys.length) {
      console.log('Duplicate key', module.key)
    }
    const sorted = [...keys].sort((a, b) => {
      const aIdx = order.indexOf(a as PermissionKey)
      const bIdx = order.indexOf(b as PermissionKey)
      return aIdx - bIdx
    })
    if (JSON.stringify(sorted) !== JSON.stringify(keys)) {
      console.log('Order mismatch', module.key)
    }
  }
}
