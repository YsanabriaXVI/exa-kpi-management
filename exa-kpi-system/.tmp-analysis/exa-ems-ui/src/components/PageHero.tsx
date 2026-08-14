import React from 'react'
import { CBadge } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'

type Highlight = {
  label: string
  value?: string | number | null
  color?: string
  textColor?: string
}

type PageHeroProps = {
  icon?: any
  title: string
  kicker?: string
  subtitle?: string
  highlights?: Highlight[]
  actions?: React.ReactNode
}

const PageHero: React.FC<PageHeroProps> = ({ icon, title, kicker, subtitle, highlights = [], actions }) => {
  return (
    <div className="page-hero shadow-sm border-0 mb-4">
      <div className="page-hero__content">
        {kicker && <div className="text-uppercase text-body-secondary fw-semibold small">{kicker}</div>}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {icon && <CIcon icon={icon} className="text-primary" size="lg" />}
          <h3 className="mb-0">{title}</h3>
        </div>
        {subtitle && <div className="text-body-secondary mt-1">{subtitle}</div>}
        {!!highlights.length && (
          <div className="d-flex flex-wrap gap-2 mt-3">
            {highlights.map((item, idx) => {
              const badgeColor = item.color || 'light'
              const textColorClass = item.textColor
                ? `text-${item.textColor}`
                : badgeColor !== 'light'
                  ? 'text-white'
                  : 'text-body'
              const labelClass =
                badgeColor !== 'light' ? 'text-white-50' : 'text-body-secondary'

              return (
                <CBadge key={`${item.label}-${idx}`} color={badgeColor} className={`px-3 py-2 ${textColorClass}`}>
                  <span className={`${labelClass} me-1`}>{item.label}</span>
                  <span className="fw-semibold">{item.value ?? '—'}</span>
                </CBadge>
              )
            })}
          </div>
        )}
      </div>
      {actions && <div className="page-hero__actions">{actions}</div>}
    </div>
  )
}

export default PageHero
