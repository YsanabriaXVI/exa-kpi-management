import type { GroupState, ModuleDescriptor, ModuleState, PermissionDefinition, PermissionKey } from '../types/permissions'
import { ACTION_META_OVERRIDES, MODULE_SCOPEABLES, SECTION_CONFIG } from '../data/permissionCatalog'

export interface ActionDescriptor {
  action_id: number
  name: string
}

export interface ActionLookup {
  byName: Record<string, number>
  byId: Record<number, string>
}

const initializeGranted = (permissions: PermissionDefinition[]): Record<PermissionKey, boolean> =>
  permissions.reduce(
    (acc, permission) => ({
      ...acc,
      [permission.key]: false,
    }),
    {} as Record<PermissionKey, boolean>
  )

const cloneModule = (module: ModuleState): ModuleState => ({
  ...module,
  granted: { ...module.granted },
})

const cloneGroups = (source: GroupState[]): GroupState[] =>
  source.map((group) => ({
    ...group,
    modules: group.modules.map((module) => cloneModule(module)),
  }))

const normalizeName = (value: string) => value.trim().toLowerCase()

const toCamelKey = (value: string) => {
  const cleaned = value.trim().toLowerCase()
  if (!cleaned) {
    return 'action'
  }
  const camel = cleaned
    .replace(/[^a-z0-9]+([a-z0-9])/g, (_, char: string) => char.toUpperCase())
    .replace(/[^a-z0-9]/g, '')
  return camel || 'action'
}

const buildPermissionDefinition = (actionName: string): PermissionDefinition => {
  const normalized = normalizeName(actionName)
  const override = ACTION_META_OVERRIDES[normalized]
  const key = override?.key || toCamelKey(actionName)
  return {
    key,
    label: override?.label || actionName,
    help: override?.help,
    actionName,
  }
}

const buildModuleState = (
  module: ModuleDescriptor,
  permissionsCatalog: PermissionDefinition[]
): ModuleState => {
  const label = module.name?.trim() || 'Untitled Module'
  const normalized = normalizeName(label)
  const moduleIdValue =
    typeof module.module_id === 'number' ? module.module_id : Number(module.module_id)
  const moduleId = Number.isFinite(moduleIdValue) ? Number(moduleIdValue) : undefined
  return {
    key: moduleId ? `module-${moduleId}` : `module-${normalized}`,
    label,
    moduleId,
    scopeable: MODULE_SCOPEABLES.has(normalized),
    available: permissionsCatalog,
    granted: initializeGranted(permissionsCatalog),
  }
}

const resolveSectionConfig = (section?: string) => {
  if (!section) {
    return {
      key: 'other',
      title: 'Other',
      order: 99,
    }
  }
  const normalized = section.toLowerCase()
  const config = SECTION_CONFIG[normalized]
  if (config) {
    return config
  }
  return {
    key: normalized,
    title: section.charAt(0).toUpperCase() + section.slice(1),
    order: 90,
  }
}

export const createGroupsFromModules = (
  modules: ModuleDescriptor[],
  permissionsCatalog: PermissionDefinition[]
): GroupState[] => {
  const collection: Record<string, { group: GroupState; order: number }> = {}

  modules
    .filter((module) => {
      if (module.status === undefined || module.status === null) {
        return true
      }
      const statusNumeric = typeof module.status === 'number' ? module.status : Number(module.status)
      if (Number.isNaN(statusNumeric)) {
        return true
      }
      return statusNumeric === 1
    })
    .forEach((module) => {
      const section = resolveSectionConfig(module.section)
      if (!collection[section.key]) {
        collection[section.key] = {
          group: {
            key: section.key,
            title: section.title,
            modules: [],
          },
          order: section.order,
        }
      }
      collection[section.key].group.modules.push(buildModuleState(module, permissionsCatalog))
    })

  return Object.values(collection)
    .sort((a, b) => a.order - b.order)
    .map(({ group }) => ({
      ...group,
      modules: group.modules.sort((alpha, beta) => alpha.label.localeCompare(beta.label)),
    }))
}

export const buildPermissionDefinitions = (actions: ActionDescriptor[]): PermissionDefinition[] => {
  const seen = new Set<string>()
  return actions.reduce<PermissionDefinition[]>((acc, action) => {
    if (seen.has(action.name)) {
      return acc
    }
    seen.add(action.name)
    acc.push(buildPermissionDefinition(action.name))
    return acc
  }, [])
}

export const buildActionLookup = (actions: ActionDescriptor[]): ActionLookup => {
  return actions.reduce(
    (acc, action) => {
      acc.byName[action.name] = action.action_id
      acc.byId[action.action_id] = action.name
      return acc
    },
    {
      byName: {},
      byId: {},
    } as ActionLookup
  )
}

export const hydrateGroupsFromPermissions = (
  baseGroups: GroupState[],
  permissions: Record<string, number[]> | null | undefined,
  lookup: ActionLookup | null
): GroupState[] => {
  const base = cloneGroups(baseGroups)
  if (!permissions || !lookup) {
    return base
  }

  return base.map((group) => ({
    ...group,
    modules: group.modules.map((module) => {
      if (!module.moduleId) {
        return module
      }
      const actionIds = permissions[module.moduleId] || permissions[module.moduleId.toString()]
      if (!Array.isArray(actionIds) || actionIds.length === 0) {
        return module
      }

      const updated = cloneModule(module)
      actionIds.forEach((actionId) => {
        const actionName = lookup.byId[actionId]
        if (!actionName) {
          return
        }
        const definition = module.available.find((permission) => permission.actionName === actionName)
        if (definition) {
          updated.granted[definition.key] = true
        }
      })

      return updated
    }),
  }))
}

export const groupsToPermissionPayload = (
  groups: GroupState[],
  lookup: ActionLookup | null
): Record<number, number[]> => {
  if (!lookup) {
    return {}
  }
  const payload: Record<number, number[]> = {}

  groups.forEach((group) => {
    group.modules.forEach((module) => {
      if (!module.moduleId) {
        return
      }
      const actionIds = module.available
        .filter((permission) => module.granted[permission.key])
        .map((permission) => lookup.byName[permission.actionName])
        .filter((actionId): actionId is number => typeof actionId === 'number')

      if (actionIds.length > 0) {
        payload[module.moduleId] = actionIds
      }
    })
  })

  return payload
}

export const copyGroupsSnapshot = (source: GroupState[]): GroupState[] =>
  cloneGroups(source)
