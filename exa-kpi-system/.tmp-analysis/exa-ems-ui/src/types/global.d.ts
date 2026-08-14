/**
 * Global TypeScript declarations
 */

import { NotificationService } from '../services/notification.service'

declare global {
  interface Window {
    exaToast?: NotificationService
  }
}

export {}

