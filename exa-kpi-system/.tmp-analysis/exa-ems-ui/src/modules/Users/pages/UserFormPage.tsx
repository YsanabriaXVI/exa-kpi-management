/**
 * User Form Page
 * Page for creating and editing users
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle } from '@coreui/icons'
import { cilUser } from '@coreui/icons'
import UserForm from '../components/UserForm'
import type { RootState, AppDispatch } from '../../../store'
import {
  loadUser,
  loadRoles,
  loadClients,
  loadSubdivisions,
  createUser,
  updateUser,
  clearCurrentUser,
  setDefaultUser,
} from '../store/usersSlice'
import { loadCompanies } from '../../Companies/store/companiesSlice'
import { loadDrivers } from '../../Assets/Drivers/store/drivers.slice'
import PageHero from '../../../components/PageHero'
import { permissionService, CREATE, UPDATE, READ } from '../../../services/auth/permission.service'
import { MODULE_USERS } from '../../../constants/modules'
import './UserForm.scss'

const UserFormPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch<AppDispatch>()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedUserData, setSavedUserData] = useState<any>(null)
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  const { currentUser, roles, loading, error } = useSelector(
    (state: RootState) => state.users
  )

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_USERS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_USERS, UPDATE)
  const canRead = permissionService.checkPermission(MODULE_USERS, READ)

  const debugEnabled = useMemo(() => {
    if (import.meta.env?.VITE_USER_FORM_DEBUG === 'true') {
      return true
    }
    const params = new URLSearchParams(location.search)
    return params.get('debugUserForm') === 'true'
  }, [location.search])

  const companyRoleDebug = useMemo(() => {
    if (!debugEnabled) {
      return []
    }

    const roleLookup = new Map(roles.map((role) => [role.role_id, role.name]))
    return (currentUser?.user_role_companies || []).map((entry: any, index: number) => {
      const rawCompany = entry?.company
      const rawRole = entry?.role
      const companyId =
        rawCompany && typeof rawCompany === 'object' ? rawCompany.company_id : rawCompany
      const companyName =
        rawCompany && typeof rawCompany === 'object'
          ? rawCompany.name
          : companyId
            ? `Company ${companyId}`
            : 'Unknown'

      const roleId =
        rawRole && typeof rawRole === 'object' ? rawRole.role_id : rawRole ?? null
      const roleNameFromEntry =
        rawRole && typeof rawRole === 'object' ? rawRole.name : undefined
      const normalizedRoleId =
        typeof roleId === 'number' ? roleId : roleId ? Number(roleId) : null
      const resolvedRoleName =
        roleNameFromEntry || (normalizedRoleId != null ? roleLookup.get(normalizedRoleId) : null)

      return {
        key: entry?.company_item_id || `${companyId || 'company'}-${index}`,
        companyId: companyId ?? null,
        companyName,
        roleId: normalizedRoleId,
        roleName: resolvedRoleName,
        hasRoleId: normalizedRoleId != null,
        hasRoleMatch: Boolean(resolvedRoleName),
      }
    })
  }, [currentUser?.user_role_companies, debugEnabled, roles])

  const debugIssues = useMemo(() => {
    if (!debugEnabled) {
      return []
    }

    const issues: string[] = []
    if (!roles.length) {
      issues.push('Roles list is empty; the API response may have failed or returned 0 items.')
    }
    if (isEdit && !currentUser) {
      issues.push('User data is not loaded yet; waiting for loadUser to resolve.')
    }

    const missingRoleIds = companyRoleDebug.filter((item) => !item.hasRoleId)
    if (missingRoleIds.length > 0) {
      issues.push('One or more company-role entries are missing a role_id field.')
    }

    const unresolvedRoles = companyRoleDebug.filter(
      (item) => item.hasRoleId && !item.hasRoleMatch
    )
    if (unresolvedRoles.length > 0) {
      issues.push('Some role IDs do not exist in the roles list, so the selector cannot resolve a label.')
    }

    if (!issues.length) {
      issues.push('No immediate issues detected. Verify CoreUI styles/scripts are bundled correctly.')
    }

    return issues
  }, [companyRoleDebug, currentUser, debugEnabled, isEdit, roles.length])

  // Helper to show toast notifications
  const showToast = (message: string, color: 'success' | 'danger' | 'warning' | 'info') => {
    setToast(
      <CToast autohide={true} delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  // Check permissions and redirect if necessary
  useEffect(() => {
    if (!canRead) {
      showToast('You do not have permission to access user management.', 'danger')
      navigate('/dashboard')
      return
    }
    if (isEdit && !canUpdate) {
      showToast('You do not have permission to edit users.', 'warning')
      navigate('/modules/users')
      return
    }
    if (!isEdit && !canCreate) {
      showToast('You do not have permission to create users.', 'warning')
      navigate('/modules/users')
      return
    }
  }, [canRead, canUpdate, canCreate, isEdit, navigate])

  useEffect(() => {
    const loadMetadata = async () => {
      await Promise.all([
        dispatch(loadRoles()),
        dispatch(loadClients()),
        dispatch(loadCompanies()),
        dispatch(loadSubdivisions()),
        dispatch(loadDrivers()),
      ])
      setMetadataLoaded(true)
    }
    loadMetadata()

    // Cleanup
    return () => {
      dispatch(clearCurrentUser())
    }
  }, [dispatch])

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        await dispatch(loadUser(parseInt(id)))
      } else {
        dispatch(setDefaultUser())
      }
      setDataLoaded(true)
    }
    loadData()
  }, [id, isEdit, dispatch])

  const handleSubmit = async (formData: any) => {
    // Check permissions before submitting
    if (isEdit && !canUpdate) {
      showToast('You do not have permission to update users.', 'danger')
      return
    }
    if (!isEdit && !canCreate) {
      showToast('You do not have permission to create users.', 'danger')
      return
    }

    try {
      let result: any
      if (isEdit && id) {
        result = await dispatch(updateUser({ id: parseInt(id), userData: formData }))
      } else {
        result = await dispatch(createUser(formData))
      }

      if (result.meta.requestStatus === 'fulfilled') {
        // Store the saved user data and show success modal
        setSavedUserData(result.payload)
        setShowSuccessModal(true)
      } else {
        const payload = result.payload
        let errorMessage = 'Failed to save user'
        
        // Handle structured backend error: { status: "fail", data: { email: "..." } }
        if (payload && typeof payload === 'object') {
           if (payload.data && typeof payload.data === 'object') {
             // Extract first error message from data object
             const firstKey = Object.keys(payload.data)[0]
             if (firstKey && payload.data[firstKey]) {
               errorMessage = payload.data[firstKey]
             }
           } else if (payload.message) {
             errorMessage = payload.message
           } else if (typeof payload === 'string') {
             errorMessage = payload
           }
        } else if (typeof payload === 'string') {
           errorMessage = payload
        }
        
        throw new Error(errorMessage)
      }
    } catch (err: any) {
      // Show error toast
      showToast(
        `${err.message || 'An error occurred while saving the user.'}`,
        'danger'
      )
    }
  }

  const handleCancel = () => {
    navigate('/modules/users')
  }

  // Modal action handlers
  const handleGoToList = () => {
    setShowSuccessModal(false)
    navigate('/modules/users')
  }

  const handleCreateAnother = () => {
    setShowSuccessModal(false)
    setSavedUserData(null)
    dispatch(setDefaultUser())
    navigate('/modules/users/create')
  }

  const handleEditCurrent = () => {
    setShowSuccessModal(false)
    if (savedUserData?.user_id) {
      navigate(`/modules/users/edit/${savedUserData.user_id}`)
      dispatch(loadUser(savedUserData.user_id))
    }
  }

  const contentReady = metadataLoaded && dataLoaded

  return (
    <div className="user-form-page">
      {!contentReady ? (
        <div className="user-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading user information</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : (
        <>
          <CToaster ref={toaster} push={toast} placement="top-end" />
          <PageHero
            kicker="User Management"
            icon={cilUser}
            title={isEdit ? 'Edit User' : 'Create User'}
            subtitle={isEdit ? currentUser?.email : 'Create a new user'}
          />
          
          <UserForm
            initialValues={isEdit ? currentUser : currentUser}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            roles={roles}
            loading={loading}
            error={error}
            isEdit={isEdit}
          />

          {debugEnabled && (
            <section className="user-form-debug mt-4">
              <header className="user-form-debug__header">
                <strong>User Form Debug</strong>
                <span>
                  Enabled via {import.meta.env?.VITE_USER_FORM_DEBUG === 'true' ? 'env flag' : 'query (?debugUserForm=true)'}
                </span>
              </header>
              <div className="user-form-debug__metadata">
                <div>
                  <span className="label">Mode</span>
                  <span>{isEdit ? 'Edit' : 'Create'}</span>
                </div>
                <div>
                  <span className="label">User ID</span>
                  <span>{id || 'N/A'}</span>
                </div>
                <div>
                  <span className="label">Roles loaded</span>
                  <span>{roles.length}</span>
                </div>
                <div>
                  <span className="label">Company-role rows</span>
                  <span>{companyRoleDebug.length}</span>
                </div>
              </div>

              <ul className="user-form-debug__issues">
                {debugIssues.map((issue, idx) => (
                  <li key={`debug-issue-${idx}`}>{issue}</li>
                ))}
              </ul>

              {companyRoleDebug.length > 0 && (
                <div className="user-form-debug__table-wrapper">
                  <table className="user-form-debug__table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Role ID</th>
                        <th>Role Name</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyRoleDebug.map((entry) => (
                        <tr key={entry.key}>
                          <td>{entry.companyName}</td>
                          <td>{entry.roleId ?? '—'}</td>
                          <td>{entry.roleName || 'Unknown'}</td>
                          <td>
                            {entry.hasRoleId
                              ? entry.hasRoleMatch
                                ? 'Resolved'
                                : 'Missing in roles list'
                              : 'No role assigned'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Success Modal */}
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
                User <strong>{savedUserData?.email || savedUserData?.first_name}</strong> has been{' '}
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
                  {savedUserData?.user_id && (
                  <CButton color="info" className="text-white" onClick={handleEditCurrent}>
                    {isEdit ? 'Continue Editing' : 'Edit User'}
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

export default UserFormPage
