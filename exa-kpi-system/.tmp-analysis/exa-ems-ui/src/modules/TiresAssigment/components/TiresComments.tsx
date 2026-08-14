// src/modules/TiresAssignment/components/TiresAssignmentComments.tsx

import React from 'react'
import Comments from '../../../components/Comments/Comments'
import { MODULE_TIRES, MODULES_ID } from '../../../constants/modules'

interface TiresAssignmentCommentsProps {
  tiresAssignmentId?: number | string | null
  canEdit: boolean
}

const TiresAssignmentComments: React.FC<TiresAssignmentCommentsProps> = ({
  tiresAssignmentId,
  canEdit,
}) => {
  if (!tiresAssignmentId) return null

  return (
    <Comments
      moduleId={MODULES_ID[MODULE_TIRES]}
      itemId={Number(tiresAssignmentId)}
      canAdd={canEdit}
      canEdit={canEdit}
      canDelete={canEdit}
    />
  )
}

export default TiresAssignmentComments
