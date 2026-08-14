import React, { Component, ErrorInfo } from 'react'
import { CButton, CCard, CCardBody, CCol, CRow } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilWarning, cilReload } from '@coreui/icons'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class PaymentErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PaymentErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <CRow className="justify-content-center mt-5">
          <CCol xs={12} md={8} lg={6}>
            <CCard className="border-0 shadow-sm text-center">
              <CCardBody className="py-5">
                <CIcon icon={cilWarning} size="3xl" className="text-warning mb-3" />
                <h4 className="mb-2">Something went wrong</h4>
                <p className="text-body-secondary mb-4">
                  An unexpected error occurred in this module. Please try again.
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <pre className="text-start bg-body-secondary p-3 rounded small mb-4" style={{ maxHeight: '150px', overflow: 'auto' }}>
                    {this.state.error.message}
                  </pre>
                )}
                <CButton color="primary" onClick={this.handleRetry}>
                  <CIcon icon={cilReload} className="me-2" />
                  Try Again
                </CButton>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )
    }
    return this.props.children
  }
}

export default PaymentErrorBoundary
