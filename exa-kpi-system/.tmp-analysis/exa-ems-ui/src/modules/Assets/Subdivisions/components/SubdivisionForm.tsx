import React, { useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CFormSwitch,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave } from '@coreui/icons'
import { Subdivision } from '../types'
import SubdivisionInternalSuppliers from './SubdivisionInternalSuppliers'

interface SubdivisionFormProps {
  initialValues: Subdivision
  onSubmit: (values: Subdivision) => void
  loading?: boolean
  readOnly?: boolean
  subdivisionId?: number | null
}

const SubdivisionForm: React.FC<SubdivisionFormProps> = ({ initialValues, onSubmit, loading, readOnly, subdivisionId }) => {
  const [formData, setFormData] = React.useState<Subdivision>(initialValues)
  const [validated, setValidated] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  useEffect(() => {
    setFormData(initialValues)
  }, [initialValues])

  const handleChange = (field: keyof Subdivision, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    if (!formData.name?.trim()) {
      newErrors.name = 'Subdivision Name is required'
      isValid = false
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidated(true)

    if (validateForm()) {
      onSubmit(formData)
    } else {
      const firstErrorField = document.querySelector('.is-invalid')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ;(firstErrorField as HTMLElement).focus()
      }
    }
  }

  const isActive = String(formData.active ?? '1') === '1' || formData.active === true

  return (
    <CForm onSubmit={handleSubmit} className="subdivision-form" noValidate>
      <CRow className="g-4">
        <CCol xs={12}>
          <CCard className="subdivision-section-card shadow-sm border-0">
            <CCardHeader className="subdivision-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Identity</div>
                <div className="section-title">Subdivision Details</div>
                <small className="text-body-secondary">Primary contact and billing references.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Subdivision Name *</CFormLabel>
                  <CFormInput
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    invalid={!!errors.name}
                    feedbackInvalid={errors.name}
                    id="subdivision-name"
                    required
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Reference Name</CFormLabel>
                  <CFormInput
                    value={formData.reference || ''}
                    onChange={(e) => handleChange('reference', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Email</CFormLabel>
                  <CFormInput
                    value={formData.email || ''}
                    type="email"
                    onChange={(e) => handleChange('email', e.target.value)}
                    invalid={!!errors.email}
                    feedbackInvalid={errors.email}
                    id="subdivision-email"
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Phone</CFormLabel>
                  <CFormInput
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    disabled={readOnly}
                  />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="subdivision-section-card shadow-sm border-0">
            <CCardHeader className="subdivision-section-header d-flex justify-content-between align-items-center">
              <div>
                <div className="section-kicker">Finance</div>
                <div className="section-title">Billing & Status</div>
                <small className="text-body-secondary">Exchange rate and activation.</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Exchange Rate (Lps.)</CFormLabel>
                  <CFormInput
                    value={formData.exchange_rate || ''}
                    onChange={(e) => handleChange('exchange_rate', e.target.value)}
                    placeholder="e.g. 24.50"
                    disabled={readOnly}
                  />
                </CCol>
                <CCol md={6} className="d-flex align-items-center gap-2">
                  <CFormSwitch
                     size="lg"
                     color="success"
                     checked={isActive}
                     onChange={(e) => handleChange('active', e.target.checked ? '1' : '0')}
                     disabled={readOnly}
                   />
                  <span className="fw-semibold">{isActive ? 'Active' : 'Inactive'}</span>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          {subdivisionId ? (
            <SubdivisionInternalSuppliers subdivisionId={Number(subdivisionId)} readOnly={readOnly} />
          ) : (
            <CCard className="subdivision-section-card shadow-sm border-0">
              <CCardHeader className="subdivision-section-header d-flex justify-content-between align-items-center">
                <div>
                  <div className="section-kicker">Suppliers</div>
                  <div className="section-title">Internal Suppliers</div>
                  <small className="text-body-secondary">Suppliers available to trucks in this subdivision.</small>
                </div>
              </CCardHeader>
              <CCardBody>
                <small className="text-body-secondary">Save the subdivision first to manage internal suppliers.</small>
              </CCardBody>
            </CCard>
          )}
        </CCol>

        <CCol xs={12} className="mb-4">
          <div className="subdivision-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2">
            <CButton
              color="secondary"
              variant="ghost"
              type="button"
              onClick={() => window.history.back()}
              disabled={loading}
            >
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back
            </CButton>
             <div className="d-flex gap-2">
               {!readOnly && (
                 <CButton color="primary" type="submit" disabled={loading} className="text-white px-4">
                   <CIcon icon={cilSave} className="me-2" />
                   Save Subdivision
                 </CButton>
               )}
             </div>
          </div>
        </CCol>
      </CRow>
    </CForm>
  )
}

export default SubdivisionForm
