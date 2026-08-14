/**
 * Location Item Form Page
 * Page for creating and editing location items (Countries, Departments, Cities, Variants)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { cilCheckCircle, cilMap } from '@coreui/icons'
import LocationItemForm from '../components/LocationItemForm'
import type { RootState, AppDispatch } from '../../../store'
import {
  loadAllLocationItems,
  createLocationItem,
  updateLocationItem,
  setDefaultItem,
  setCurrentItem,
} from '../store/locationItemsSlice'
import PageHero from '../../../components/PageHero'
import { permissionService, CREATE, UPDATE, READ } from '../../../services/auth/permission.service'
import { MODULE_LOCATIONS } from '../../../constants/modules'
import { LOCATION_TYPES } from '../constants'
import type { LocationTypeKey } from '../types'

const LocationItemFormPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { type, id } = useParams<{ type: string; id: string }>()
  const isEdit = Boolean(id) && id !== 'new'
  const toaster = useRef<any>()
  const [toast, setToast] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedItemData, setSavedItemData] = useState<any>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Validate type param
  const isValidType = type && LOCATION_TYPES.includes(type as any)
  const locationType = isValidType ? (type as LocationTypeKey) : 'countries'

  const { current, loading, error, data } = useSelector((state: RootState) => (state as any).locationitems)

  // Permission checks
  const canCreate = permissionService.checkPermission(MODULE_LOCATIONS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_LOCATIONS, UPDATE)
  const canRead = permissionService.checkPermission(MODULE_LOCATIONS, READ)

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

  // Check permissions and type validity
  useEffect(() => {
    if (!isValidType) {
      showToast('Invalid location item type.', 'danger')
      navigate('/modules/locationitems')
      return
    }
    if (!canRead) {
      showToast('You do not have permission to access location items.', 'danger')
      navigate('/dashboard')
      return
    }
    if (isEdit && !canUpdate) {
      showToast('You do not have permission to edit location items.', 'warning')
      navigate('/modules/locationitems')
      return
    }
    if (!isEdit && !canCreate) {
      showToast('You do not have permission to create location items.', 'warning')
      navigate('/modules/locationitems')
      return
    }
  }, [canRead, canUpdate, canCreate, isEdit, navigate, isValidType])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      // Ensure dropdown data is loaded
      if (
        data.countries.length === 0 ||
        data.departments.length === 0 ||
        data.cities.length === 0
      ) {
        await dispatch(loadAllLocationItems())
      }

      if (isEdit && id) {
        // Find the item in the store or fetch it if needed
        // For simplicity, we rely on loadAllLocationItems populating the data structure
        // In a clearer implementation, we might fetch a single item by ID
        const items = data[locationType] as any[]
        const found = items.find(
          (item: any) =>
            String(
              item.id ||
                item.country_id ||
                item.department_id ||
                item.city_id ||
                item.variant_id
            ) === id
        )

        if (found) {
          dispatch(setCurrentItem(found))
        } else {
          // Fallback or fetch single logic could go here
          showToast('Item not found.', 'warning')
          navigate('/modules/locationitems')
        }
      } else {
        dispatch(setDefaultItem())
      }
      setDataLoaded(true)
    }

    if (isValidType) {
      loadData()
    }
  }, [id, isEdit, dispatch, locationType, isValidType]) // Added dependencies

  const handleSubmit = async (formData: any) => {
    if (isEdit && !canUpdate) {
      showToast('You do not have permission to update.', 'danger')
      return
    }
    if (!isEdit && !canCreate) {
      showToast('You do not have permission to create.', 'danger')
      return
    }

    try {
      let result: any
      if (isEdit && id) {
        result = await dispatch(
          updateLocationItem({
            type: locationType,
            id: Number(id),
            item: formData,
          })
        )
      } else {
        result = await dispatch(createLocationItem({ type: locationType, item: formData }))
      }

      if (result.meta.requestStatus === 'fulfilled') {
        setSavedItemData(result.payload.item)
        setShowSuccessModal(true)
      } else {
        throw new Error(result.error?.message || 'Failed to save item')
      }
    } catch (err: any) {
      showToast(`${err.message || 'An error occurred while saving.'}`, 'danger')
    }
  }

  const handleCancel = () => {
    navigate('/modules/locationitems')
  }

  const handleGoToList = () => {
    setShowSuccessModal(false)
    navigate('/modules/locationitems')
  }

  const handleCreateAnother = () => {
    setShowSuccessModal(false)
    setSavedItemData(null)
    dispatch(setDefaultItem())
    navigate(`/modules/locationitems/${locationType}/create`)
  }

  const handleEditCurrent = () => {
    setShowSuccessModal(false)
    if (savedItemData) {
      const savedId =
        savedItemData.id ||
        savedItemData.country_id ||
        savedItemData.department_id ||
        savedItemData.city_id ||
        savedItemData.variant_id
      
      // If we are already editing, just stay here. 
      // If we were creating, navigate to the edit URL.
      if (!isEdit) {
        navigate(`/modules/locationitems/${locationType}/edit/${savedId}`)
      }
      dispatch(setCurrentItem(savedItemData))
    }
  }

  const typeLabels: Record<string, string> = {
    countries: 'Country',
    departments: 'Department',
    cities: 'City',
    variants: 'Variant',
  }

  const currentLabel = typeLabels[locationType] || 'Item'

  return (
    <div className="location-item-form-page">
      {!dataLoaded ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading...</div>
          </div>
        </div>
      ) : (
        <>
          <CToaster ref={toaster} push={toast} placement="top-end" />
          <PageHero
            kicker="Location Items Management"
            icon={cilMap}
            title={isEdit ? `Edit ${currentLabel}` : `Create ${currentLabel}`}
            subtitle={isEdit ? (current as any)?.name : `Add new ${currentLabel}`}
          />

          <LocationItemForm
            type={locationType}
            initialValues={isEdit ? current : null}
            loading={loading}
            error={error}
            isEdit={isEdit}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            countries={data.countries}
            departments={data.departments}
            variants={data.variants}
            readOnly={false} // Permissions handled by redirection
            addLabel={`${isEdit ? 'Save' : 'Create'} ${currentLabel}`}
          />

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
                {currentLabel} <strong>{savedItemData?.name}</strong> has been{' '}
                {isEdit ? 'updated' : 'created'} successfully.
              </p>
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
                <CButton color="info" className="text-white" onClick={handleEditCurrent}>
                  {isEdit ? 'Continue Editing' : 'Edit Item'}
                </CButton>
              </div>
            </CModalFooter>
          </CModal>
        </>
      )}
    </div>
  )
}

export default LocationItemFormPage
