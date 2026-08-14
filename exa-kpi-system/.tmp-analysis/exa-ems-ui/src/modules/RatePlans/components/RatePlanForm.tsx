import React, { useEffect, useState } from 'react'
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
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave, cilX } from '@coreui/icons'
import { ACTIVE_STATUS_ID } from '../constants'
import type { RatePlan, RatePlanStatus } from '../types'

interface RatePlanFormProps {
  initialValues: RatePlan | null
  loading: boolean
  error?: string | null
  isEdit: boolean
  onSubmit: (plan: RatePlan) => void
  onCancel: () => void
}

const RatePlanForm: React.FC<RatePlanFormProps> = ({ initialValues, loading, error, isEdit, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<RatePlan>(initialValues || { name: '', status: { id: ACTIVE_STATUS_ID, name: 'ACTIVE' } })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues)
    }
  }, [initialValues])

  const handleChange = (field: keyof RatePlan, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleStatusToggle = (checked: boolean) => {
    const status: RatePlanStatus = {
      id: checked ? ACTIVE_STATUS_ID : 0,
      name: checked ? 'ACTIVE' : 'DISABLED',
    }
    handleChange('status', status)
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
    const statusId = typeof formData.status === 'object' ? formData.status.id : Number(formData.status || ACTIVE_STATUS_ID)
    onSubmit({
      ...formData,
      status: {
        id: statusId,
        name: statusId === ACTIVE_STATUS_ID ? 'ACTIVE' : 'DISABLED',
      },
    })
  }

  return (
    <CCard className="rateplan-form-card">
      <CCardHeader className="attribute-card-header">
        <div className="attribute-card-title">Rate Plan Details</div>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger">{error}</CAlert>}
        <CForm>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormInput
                label="Name *"
                placeholder="Rate Plan Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                invalid={Boolean(errors.name)}
                disabled={loading}
              />
              {errors.name && <CFormFeedback invalid>{errors.name}</CFormFeedback>}
            </CCol>
            <CCol md={6}>
              <div className="d-flex align-items-center h-100">
                <CFormSwitch
                  id="rateplan-status"
                  label={Number((formData.status as any)?.id ?? formData.status ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID ? 'Active' : 'Disabled'}
                  checked={Number((formData.status as any)?.id ?? formData.status ?? ACTIVE_STATUS_ID) === ACTIVE_STATUS_ID}
                  onChange={(e) => handleStatusToggle(e.target.checked)}
                  disabled={loading}
                  className="attribute-toggle mb-0"
                />
              </div>
            </CCol>
          </CRow>
        </CForm>
      </CCardBody>
      <CCardFooter className="attribute-form-footer d-flex justify-content-between align-items-center">
        <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
          <CIcon icon={cilArrowLeft} className="me-2" />
          Back
        </CButton>
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
            <CIcon icon={cilX} className="me-2" />
            Cancel
          </CButton>
          <CButton color="success" className="text-white" onClick={handleSubmit} disabled={loading}>
            <CIcon icon={cilSave} className="me-2" />
            {isEdit ? 'Save Changes' : 'Save Rate Plan'}
          </CButton>
        </div>
      </CCardFooter>
    </CCard>
  )
}

export default RatePlanForm
