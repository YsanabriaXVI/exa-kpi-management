/**
 * Payment module feature flags for Phase 7 parallel run.
 *
 * Priority: URL param > localStorage > env var > default (true)
 *
 * Usage:
 *   - URL param: ?payment_v2=false  (persists to localStorage)
 *   - localStorage: localStorage.setItem('exa_payment_v2', 'false')
 *   - Env var: VITE_PAYMENT_V2_ENABLED=false in .env
 *   - Admin toggle: call setPaymentV2Enabled(false)
 */

const STORAGE_KEY = 'exa_payment_v2'
const URL_PARAM = 'payment_v2'

/** Read the flag value. Returns true if new payment module should be used. */
export function isPaymentV2Enabled(): boolean {
  // Check URL param first (and persist it)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const urlVal = params.get(URL_PARAM)
    if (urlVal !== null) {
      const enabled = urlVal !== 'false' && urlVal !== '0'
      localStorage.setItem(STORAGE_KEY, String(enabled))
      return enabled
    }
  }

  // Check localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored !== 'false'
  }

  // Check env var
  const envVal = (import.meta as any).env?.VITE_PAYMENT_V2_ENABLED
  if (envVal !== undefined) return envVal !== 'false' && envVal !== '0'

  // Default: new module enabled
  return true
}

/** Programmatically set the flag. */
export function setPaymentV2Enabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(enabled))
}

/** Clear the flag (revert to env/default). */
export function clearPaymentV2Flag(): void {
  localStorage.removeItem(STORAGE_KEY)
}
