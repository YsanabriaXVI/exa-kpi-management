import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
  CAlert,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import PageHero from '../../../components/PageHero'
import { cilCheckCircle, cilBuilding } from '@coreui/icons'
import type { AppDispatch, RootState } from '../../../store'
import {
  clearCurrentCompany,
  createCompany,
  loadCompany,
  setDefaultCompany,
  updateCompany,
  uploadCompanyLogo,
  setActiveTab,
} from '../store/companiesSlice'
import CompanyForm from '../components/CompanyForm'
import type { Company } from '../types'
import './CompanyForm.scss'

const CompanyFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const { currentCompany, loading, error, activeTab } = useSelector((state: RootState) => (state as any).companies)
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedCompany, setSavedCompany] = useState<Company | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const debugEnabled = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('debugCompany') === 'true'
  }, [location.search])

  useEffect(() => {
    const navTab = (location.state as any)?.activeTab
    if (navTab) {
      dispatch(setActiveTab(navTab))
    }
    if (isEdit && id) {
      dispatch(loadCompany(Number(id)))
    } else {
      dispatch(setDefaultCompany())
    }
    return () => {
      dispatch(clearCurrentCompany())
    }
  }, [dispatch, id, isEdit])

  const showToast = (message: string, color: 'success' | 'danger') => {
    setToast(
      <CToast autohide delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  const handleSubmit = async (data: Company, logoFile?: File | null) => {
    try {
      let result: any
      if (isEdit && id) {
        result = await dispatch(updateCompany({ id: Number(id), company: data }))
      } else {
        result = await dispatch(createCompany(data))
      }
      if (result.meta.requestStatus === 'fulfilled') {
        const saved = result.payload as Company
        setSavedCompany(saved)
        if (logoFile && saved.company_id) {
          await dispatch(uploadCompanyLogo({ id: saved.company_id, filename: logoFile.name, file: logoFile }))
        }
        setShowSuccessModal(true)
      } else {
        throw new Error(result.payload || 'Failed to save company')
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save company', 'danger')
    }
  }

  const handleCancel = () => {
    navigate('/modules/companies', { state: { activeTab } })
  }

  return (
    <div className="company-form-page">
      <CToaster ref={toaster} push={toast} placement="top-end" />
      {debugEnabled && (
        <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.5rem' }}>
          <strong>Debug Company Payload</strong>
          {'\n'}
          {JSON.stringify(currentCompany, null, 2)}
        </pre>
      )}
      <CompanyForm
        initialValues={currentCompany}
        loading={loading}
        error={error}
        isEdit={isEdit}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />

      <CModal visible={showSuccessModal} onClose={() => setShowSuccessModal(false)} alignment="center" backdrop="static">
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilCheckCircle} className="text-success me-2" size="lg" />
            Success!
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-0">
            Company <strong>{savedCompany?.name}</strong> has been {isEdit ? 'updated' : 'created'} successfully.
          </p>
          <p className="text-body-secondary mt-2 mb-0">What would you like to do next?</p>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <CButton color="secondary" onClick={() => navigate('/modules/companies', { state: { activeTab } })}>
            Back to List
          </CButton>
          <div className="d-flex gap-2">
            {!isEdit && (
              <CButton
                color="primary"
                className="text-white"
                onClick={() => {
                  setShowSuccessModal(false)
                  setSavedCompany(null)
                  dispatch(setDefaultCompany())
                  navigate('/modules/companies/create', { state: { activeTab } })
                }}
              >
                Create Another
              </CButton>
            )}
            {savedCompany?.company_id && (
              <CButton
                color="info"
                className="text-white"
                onClick={() => {
                  setShowSuccessModal(false)
                  navigate(`/modules/companies/edit/${savedCompany.company_id}`, { state: { activeTab } })
                  dispatch(loadCompany(savedCompany.company_id))
                }}
              >
                {isEdit ? 'Continue Editing' : 'Edit Company'}
              </CButton>
            )}
          </div>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default CompanyFormPage
