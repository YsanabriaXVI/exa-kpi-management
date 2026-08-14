import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react-pro'

interface ActivityCardProps {
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
}

const ActivityCard: React.FC<ActivityCardProps> = ({ createdAt, createdBy, updatedAt, updatedBy }) => (
  <CCard className="h-100">
    <CCardHeader>
      <strong>Activity</strong>
    </CCardHeader>
    <CCardBody className="role-audit-info">
      <div className="role-audit-info__item">
        <span className="label">Created By</span>
        <span className="value">{createdBy || '—'}</span>
      </div>
      <div className="role-audit-info__item">
        <span className="label">Created On</span>
        <span className="value">{createdAt || '—'}</span>
      </div>
      <div className="role-audit-info__item">
        <span className="label">Updated By</span>
        <span className="value">{updatedBy || '—'}</span>
      </div>
      <div className="role-audit-info__item">
        <span className="label">Updated On</span>
        <span className="value">{updatedAt || '—'}</span>
      </div>
    </CCardBody>
  </CCard>
)

export default ActivityCard
