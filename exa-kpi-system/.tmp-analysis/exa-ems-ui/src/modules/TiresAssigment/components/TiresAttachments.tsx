// src/modules/TiresAssignment/components/TiresAssignmentAttachments.tsx

import React from 'react'
import Attachments from '../../../components/Attachments/Attachments'
import { MODULE_TIRES, MODULES_ID } from '../../../constants/modules'

interface TiresAssignmentAttachmentsProps {
  tiresAssignmentId?: number | string | null
  canEdit: boolean
}

const TiresAssignmentAttachments: React.FC<TiresAssignmentAttachmentsProps> = ({
  tiresAssignmentId,
  canEdit,
}) => {
  if (!tiresAssignmentId) return null

  return (
    <Attachments
      moduleId={MODULES_ID[MODULE_TIRES]}
      itemId={Number(tiresAssignmentId)}
      canAdd={canEdit}
      canDelete={canEdit}
      canView={true}
    />
  )
}

export default TiresAssignmentAttachments
