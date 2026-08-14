import React, { useEffect, useMemo, useState } from 'react'
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
  CFormLabel,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave, cilX } from '@coreui/icons'
import type { CityRef, Location } from '../types'
import { ACTIVE_STATUS_ID, DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from '../constants'
import LocationMap from './LocationMap'

interface LocationFormProps {
  initialValues?: Location
  loading?: boolean
  error?: string | null
  isEdit?: boolean
  cities: CityRef[]
  onSubmit: (data: Location) => void
  onCancel: () => void
  readOnly?: boolean
}

const LocationForm: React.FC<LocationFormProps> = ({
  initialValues,
  loading,
  error,
  isEdit,
  cities,
  onSubmit,
  onCancel,
  readOnly = false,
}: LocationFormProps) => {
  const [formData, setFormData] = useState<Location>(
    initialValues || {
      name: '',
      city_id: undefined,
      address: '',
      reference: '',
      phone: '',
      status: ACTIVE_STATUS_ID,
      latitud: DEFAULT_LATITUDE,
      longitud: DEFAULT_LONGITUDE,
      geofence_coordinates: undefined,
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialValues) {
      setFormData({
        ...initialValues,
        latitud: initialValues.latitud ?? DEFAULT_LATITUDE,
        longitud: initialValues.longitud ?? DEFAULT_LONGITUDE,
      })
    }
  }, [initialValues])

  const handleChange = (field: keyof Location, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const validate = () => {
    const nextErrors: Partial<Record<keyof Location, string>> = {}
    if (!formData.name || formData.name.trim() === '') {
      nextErrors.name = 'Name is required'
    } else if (!/[a-zA-Z]/.test(formData.name)) {
      nextErrors.name = 'Name must contain at least one letter'
    }
    if (!formData.city_id && !formData.city?.city_id) {
      nextErrors.city_id = 'City is required'
    }
    if (!formData.reference || formData.reference.trim() === '') {
      nextErrors.reference = 'Reference is required'
    }
    if (!formData.phone || formData.phone.trim() === '') {
      nextErrors.phone = 'Phone is required'
    } else if (!/^[0-9+\-() ]+$/.test(formData.phone)) {
      nextErrors.phone = 'Phone number contains invalid characters'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const status = Number((formData as any).status ?? ACTIVE_STATUS_ID)
    onSubmit({
      ...formData,
      status,
      city_id: formData.city_id ?? formData.city?.city_id,
      latitud: Number.isFinite(Number(formData.latitud)) ? Number(formData.latitud) : DEFAULT_LATITUDE,
      longitud: Number.isFinite(Number(formData.longitud)) ? Number(formData.longitud) : DEFAULT_LONGITUDE,
      geofence_coordinates: formData.geofence_coordinates,
    })
  }

  const cityOptions = useMemo(() => {
    const base = (cities || [])
      .filter((city) => city && (city.city_id || city.id) && city.name)
      .map((city) => ({
        value: String(city.city_id ?? city.id),
        label: city.department?.country?.name
          ? `${city.name} (${city.department?.name}, ${city.department?.country?.name})`
          : city.name || 'City',
        department: city.department,
      }))

    const selectedId = formData.city_id ?? formData.city?.city_id ?? formData.city?.id
    const selectedName = formData.city?.name
    if (selectedId != null && selectedName) {
      const exists = base.some((opt) => opt.value === String(selectedId))
      if (!exists) {
        base.unshift({
          value: String(selectedId),
          label: selectedName,
          department: formData.city?.department,
        })
      }
    }

    return base
  }, [cities, formData.city_id, formData.city])

  const selectedCity = useMemo(() => {
    const cityId = formData.city_id ?? formData.city?.city_id ?? formData.city?.id
    return cityOptions.find((opt) => opt.value === String(cityId))
  }, [cityOptions, formData.city_id, formData.city])

  const countryName = selectedCity?.department?.country?.name || formData.city?.department?.country?.name
  const departmentName = selectedCity?.department?.name || formData.city?.department?.name

  return (
    <CCard>
      <CCardHeader className="attribute-card-header">
        <div className="attribute-card-title">{isEdit ? 'Edit Location' : 'Add Location'}</div>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger">{error}</CAlert>}
        <CForm>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormInput
                label="Name *"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                invalid={Boolean(errors.name)}
                disabled={loading || readOnly}
              />
              {errors.name && <CFormFeedback invalid>{errors.name}</CFormFeedback>}
            </CCol>
            <CCol md={6}>
              <CFormLabel>City *</CFormLabel>
              <CMultiSelect
                options={cityOptions}
                // cityOptions use String(city_id) for their `value` field, so the
                // current selection must also be passed as a string — otherwise
                // CoreUI's MultiSelect comparison (strict equality) never matches
                // and the dropdown renders with nothing selected AND fails to
                // register clicks on options. Passing a number here was the bug.
                value={
                  formData.city_id != null
                    ? [String(formData.city_id)]
                    : formData.city?.city_id != null
                    ? [String(formData.city.city_id)]
                    : []
                }
                onChange={(vals) => {
                  handleChange('city_id', vals[0] ? Number(vals[0].value) : undefined)
                }}
                disabled={loading || readOnly}
                invalid={Boolean(errors.city_id)}
                multiple={false}
                search
                placeholder="Select a city"
                dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
              />
              {errors.city_id && (
                <div className="invalid-feedback d-block">{errors.city_id}</div>
              )}
            </CCol>
          </CRow>

          <CRow className="g-3 mt-1">
            <CCol md={6}>
              <CFormInput
                label="Country"
                value={countryName || ''}
                disabled
              />
            </CCol>
            <CCol md={6}>
              <CFormInput
                label="Department"
                value={departmentName || ''}
                disabled
              />
            </CCol>
          </CRow>

          <CRow className="g-3 mt-1">
            <CCol md={6}>
              <CFormInput
                label="Address"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                disabled={loading || readOnly}
              />
            </CCol>
            <CCol md={6}>
              <CFormInput
                label="Reference *"
                value={formData.reference || ''}
                onChange={(e) => handleChange('reference', e.target.value)}
                invalid={Boolean(errors.reference)}
                disabled={loading || readOnly}
              />
              {errors.reference && <CFormFeedback invalid>{errors.reference}</CFormFeedback>}
            </CCol>
          </CRow>

          <CRow className="g-3 mt-1">
            <CCol md={6}>
              <CFormInput
                label="Phone *"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                invalid={Boolean(errors.phone)}
                disabled={loading || readOnly}
              />
              {errors.phone && <CFormFeedback invalid>{errors.phone}</CFormFeedback>}
            </CCol>
          </CRow>

          <LocationMap
            latitud={formData.latitud}
            longitud={formData.longitud}
            geofenceCoordinates={formData.geofence_coordinates}
            readOnly={loading || readOnly}
            onCenterChange={(latitud, longitud) => {
              handleChange('latitud', latitud)
              handleChange('longitud', longitud)
            }}
            onPolygonChange={(coordinates) => handleChange('geofence_coordinates', coordinates)}
          />
        </CForm>
      </CCardBody>
      <CCardFooter className="attribute-form-footer d-flex justify-content-between align-items-center">
        <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
          <CIcon icon={cilArrowLeft} className="me-2" />
          Back
        </CButton>
        <div className="d-flex gap-2">
          {!readOnly && (
            <>
              <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
                <CIcon icon={cilX} className="me-2" />
                Cancel
              </CButton>
              <CButton color="success" className="text-white" onClick={handleSubmit} disabled={loading}>
                <CIcon icon={cilSave} className="me-2" />
                {isEdit ? 'Save Changes' : 'Save Location'}
              </CButton>
            </>
          )}
        </div>
      </CCardFooter>
    </CCard>
  )
}

export default LocationForm
