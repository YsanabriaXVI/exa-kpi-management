import React, { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react-pro'

interface FormDirtyGuardProps {
  isDirty: boolean
}

/**
 * Guards against accidental navigation when form has unsaved changes.
 * Works with BrowserRouter (no data router required).
 *
 * - Browser tab close / refresh: native `beforeunload` prompt
 * - In-app navigation: intercepts popstate (back/forward) and shows a CoreUI modal
 */
const FormDirtyGuard: React.FC<FormDirtyGuardProps> = ({ isDirty }) => {
  const { t } = useTranslation('payments')
  const navigate = useNavigate()
  const [showModal, setShowModal] = React.useState(false)
  const pendingDelta = useRef<number | null>(null)

  // Browser close / refresh protection
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    },
    [isDirty],
  )

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [handleBeforeUnload])

  // Intercept browser back/forward via popstate
  useEffect(() => {
    if (!isDirty) return

    // Push a duplicate entry so we can intercept back navigation
    window.history.pushState(null, '', window.location.href)

    const handlePopState = () => {
      // Re-push to prevent actually leaving
      window.history.pushState(null, '', window.location.href)
      pendingDelta.current = -1
      setShowModal(true)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isDirty])

  const handleStay = () => {
    pendingDelta.current = null
    setShowModal(false)
  }

  const handleLeave = () => {
    setShowModal(false)
    // Go back twice: once for our pushState, once for the real navigation
    navigate(-2)
  }

  if (!showModal) return null

  return (
    <CModal alignment="center" visible onClose={handleStay}>
      <CModalHeader closeButton>
        <CModalTitle>{t('guard.title')}</CModalTitle>
      </CModalHeader>
      <CModalBody>{t('guard.message')}</CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={handleStay}>
          {t('guard.stay')}
        </CButton>
        <CButton color="danger" className="text-white" onClick={handleLeave}>
          {t('guard.leave')}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default FormDirtyGuard
