/**
 * User Profile Form Component
 * Form for user profile information
 */

import React from 'react'
import { CCol, CFormInput, CFormLabel, CRow } from '@coreui/react-pro'

interface UserProfileFormProps {
  data: any
  errors: any
  onChange: (field: string, value: any) => void
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({
  data,
  errors,
  onChange,
}) => {
  return (
    <div className="user-profile-form">
      <CRow className="g-4 form-grid">
        <CCol md={6}>
          <CFormLabel htmlFor="job_title">Job Title</CFormLabel>
          <CFormInput
            type="text"
            id="job_title"
            placeholder="Job Title"
            value={data?.job_title || ''}
            onChange={(e) => onChange('job_title', e.target.value)}
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel htmlFor="profile_phone">Phone</CFormLabel>
          <CFormInput
            type="text"
            id="profile_phone"
            placeholder="Profile phone"
            value={data?.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
          />
        </CCol>
      </CRow>

      <CRow className="g-4 form-grid">
        <CCol md={4}>
          <CFormLabel htmlFor="ext">Ext</CFormLabel>
          <CFormInput
            type="text"
            id="ext"
            placeholder="Ext"
            value={data?.ext || ''}
            onChange={(e) => onChange('ext', e.target.value)}
          />
        </CCol>
        <CCol md={8}>
          <CFormLabel htmlFor="address">Address</CFormLabel>
          <CFormInput
            type="text"
            id="address"
            placeholder="Street address"
            value={data?.address || ''}
            onChange={(e) => onChange('address', e.target.value)}
          />
        </CCol>
      </CRow>

      <CRow className="g-4 form-grid">
        <CCol md={6}>
          <CFormLabel htmlFor="city">City</CFormLabel>
          <CFormInput
            type="text"
            id="city"
            placeholder="City"
            value={data?.city || ''}
            onChange={(e) => onChange('city', e.target.value)}
          />
        </CCol>
        <CCol md={3}>
          <CFormLabel htmlFor="state">State</CFormLabel>
          <CFormInput
            type="text"
            id="state"
            placeholder="State"
            value={data?.state || ''}
            onChange={(e) => onChange('state', e.target.value)}
          />
        </CCol>
        <CCol md={3}>
          <CFormLabel htmlFor="zipcode">Zip Code</CFormLabel>
          <CFormInput
            type="text"
            id="zipcode"
            placeholder="Zip Code"
            value={data?.zipcode || ''}
            onChange={(e) => onChange('zipcode', e.target.value)}
          />
        </CCol>
      </CRow>
    </div>
  )
}

export default UserProfileForm
