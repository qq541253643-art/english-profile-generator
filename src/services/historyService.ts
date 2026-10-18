import type { GenerationUniqueness, Profile } from '../types/profile'
import {
  clearProfiles as clearLocalProfiles,
  deleteProfiles as deleteLocalProfiles,
  loadProfiles as loadLocalProfiles,
  saveProfiles as saveLocalProfiles,
} from './historyDb'

export type HistoryMode = 'browser' | 'server'

type HealthResponse = {
  profilePersistence?: HistoryMode
  profileRetentionDays?: number
}

type StoredProfile = Omit<Profile, 'avatarPreviewUrl' | 'canDelete'> & { canDelete?: boolean }

const EMPTY_UNIQUENESS: GenerationUniqueness = {
  windowDays: 0,
  displayNameKeys: [],
  usernameKeys: [],
  bioKeys: [],
  bioZhKeys: [],
  avatarIds: [],
}

let modePromise: Promise<HistoryMode> | null = null

export function getHistoryMode(): Promise<HistoryMode> {
  if (!modePromise) {
    modePromise = fetch('/__health', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<HealthResponse> : Promise.reject())
      .then((health) => health.profilePersistence === 'server' ? 'server' : 'browser')
      .catch(() => 'browser')
  }
  return modePromise
}

async function serverRequest<T>(method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<T> {
  const response = await fetch('/__profiles', {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'X-EPG-Client': 'web',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => null) as ({ error?: string } & T) | null
  if (!response.ok) throw new Error(payload?.error || `服务器历史同步失败（HTTP ${response.status}）`)
  if (!payload) throw new Error('服务器历史同步返回了无效数据。')
  return payload
}

function storable(profile: Profile): StoredProfile {
  const { avatarPreviewUrl: _avatarPreviewUrl, canDelete: _canDelete, ...stored } = profile
  return stored
}

export async function loadProfiles(): Promise<Profile[]> {
  if (await getHistoryMode() === 'browser') return loadLocalProfiles()
  const result = await serverRequest<{ profiles: StoredProfile[] }>('GET')
  return result.profiles
}

export async function loadGenerationUniqueness(): Promise<GenerationUniqueness> {
  if (await getHistoryMode() === 'browser') return EMPTY_UNIQUENESS
  const result = await serverRequest<{ uniqueness?: GenerationUniqueness }>('GET')
  return result.uniqueness || EMPTY_UNIQUENESS
}

export async function saveProfiles(profiles: Profile[]): Promise<string[]> {
  if (await getHistoryMode() === 'browser') return saveLocalProfiles(profiles)
  const result = await serverRequest<{ removedIds: string[] }>('POST', { profiles: profiles.map(storable) })
  return result.removedIds
}

export async function deleteProfiles(ids: string[]): Promise<void> {
  if (await getHistoryMode() === 'browser') return deleteLocalProfiles(ids)
  await serverRequest('DELETE', { ids })
}

export async function clearProfiles(): Promise<void> {
  if (await getHistoryMode() === 'browser') return clearLocalProfiles()
  await serverRequest('DELETE', { all: true })
}
