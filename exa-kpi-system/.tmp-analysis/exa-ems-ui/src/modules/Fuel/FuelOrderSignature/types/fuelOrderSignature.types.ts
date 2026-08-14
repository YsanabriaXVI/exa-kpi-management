export interface SignatureUser {
  userid: number
  username: string
  email: string
  signature: boolean
  status?: {
    id: number
    name?: string
  }
}

export interface SignatureListResponse {
  users: SignatureUser[]
}

export interface SignatureFile {
  control_id?: string
  attachment_id: string | number
  name: string
  type: string
  url: string
  lastModified?: string | number | null
  success?: boolean
}

export type FuelOrderSignatureErrors =
  | Record<string, string>
  | string
  | { message?: string; name?: string; code?: string; stack?: string }
  | null
  | undefined
