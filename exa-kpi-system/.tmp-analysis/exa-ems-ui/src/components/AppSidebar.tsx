import React, { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CNavTitle,
  CSidebar,
  CSidebarBrand,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react-pro'

import { AppSidebarNav } from './AppSidebarNav'

// sidebar nav config
import navigation from '../_nav'
import type { NavItem } from '../_nav'

import type { RootState } from '../store'
import { set } from '../store'
import { permissionService, READ } from '../services/auth/permission.service'
import { authStorage } from '../services/auth/auth.storage'

/**
 * Recursively filters navigation items based on user permissions.
 * Items with a module property require READ permission to be visible.
 * Items with visibleToEmails are restricted to specific users.
 * Items without a module property are always visible (e.g., Dashboard).
 * Parent groups are hidden if all children are filtered out.
 * Section headers (CNavTitle) are hidden when the section that follows them
 * has no visible content — otherwise the label renders as an orphan header.
 */
const filterNavigationByPermissions = (items: NavItem[]): NavItem[] => {
  const currentUser = authStorage.getUser()
  const currentEmail = (currentUser?.email || '').toLowerCase()

  const filtered = items
    .map((item) => {
      const filteredItem = { ...item }

      // Email-based access control (e.g., Nabi beta access)
      if (filteredItem.visibleToEmails) {
        if (!filteredItem.visibleToEmails.includes(currentEmail)) {
          return null
        }
      }

      // If item has children, filter them recursively
      if (filteredItem.items && filteredItem.items.length > 0) {
        filteredItem.items = filterNavigationByPermissions(filteredItem.items)

        if (filteredItem.items.length === 0) {
          return null
        }
      }

      // Check permission if module is specified
      if (filteredItem.module) {
        const hasPermission = permissionService.checkPermission(filteredItem.module, READ)
        if (!hasPermission) {
          return null
        }
      }

      return filteredItem
    })
    .filter((item): item is NavItem => item !== null)

  // Drop orphan section headers. A CNavTitle is only meaningful when the
  // next item in the list is actual content (e.g. a CNavGroup or CNavItem).
  // If the following item is another CNavTitle, or there is no following
  // item, the section the title belongs to has been filtered out and the
  // header must be dropped as well — otherwise users see a label like
  // "DEPOT" in the sidebar with nothing beneath it.
  return filtered.filter((item, index) => {
    if (item.component !== CNavTitle) return true
    const next = filtered[index + 1]
    return next !== undefined && next.component !== CNavTitle
  })
}

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state: RootState) => state.ui.sidebarUnfoldable)
  const sidebarShow = useSelector((state: RootState) => state.ui.sidebarShow)

  // Filter navigation items based on user permissions
  // useMemo ensures filtering only happens when navigation changes
  const filteredNavigation = useMemo(() => {
    return filterNavigationByPermissions(navigation)
  }, []) // Navigation is static, so empty dependency array is fine

  return (
    <CSidebar
      className="bg-dark-gradient border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch(set({ sidebarShow: visible }))
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand as={NavLink} to="/">
          <img
            src="/logo-full.svg"
            alt="EXA Logo"
            className="sidebar-brand-full"
            height={32}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          <img
            src="/logo-compact.svg"
            alt="EXA"
            className="sidebar-brand-narrow"
            height={32}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch(set({ sidebarShow: false }))}
        />
        <CSidebarToggler
          onClick={() => dispatch(set({ sidebarUnfoldable: !unfoldable }))}
        />
      </CSidebarHeader>
      <AppSidebarNav items={filteredNavigation} />
    </CSidebar>
  )
}

export default AppSidebar
