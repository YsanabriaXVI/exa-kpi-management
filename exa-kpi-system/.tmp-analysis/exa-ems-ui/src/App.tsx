import React, { Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'

import { CSpinner, useColorModes } from '@coreui/react-pro'

import './scss/style.scss'

// We use those styles to show code examples, you should remove them in your application.
import './scss/examples.scss'

import type { State } from './store'
import ProtectedRoute from './components/ProtectedRoute'
import { forceLogout } from './store/slices/authSlice'
import { setLogoutHandler } from './services/api/axios.config'
import './services/notification.service' // Initialize notification service
import ExaToastContainer from './components/ExaToastContainer'

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

const Login = React.lazy(() => import('./views/pages/login/Login'))
const Register = React.lazy(() => import('./views/pages/register/Register'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))

// Email App
const EmailApp = React.lazy(() => import('./views/apps/email/EmailApp'))

const App = () => {
  const dispatch = useDispatch()
  const { isColorModeSet, setColorMode } = useColorModes(
    'coreui-pro-react-admin-template-theme-modern',
  )
  const storedTheme = useSelector((state: State) => state.theme)

  useEffect(() => {
    // Set up global logout handler for axios interceptor
    setLogoutHandler(() => {
      console.log('🔒 Global logout handler triggered')
      dispatch(forceLogout())
    })

    // Theme initialization
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    let theme = urlParams.get('theme')

    if (theme !== null && theme.match(/^[A-Za-z0-9\s]+/)) {
      theme = theme.match(/^[A-Za-z0-9\s]+/)![0]
    }

    if (theme) {
      setColorMode(theme)
    }

    if (isColorModeSet()) {
      return
    }

    setColorMode(storedTheme)
  }, [dispatch]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <ExaToastContainer />
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/404" element={<Page404 />} />
          <Route path="/500" element={<Page500 />} />

          {/* Protected Routes */}
          <Route
            path="/apps/email/*"
            element={
              <ProtectedRoute>
                <EmailApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <DefaultLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </>
  )
}

export default App
