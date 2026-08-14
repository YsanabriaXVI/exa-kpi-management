import React, { useRef, useState, useCallback } from 'react'
import {
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'

/**
 * Simple toast hook following existing app CToaster pattern.
 * Returns { addToast, ToasterComponent } — render <ToasterComponent /> once in JSX.
 */
export function useToast() {
  const toaster = useRef<any>(null)
  const [toast, setToast] = useState<React.ReactElement | null>(null)

  const addToast = useCallback(
    (message: string, color: 'success' | 'danger' | 'warning' | 'info' = 'success') => {
      setToast(
        <CToast autohide delay={4000} color={color} className="text-white align-items-center">
          <div className="d-flex">
            <CToastBody>{message}</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>,
      )
    },
    [],
  )

  const ToasterComponent = useCallback(
    () => <CToaster ref={toaster} push={toast} placement="top-end" />,
    [toast],
  )

  return { addToast, ToasterComponent }
}
