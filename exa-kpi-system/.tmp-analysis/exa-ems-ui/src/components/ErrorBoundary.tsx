import React, { Component } from 'react'
import { CAlert, CButton, CContainer } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilReload, cilWarning } from '@coreui/icons'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: (error: Error, reset: () => void) => React.ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.props.onReset?.()
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.handleReset)
      }

      return (
        <CContainer fluid className="py-5">
          <CAlert color="danger" className="d-flex flex-column align-items-center text-center">
            <CIcon icon={cilWarning} size="3xl" className="mb-3" />
            <h5 className="mb-2">Something went wrong</h5>
            <p className="text-body-secondary mb-3">{error.message}</p>
            <CButton color="danger" variant="outline" onClick={this.handleReset}>
              <CIcon icon={cilReload} className="me-2" />
              Try Again
            </CButton>
          </CAlert>
        </CContainer>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
