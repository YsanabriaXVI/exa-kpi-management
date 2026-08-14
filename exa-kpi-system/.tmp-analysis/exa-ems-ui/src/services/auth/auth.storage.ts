/**
 * Authentication Storage Service
 * Modern secure storage for auth tokens and user data
 * Uses localStorage with fallback and proper TypeScript types
 */

export interface AuthToken {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
}

export interface User {
  user_id: number
  username: string
  email: string
  first_name: string
  last_name: string
  current_company: number
  [key: string]: any
}

export interface UserDetails {
  details: any
  actions: any[]
  companies: Record<string, any>
  errors: null | string
}

class AuthStorage {
  private readonly TOKEN_KEY = 'exa_auth_token'
  private readonly USER_KEY = 'exa_user_data'
  private readonly DETAILS_KEY = 'exa_user_details'
  private readonly COOKIE_API_TOKEN = 'api_token'
  private readonly COOKIE_USER = 'user_data'

  private setCookie(name: string, value: string, days = 1) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
    // Attempt to set on the parent domain so cookies apply across ems*.exasa.net
    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
    const parts = hostname.split('.')
    const parentDomain = parts.length > 2 ? `.${parts.slice(-2).join('.')}` : hostname
    const domainAttr = parentDomain ? `; domain=${parentDomain}` : ''
    // SameSite=None + Secure so cookies are sent in cross-site requests (ems26 -> ems3)
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/${domainAttr}; SameSite=None; Secure`
  }

  private clearCookie(name: string) {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
    const parts = hostname.split('.')
    const parentDomain = parts.length > 2 ? `.${parts.slice(-2).join('.')}` : hostname
    const domainAttr = parentDomain ? `; domain=${parentDomain}` : ''
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainAttr}; SameSite=None; Secure`
  }

  /**
   * Save authentication token
   */
  saveToken(token: AuthToken): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, JSON.stringify(token))
    } catch (error) {
      console.error('Error saving token:', error)
    }
  }

  /**
   * Get authentication token
   */
  getToken(): AuthToken | null {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY)
      return token ? JSON.parse(token) : null
    } catch (error) {
      console.error('Error reading token:', error)
      return null
    }
  }

  /**
   * Save user data
   */
  saveUser(user: User): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user))
    } catch (error) {
      console.error('Error saving user:', error)
    }
  }

  /**
   * Save legacy cookies expected by PHP endpoints (attachments download, etc.)
   */
  saveLegacyCookies(token: AuthToken, user: User): void {
    try {
      const apiTokenPayload = {
        ...token,
        scope: 'user',
        user: {
          current_company: user.current_company,
          user_id: user.user_id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        },
      }
      this.setCookie(this.COOKIE_API_TOKEN, JSON.stringify(apiTokenPayload))
      this.setCookie(this.COOKIE_USER, JSON.stringify(apiTokenPayload.user))
    } catch (error) {
      console.error('Error setting legacy cookies:', error)
    }
  }

  /**
   * Get user data
   */
  getUser(): User | null {
    try {
      const user = localStorage.getItem(this.USER_KEY)
      return user ? JSON.parse(user) : null
    } catch (error) {
      console.error('Error reading user:', error)
      return null
    }
  }

  /**
   * Save user details (companies, permissions, actions)
   */
  saveDetails(details: UserDetails): void {
    try {
      localStorage.setItem(this.DETAILS_KEY, JSON.stringify(details))
    } catch (error) {
      console.error('Error saving details:', error)
    }
  }

  /**
   * Get user details
   */
  getDetails(): UserDetails | null {
    try {
      const details = localStorage.getItem(this.DETAILS_KEY)
      return details ? JSON.parse(details) : null
    } catch (error) {
      console.error('Error reading details:', error)
      return null
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken()
    return !!token?.access_token
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY)
      localStorage.removeItem(this.USER_KEY)
      localStorage.removeItem(this.DETAILS_KEY)
      this.clearCookie(this.COOKIE_API_TOKEN)
      this.clearCookie(this.COOKIE_USER)
    } catch (error) {
      console.error('Error clearing auth:', error)
    }
  }

  /**
   * Get access token string (for API calls)
   */
  getAccessToken(): string | null {
    const token = this.getToken()
    return token?.access_token || null
  }
}

// Export singleton instance
export const authStorage = new AuthStorage()
