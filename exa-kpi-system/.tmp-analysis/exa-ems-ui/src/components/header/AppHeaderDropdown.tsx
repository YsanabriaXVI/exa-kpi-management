import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react-pro'
import {
  cilUser,
  cilAccountLogout,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import { useAuth } from 'src/hooks/useAuth'

const AppHeaderDropdown = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const handleLogout = async () => {
    await logout()
    // Navigate to login after logout (no reload)
    navigate('/login', { replace: true })
  }

  const handleProfileClick = () => {
    navigate('/profile')
  }

  // Get user initials: F+L if available, otherwise first letter of email
  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      // First letter of first name + first letter of last name
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
    } else if (user?.email) {
      // Fallback to first letter of email
      return user.email.charAt(0).toUpperCase()
    } else if (user?.username) {
      // Fallback to first letter of username
      return user.username.charAt(0).toUpperCase()
    }
    return 'U' // Default fallback
  }

  // Get display name
  const getDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || user?.username || t('account')
  }

  return (
    <CDropdown variant="nav-item" alignment="end">
      <CDropdownToggle className="py-0" caret={false}>
        <CAvatar color="primary" textColor="white" size="md">
          {getUserInitials()}
        </CAvatar>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0">
        <CDropdownHeader className="bg-body-secondary text-body-secondary fw-semibold rounded-top mb-2">
          {getDisplayName()}
        </CDropdownHeader>
        <CDropdownItem onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilUser} className="me-2" />
          {t('profile')}
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          {t('logout')}
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
