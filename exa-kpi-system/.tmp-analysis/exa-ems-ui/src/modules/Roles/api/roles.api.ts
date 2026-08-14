import apiClient from '../../../services/api/axios.config'
import type { Role } from '../types'
import type { ModuleDescriptor } from '../types/permissions'
import type { ActionDescriptor } from '../utils/permissionsMapper'

const normalizeAuditUser = (user: any) => {
  if (!user) {
    return undefined
  }
  const firstName = user.first_name || ''
  const lastName = user.last_name || ''
  return {
    user_id: user.user_id,
    first_name: firstName,
    last_name: lastName,
    email: user.email,
    full_name: user.full_name || `${firstName} ${lastName}`.trim(),
  }
}

const normalizeRole = (role: any): Role => {
  return {
    role_id: role.role_id,
    name: role.name || '',
    status:
      typeof role.status === 'object'
        ? role.status
        : {
            id: Number(role.status ?? 1),
            name: Number(role.status) === 1 ? 'ACTIVE' : 'DISABLED',
          },
    description: role.description || '',
    permissions: role.permissions || {},
    mobile_field_restrictions: role.mobileFieldRestrictions || role.mobile_field_restrictions || {},
    create_user: normalizeAuditUser(role.create_user),
    update_user: normalizeAuditUser(role.update_user),
    create_date: role.create_date,
    update_date: role.update_date,
    update_date_format: role.update_date_format,
  }
}

const transformRoleForBackend = (role: Partial<Role>) => {
  const payload: any = {
    ...role,
  }
  if (payload.status && typeof payload.status === 'object') {
    payload.status = payload.status.id
  }
  if (payload.mobile_field_restrictions) {
    payload.mobileFieldRestrictions = payload.mobile_field_restrictions
    delete payload.mobile_field_restrictions
  }
  return payload
}

class RolesAPI {
  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get<any>('/roles', {
      headers: {
        'Route-Type': 'admin',
      },
    })

    const roles = response.data?.roles || response.data?.data?.roles || response.data || []
    return roles.map(normalizeRole)
  }

  async getRole(id: number): Promise<Role> {
    const response = await apiClient.get<any>(`/roles/${id}`, {
      headers: {
        'Route-Type': 'admin',
      },
    })
    const roleData = response.data?.role || response.data?.data?.role || response.data?.data || response.data
    return normalizeRole(roleData)
  }

  async createRole(data: Partial<Role>): Promise<Role> {
    const payload = transformRoleForBackend(data)
    const response = await apiClient.post<any>(
      '/roles',
      payload,
      {
        headers: {
          'Route-Type': 'admin',
        },
      }
    )
    const roleData = response.data?.role || response.data?.data?.role || response.data?.data || response.data
    return normalizeRole(roleData)
  }

  async updateRole(id: number, data: Partial<Role>): Promise<Role> {
    const payload = transformRoleForBackend(data)
    const response = await apiClient.put<any>(
      `/roles/${id}`,
      payload,
      {
        headers: {
          'Route-Type': 'admin',
        },
      }
    )
    const roleData = response.data?.role || response.data?.data?.role || response.data?.data || response.data
    return normalizeRole(roleData)
  }

  async deleteRole(id: number): Promise<void> {
    await apiClient.delete(`/roles/${id}`, {
      headers: {
        'Route-Type': 'admin',
      },
    })
  }

  async getActions(): Promise<ActionDescriptor[]> {
    const response = await apiClient.get<any>('/actions', {
      headers: {
        'Route-Type': 'admin',
      },
    })
    const actions = response.data?.actions || response.data?.data?.actions || response.data || []
    return actions
  }

  async getModules(): Promise<ModuleDescriptor[]> {
    const response = await apiClient.get<any>('/modules', {
      headers: {
        'Route-Type': 'admin',
      },
    })
    const payload =
      response.data?.modules ??
      response.data?.data?.modules ??
      response.data?.data ??
      response.data ??
      []

    if (Array.isArray(payload)) {
      return payload
    }

    if (payload?.modules && Array.isArray(payload.modules)) {
      return payload.modules
    }

    return []
  }
}

export const rolesAPI = new RolesAPI()
