import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { authStorage } from '../auth/auth.storage'

const runtimeEnvApi =
  typeof window !== 'undefined' && (window as unknown as { __ENV__?: { VITE_API_URL?: string } }).__ENV__?.VITE_API_URL

const API_BASE_URL =
  runtimeEnvApi && !runtimeEnvApi.startsWith('$')
    ? runtimeEnvApi
    : import.meta.env.VITE_API_URL || 'https://stg.exasa.net/api'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = authStorage.getToken()?.access_token
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['PaymentList', 'Payment', 'ChargeConfigList', 'ChargeConfig', 'InstallmentList', 'MigrationData'],
  endpoints: () => ({}),
})
