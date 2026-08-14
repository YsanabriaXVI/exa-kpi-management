/**
 * User Form Component
 * Main form container for creating and editing users
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardFooter,
  CButton,
  CRow,
  CCol,
  CAlert,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilX, cilArrowLeft, cilUser, cilAddressBook, cilBuilding, cilPeople } from '@coreui/icons'
import UserDataForm from './UserDataForm'
import UserProfileForm from './UserProfileForm'
import CompaniesDataForm from './CompaniesDataForm'
import JoinedDataForm from './JoinedDataForm'
import type { User } from '../types'
import type { RootState } from '../../../store'

interface UserFormProps {
  initialValues: User | null
  onSubmit: (data: User) => void
  onCancel: () => void
  roles: any[]
  loading: boolean
  error: string | null
  isEdit: boolean
}

const UserForm: React.FC<UserFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  roles,
  loading,
  error,
  isEdit,
}) => {
  const [formData, setFormData] = useState<User | null>(initialValues)
  const [validationErrors, setValidationErrors] = useState<any>({})
  
  // Get companies, clients, and subdivisions from store (prefer companies slice, fallback to auth)
  const companies = useSelector(
    (state: RootState) =>
      (state as any).companies?.companies ||
      (state as any).auth?.companies ||
      []
  )
  const clients = useSelector((state: RootState) => state.users.clients || [])
  const subdivisions = useSelector((state: RootState) => state.users.subdivisions || [])
  const drivers = useSelector((state: RootState) => (state as any).drivers?.list || [])

  const [isDriver, setIsDriver] = useState<boolean>(Boolean(initialValues?.driver_id))

  const driverOptions = useMemo(() => {
    const mappedId = formData?.driver_id ? String(formData.driver_id) : ''

    // CMultiSelect has no value prop - selection is driven by options[].selected
    const options = (drivers || []).map((d: any) => {
      const value = String(d.asset_id ?? d.id ?? '')
      return {
        value,
        selected: value === mappedId,
        label:
          [d.first_name ?? d.attributes?.['21'], d.last_name ?? d.attributes?.['22']]
            .filter(Boolean)
            .join(' ') ||
          d.generic_name1 ||
          d.internal_identification ||
          'Driver',
      }
    })

    // Keep the mapped driver visible even if it's missing from the loaded list
    if (mappedId && !options.some((o: any) => o.value === mappedId)) {
      const mapped = formData?.driver
      options.push({
        value: mappedId,
        selected: true,
        label:
          [mapped?.first_name, mapped?.last_name].filter(Boolean).join(' ') ||
          `Driver #${mappedId}`,
      })
    }

    return options
  }, [drivers, formData?.driver_id, formData?.driver])

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues)
      setIsDriver(Boolean(initialValues.driver_id))
    }
  }, [initialValues])

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleProfileChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      profile: {
        ...prev?.profile,
        [field]: value,
      },
    }))
  }

  const handleCompanyRoleChange = (value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      user_role_companies: value,
    }))
  }

  const handleJoinedDataChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleStatusChange = (value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      status: value,
    }))
  }

  const handleIsDriverChange = (checked: boolean) => {
    setIsDriver(checked)
    if (!checked) {
      setFormData((prev: any) => ({
        ...prev,
        driver_id: null,
      }))
    }
  }

  const validateForm = (): boolean => {
    const errors: any = {}

    if (!formData?.email || formData.email.trim() === '') {
      errors.email = 'Email is required'
    }

    if (!formData?.first_name || formData.first_name.trim() === '') {
      errors.first_name = 'First name is required'
    }

    if (!formData?.last_name || formData.last_name.trim() === '') {
      errors.last_name = 'Last name is required'
    }

    // Password validation for new users
    if (!isEdit) {
      if (!formData?.password || formData.password.trim() === '') {
        errors.password = 'Password is required'
      } else if (formData.password.length < 8 || formData.password.length > 10) {
        errors.password = 'Password must be between 8 and 10 characters'
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = 'Password must contain uppercase, lowercase, and digit'
      }

      if (formData?.password !== formData?.password2) {
        errors.password2 = 'Passwords do not match'
      }
    } else {
      // For updates, only validate if password is provided
      if (formData?.password && formData.password.trim() !== '') {
        if (formData.password.length < 8 || formData.password.length > 10) {
          errors.password = 'Password must be between 8 and 10 characters'
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
          errors.password = 'Password must contain uppercase, lowercase, and digit'
        }

        if (formData?.password !== formData?.password2) {
          errors.password2 = 'Passwords do not match'
        }
      }
    }

    if (isDriver && !formData?.driver_id) {
      errors.driver_id = 'Please select a driver'
    }

    // Validate user role companies
    if (!formData?.user_role_companies || formData.user_role_companies.length === 0) {
      errors.user_role_companies = 'At least one company and role is required'
    } else {
      const hasInvalidRole = formData.user_role_companies.some(
        (urc) => !urc.role || !urc.role.role_id || urc.role.role_id === ''
      )
      if (hasInvalidRole) {
        errors.user_role_companies = 'All companies must have a valid role selected'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm() && formData) {
      // driver_id: 0 explicitly clears the mapping on the API (absent key = unchanged)
      onSubmit({
        ...formData,
        driver_id: isDriver && formData.driver_id ? Number(formData.driver_id) : 0,
      })
    }
  }

  if (!formData) {
    return (
      <CCard>
        <CCardBody>
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard>
      <CCardHeader className="attribute-card-header">
        <div className="attribute-card-title">User Details</div>
      </CCardHeader>
      <CCardBody>
        {loading && (
          <CAlert color="info">Loading...</CAlert>
        )}
        
        {error && (
          <CAlert color="danger">{error}</CAlert>
        )}

        <CRow>
          {/* User Data Card */}
          <CCol xl={6} lg={12}>
            <CCard className="mb-4">
              <CCardHeader>
                <CIcon icon={cilUser} className="me-2" />
                <strong>User Data</strong>
              </CCardHeader>
              <CCardBody>
                <UserDataForm
                  data={formData}
                  errors={validationErrors}
                  onChange={handleChange}
                  onStatusChange={handleStatusChange}
                  isNew={!isEdit}
                  isDriver={isDriver}
                  onIsDriverChange={handleIsDriverChange}
                  driverOptions={driverOptions}
                />
              </CCardBody>
            </CCard>
          </CCol>

          {/* Profile Data Card */}
          <CCol xl={6} lg={12}>
            <CCard className="mb-4">
              <CCardHeader>
                <CIcon icon={cilAddressBook} className="me-2" />
                <strong>Profile Data</strong>
              </CCardHeader>
              <CCardBody>
                <UserProfileForm
                  data={formData.profile}
                  errors={validationErrors}
                  onChange={handleProfileChange}
                />
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>

        <CRow>
          {/* Companies Data Card */}
          <CCol xl={6} lg={12}>
            <CCard className="mb-4">
              <CCardHeader>
                <CIcon icon={cilBuilding} className="me-2" />
                <strong>Company - Role</strong>
              </CCardHeader>
              <CCardBody>
                <CompaniesDataForm
                  data={formData.user_role_companies || []}
                  companies={companies}
                  roles={roles}
                  errors={validationErrors}
                  onChange={handleCompanyRoleChange}
                />
              </CCardBody>
            </CCard>
          </CCol>

          {/* Joined Data Card */}
          <CCol xl={6} lg={12}>
            <CCard className="mb-4">
              <CCardHeader>
                <CIcon icon={cilPeople} className="me-2" />
                <strong>Joined</strong>
              </CCardHeader>
              <CCardBody>
                <JoinedDataForm
                  user={formData}
                  clients={clients}
                  subdivisions={subdivisions}
                  errors={validationErrors}
                  onChange={handleJoinedDataChange}
                />
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CCardBody>
      <CCardFooter className="user-form-actions">
        <div className="user-form-actions__back">
          <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back
          </CButton>
        </div>
        <div className="d-flex flex-wrap gap-2 justify-content-end">
          <CButton
            color="success"
            className="user-form-actions__primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            <CIcon icon={cilSave} className="me-2" />
            Save
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            <CIcon icon={cilX} className="me-2" />
            Cancel
          </CButton>
        </div>
      </CCardFooter>
    </CCard>
  )
}

export default UserForm
