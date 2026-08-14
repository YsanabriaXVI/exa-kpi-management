import api from '../../../../services/api/axios.config'
import type {
  SignatureListResponse,
  SignatureFile,
} from '../types/fuelOrderSignature.types'

const BASE_URL = '/fuel-service/fuelOrder'

function mimeToExt(mime: string): string {
  if (mime === 'image/png') return '.png'
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  return ''
}

class FuelOrderSignatureApi {
  async fetchSignaturesList(): Promise<SignatureListResponse> {
    const res = await api.get<SignatureListResponse>(
      `${BASE_URL}/seaweed-signatures`,
    )
    return res.data
  }

  async fetchUserSignature(userId: number): Promise<SignatureFile> {
    const res = await api.get(`${BASE_URL}/seaweed-img/${userId}.png`, {
      responseType: 'blob',
      headers: { 'Cache-Control': 'no-store' },
    })

    const blob = res.data as Blob
    const objectUrl = URL.createObjectURL(blob)

    const ct =
      (res.headers && (res.headers['content-type'] as string)) || 'image/png'
    const lastModified =
      (res.headers && (res.headers['last-modified'] as string)) || null

    return {
      attachment_id: userId,
      name: `${userId}.png`,
      type: blob.type || ct || 'image/png',
      url: objectUrl,
      lastModified,
    }
  }

  async uploadSignature(file: File, userId: number): Promise<SignatureFile> {
    let ext = mimeToExt(file.type)
    if (!ext) {
      const m = file.name?.match(/\.\w+$/)
      ext = m?.[0] ?? '.png'
    }
    const finalName = `${userId}${ext}`

    let renamed: File
    try {
      renamed = new File([file], finalName, { type: file.type })
    } catch {
      renamed = file
    }

    const formData = new FormData()
    formData.append('file', renamed)

    const res = await api.post<{ ok: boolean; key: string }>(
      `${BASE_URL}/seaweed-img`,
      formData,
      {},
    )

    const data = res.data
    return {
      success: data.ok,
      attachment_id: data.key,
      name: finalName,
      type: file.type || 'image/png',
      url: `${BASE_URL}/seaweed-img/${data.key}`,
      lastModified: Date.now(),
    }
  }
}

export const fuelOrderSignatureApi = new FuelOrderSignatureApi()
