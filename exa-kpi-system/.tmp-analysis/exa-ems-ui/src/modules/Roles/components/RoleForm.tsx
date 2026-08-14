import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSwitch,
  CFormTextarea,
  CMultiSelect,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CTabContent,
  CTabPane,
  CSpinner,
  CFormFeedback,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCopy, cilMobile, cilNotes, cilSave, cilShieldAlt, cilX } from '@coreui/icons'
import type { Role } from '../types'
import type { GroupState } from '../types/permissions'
import PermissionsSection from './PermissionsSection'
import ActivityCard from './ActivityCard'
import MobileFieldRestrictionsTab from './MobileFieldRestrictionsTab'

interface RoleFormProps {
  role: Role | null
  loading: boolean
  onSubmit: (role: Role) => void
  onCancel: () => void
  isEdit: boolean
  permissionGroups: GroupState[]
  permissionsReady: boolean
  onPermissionsChange: (groups: GroupState[]) => void
  copyOptions: { value: string; label: string }[]
  onCopyFromRole: (roleId: string) => Promise<GroupState[]>
}

const RoleForm: React.FC<RoleFormProps> = ({
  role,
  loading,
  onSubmit,
  onCancel,
  isEdit,
  permissionGroups,
  permissionsReady,
  onPermissionsChange,
  copyOptions,
  onCopyFromRole,
}) => {
  const isDebug = import.meta.env?.VITE_USER_FORM_DEBUG === 'true'
  const [formData, setFormData] = useState<Role | null>(role)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'details' | 'permissions' | 'mobileFields'>('details')
  const [copying, setCopying] = useState(false)
  const [fieldRestrictions, setFieldRestrictions] = useState<Record<string, string[]>>(
    role?.mobile_field_restrictions || { carrier: [], shipper: [], operations: [] }
  )

  useEffect(() => {
    setFormData(role)
    setFieldRestrictions(role?.mobile_field_restrictions || { carrier: [], shipper: [], operations: [] })
  }, [role])

  const handleChange = (field: keyof Role, value: any) => {
    setFormData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [field]: value,
      }
    })
  }

  const handleStatusToggle = (checked: boolean) => {
    setFormData((prev) => {
      if (!prev) {
        return prev
      }
      return {
        ...prev,
        status: {
          id: checked ? 1 : 2,
          name: checked ? 'ACTIVE' : 'DISABLED',
        },
      }
    })
  }

  const validate = () => {
    const validationErrors: Record<string, string> = {}
    if (!formData?.name || formData.name.trim() === '') {
      validationErrors.name = 'Role name is required'
    }
    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }

  const onSubmitHandler = () => {
    if (formData && validate()) {
      onSubmit({
        ...formData,
        mobile_field_restrictions: fieldRestrictions,
      })
    }
  }

  const isActive = formData?.status?.id === 1

  const formatAuditValue = (value?: string | number) => {
    if (!value) {
      return '—'
    }
    const numeric = typeof value === 'string' && /^\d+$/.test(value) ? parseInt(value, 10) * 1000 : Number(value)
    const date = new Date(numeric)
    if (Number.isNaN(date.getTime())) {
      return value.toString()
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  const handleCopyFromChange = async (value: string) => {
    if (isDebug) {
      console.debug('[RoleForm Debug] handleCopyFromChange called', value)
    }
    if (!value) {
      return
    }
    setCopying(true)
    try {
      const snapshot = await onCopyFromRole(value)
      onPermissionsChange(snapshot)
    } finally {
      setCopying(false)
    }
  }

  const auditInfo = useMemo(
    () => [
      {
        label: 'Created By',
        value: formData?.create_user?.full_name || '—',
      },
      {
        label: 'Created On',
        value: formatAuditValue(formData?.create_date),
      },
      {
        label: 'Updated By',
        value: formData?.update_user?.full_name || '—',
      },
      {
        label: 'Updated On',
        value: formatAuditValue(formData?.update_date),
      },
    ],
    [formData]
  )

  const sanitizedCopyOptions = useMemo(
    () => {
      const base = Array.isArray(copyOptions) ? copyOptions : []
      const sanitized = base
        .filter((option): option is { value: string; label: string } => {
          const valid =
            Boolean(option) &&
            typeof option === 'object' &&
            typeof option.value === 'string' &&
            option.value.trim() !== ''
          if (!valid && isDebug) {
            console.debug('[RoleForm Debug] Dropping invalid copy option', option)
          }
          return valid
        })
        .map((option) => ({
          value: option.value,
          label: option.label || option.value,
        }))
      if (isDebug) {
        console.debug('[RoleForm Debug] Sanitized copy options', sanitized)
      }
      return sanitized
    },
    [copyOptions, isDebug]
  )

  if (!formData) {
    return null
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center attribute-card-header">
        <div className="attribute-card-title">Role Details</div>
      </CCardHeader>
      <CCardBody>
        <CNav variant="tabs" role="tablist" className="mb-3">
          <CNavItem>
            <CNavLink
              active={activeTab === 'details'}
              onClick={() => setActiveTab('details')}
              role="button"
            >
              Role Details
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeTab === 'permissions'}
              onClick={() => setActiveTab('permissions')}
              role="button"
            >
              Permissions
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeTab === 'mobileFields'}
              onClick={() => setActiveTab('mobileFields')}
              role="button"
            >
              <CIcon icon={cilMobile} className="me-1" />
              Mobile Field Restrictions
            </CNavLink>
          </CNavItem>
        </CNav>
        <CTabContent>
          <CTabPane role="tabpanel" visible={activeTab === 'details'}>
            <CRow className="g-3">
              <CCol xl={8} lg={12}>
                <CCard className="mb-4">
                  <CCardHeader>
                    <CIcon icon={cilShieldAlt} className="me-2" />
                    <strong>Role Details</strong>
                  </CCardHeader>
                  <CCardBody>
                    <CRow className="g-4 form-grid">
                      <CCol md={12}>
                        <CFormLabel htmlFor="role_name">
                          Role Name <span className="text-danger">*</span>
                        </CFormLabel>
                        <CFormInput
                          id="role_name"
                          value={formData.name}
                          placeholder="Enter role name"
                          onChange={(event) => handleChange('name', event.target.value)}
                          invalid={!!errors.name}
                          className={errors.name ? 'is-invalid' : ''}
                        />
                        {errors?.name && <CFormFeedback invalid>{errors.name}</CFormFeedback>}
                      </CCol>
                    </CRow>

                    <CRow className="g-4 form-grid mt-1">
                      <CCol md={12}>
                        <CFormLabel htmlFor="role_description">Description</CFormLabel>
                        <CFormTextarea
                          id="role_description"
                          placeholder="Add a short summary about what this role can access"
                          value={formData.description || ''}
                          rows={4}
                          onChange={(event) => handleChange('description', event.target.value)}
                        />
                      </CCol>
                    </CRow>

                    <CRow className="g-4 form-grid mt-1">
                      <CCol md={12}>
                        <CFormLabel htmlFor="role_status">Status</CFormLabel>
                        <div className="user-status-switch">
                          <div className="user-status-switch__toggle">
                            <CFormSwitch
                              id="role_status"
                              checked={isActive}
                              label={isActive ? 'Active' : 'Disabled'}
                              onChange={(event) => handleStatusToggle(event.target.checked)}
                            />
                          </div>
                          <span className="form-text mb-0">Toggle to enable or disable this role.</span>
                        </div>
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard>
              </CCol>

              <CCol xl={4} lg={12}>
                <ActivityCard
                  createdBy={auditInfo[0].value}
                  createdAt={auditInfo[1].value}
                  updatedBy={auditInfo[2].value}
                  updatedAt={auditInfo[3].value}
                />
              </CCol>
            </CRow>
          </CTabPane>
          <CTabPane role="tabpanel" visible={activeTab === 'permissions'}>
            {!permissionsReady && (
              <div className="text-center py-5">
                <CSpinner />
              </div>
            )}
            {permissionsReady && (
              <>
                <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <CIcon icon={cilCopy} />
                    <span className="fw-semibold">Copy permissions from:</span>
                  </div>
                  {sanitizedCopyOptions.length > 0 ? (
                    <CMultiSelect
                      className="copy-role-select"
                      options={sanitizedCopyOptions}
                      placeholder="Select role..."
                      multiple={false}
                      size="sm"
                      search
                      disabled={copying}
                      selectionType="counter"
                      onChange={(selected) => {
                        if (isDebug) {
                          console.debug('[RoleForm Debug] copy from selection raw', selected)
                        }
                        handleCopyFromChange(selected?.[0]?.value || '')
                      }}
                    />
                  ) : (
                    <span className="text-muted">No other roles available to copy from</span>
                  )}
                  {copying && <CSpinner size="sm" />}
                </div>

                <PermissionsSection groups={permissionGroups} onChange={onPermissionsChange} />
              </>
            )}
          </CTabPane>
          <CTabPane role="tabpanel" visible={activeTab === 'mobileFields'}>
            <MobileFieldRestrictionsTab
              restrictions={fieldRestrictions}
              onChange={setFieldRestrictions}
            />
          </CTabPane>
        </CTabContent>
      </CCardBody>
      <CCardFooter className="user-form-actions">
        <div className="user-form-actions__back">
          <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back
          </CButton>
        </div>
        <div className="d-flex flex-wrap gap-2 justify-content-end">
          <CButton color="success" className="user-form-actions__primary" onClick={onSubmitHandler} disabled={loading}>
            <CIcon icon={cilSave} className="me-2" />
            {isEdit ? 'Save Changes' : 'Create Role'}
          </CButton>
          <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
            <CIcon icon={cilX} className="me-2" />
            Cancel
          </CButton>
        </div>
      </CCardFooter>
    </CCard>
  )
}

export default RoleForm
