import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store'
import { checkAuth } from '../store/slices/authSlice'
import { permissionService, READ } from '../services/auth/permission.service'

interface ProtectedRouteProps {
  module?: string
  children: React.ReactNode
  redirectTo?: string
}

/**
 * ProtectedRoute Component
 * 
 * Wraps route components to enforce authentication and permission-based access control.
 * 
 * Security checks (in order):
 * 1. Authentication - User must be logged in (redirects to /login)
 * 2. Permission - If module specified, user must have READ permission (redirects to /dashboard)
 * 
 * Usage:
 * ```tsx
 * // Basic protection (authentication only)
 * <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 * 
 * // Module protection (authentication + permission)
 * <Route
 *   path="/modules/users"
 *   element={
 *     <ProtectedRoute module={MODULE_USERS}>
 *       <UsersListPage />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 * 
 * @param module - Optional module constant to check permission against
 * @param children - The component to render if all checks pass
 * @param redirectTo - Optional custom redirect path for permission failures (defaults to /dashboard)
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  module, 
  children, 
  redirectTo = '/dashboard' 
}) => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)

  // Check auth state on mount and when location changes
  useEffect(() => {
    dispatch(checkAuth())
  }, [dispatch, location.pathname])

  // First check: Authentication required for all protected routes
  if (!isAuthenticated) {
    console.warn('🔒 Access denied: User not authenticated, redirecting to login')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Second check: Module permission (if module is specified)
  if (module) {
    const hasPermission = permissionService.checkPermission(module, READ)
    
    if (!hasPermission) {
      console.warn(`🚫 Access denied: User "${user?.username}" lacks READ permission for module: ${module}`)
      return <Navigate to={redirectTo} replace />
    }
  }

  // All checks passed, render the protected component
  return <>{children}</>
}

export default ProtectedRoute
