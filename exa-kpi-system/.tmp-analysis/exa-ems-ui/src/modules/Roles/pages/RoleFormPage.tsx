import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilLockLocked } from '@coreui/icons'

import PageHero from '../../../components/PageHero'
import RoleForm from '../components/RoleForm'
import { rolesAPI } from '../api/roles.api'
import { createRole, loadRole, loadRolesList, setDefaultRole, updateRole, clearRoleError } from '../store/rolesSlice'
import type { RootState, AppDispatch } from '../../../store'
import type { Role } from '../types'
import type { ActionDescriptor, ActionLookup } from '../utils/permissionsMapper'
import {
  buildActionLookup,
  buildPermissionDefinitions,
  copyGroupsSnapshot,
  createGroupsFromModules,
  groupsToPermissionPayload,
  hydrateGroupsFromPermissions,
} from '../utils/permissionsMapper'
import type { GroupState } from '../types/permissions'
import './RoleForm.scss'

const RoleFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const toaster = useRef<any>()
  const { currentRole, roles, loading, error } = useSelector((state: RootState) => state.roles)

  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedRoleData, setSavedRoleData] = useState<Role | null>(null)
  const [permissionGroups, setPermissionGroups] = useState<GroupState[]>([])
  const [basePermissionGroups, setBasePermissionGroups] = useState<GroupState[]>([])
  const [actionLookup, setActionLookup] = useState<ActionLookup | null>(null)
  const [permissionsReady, setPermissionsReady] = useState(false)
  const [modulesLoaded, setModulesLoaded] = useState(false)
  const [actionsLoaded, setActionsLoaded] = useState(false)
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  const copyOptions = useMemo(
    () =>
      (roles || []).map((role: Role) => ({
        value: role.role_id?.toString() || '',
        label: role.name || `Role ${role.role_id}`,
      })),
    [roles]
  )

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' | 'info' = 'danger') => {
    if (!message) {
      return
    }
    setToast(
      <CToast autohide delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  const extractErrorMessage = (payload: any, fallback = 'An unexpected error occurred') => {
    if (!payload) {
      return fallback
    }

    if (typeof payload === 'string') {
      return payload
    }

    if (payload.message && typeof payload.message === 'string') {
      return payload.message
    }

    const data = payload.data ?? payload.response?.data
    if (typeof data === 'string') {
      return data
    }
    if (data?.message && typeof data.message === 'string') {
      return data.message
    }
    if (data && typeof data === 'object') {
      const firstKey = Object.keys(data)[0]
      const firstValue = firstKey ? data[firstKey] : null
      if (typeof firstValue === 'string') {
        return firstValue
      }
      if (Array.isArray(firstValue) && firstValue.length > 0) {
        const arrayMessage = firstValue[0]
        if (typeof arrayMessage === 'string') {
          return arrayMessage
        }
      }
    }

    return fallback
  }

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        // Load roles list for copy options and permissions metadata in parallel
        const [modules, actions] = await Promise.all([
          rolesAPI.getModules(),
          rolesAPI.getActions(),
          dispatch(loadRolesList()),
        ])
        
        const definitions = buildPermissionDefinitions(actions)
        const baseGroups = createGroupsFromModules(modules, definitions)
        setPermissionGroups(baseGroups)
        setBasePermissionGroups(copyGroupsSnapshot(baseGroups))
        setActionLookup(buildActionLookup(actions as ActionDescriptor[]))
        setModulesLoaded(true)
        setActionsLoaded(true)
        setMetadataLoaded(true)
      } catch (err: any) {
        const message = extractErrorMessage(err, 'Failed to load permissions metadata')
        setFormError(message)
        showToast(message, 'danger')
      }
    }

    fetchMeta()
  }, [dispatch])

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        await dispatch(loadRole(parseInt(id)))
      } else {
        dispatch(setDefaultRole())
        dispatch(clearRoleError())
      }
      setDataLoaded(true)
    }
    loadData()
  }, [dispatch, id, isEdit])

  useEffect(() => {
    if (modulesLoaded && actionsLoaded && permissionGroups.length && actionLookup) {
      if (currentRole) {
        const hydrated = hydrateGroupsFromPermissions(permissionGroups, currentRole.permissions, actionLookup)
        setPermissionGroups(hydrated)
      }
      setPermissionsReady(true)
    }
  }, [modulesLoaded, actionsLoaded, permissionGroups.length, actionLookup, currentRole])

  useEffect(() => {
    if (error) {
      const message = extractErrorMessage(error, 'Failed to load role')
      setFormError(message)
      showToast(message, 'danger')
    }
  }, [error])

  const handleSave = async (role: Role) => {
    try {
      if (!actionLookup) {
        throw new Error('Permissions not ready')
      }
      const permissionsPayload = groupsToPermissionPayload(permissionGroups, actionLookup)
      const payload: Role = {
        ...role,
        permissions: permissionsPayload,
      }
      let result: Role
      if (isEdit && id) {
        result = await dispatch(updateRole({ id: parseInt(id), roleData: payload })).unwrap()
      } else {
        result = await dispatch(createRole(payload)).unwrap()
      }
      setSavedRoleData(result)
      setShowSuccessModal(true)
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to save role')
      setFormError(message)
      showToast(message, 'danger')
    }
  }

  const handleCopyFromRole = async (roleId: string) => {
    if (!roleId) return permissionGroups
    try {
      const target = roles.find((role) => role.role_id?.toString() === roleId)
      if (!target || !actionLookup) return permissionGroups
      return hydrateGroupsFromPermissions(permissionGroups, target.permissions, actionLookup)
    } catch (err) {
      console.error('Failed to copy permissions from role', err)
      return permissionGroups
    }
  }

  const handleGoToList = () => {
    setShowSuccessModal(false)
    navigate('/modules/roles')
  }

  const handleCreateAnother = () => {
    setShowSuccessModal(false)
    setSavedRoleData(null)
    dispatch(setDefaultRole())
    if (basePermissionGroups.length) {
      setPermissionGroups(copyGroupsSnapshot(basePermissionGroups))
    }
    navigate('/modules/roles/create')
  }

  const handleEditCurrent = () => {
    if (savedRoleData?.role_id) {
      setShowSuccessModal(false)
      navigate(`/modules/roles/edit/${savedRoleData.role_id}`)
      dispatch(loadRole(savedRoleData.role_id))
    }
  }

  const contentReady = metadataLoaded && dataLoaded

  return (
    <div className="role-form-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      {!contentReady ? (
        <div className="role-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading role information</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : (
        <>
          <PageHero
            kicker="Roles Management"
            icon={cilLockLocked}
            title={isEdit ? 'Edit Role' : 'Create Role'}
            subtitle={isEdit ? currentRole?.name || 'Edit role' : 'Create a new role and assign permissions'}
          />
          {formError && <CAlert color="danger">{formError}</CAlert>}
          <RoleForm
            role={currentRole}
            loading={loading}
            onSubmit={handleSave}
            onCancel={() => navigate('/modules/roles')}
            isEdit={isEdit}
            permissionGroups={permissionGroups}
            permissionsReady={permissionsReady}
            onPermissionsChange={(groups) => setPermissionGroups(copyGroupsSnapshot(groups))}
            copyOptions={copyOptions}
            onCopyFromRole={handleCopyFromRole}
          />
          <CModal
            visible={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            alignment="center"
            backdrop="static"
          >
            <CModalHeader>
              <CModalTitle>
                <CIcon icon={cilCheckCircle} className="text-success me-2" size="lg" />
                Success!
              </CModalTitle>
            </CModalHeader>
            <CModalBody>
              <p className="mb-0">
                Role <strong>{savedRoleData?.name || savedRoleData?.role_id}</strong> has been{' '}
                {isEdit ? 'updated' : 'created'} successfully.
              </p>
              <p className="text-body-secondary mt-2 mb-0">What would you like to do next?</p>
            </CModalBody>
            <CModalFooter className="d-flex justify-content-between">
              <CButton color="secondary" onClick={handleGoToList}>
                Back to List
              </CButton>
              <div className="d-flex gap-2">
                {!isEdit && (
                  <CButton color="primary" onClick={handleCreateAnother}>
                    Create Another
                  </CButton>
                )}
                {savedRoleData?.role_id && (
                  <CButton color="info" className="text-white" onClick={handleEditCurrent}>
                    {isEdit ? 'Continue Editing' : 'Edit Role'}
                  </CButton>
                )}
              </div>
            </CModalFooter>
          </CModal>
        </>
      )}
    </div>
  )
}

export default RoleFormPage
