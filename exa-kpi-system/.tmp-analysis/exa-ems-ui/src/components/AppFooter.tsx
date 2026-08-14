import React from 'react'
import { CFooter } from '@coreui/react-pro'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span className="ms-1">Exa Management System 2025 (EMS) &copy; Copyright.</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Powered by</span>
        <a
          href="https://coreui.io/product/react-dashboard-template/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CoreUI Pro
        </a>
      </div>
    </CFooter>
  )
}

export default AppFooter
