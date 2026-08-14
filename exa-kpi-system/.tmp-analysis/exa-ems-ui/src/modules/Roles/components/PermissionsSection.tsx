import React, { useEffect, useMemo, useState } from 'react'
import {
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilFilter, cilSettings, cilTrash, cilCheckCircle } from '@coreui/icons'
import type { GroupState, PermissionKey } from '../types/permissions'
import { PERMISSION_ORDER } from '../data/permissionCatalog'
import PermissionChip from './PermissionChip'

interface PermissionsSectionProps {
  groups: GroupState[]
  onChange: (next: GroupState[]) => void
}

const PermissionsSection: React.FC<PermissionsSectionProps> = ({ groups, onChange }) => {
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({})
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedFilters(searchFilters), 150)
    return () => clearTimeout(timeout)
  }, [searchFilters])

  const updateGroup = (groupKey: string, updater: (group: GroupState) => GroupState) => {
    onChange(
      groups.map((group) => {
        if (group.key !== groupKey) {
          return group
        }
        return updater(group)
      })
    )
  }

  const handleTogglePermission = (groupKey: string, moduleKey: string, permissionKey: PermissionKey) => {
    updateGroup(groupKey, (group) => ({
      ...group,
      modules: group.modules.map((module) => {
        if (module.key !== moduleKey) {
          return module
        }
        return {
          ...module,
          granted: {
            ...module.granted,
            [permissionKey]: !module.granted[permissionKey],
          },
        }
      }),
    }))
  }

  const toggleModulePermissions = (module: typeof groups[number]['modules'][number], active: boolean) =>
    module.available.reduce(
      (acc, permission) => ({
        ...acc,
        [permission.key]: active,
      }),
      {} as Record<PermissionKey, boolean>
    )

  const handleGrantAll = (groupKey: string) => {
    updateGroup(groupKey, (group) => ({
      ...group,
      modules: group.modules.map((module) => ({
        ...module,
        granted: toggleModulePermissions(module, true),
      })),
    }))
  }

  const handleClearSection = (groupKey: string) => {
    updateGroup(groupKey, (group) => ({
      ...group,
      modules: group.modules.map((module) => ({
        ...module,
        granted: toggleModulePermissions(module, false),
      })),
    }))
  }

  const handleModuleAll = (groupKey: string, moduleKey: string, active: boolean) => {
    updateGroup(groupKey, (group) => ({
      ...group,
      modules: group.modules.map((module) => {
        if (module.key !== moduleKey) {
          return module
        }
        return {
          ...module,
          granted: toggleModulePermissions(module, active),
        }
      }),
    }))
  }

  const sortedPermissions = (available: typeof groups[number]['modules'][number]['available']) =>
    [...available].sort((a, b) => {
      const orderA = PERMISSION_ORDER.indexOf(a.key)
      const orderB = PERMISSION_ORDER.indexOf(b.key)
      const normalizedA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA
      const normalizedB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB
      return normalizedA - normalizedB
    })

  const filteredGroups = useMemo(() => {
    return groups.map((group) => {
      const term = (debouncedFilters[group.key] || '').toLowerCase()
      if (!term) {
        return group
      }
      return {
        ...group,
        modules: group.modules.filter((module) => module.label.toLowerCase().includes(term)),
      }
    })
  }, [groups, debouncedFilters])

  return (
    <CRow className="g-4">
      {filteredGroups.map((group) => (
        <CCol key={group.key} xs={12}>
          <CCard className="permissions-card">
            <CCardHeader className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
              <div className="fw-semibold">{group.title}</div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <CButtonGroup size="sm">
                  <CButton type="button" color="secondary" variant="outline" onClick={() => handleGrantAll(group.key)}>
                    <CIcon icon={cilCheckCircle} className="me-2" />
                    Grant All
                  </CButton>
                  <CButton type="button" color="secondary" variant="outline" onClick={() => handleClearSection(group.key)}>
                    <CIcon icon={cilTrash} className="me-2" />
                    Clear Section
                  </CButton>
                </CButtonGroup>
                <div className="d-flex align-items-center gap-2">
                  <CIcon icon={cilFilter} className="text-body-secondary" />
                  <CFormInput
                    size="sm"
                    placeholder="Search modules..."
                    value={searchFilters[group.key] || ''}
                    onChange={(event) =>
                      setSearchFilters((prev) => ({
                        ...prev,
                        [group.key]: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </CCardHeader>
            <CCardBody>
              <div className="table-responsive">
                <CTable striped hover responsive small className="permissions-table align-middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: '220px' }}>Module</CTableHeaderCell>
                      <CTableHeaderCell>Permissions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {group.modules.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={2} className="text-center text-body-secondary py-4">
                          No modules match your search term.
                        </CTableDataCell>
                      </CTableRow>
                    )}
                    {group.modules.map((module) => {
                      const grantedCount = module.available.filter((permission) => module.granted[permission.key]).length
                      const isActive = grantedCount > 0
                      return (
                        <CTableRow key={`${group.key}-${module.key}`} className="permission-module-row">
                          <CTableDataCell className="fw-semibold align-middle">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <span>{module.label}</span>
                              <CBadge color={isActive ? 'success' : 'secondary'} shape="rounded-pill">
                                {grantedCount}/{module.available.length}
                              </CBadge>
                              {module.scopeable && (
                                <CButton type="button" size="sm" color="secondary" variant="ghost" title="Scope (coming soon)">
                                  <CIcon icon={cilSettings} />
                                </CButton>
                              )}
                            </div>
                            <div className="d-flex gap-1 mt-1">
                              <CButton
                                size="sm"
                                color="light"
                                variant="outline"
                                onClick={() => handleModuleAll(group.key, module.key, true)}
                              >
                                Select All
                              </CButton>
                              <CButton
                                size="sm"
                                color="light"
                                variant="outline"
                                onClick={() => handleModuleAll(group.key, module.key, false)}
                              >
                                Clear
                              </CButton>
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex flex-wrap gap-2">
                              {sortedPermissions(module.available).map((permission) => (
                                <PermissionChip
                                  key={permission.key}
                                  active={!!module.granted[permission.key]}
                                  label={permission.label}
                                  help={permission.help}
                                  onToggle={() => handleTogglePermission(group.key, module.key, permission.key)}
                                />
                              ))}
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      ))}
    </CRow>
  )
}

export default PermissionsSection
