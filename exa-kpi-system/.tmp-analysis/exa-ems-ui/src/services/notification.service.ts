/**
 * Notification Service
 * Global notification/toast service for showing user messages
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  duration?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

class NotificationService {
  private toastQueue: Array<{
    type: NotificationType
    title: string
    message: string
    options?: ToastOptions
  }> = []

  /**
   * Show a success notification
   */
  success(title: string, message: string, options?: ToastOptions) {
    this.show('success', title, message, options)
  }

  /**
   * Show an error notification
   */
  error(title: string, message: string, options?: ToastOptions) {
    this.show('error', title, message, options)
  }

  /**
   * Show a warning notification
   */
  warning(title: string, message: string, options?: ToastOptions) {
    this.show('warning', title, message, options)
  }

  /**
   * Show an info notification
   */
  info(title: string, message: string, options?: ToastOptions) {
    this.show('info', title, message, options)
  }

  /**
   * Internal method to show notification
   */
  private show(type: NotificationType, title: string, message: string, options?: ToastOptions) {
    // Log to console for debugging
    const icon = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    }[type]
    
    console.log(`${icon} ${title}: ${message}`)

    // Add to queue for component to consume
    this.toastQueue.push({ type, title, message, options })

    // Trigger custom event for toast component to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('exa-toast', {
          detail: { type, title, message, options },
        }),
      )
    }
  }

  /**
   * Get queued toasts (for components that want to display them)
   */
  getQueue() {
    const queue = [...this.toastQueue]
    this.toastQueue = []
    return queue
  }
}

// Export singleton instance
export const notificationService = new NotificationService()

// Make it globally available for axios interceptor
if (typeof window !== 'undefined') {
  ;(window as any).exaToast = notificationService
}

export default notificationService

