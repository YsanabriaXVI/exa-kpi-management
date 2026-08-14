import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react-pro'

import AppBreadcrumb from './AppBreadcrumb'
import ProtectedRoute from './ProtectedRoute'
import PaymentErrorBoundary from '../modules/Payments/components/PaymentErrorBoundary'
import { MODULE_PAYMENTS } from '../constants/modules'

// routes config
import routes from '../routes'

const AppContent = () => {
  return (
    <CContainer fluid className="px-4">
      <AppBreadcrumb />
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            const element = (
              <ProtectedRoute module={route.module}>
                <route.element />
              </ProtectedRoute>
            )
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  element={
                    route.module === MODULE_PAYMENTS
                      ? <PaymentErrorBoundary>{element}</PaymentErrorBoundary>
                      : element
                  }
                />
              )
            )
          })}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default AppContent
