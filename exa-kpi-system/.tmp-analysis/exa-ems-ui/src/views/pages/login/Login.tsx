/**
 * Modern Login Page - React 18 Design
 * Uses React hooks, TypeScript, and modern authentication practices
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilArrowRight, cilShieldAlt } from '@coreui/icons'
import { useAuth } from '../../../hooks/useAuth'
import './Login.scss'



const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth()

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })

  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  useEffect(() => {
    return () => {
      clearError()
    }
  }, [clearError])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (validationError) setValidationError(null)
    if (error) clearError()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username.trim()) {
      setValidationError('Please enter your username')
      return
    }

    if (!formData.password) {
      setValidationError('Please enter your password')
      return
    }

    await login(formData.username, formData.password)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any)
    }
  }

  const handleForgotPassword = () => {
    alert('Please contact your administrator to reset your password.')
  }

  const getEnvironmentLabel = () => {
    const { hostname } = window.location
    if (hostname === 'stg.exasa.net') return 'Staging'
    if (hostname === 'preview.exasa.net') return 'Preview'
    if (hostname === 'ems2.exasa.net' || hostname === 'localhost') return 'Local'
    return null
  }

  const environmentLabel = getEnvironmentLabel()

  return (
    <div className="exa-login-page min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={10} lg={8} xl={6}>
            <CCard className="login-card mx-4">
              <CCardBody className="p-5">
                <div className="text-center mb-5">
                  <div className="logo-container mb-4">
                    <img 
                      src="/logo-dark.svg" 
                      alt="EXA Management System" 
                      style={{ width: '60%', maxWidth: '300px', height: 'auto', display: 'block', margin: '0 auto' }} 
                    />
                  </div>
                  {/* Removed "Welcome Back" and "Sign in to your account" to emphasize logo */}
                  {environmentLabel && (
                    <span className="badge bg-info-subtle text-info rounded-pill px-3 py-2 mt-2">
                      {environmentLabel} Environment
                    </span>
                  )}
                </div>

                <CForm onSubmit={handleSubmit}>
                  {(error || validationError) && (
                    <CAlert color="danger" className="d-flex align-items-center mb-4">
                      <CIcon icon={cilShieldAlt} className="me-2" />
                      {error || validationError}
                    </CAlert>
                  )}

                  <div className="mb-4">
                    <CInputGroup className="input-group-lg">
                      <CInputGroupText className="bg-transparent border-end-0 text-medium-emphasis">
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        id="login-username"
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Email or username"
                        disabled={isLoading}
                        autoComplete="username"
                        className="border-start-0 ps-0"
                      />
                    </CInputGroup>
                  </div>

                  <div className="mb-4">
                    <CInputGroup className="input-group-lg">
                      <CInputGroupText className="bg-transparent border-end-0 text-medium-emphasis">
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        id="login-password"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Password"
                        disabled={isLoading}
                        autoComplete="current-password"
                        className="border-start-0 ps-0"
                      />
                    </CInputGroup>
                  </div>

                  <div className="d-grid gap-2 mb-4">
                    <CButton
                      color="primary"
                      size="lg"
                      className="login-button"
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Login
                          <CIcon icon={cilArrowRight} className="ms-2" />
                        </>
                      )}
                    </CButton>
                  </div>

                  <div className="text-center">
                    <CButton
                      onClick={handleForgotPassword}
                      color="link"
                      className="text-decoration-none text-medium-emphasis"
                      type="button"
                    >
                      Forgot password?
                    </CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
            
            <div className="text-center mt-4 text-medium-emphasis small">
              &copy; {new Date().getFullYear()} Exa Management System. All rights reserved.
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
