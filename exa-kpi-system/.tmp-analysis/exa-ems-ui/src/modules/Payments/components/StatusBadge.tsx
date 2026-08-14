import React from 'react'
import { CBadge } from '@coreui/react-pro'
import { useTranslation } from 'react-i18next'
import type { PaymentStatus } from '../types.v2'

const statusColorMap: Record<PaymentStatus, string> = {
  DRAFT: 'secondary',
  OPEN: 'info',
  REVIEW: 'warning',
  APPROVED: 'success',
  CLOSED: 'primary',
  VOID: 'danger',
}

interface StatusBadgeProps {
  status: PaymentStatus
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation('payments')
  const color = statusColorMap[status] || 'secondary'
  const label = t(`status.${status}`, status)

  return <CBadge color={color}>{label}</CBadge>
}

export default React.memo(StatusBadge)
