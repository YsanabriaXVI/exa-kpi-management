import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormFeedback,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilLocationPin } from '@coreui/icons'
import { getLocationCoordinates, isValidLatitude, isValidLongitude } from '../../../utils/coordinates'

interface CoordinatesEditModalProps {
  visible: boolean
  location: any | null
  onSave: (latitud: number, longitud: number) => Promise<void>
  onClose: () => void
}

const CoordinatesEditModal: React.FC<CoordinatesEditModalProps> = ({
  visible,
  location,
  onSave,
  onClose,
}) => {
  const [latitud, setLatitud] = useState('')
  const [longitud, setLongitud] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      const coords = getLocationCoordinates(location)
      setLatitud(coords.latitud !== null && coords.latitud !== 0 ? String(coords.latitud) : '')
      setLongitud(coords.longitud !== null && coords.longitud !== 0 ? String(coords.longitud) : '')
      setErrors({})
      setSaveError('')
      setSaving(false)
    }
  }, [visible, location])

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}
    if (!isValidLatitude(latitud)) {
      nextErrors.latitud = 'Latitude must be a number between -90 and 90'
    }
    if (!isValidLongitude(longitud)) {
      nextErrors.longitud = 'Longitude must be a number between -180 and 180'
    }
    if (!nextErrors.latitud && !nextErrors.longitud && Number(latitud) === 0 && Number(longitud) === 0) {
      nextErrors.latitud = 'Coordinates (0, 0) are not valid'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setSaveError('')
    try {
      await onSave(Number(latitud), Number(longitud))
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save the coordinates')
      setSaving(false)
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
      <CModalHeader>
        <CModalTitle>
          <CIcon icon={cilLocationPin} className="text-warning me-2" size="lg" />
          Set Coordinates{location?.name ? ` — ${location.name}` : ''}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {saveError && <CAlert color="danger">{saveError}</CAlert>}
        <div className="mb-3">
          <CFormInput
            type="number"
            label="Latitude *"
            placeholder="e.g. 15.5042"
            value={latitud}
            invalid={Boolean(errors.latitud)}
            onChange={(e) => {
              setLatitud(e.target.value)
              setErrors((prev) => {
                const next = { ...prev }
                delete next.latitud
                return next
              })
            }}
            disabled={saving}
          />
          {errors.latitud && <CFormFeedback invalid className="d-block">{errors.latitud}</CFormFeedback>}
        </div>
        <div>
          <CFormInput
            type="number"
            label="Longitude *"
            placeholder="e.g. -88.0250"
            value={longitud}
            invalid={Boolean(errors.longitud)}
            onChange={(e) => {
              setLongitud(e.target.value)
              setErrors((prev) => {
                const next = { ...prev }
                delete next.longitud
                return next
              })
            }}
            disabled={saving}
          />
          {errors.longitud && <CFormFeedback invalid className="d-block">{errors.longitud}</CFormFeedback>}
        </div>
      </CModalBody>
      <CModalFooter className="d-flex justify-content-between">
        <CButton color="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </CButton>
        <CButton color="primary" className="text-white" onClick={handleSave} disabled={saving}>
          {saving && <CSpinner size="sm" className="me-2" />}
          Save Coordinates
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default CoordinatesEditModal
