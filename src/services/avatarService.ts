import type { Profile } from '../types/profile'
import { avatarFilename } from '../utils/avatar'
import { downloadBlob } from './exportService'

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

async function avatarToBlob(url: string): Promise<Blob> {
  const response = await fetch(avatarFetchUrl(url))
  if (!response.ok) throw new Error(`头像下载失败（HTTP ${response.status}）`)
  return response.blob()
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

export function readAuthorizedAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('请选择图片文件。'))
  if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('头像文件不得超过 5 MB。'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('无法读取头像文件。'))
    reader.readAsDataURL(file)
  })
}
