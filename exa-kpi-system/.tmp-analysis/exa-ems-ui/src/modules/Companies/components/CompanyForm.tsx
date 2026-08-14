import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CForm,
  CFormFeedback,
  CFormInput,
  CFormSwitch,
  CRow,
  CImage,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilX } from '@coreui/icons'
import type { Company } from '../types'
import { ACTIVE_STATUS_ID, DEFAULT_STATUS_ID } from '../constants'

interface CompanyFormProps {
  initialValues: Company | null
  loading: boolean
  error?: string | null
  isEdit: boolean
  onSubmit: (company: Company, logoFile?: File | null) => void
  onCancel: () => void
}

const CompanyForm: React.FC<CompanyFormProps> = ({ initialValues, loading, error, isEdit, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Company>(
    initialValues || {
      name: '',
      description: '',
      address: '',
      phone: '',
      reference: '',
      status: DEFAULT_STATUS_ID,
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initialValues?.logo_url ?? null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (initialValues) {
      setFormData({
        ...initialValues,
        status: initialValues.status ?? DEFAULT_STATUS_ID,
      })
      setPreview(initialValues.logo_url ?? null)
    }
  }, [initialValues])

  const handleChange = (field: keyof Company, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAddressInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = (e.target as HTMLDivElement).innerHTML
    handleChange('address', html)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setLogoFile(null)
      setPreview(initialValues?.logo_url ?? null)
    }
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!formData.name || formData.name.trim() === '') {
      nextErrors.name = 'Name is required'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSubmit(
      {
        ...formData,
        status: Number(formData.status ?? DEFAULT_STATUS_ID),
      },
      logoFile
    )
  }

  const statusLabel =
    Number(formData.status ?? DEFAULT_STATUS_ID) === ACTIVE_STATUS_ID ? 'Active' : 'Inactive'

  return (
    <CCard>
      <CCardHeader className="attribute-card-header">
        <div className="attribute-card-title">{isEdit ? 'Edit Company' : 'Add Company'}</div>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger">{error}</CAlert>}
        <CForm>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormInput
                label="Name *"
                placeholder="Company name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                invalid={Boolean(errors.name)}
                disabled={loading}
              />
              {errors.name && <CFormFeedback invalid>{errors.name}</CFormFeedback>}
            </CCol>
            <CCol md={6}>
              <CFormInput
                label="Description"
                placeholder="Short description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={loading}
              />
            </CCol>
          </CRow>

          <CRow className="g-3 mt-1">
            <CCol md={8}>
              <label className="form-label">Address (rich text)</label>
              <div
                className="form-control rich-text-editor"
                contentEditable={!loading}
                onInput={handleAddressInput}
                dangerouslySetInnerHTML={{ __html: formData.address || '' }}
              />
              <div className="form-text">Supports HTML (bold, line breaks, spans, etc.).</div>
            </CCol>
            <CCol md={6}>
              <CFormInput
                label="Phone"
                placeholder="Phone"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                disabled={loading}
              />
            </CCol>
          </CRow>

          <CRow className="g-3 mt-1">
            <CCol md={6}>
              <CFormInput
                label="Reference"
                placeholder="Reference"
                value={formData.reference || ''}
                onChange={(e) => handleChange('reference', e.target.value)}
                disabled={loading}
              />
            </CCol>
            <CCol md={6} className="d-flex align-items-center">
              <CFormSwitch
                id="company-status"
                label={statusLabel}
                checked={Number(formData.status ?? DEFAULT_STATUS_ID) === ACTIVE_STATUS_ID}
                onChange={(e) => handleChange('status', e.target.checked ? ACTIVE_STATUS_ID : 0)}
                disabled={loading}
                className="attribute-toggle mb-0"
              />
            </CCol>
          </CRow>

          <CRow className="g-3 mt-1 align-items-center">
            <CCol md={6}>
              <CFormInput
                type="file"
                label="Logo"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                disabled={loading}
              />
              <div className="form-text">PNG/JPG up to 2MB.</div>
            </CCol>
            <CCol md={6}>
              {preview ? (
                <div className="text-center">
                  <CImage fluid rounded src={preview} alt="Logo preview" style={{ maxHeight: '120px' }} />
                </div>
              ) : (
                <div className="text-body-secondary small">No logo uploaded</div>
              )}
            </CCol>
          </CRow>
        </CForm>
      </CCardBody>
      <CCardFooter className="attribute-form-footer d-flex justify-content-between align-items-center">
        <CButton color="secondary" variant="ghost" onClick={onCancel} disabled={loading}>
          <CIcon icon={cilX} className="me-2" />
          Cancel
        </CButton>
        <div className="d-flex gap-2">
          <CButton color="success" className="text-white" onClick={handleSubmit} disabled={loading}>
            <CIcon icon={cilSave} className="me-2" />
            {isEdit ? 'Save Changes' : 'Save Company'}
          </CButton>
        </div>
      </CCardFooter>
    </CCard>
  )
}

export default CompanyForm
