/**
 * User Data Form Component
 * Form for basic user information
 */

import React from 'react'
import {
  CCol,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormSwitch,
  CFormText,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'

interface UserDataFormProps {
  data: any
  errors: any
  onChange: (field: string, value: any) => void
  onStatusChange: (value: any) => void
  isNew: boolean
  isDriver: boolean
  onIsDriverChange: (checked: boolean) => void
  driverOptions: { value: string; label: string; selected?: boolean }[]
}

const UserDataForm: React.FC<UserDataFormProps> = ({
  data,
  errors,
  onChange,
  onStatusChange,
  isNew,
  isDriver,
  onIsDriverChange,
  driverOptions,
}) => {
  const isActive = data?.status?.id === 1

  return (
    <div className="user-data-form">
      {/* Email */}
      <div className="mb-4">
        <CFormLabel htmlFor="email">
          User Name/Email <span className="text-danger">*</span>
        </CFormLabel>
        <CFormInput
          type="email"
          id="email"
          placeholder="user@example.com"
          value={data?.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          invalid={!!errors?.email}
          className={errors?.email ? 'is-invalid' : ''}
        />
        {errors?.email && <CFormFeedback invalid>{errors.email}</CFormFeedback>}
      </div>

      <CRow className="g-4 form-grid">
        <CCol md={6}>
          <CFormLabel htmlFor="first_name">
            First Name <span className="text-danger">*</span>
          </CFormLabel>
          <CFormInput
            type="text"
            id="first_name"
            placeholder="First Name"
            value={data?.first_name || ''}
            onChange={(e) => onChange('first_name', e.target.value)}
            invalid={!!errors?.first_name}
            className={errors?.first_name ? 'is-invalid' : ''}
          />
          {errors?.first_name && <CFormFeedback invalid>{errors.first_name}</CFormFeedback>}
        </CCol>

        <CCol md={6}>
          <CFormLabel htmlFor="last_name">
            Last Name <span className="text-danger">*</span>
          </CFormLabel>
          <CFormInput
            type="text"
            id="last_name"
            placeholder="Last Name"
            value={data?.last_name || ''}
            onChange={(e) => onChange('last_name', e.target.value)}
            invalid={!!errors?.last_name}
            className={errors?.last_name ? 'is-invalid' : ''}
          />
          {errors?.last_name && <CFormFeedback invalid>{errors.last_name}</CFormFeedback>}
        </CCol>
      </CRow>

      <CRow className="g-4 form-grid">
        <CCol md={12}>
          <CFormLabel htmlFor="phone">Phone</CFormLabel>
          <CFormInput
            type="text"
            id="phone"
            placeholder="(555) 000-1234"
            value={data?.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
          />
        </CCol>
      </CRow>

      <CRow className="g-4 form-grid">
        <CCol md={6}>
          <CFormLabel htmlFor="password">
            Password {isNew && <span className="text-danger">*</span>}
          </CFormLabel>
          <CFormInput
            type="password"
            id="password"
            placeholder="Enter password"
            value={data?.password || ''}
            onChange={(e) => onChange('password', e.target.value)}
            invalid={!!errors?.password}
            className={errors?.password ? 'is-invalid' : ''}
          />
          {errors?.password && <CFormFeedback invalid>{errors.password}</CFormFeedback>}
          <CFormText>
            8-10 characters, with uppercase, lowercase, and a digit.
          </CFormText>
        </CCol>

        <CCol md={6}>
          <CFormLabel htmlFor="password2">
            Repeat Password {isNew && <span className="text-danger">*</span>}
          </CFormLabel>
          <CFormInput
            type="password"
            id="password2"
            placeholder="Confirm password"
            value={data?.password2 || ''}
            onChange={(e) => onChange('password2', e.target.value)}
            invalid={!!errors?.password2}
            className={errors?.password2 ? 'is-invalid' : ''}
          />
          {errors?.password2 && <CFormFeedback invalid>{errors.password2}</CFormFeedback>}
        </CCol>
      </CRow>

      <CRow className="g-4 form-grid">
        <CCol md={12}>
          <CFormLabel htmlFor="status" className="d-block">
            Account Status
          </CFormLabel>
          <div className="user-status-switch">
            <div className="user-status-switch__toggle">
              <CFormSwitch
                id="status"
                label={isActive ? 'Active' : 'Disabled'}
                checked={isActive}
                onChange={(e) => {
                  const newStatus = e.target.checked
                    ? { name: 'ACTIVE', id: 1 }
                    : { name: 'DISABLED', id: 2 }
                  onStatusChange(newStatus)
                }}
              />
            </div>
            <CFormText className="mb-0">
              Toggle to enable or disable this account.
            </CFormText>
          </div>
        </CCol>
      </CRow>

      <CRow className="g-4 form-grid">
        <CCol md={12}>
          <CFormLabel htmlFor="is_driver" className="d-block">
            Driver
          </CFormLabel>
          <div className="user-status-switch">
            <div className="user-status-switch__toggle">
              <CFormSwitch
                id="is_driver"
                label={isDriver ? 'Driver' : 'Not a driver'}
                checked={isDriver}
                onChange={(e) => onIsDriverChange(e.target.checked)}
              />
            </div>
            <CFormText className="mb-0">
              Toggle to map this user to a specific driver.
            </CFormText>
          </div>
          {isDriver && (
            <div className="mt-3">
              <CMultiSelect
                options={driverOptions}
                onChange={(selected: any) => {
                  const opt = Array.isArray(selected) ? selected[0] : selected
                  onChange('driver_id', opt?.value ? Number(opt.value) : null)
                }}
                virtualScroller={driverOptions.length > 20}
                multiple={false}
                selectionType="tags"
                dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                placeholder="Select driver"
                invalid={!!errors?.driver_id}
              />
              {errors?.driver_id && (
                <CFormFeedback invalid className="d-block">
                  {errors.driver_id}
                </CFormFeedback>
              )}
            </div>
          )}
        </CCol>
      </CRow>
    </div>
  )
}

export default UserDataForm
