import type { Profile } from '../types/profile'
import { avatarFilename } from '../utils/avatar'
import { downloadBlob } from './exportService'
import { SYNTHETIC_AVATAR_CREDIT, SYNTHETIC_AVATAR_LICENSE_URL } from './syntheticAvatarService'

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

export function profileAvatarUrl(profile: Profile): string {
  return profile.avatarPreviewUrl || avatarFetchUrl(profile.avatarUrl)
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type)
  const output = new Uint8Array(12 + data.length)
  const view = new DataView(output.buffer)
  view.setUint32(0, data.length)
  output.set(typeBytes, 4)
  output.set(data, 8)
  view.setUint32(8 + data.length, crc32(output.subarray(4, 8 + data.length)))
  return output
}

async function addSyntheticCredit(png: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await png.arrayBuffer())
  const iend = bytes.length - 12
  if (iend < 8 || new TextDecoder().decode(bytes.subarray(iend + 4, iend + 8)) !== 'IEND') return png
  const prefix = new TextEncoder().encode('Attribution\0\0\0\0\0')
  const message = new TextEncoder().encode(`${SYNTHETIC_AVATAR_CREDIT} | License: ${SYNTHETIC_AVATAR_LICENSE_URL} | Modified: center-cropped and resized to 512 x 512 PNG.`)
  const metadata = new Uint8Array(prefix.length + message.length)
  metadata.set(prefix)
  metadata.set(message, prefix.length)
  return new Blob([
    new Uint8Array(bytes.subarray(0, iend)),
    new Uint8Array(pngChunk('iTXt', metadata)),
    new Uint8Array(bytes.subarray(iend)),
  ], { type: 'image/png' })
}

async function rasterizeAvatar(blob: Blob, includeSyntheticCredit = false): Promise<Blob> {
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
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (png) => png ? resolve(png) : reject(new Error('高清头像转换失败。')),
      'image/png',
    ))
    return includeSyntheticCredit ? addSyntheticCredit(png) : png
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
  if (url.startsWith('blob:')) {
    const ready = await fetch(url)
    if (!ready.ok) throw new Error('已生成的高清头像读取失败。')
    return ready.blob()
  }
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
  if (url.includes('/__synthetic-avatar?')) return rasterizeAvatar(blob, true)
  if (url.includes('randomuser.me/api/portraits/')) {
    try {
      return rasterizeAvatar(await enhancePhotoWithAi(blob))
    } catch (error) {
      throw new Error(error instanceof Error
        ? `AI 头像增强失败：${error.message}`
        : 'AI 头像增强失败。')
    }
  }
  return rasterizeAvatar(blob)
}

export async function prepareProfileAvatars(
  profiles: Profile[],
  onProgress?: (completed: number, total: number) => void,
  signal?: AbortSignal,
): Promise<{ profiles: Profile[]; failed: number }> {
  let cursor = 0
  let completed = 0
  let failed = 0
  const prepared = [...profiles]
  const workerCount = Math.min(2, profiles.length)

  const worker = async () => {
    while (cursor < profiles.length) {
      if (signal?.aborted) throw new DOMException('生成已取消。', 'AbortError')
      const index = cursor
      cursor += 1
      const profile = profiles[index]
      try {
        const blob = await avatarToBlob(profile.avatarPreviewUrl || profile.avatarUrl)
        prepared[index] = { ...profile, avatarPreviewUrl: URL.createObjectURL(blob) }
      } catch {
        failed += 1
      }
      completed += 1
      onProgress?.(completed, profiles.length)
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker))
  return { profiles: prepared, failed }
}

export function releaseProfileAvatar(profile: Profile): void {
  if (profile.avatarPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(profile.avatarPreviewUrl)
}

export async function downloadAvatar(profile: Profile, index = 0): Promise<void> {
  const blob = await avatarToBlob(profile.avatarPreviewUrl || profile.avatarUrl)
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
      const blob = await avatarToBlob(profiles[index].avatarPreviewUrl || profiles[index].avatarUrl)
      zip.file(avatarFilename(index, profiles[index].avatarUrl), blob)
      included += 1
    } catch {
      failed += 1
    }
    onProgress?.(index + 1, profiles.length)
  }
  if (profiles.some((profile) => profile.avatarSource === 'sigils-synthetic')) {
    zip.file('CREDITS.txt', `${SYNTHETIC_AVATAR_CREDIT}\r\nLicense: ${SYNTHETIC_AVATAR_LICENSE_URL}\r\nNo depicted person is real. Images were center-cropped and resized to 512 x 512 PNG.\r\n`)
  }
  if (included === 0) throw new Error('没有可打包的头像，请检查网络或换用本地已授权头像。')
  downloadBlob(await zip.generateAsync({ type: 'blob' }), 'english-profile-avatars.zip')
  return { included, failed }
}
