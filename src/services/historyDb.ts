import { openDB } from 'idb'
import type { Profile } from '../types/profile'
import { generateStrongPassword } from '../utils/password'

const DB_NAME = 'english-profile-generator'
const STORE_NAME = 'profile-history'
export const HISTORY_RETENTION_DAYS = 90
export const HISTORY_MAX_PROFILES = 500
export const HISTORY_MAX_BYTES = 50 * 1024 * 1024

type StoredProfile = Omit<Profile, 'password' | 'avatarPreviewUrl'>

export interface HistoryRetentionResult<T> {
  kept: T[]
  removedIds: string[]
}

export function applyHistoryRetention<T extends { id: string; createdAt: string }>(
  profiles: T[],
  now = Date.now(),
  maxProfiles = HISTORY_MAX_PROFILES,
  maxBytes = HISTORY_MAX_BYTES,
): HistoryRetentionResult<T> {
  const cutoff = now - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const sorted = [...profiles].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const kept: T[] = []
  const removedIds: string[] = []
  let storedBytes = 0

  for (const profile of sorted) {
    const createdAt = Date.parse(profile.createdAt)
    const profileBytes = new TextEncoder().encode(JSON.stringify(profile)).byteLength
    const expired = !Number.isFinite(createdAt) || createdAt < cutoff
    const exceedsLimit = kept.length >= maxProfiles || storedBytes + profileBytes > maxBytes
    if (expired || exceedsLimit) removedIds.push(profile.id)
    else {
      kept.push(profile)
      storedBytes += profileBytes
    }
  }

  return { kept, removedIds }
}

async function database() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

export async function saveProfiles(profiles: Profile[]): Promise<string[]> {
  const db = await database()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await Promise.all(profiles.map(({ password: _password, avatarPreviewUrl: _avatarPreviewUrl, ...profile }) => tx.store.put(profile satisfies StoredProfile)))
  const retention = applyHistoryRetention(await tx.store.getAll() as StoredProfile[])
  await Promise.all(retention.removedIds.map((id) => tx.store.delete(id)))
  await tx.done
  return retention.removedIds
}

export async function loadProfiles(): Promise<Profile[]> {
  const db = await database()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const retention = applyHistoryRetention(await tx.store.getAll() as StoredProfile[])
  await Promise.all(retention.removedIds.map((id) => tx.store.delete(id)))
  await tx.done
  return retention.kept
    .map((profile) => ({ ...profile, password: generateStrongPassword() }))
}

export async function deleteProfiles(ids: string[]): Promise<void> {
  const db = await database()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await Promise.all(ids.map((id) => tx.store.delete(id)))
  await tx.done
}

export async function clearProfiles(): Promise<void> {
  const db = await database()
  await db.clear(STORE_NAME)
}
