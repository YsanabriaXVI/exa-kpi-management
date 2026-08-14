/**
 * Profile Page
 * Page for viewing and editing user profile
 */

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCardFooter,
  CRow,
  CCol,
  CButton,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
  CSpinner,
  CAlert,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilUser, cilSave, cilBan, cilLanguage } from '@coreui/icons'

import PageHero from '../../../components/PageHero'
import { profileAPI } from '../api/profile.api'
import type { ProfileFormData } from '../types'
import type { RootState } from '../../../store'
import { authStorage } from '../../../services/auth/auth.storage'
import './ProfilePage.scss'

const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toaster = useRef<any>()
  
  const { user, details } = useSelector((state: RootState) => state.auth)
  
  const [formData, setFormData] = useState<ProfileFormData>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    password2: '',
    profile: {
      job_title: '',
      ext: '',
      address: '',
      city: '',
      zipcode: '',
    },
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<any>({})
  const [toast, setToast] = useState<any>(null)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  // Load user data on mount
  useEffect(() => {
    if (user && details && !initialDataLoaded) {
      const userDetails = details.details || {}
      const userProfile = userDetails.profile || {}
      
      setFormData({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: userDetails.phone || '',
        password: '',
        password2: '',
        profile: {
          job_title: userProfile.job_title || '',
          ext: userProfile.ext || '',
          address: userProfile.address || '',
          city: userProfile.city || '',
          zipcode: userProfile.zipcode || '',
        },
      })
      setInitialDataLoaded(true)
    }
  }, [user, details, initialDataLoaded])

  // Helper to show toast notifications
  const showToast = (message: string, color: 'success' | 'danger' | 'warning' | 'info') => {
    setToast(
      <CToast autohide={true} delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>,
    )
  }

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: any = {}

    // Email validation
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    // First name validation
    if (!formData.first_name || !formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }

    // Last name validation
    if (!formData.last_name || !formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    }

    // Password validation (only if password is provided)
    if (formData.password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,10}$/
      if (!passwordRegex.test(formData.password)) {
        newErrors.password =
          'Password must be 8-10 characters long and contain at least one uppercase letter, one lowercase letter, and one digit'
      }

      // Check password confirmation
      if (formData.password !== formData.password2) {
        newErrors.password2 = "Passwords don't match"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle profile field changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [name]: value,
      },
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      showToast('Please fix the validation errors', 'danger')
      return
    }

    if (!user?.user_id) {
      showToast('User information not found', 'danger')
      return
    }

    setLoading(true)

    try {
      const payload: any = {
        user_id: user.user_id,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        profile: formData.profile,
      }

      // Only include password if it was provided
      if (formData.password) {
        payload.password = formData.password
      }

      await profileAPI.updateProfile(payload)

      // Update local storage with new user data
      const updatedUser = {
        ...user,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
      }
      authStorage.saveUser(updatedUser)

      showToast('Profile updated successfully!', 'success')

      // Clear password fields after successful update
      setFormData((prev) => ({
        ...prev,
        password: '',
        password2: '',
      }))

      // Reload page after a short delay to refresh auth state
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      const message = error.response?.data?.message || 'Failed to update profile'
      showToast(message, 'danger')
    } finally {
      setLoading(false)
    }
  }

  // Handle reset
  const handleReset = () => {
    if (user && details) {
      const userDetails = details.details || {}
      const userProfile = userDetails.profile || {}
      
      setFormData({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: userDetails.phone || '',
        password: '',
        password2: '',
        profile: {
          job_title: userProfile.job_title || '',
          ext: userProfile.ext || '',
          address: userProfile.address || '',
          city: userProfile.city || '',
          zipcode: userProfile.zipcode || '',
        },
      })
      setErrors({})
      showToast('Form reset to original values', 'info')
    }
  }

  return (
    <div className="profile-page">
      <CToaster push={toast} placement="top-end" ref={toaster} />

      <PageHero
        kicker={t('account')}
        icon={cilUser}
        title={t('profile')}
        subtitle={t('manageYourAccountInformation')}
      />

      <CRow className="mb-4">
        <CCol xs={12}>
          <CCard>
            <CCardBody>
              {!initialDataLoaded ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                  <p className="mt-3">{t('loadingProfile')}...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <CRow>
                    {/* User Data Section */}
                    <CCol xl={6} lg={12} sm={12}>
                      <h5 className="mb-3">
                        <CIcon icon={cilUser} className="me-2" />
                        {t('userData')}
                      </h5>
                          {/* Email */}
                          <div className="mb-3">
                            <label htmlFor="email" className="form-label">
                              {t('email')} <span className="text-danger">*</span>
                            </label>
                            <input
                              type="email"
                              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                              id="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder={t('enterEmail')}
                            />
                            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                          </div>

                          {/* First Name */}
                          <div className="mb-3">
                            <label htmlFor="first_name" className="form-label">
                              {t('firstName')} <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                              id="first_name"
                              name="first_name"
                              value={formData.first_name}
                              onChange={handleChange}
                              placeholder={t('enterFirstName')}
                            />
                            {errors.first_name && (
                              <div className="invalid-feedback">{errors.first_name}</div>
                            )}
                          </div>

                          {/* Last Name */}
                          <div className="mb-3">
                            <label htmlFor="last_name" className="form-label">
                              {t('lastName')} <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                              id="last_name"
                              name="last_name"
                              value={formData.last_name}
                              onChange={handleChange}
                              placeholder={t('enterLastName')}
                            />
                            {errors.last_name && (
                              <div className="invalid-feedback">{errors.last_name}</div>
                            )}
                          </div>

                          {/* Phone */}
                          <div className="mb-3">
                            <label htmlFor="phone" className="form-label">
                              {t('phone')}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder={t('enterPhone')}
                            />
                          </div>

                          {/* Password */}
                          <div className="mb-3">
                            <label htmlFor="password" className="form-label">
                              {t('password')}
                            </label>
                            <input
                              type="password"
                              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                              id="password"
                              name="password"
                              value={formData.password}
                              onChange={handleChange}
                              placeholder={t('leaveBlankToKeepCurrent')}
                            />
                            {errors.password && (
                              <div className="invalid-feedback">{errors.password}</div>
                            )}
                            <small className="form-text text-muted">
                              {t('passwordRequirements')}
                            </small>
                          </div>

                          {/* Confirm Password */}
                          <div className="mb-3">
                            <label htmlFor="password2" className="form-label">
                              {t('confirmPassword')}
                            </label>
                            <input
                              type="password"
                              className={`form-control ${errors.password2 ? 'is-invalid' : ''}`}
                              id="password2"
                              name="password2"
                              value={formData.password2}
                              onChange={handleChange}
                              placeholder={t('repeatPassword')}
                            />
                            {errors.password2 && (
                              <div className="invalid-feedback">{errors.password2}</div>
                            )}
                          </div>
                    </CCol>

                    {/* Profile Data & Preferences Section */}
                    <CCol xl={6} lg={12} sm={12}>
                      <h5 className="mb-3">
                        <CIcon icon={cilUser} className="me-2" />
                        {t('profileData')}
                      </h5>
                          {/* Job Title */}
                          <div className="mb-3">
                            <label htmlFor="job_title" className="form-label">
                              {t('jobTitle')}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              id="job_title"
                              name="job_title"
                              value={formData.profile.job_title}
                              onChange={handleProfileChange}
                              placeholder={t('enterJobTitle')}
                            />
                          </div>

                          {/* Extension */}
                          <div className="mb-3">
                            <label htmlFor="ext" className="form-label">
                              {t('extension')}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              id="ext"
                              name="ext"
                              value={formData.profile.ext}
                              onChange={handleProfileChange}
                              placeholder={t('enterExtension')}
                            />
                          </div>

                          {/* Address */}
                          <div className="mb-3">
                            <label htmlFor="address" className="form-label">
                              {t('address')}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              id="address"
                              name="address"
                              value={formData.profile.address}
                              onChange={handleProfileChange}
                              placeholder={t('enterAddress')}
                            />
                          </div>

                          {/* City */}
                          <div className="mb-3">
                            <label htmlFor="city" className="form-label">
                              {t('city')}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              id="city"
                              name="city"
                              value={formData.profile.city}
                              onChange={handleProfileChange}
                              placeholder={t('enterCity')}
                            />
                          </div>

                          {/* Zip Code */}
                          <div className="mb-3">
                            <label htmlFor="zipcode" className="form-label">
                              {t('zipCode')}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              id="zipcode"
                              name="zipcode"
                              value={formData.profile.zipcode}
                              onChange={handleProfileChange}
                              placeholder={t('enterZipCode')}
                            />
                          </div>

                          {/* Language Preference */}
                          <h5 className="mb-3 mt-4">
                            <CIcon icon={cilLanguage} className="me-2" />
                            {t('languagePreference')}
                          </h5>
                          <div className="mb-3">
                            <label htmlFor="language" className="form-label">
                              {t('language')}
                            </label>
                            <select
                              className="form-select"
                              id="language"
                              value={i18n.language?.startsWith('es') ? 'es' : 'en'}
                              onChange={(e) => {
                                i18n.changeLanguage(e.target.value)
                                showToast(t('languageChanged'), 'success')
                              }}
                            >
                              <option value="en">English</option>
                              <option value="es">Español</option>
                            </select>
                            <small className="form-text text-muted">
                              {t('languageHint')}
                            </small>
                          </div>
                    </CCol>
                  </CRow>
                </form>
              )}
            </CCardBody>
            <CCardFooter>
              <CButton
                color="primary"
                onClick={handleSubmit}
                disabled={loading || !initialDataLoaded}
                className="me-2"
              >
                {loading ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    {t('saving')}...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilSave} className="me-2" />
                    {t('save')}
                  </>
                )}
              </CButton>
              <CButton
                color="danger"
                variant="outline"
                onClick={handleReset}
                disabled={loading || !initialDataLoaded}
              >
                <CIcon icon={cilBan} className="me-2" />
                {t('reset')}
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default ProfilePage

