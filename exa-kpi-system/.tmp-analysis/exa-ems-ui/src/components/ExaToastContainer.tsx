import React, { useEffect, useRef, useState } from 'react'
import { CToast, CToastBody, CToastClose, CToastHeader, CToaster } from '@coreui/react-pro'

interface ToastItem {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
}

const COLOR_MAP: Record<ToastItem['type'], string> = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'info',
}

let nextId = 1

const ExaToastContainer: React.FC = () => {
  const toaster = useRef<any>(null)
  const [toast, setToast] = useState<any>()

  useEffect(() => {
    const handler = (e: Event) => {
      const { type, title, message } = (e as CustomEvent).detail as ToastItem
      const color = COLOR_MAP[type] ?? 'info'
      const id = nextId++
      setToast(
        <CToast key={id} autohide delay={6000} color={color} className="text-white align-items-center">
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
          <div className="d-flex">
            <CToastBody>{message}</CToastBody>
            <CToastClose className="me-2 m-auto" white />
          </div>
        </CToast>,
      )
    }

    window.addEventListener('exa-toast', handler)
    return () => window.removeEventListener('exa-toast', handler)
  }, [])

  return <CToaster ref={toaster} push={toast} placement="top-end" />
}

export default ExaToastContainer
