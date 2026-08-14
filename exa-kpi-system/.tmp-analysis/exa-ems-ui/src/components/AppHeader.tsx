import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import {
  CContainer,
  // CForm, // Commented out - search removed
  // CFormInput, // Commented out - search removed
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  // CInputGroup, // Commented out - search removed
  // CInputGroupText, // Commented out - search removed
  useColorModes,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilContrast,
  cilMenu,
  cilMoon,
  cilSun,
  cilLanguage,
} from '@coreui/icons'
import { cifUs, cifEs } from '@coreui/icons'

import {
  AppHeaderDropdown,
  // AppHeaderDropdownMssg, // Commented out - not used
  // AppHeaderDropdownNotif, // Commented out - not used
  // AppHeaderDropdownTasks, // Commented out - not used
} from './header/index'

import type { RootState } from 'src/store'
import { set } from 'src/store'

const AppHeader = () => {
  const headerRef = useRef<HTMLDivElement>(null)
  const { colorMode, setColorMode } = useColorModes('coreui-pro-react-admin-template-theme-modern')
  const { i18n, t } = useTranslation()

  const dispatch = useDispatch()
  const asideShow = useSelector((state: RootState) => state.ui.asideShow)
  const sidebarShow = useSelector((state: RootState) => state.ui.sidebarShow)
  const { user } = useSelector((state: RootState) => state.auth)
  
  // Get user display name
  const getUserDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || user?.username || ''
  }

  useEffect(() => {
    document.addEventListener('scroll', () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    })
  }, [])

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer className="px-4" fluid>
        <CHeaderToggler
          className={classNames('d-lg-none', {
            'prevent-hide': !sidebarShow,
          })}
          onClick={() => dispatch(set({ sidebarShow: !sidebarShow }))}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        {/* Search bar removed */}
        {/* Commented out: Notifications, Tasks, Messages */}
        {/* <CHeaderNav className="d-none d-md-flex ms-auto">
          <AppHeaderDropdownNotif />
          <AppHeaderDropdownTasks />
          <AppHeaderDropdownMssg />
        </CHeaderNav> */}
        <CHeaderNav className="ms-auto">
          {/* User Info Display */}
          {user && (
            <li className="nav-item d-none d-md-flex align-items-center px-3">
              <div className="text-end">
                <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>
                  {getUserDisplayName()}
                </div>
                <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
                  {user.email}
                </div>
              </div>
            </li>
          )}
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false}>
              <CIcon icon={cilLanguage} size="lg" />
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem
                active={i18n.language === 'en'}
                className="d-flex align-items-center"
                as="button"
                onClick={() => i18n.changeLanguage('en')}
              >
                <CIcon className="me-2" icon={cifUs} size="lg" /> English
              </CDropdownItem>
              <CDropdownItem
                active={i18n.language === 'es'}
                className="d-flex align-items-center"
                as="button"
                onClick={() => i18n.changeLanguage('es')}
              >
                <CIcon className="me-2" icon={cifEs} size="lg" /> Español
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false}>
              {colorMode === 'dark' ? (
                <CIcon icon={cilMoon} size="lg" />
              ) : colorMode === 'auto' ? (
                <CIcon icon={cilContrast} size="lg" />
              ) : (
                <CIcon icon={cilSun} size="lg" />
              )}
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem
                active={colorMode === 'light'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('light')}
              >
                <CIcon className="me-2" icon={cilSun} size="lg" /> {t('light')}
              </CDropdownItem>
              <CDropdownItem
                active={colorMode === 'dark'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('dark')}
              >
                <CIcon className="me-2" icon={cilMoon} size="lg" /> {t('dark')}
              </CDropdownItem>
              <CDropdownItem
                active={colorMode === 'auto'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('auto')}
              >
                <CIcon className="me-2" icon={cilContrast} size="lg" /> Auto
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <AppHeaderDropdown />
        </CHeaderNav>
        {/* Commented out: Settings/Applications icon to the right of profile */}
        {/* <CHeaderToggler
          onClick={() => dispatch({ type: 'set', asideShow: !asideShow })}
          style={{ marginInlineEnd: '-12px' }}
        >
          <CIcon icon={cilApplicationsSettings} size="lg" />
        </CHeaderToggler> */}
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
