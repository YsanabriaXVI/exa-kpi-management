import { authStorage } from './auth.storage'
import { getModuleIdByName, MODULE_INCIDENTS } from '../../constants/modules'

export const CREATE = 'Create'
export const UPDATE = 'Update'
export const DELETE = 'Delete'
export const READ = 'Read'
export const APPROVE = 'Approve'
export const UPDATE_STATUS = 'Status Update'
export const INVOICE_PRICE_KM = 'Invoice Price & Km'
export const STATEMENT_PRICE_KM = 'Statement Price & Km'

export const COMMENT_READ = 'Comment Read'
export const COMMENT_UPDATE = 'Comment Update'
export const ATTACHMENT_READ = 'Attchment Read'
export const ATTACHMENT_UPDATE = 'Attchment Update'
export const ADMIN_INVOICE = 'Admin Invoice'
export const ADMIN_STATEMENT = 'Admin Statement'

// Trip request/approval permissions (feature implemented in the mobile app)
export const REQUEST_TRIP = 'Request Trip'
export const APPROVE_TRIP_REQUEST = 'Approve Trip Request'

const SECURED_BUTTONS: Record<string, string | string[]> = { 
  D: DELETE, 
  E: [UPDATE, UPDATE_STATUS], 
  C: READ 
}

class PermissionService {
  checkPermission(module: string | number, actionsParam: string | string[]): boolean {
    let actions = actionsParam
    if (!Array.isArray(actions)) {
      actions = [actionsParam]
    }
    
    const details = authStorage.getDetails()
    if (!details) {
      console.warn('🔐 [PermissionService] No user details found in storage')
      return false
    }
    
    // Get permissions based on current company
    let permissions: Record<string, number[]> = {}
    const currentCompanyId = details.details?.current_company
    
    if (currentCompanyId && details.companies && details.companies[currentCompanyId]) {
      permissions = details.companies[currentCompanyId].role?.permissions || {}
    } else {
      // Fallback: try to find the first company if current_company is missing
      const companyIds = Object.keys(details.companies || {})
      if (companyIds.length > 0) {
        permissions = details.companies[companyIds[0]].role?.permissions || {}
      } else {
        // Fallback to direct permissions if they exist (legacy structure?)
        permissions = details.details?.permissions || {}
      }
    }

    const actionList = details.actions || []
    
    let result = false
    const moduleId = getModuleIdByName(module)
    
    // Debug log for specific checks (optional, can be noisy)
    // console.log(`🔐 [PermissionService] Checking ${actionsParam} for module ${moduleId} (${module})`)
    
    actions.forEach(actionName => {
      // Find action ID by name
      const actionObj = actionList.find((a: any) => a.name === actionName)
      const actionId = actionObj ? actionObj.action_id : null
      
      if (actionId) {
        // Check if actionId exists in permissions for this module
        // permissions is a map of moduleId -> array of actionIds
        const modulePermissions = permissions[moduleId]
        const hasPermission = modulePermissions && modulePermissions.includes(actionId)
        
        if (hasPermission) {
          result = true
        }
        
        // Detailed debug if check fails or succeeds
        // console.log(`🔐 [PermissionService] Action: ${actionName} (ID: ${actionId}), Module: ${moduleId}, Has Permission: ${hasPermission}`)
      } else {
        console.warn(`🔐 [PermissionService] Action not found: ${actionName}`)
      }
    })
    
    return result
  }

  getAvailableButtons(module: string | number, buttons: string): string {
    const bArray = buttons.toUpperCase().split('')
    return bArray.filter(btn => {
      if (btn === 'C') {
        return this.checkPermission(MODULE_INCIDENTS, SECURED_BUTTONS[btn])
      } else if (SECURED_BUTTONS[btn]) {
        return this.checkPermission(module, SECURED_BUTTONS[btn])
      }
      return true
    }).join('')
  }

  isComment(module: string | number): boolean {
    return this.checkPermission(module, COMMENT_READ)
  }

  isUpload(module: string | number): boolean {
    return this.checkPermission(module, ATTACHMENT_READ)
  }

  isOnlyUpdateStatus(moduleId: string | number): boolean {
    return !this.checkPermission(moduleId, UPDATE) && this.checkPermission(moduleId, UPDATE_STATUS)
  }

  canUpdateStatus(moduleId: string | number): boolean {
    return this.checkPermission(moduleId, UPDATE_STATUS)
  }
}

export const permissionService = new PermissionService()

