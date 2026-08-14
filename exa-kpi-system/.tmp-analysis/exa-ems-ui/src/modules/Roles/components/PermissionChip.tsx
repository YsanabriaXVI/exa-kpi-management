import React from 'react'
import { CButton, CTooltip } from '@coreui/react-pro'

interface PermissionChipProps {
  active: boolean
  label: string
  onToggle: () => void
  help?: string
}

const PermissionChip: React.FC<PermissionChipProps> = ({ active, label, onToggle, help }) => {
  const button = (
    <CButton
      type="button"
      size="sm"
      color={active ? 'info' : 'secondary'}
      variant={active ? 'solid' : 'outline'}
      className={`permission-chip text-uppercase${active ? ' permission-chip--active' : ''}`}
      aria-pressed={active}
      onClick={onToggle}
    >
      {label}
    </CButton>
  )

  if (help) {
    return (
      <CTooltip content={help} placement="top">
        {button}
      </CTooltip>
    )
  }

  return button
}

export default PermissionChip
