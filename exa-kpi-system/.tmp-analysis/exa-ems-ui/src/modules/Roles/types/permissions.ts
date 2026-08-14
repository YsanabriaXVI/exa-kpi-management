export type PermissionKey = string

export interface PermissionDefinition {
  key: PermissionKey
  label: string
  help?: string
  actionName: string
}

export interface ModuleDescriptor {
  module_id: number | string
  name: string
  section?: string
  section_id?: number | string
  status?: number | string
  attributes_count?: number
}

export interface ModuleDefinition {
  key: string
  label: string
  permissions: PermissionDefinition[]
  moduleId?: number
  scopeable?: boolean
}

export interface GroupDefinition {
  key: string
  title: string
  modules: ModuleDefinition[]
}

export interface ModuleState {
  key: string
  label: string
  moduleId?: number
  available: PermissionDefinition[]
  granted: Record<PermissionKey, boolean>
  scopeable?: boolean
}

export interface GroupState {
  key: string
  title: string
  modules: ModuleState[]
}

export interface RoleDetails {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  groups: GroupState[]
  audit?: {
    createdBy: string
    createdAt: string
    updatedBy: string
    updatedAt: string
  }
}
