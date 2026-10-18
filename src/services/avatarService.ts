import type { Profile } from '../types/profile'
import { avatarFilename } from '../utils/avatar'
import { downloadBlob } from './exportService'

type BrowserUpscaler = {
  upscale: (image: string, options: { patchSize: number; padding: number }) => Promise<string>
}

let upscalerPromise: Promise<BrowserUpscaler> | null = null

function getPhotoUpscaler(): Promise<BrowserUpscaler> {
  if (!upscalerPromise) {
    upscalerPromise = Promise.all([
      import('upscaler'),
      import('@upscalerjs/esrgan-slim/4x'),
    ]).then(([{ default: Upscaler }, { default: model }]) => new Upscaler({
      model: { ...model, path: '/models/esrgan-slim/x4/model.json' },
    }) as BrowserUpscaler)
  }
  return upscalerPromise
}

export function avatarFetchUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' && parsed.hostname === 'randomuser.me' && parsed.pathname.startsWith('/api/portraits/')) {
      return `/__avatar?url=${encodeURIComponent(parsed.href)}`
    }
  } catch {
    // Data URLs and other browser-supported local sources are fetched directly.
  }
  return url
}

function enhancedAvatarUrl(url: string): string {
  return `/__avatar-enhanced?url=${encodeURIComponent(url)}`
}

async function rasterizeAvatar(blob: Blob): Promise<Blob> {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = objectUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器不支持高清头像转换。')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.filter = 'contrast(1.04) saturate(1.03)'
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
    const sourceX = (image.naturalWidth - sourceSize) / 2
    const sourceY = (image.naturalHeight - sourceSize) / 2
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (png) => png ? resolve(png) : reject(new Error('高清头像转换失败。')),
      'image/png',
    ))
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function enhancePhotoWithAi(blob: Blob): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(blob)
  try {
    const upscaler = await getPhotoUpscaler()
    const enhancedDataUrl = await upscaler.upscale(sourceUrl, { patchSize: 64, padding: 2 })
    return fetch(enhancedDataUrl).then((response) => response.blob())
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

export async function avatarToBlob(url: string): Promise<Blob> {
  if (url.includes('randomuser.me/api/portraits/')) {
    try {
      const serverResponse = await fetch(enhancedAvatarUrl(url))
      if (serverResponse.ok && serverResponse.headers.get('content-type')?.startsWith('image/png')) {
        return await serverResponse.blob()
      }
    } catch {
      // The Windows-local edition has no server AI runtime and enhances in the browser.
    }
  }
  const response = await fetch(avatarFetchUrl(url))
  if (!response.ok) throw new Error(`头像下载失败（HTTP ${response.status}）`)
  const blob = await response.blob()
  if (url.includes('randomuser.me/api/portraits/')) {
    try {
      return rasterizeAvatar(await enhancePhotoWithAi(blob))
    } catch {
      // Older phones or disabled WebGL can still receive a deterministic 512 px PNG.
    }
  }
  return rasterizeAvatar(blob)
}

export async function downloadAvatar(profile: Profile, index = 0): Promise<void> {
  const blob = await avatarToBlob(profile.avatarUrl)
  downloadBlob(blob, avatarFilename(index, profile.avatarUrl))
}

export async function exportAvatarZip(
  profiles: Profile[],
  onProgress?: (completed: number, total: number) => void,
): Promise<{ included: number; failed: number }> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  let included = 0
  let failed = 0
  for (let index = 0; index < profiles.length; index += 1) {
    try {
      const blob = await avatarToBlob(profiles[index].avatarUrl)
      zip.file(avatarFilename(index, profiles[index].avatarUrl), blob)
      included += 1
    } catch {
      failed += 1
    }
    onProgress?.(index + 1, profiles.length)
  }
  if (included === 0) throw new Error('没有可打包的头像，请检查网络或换用本地已授权头像。')
  downloadBlob(await zip.generateAsync({ type: 'blob' }), 'english-profile-avatars.zip')
  return { included, failed }
}
