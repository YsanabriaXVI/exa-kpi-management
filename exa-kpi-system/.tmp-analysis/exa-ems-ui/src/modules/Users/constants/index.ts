/**
 * Users Module Constants
 */

export const ACTIVE_STATUS_ID = 1
export const DISABLED_STATUS_ID = 2

export const USER_STATUSES = [
  { label: 'All', value: null, color: 'success' },
  { label: 'Active', value: ACTIVE_STATUS_ID, color: 'success' },
  { label: 'Disabled', value: DISABLED_STATUS_ID, color: 'secondary' },
]

export const USER_DEFAULT = {
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  status: { name: 'ACTIVE', id: ACTIVE_STATUS_ID },
  profile: {
    job_title: '',
    phone: '',
    ext: '',
    address: '',
    city: '',
    zipcode: '',
    state: '',
    country: '',
  },
  user_role_companies: [],
  clients: [],
  subdivisions: [],
  clientsList: [],
  subdivisionsList: [],
}

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,10}$/

export const PASSWORD_REQUIREMENTS = 
  'Password must be 8-10 characters with at least one uppercase letter, one lowercase letter, and one digit'

