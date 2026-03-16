// ─── Cloudinary upload helper ─────────────────────────────────────────────────
//
// Resizes the image client-side before uploading to stay well within the
// 25 GB free tier. Target: max 1000px on the longest side, quality 0.82.
// Returns the secure_url from Cloudinary.

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string
const API_KEY       = import.meta.env.VITE_CLOUDINARY_API_KEY as string

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.warn('[cloudinary] Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET')
}

// ─── Client-side resize ───────────────────────────────────────────────────────

const MAX_SIDE = 1000   // px — longest edge
const QUALITY  = 0.82   // JPEG quality

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        QUALITY,
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = url
  })
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface CloudinaryResult {
  secure_url: string
  public_id:  string
  width:      number
  height:     number
  bytes:      number
}

export async function uploadToCloudinary(
  file: File,
  folder = 'protetoras',
): Promise<CloudinaryResult> {
  // Diagnose config issues early
  if (!CLOUD_NAME || CLOUD_NAME === 'undefined') {
    throw new Error('VITE_CLOUDINARY_CLOUD_NAME is not set — restart the dev server after editing .env')
  }
  if (!UPLOAD_PRESET || UPLOAD_PRESET === 'undefined') {
    throw new Error('VITE_CLOUDINARY_UPLOAD_PRESET is not set — restart the dev server after editing .env')
  }

  const blob      = await resizeImage(file)
  const formData  = new FormData()
  formData.append('file',          blob, 'photo.jpg')
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder',        folder)
  if (API_KEY) formData.append('api_key', API_KEY)

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
  console.debug('[cloudinary] uploading to', url, 'preset:', UPLOAD_PRESET)

  const res = await fetch(url, { method: 'POST', body: formData })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message ?? `Upload failed: ${res.status}`
    console.error('[cloudinary] upload error', res.status, err)
    // Give a specific hint for the most common cause of 401
    if (res.status === 401) {
      throw new Error(
        `${msg}\n\nMost likely cause: the upload preset "${UPLOAD_PRESET}" is set to Signed.\n` +
        `Go to Cloudinary → Settings → Upload → Upload Presets → click the preset → set Signing Mode to Unsigned → Save.`
      )
    }
    throw new Error(msg)
  }

  const data = await res.json()
  return {
    secure_url: data.secure_url,
    public_id:  data.public_id,
    width:      data.width,
    height:     data.height,
    bytes:      data.bytes,
  }
}

// ─── Transformation URL helper ────────────────────────────────────────────────
// Use this to request a specific size/crop without re-uploading.
// e.g. cloudinaryUrl(photo.storage_path, 'w_400,h_400,c_fill,q_auto,f_auto')

export function cloudinaryUrl(secureUrl: string, transforms: string): string {
  // Insert transformation string before the /upload/ segment
  return secureUrl.replace('/upload/', `/upload/${transforms}/`)
}