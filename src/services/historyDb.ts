import { openDB } from 'idb'
import type { Profile } from '../types/profile'
import { generateStrongPassword } from '../utils/password'

const DB_NAME = 'english-profile-generator'
const STORE_NAME = 'profile-history'

type StoredProfile = Omit<Profile, 'password'>

async function database() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  const db = await database()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await Promise.all(profiles.map(({ password: _password, ...profile }) => tx.store.put(profile satisfies StoredProfile)))
  await tx.done
}

export async function loadProfiles(): Promise<Profile[]> {
  const db = await database()
  const profiles = await db.getAll(STORE_NAME) as StoredProfile[]
  return profiles
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
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
