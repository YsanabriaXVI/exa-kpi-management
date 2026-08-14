/**
 * Profile Module Types
 */

export interface UserProfile {
  job_title: string
  ext: string
  address: string
  city: string
  zipcode: string
}

export interface ProfileFormData {
  // User Data
  email: string
  first_name: string
  last_name: string
  phone: string
  password?: string
  password2?: string

  // Profile Data
  profile: UserProfile
}

export interface UpdateProfilePayload {
  user_id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  password?: string
  profile: UserProfile
}

