import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const SERVER_HISTORY_RETENTION_DAYS = 3
export const SERVER_UNIQUENESS_RETENTION_DAYS = 30
const RETENTION_MS = SERVER_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000
const UNIQUENESS_RETENTION_MS = SERVER_UNIQUENESS_RETENTION_DAYS * 24 * 60 * 60 * 1000
const COOKIE_NAME = 'epg_visitor'
const VISITOR_ID = /^[a-f0-9]{64}$/
const PROFILE_ID = /^[a-f0-9-]{20,64}$/i
const MAX_REQUEST_BYTES = 1024 * 1024
const MAX_SHARED_PROFILES = 5_000
const MAX_SHARED_BYTES = 50 * 1024 * 1024
const MAX_USAGE_RECORDS = 20_000
const MAX_USAGE_BYTES = 20 * 1024 * 1024
const STORE_FILENAME = 'shared-profiles.json'
const USAGE_STORE_FILENAME = 'profile-usage.json'
const PASSWORD_LENGTH = 20
const PASSWORD_LOWER = 'abcdefghijkmnopqrstuvwxyz'
const PASSWORD_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const PASSWORD_DIGITS = '23456789'
const PASSWORD_SPECIAL = '!@#$%^&*_-+=?'
const PASSWORD_ALL = PASSWORD_LOWER + PASSWORD_UPPER + PASSWORD_DIGITS + PASSWORD_SPECIAL

function randomIndex(length) {
  const limit = 256 - (256 % length)
  let value
  do value = randomBytes(1)[0]
  while (value >= limit)
  return value % length
}

function pickPasswordCharacter(characters) {
  return characters[randomIndex(characters.length)]
}

function generateStrongPassword() {
  const characters = [
    pickPasswordCharacter(PASSWORD_LOWER),
    pickPasswordCharacter(PASSWORD_UPPER),
    pickPasswordCharacter(PASSWORD_DIGITS),
    pickPasswordCharacter(PASSWORD_SPECIAL),
  ]
  while (characters.length < PASSWORD_LENGTH) characters.push(pickPasswordCharacter(PASSWORD_ALL))
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    ;[characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]]
  }
  return characters.join('')
}

function validPassword(value) {
  return typeof value === 'string' && value.length === PASSWORD_LENGTH
    && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
}

function json(response, status, payload, visitorId) {
  const body = JSON.stringify(payload)
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }
  if (visitorId) {
    headers['Set-Cookie'] = `${COOKIE_NAME}=${visitorId}; Max-Age=${SERVER_HISTORY_RETENTION_DAYS * 86400}; Path=/; HttpOnly; SameSite=Lax`
  }
  response.writeHead(status, headers)
  response.end(body)
}

function visitorId(request) {
  for (const cookie of String(request.headers.cookie || '').split(';')) {
    const [name, value] = cookie.trim().split('=', 2)
    if (name === COOKIE_NAME && VISITOR_ID.test(value || '')) return value
  }
  return randomBytes(32).toString('hex')
}

function text(value, maxLength) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength ? value : null
}

function validAvatarUrl(url, source) {
  if (source === 'sigils-synthetic') return /^\/__synthetic-avatar\?id=[A-Za-z0-9._~%\-]{1,180}$/.test(url)
  if (source === 'randomuser-placeholder') return /^https:\/\/randomuser\.me\/api\/portraits\/(?:men|women)\/\d{1,4}\.jpg$/.test(url)
  if (source === 'local-placeholder') return url.startsWith('data:image/svg+xml;charset=utf-8,')
  return source === 'local-hd-avatar' && url.startsWith('data:image/png;base64,')
}

function sanitizeProfile(value, ownerId, now) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const id = text(value.id, 64)
  const firstName = text(value.firstName, 80)
  const lastName = text(value.lastName, 80)
  const displayName = text(value.displayName, 180)
  const username = text(value.username, 40)
  const bio = text(value.bio, 500)
  const bioZh = text(value.bioZh, 500)
  const password = validPassword(value.password) ? value.password : null
  const avatarUrl = text(value.avatarUrl, 10_000)
  const gender = value.gender === 'male' || value.gender === 'female' ? value.gender : null
  const avatarSource = ['sigils-synthetic', 'randomuser-placeholder', 'local-hd-avatar', 'local-placeholder'].includes(value.avatarSource)
    ? value.avatarSource : null
  const dataSource = value.dataSource === 'api' || value.dataSource === 'mock' ? value.dataSource : null
  const age = Number(value.age)
  const interests = Array.isArray(value.interests)
    ? value.interests.filter((item) => typeof item === 'string' && item.length <= 50).slice(0, 12)
    : null
  if (!id || !PROFILE_ID.test(id) || !firstName || !lastName || !displayName || !username || !bio || !bioZh || !password
    || !avatarUrl || !gender || !avatarSource || !validAvatarUrl(avatarUrl, avatarSource) || !dataSource
    || !Number.isInteger(age) || age < 18 || age > 45 || !interests) return null
  return {
    id, firstName, lastName, displayName, username, age, gender, bio, bioZh, password, interests,
    avatarUrl, avatarSource, dataSource, createdAt: new Date(now).toISOString(), ownerId,
  }
}

function retain(profiles, now = Date.now()) {
  const cutoff = now - RETENTION_MS
  const sorted = [...profiles].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const kept = []
  const removedIds = []
  let bytes = 2
  for (const profile of sorted) {
    const profileBytes = Buffer.byteLength(JSON.stringify(profile)) + 1
    const expired = !Number.isFinite(Date.parse(profile.createdAt)) || Date.parse(profile.createdAt) < cutoff
    if (expired || kept.length >= MAX_SHARED_PROFILES || bytes + profileBytes > MAX_SHARED_BYTES) removedIds.push(profile.id)
    else {
      kept.push(profile)
      bytes += profileBytes
    }
  }
  return { kept, removedIds }
}

function uniquenessKey(value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function syntheticAvatarId(profile) {
  if (profile.avatarSource !== 'sigils-synthetic') return null
  try {
    return new URL(profile.avatarUrl, 'http://local.invalid').searchParams.get('id') || null
  } catch {
    return null
  }
}

function avatarKey(profile) {
  return createHash('sha256').update(`${profile.avatarSource}\0${profile.avatarUrl}`).digest('hex')
}

function usageFromProfile(profile, usedAt = profile.createdAt) {
  return {
    profileId: profile.id,
    displayNameKey: uniquenessKey(profile.displayName),
    usernameKey: uniquenessKey(profile.username),
    bioKey: uniquenessKey(profile.bio),
    bioZhKey: uniquenessKey(profile.bioZh),
    avatarKey: avatarKey(profile),
    avatarId: syntheticAvatarId(profile),
    usedAt: new Date(usedAt).toISOString(),
  }
}

function isUsage(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && typeof value.profileId === 'string' && PROFILE_ID.test(value.profileId)
    && typeof value.displayNameKey === 'string' && value.displayNameKey.length > 0
    && typeof value.usernameKey === 'string' && value.usernameKey.length > 0
    && typeof value.bioKey === 'string' && value.bioKey.length > 0
    && typeof value.bioZhKey === 'string' && value.bioZhKey.length > 0
    && typeof value.avatarKey === 'string' && /^[a-f0-9]{64}$/.test(value.avatarKey)
    && (value.avatarId === null || typeof value.avatarId === 'string')
    && Number.isFinite(Date.parse(value.usedAt))
}

function retainUsage(entries, now = Date.now()) {
  const cutoff = now - UNIQUENESS_RETENTION_MS
  const sorted = entries.filter(isUsage).sort((a, b) => Date.parse(b.usedAt) - Date.parse(a.usedAt))
  const kept = []
  const seenProfiles = new Set()
  let bytes = 2
  for (const entry of sorted) {
    const entryBytes = Buffer.byteLength(JSON.stringify(entry)) + 1
    if (Date.parse(entry.usedAt) < cutoff || seenProfiles.has(entry.profileId)
      || kept.length >= MAX_USAGE_RECORDS || bytes + entryBytes > MAX_USAGE_BYTES) continue
    kept.push(entry)
    seenProfiles.add(entry.profileId)
    bytes += entryBytes
  }
  return kept
}

function uniquenessPayload(entries) {
  return {
    windowDays: SERVER_UNIQUENESS_RETENTION_DAYS,
    displayNameKeys: [...new Set(entries.map((entry) => entry.displayNameKey))],
    usernameKeys: [...new Set(entries.map((entry) => entry.usernameKey))],
    bioKeys: [...new Set(entries.map((entry) => entry.bioKey))],
    bioZhKeys: [...new Set(entries.map((entry) => entry.bioZhKey))],
    avatarIds: [...new Set(entries.map((entry) => entry.avatarId).filter(Boolean))],
  }
}

function sameIdentity(profile, usage) {
  const incoming = usageFromProfile(profile, usage.usedAt)
  return incoming.displayNameKey === usage.displayNameKey
    && incoming.usernameKey === usage.usernameKey
    && incoming.bioKey === usage.bioKey
    && incoming.bioZhKey === usage.bioZhKey
    && incoming.avatarKey === usage.avatarKey
}

function usageConflicts(profile, entries, ignoredProfileId = null) {
  const incoming = usageFromProfile(profile)
  const conflicts = new Set()
  for (const entry of entries) {
    if (entry.profileId === ignoredProfileId) continue
    if (entry.displayNameKey === incoming.displayNameKey) conflicts.add('displayName')
    if (entry.usernameKey === incoming.usernameKey) conflicts.add('username')
    if (entry.bioKey === incoming.bioKey) conflicts.add('bio')
    if (entry.bioZhKey === incoming.bioZhKey) conflicts.add('bioZh')
    if (entry.avatarKey === incoming.avatarKey) conflicts.add('avatar')
  }
  return [...conflicts]
}

function readStore(path) {
  if (!existsSync(path)) return []
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeStore(path, profiles) {
  if (!profiles.length) {
    rmSync(path, { force: true })
    return
  }
  const temporaryPath = `${path}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(profiles), { encoding: 'utf8', mode: 0o600 })
  renameSync(temporaryPath, path)
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let bytes = 0
    let exceeded = false
    request.on('data', (chunk) => {
      bytes += chunk.length
      if (!exceeded && bytes > MAX_REQUEST_BYTES) {
        exceeded = true
        reject(Object.assign(new Error('Request too large'), { status: 413 }))
      } else if (!exceeded) chunks.push(chunk)
    })
    request.on('end', () => {
      if (exceeded) return
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })) }
    })
    request.on('error', reject)
  })
}

function publicProfiles(profiles, currentVisitorId) {
  return profiles.map(({ ownerId, ...profile }) => ({ ...profile, canDelete: ownerId === currentVisitorId }))
}

export function createProfileStore(directory) {
  if (!directory) return null
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const path = join(directory, STORE_FILENAME)
  const usagePath = join(directory, USAGE_STORE_FILENAME)
  const cleanup = (now = Date.now()) => {
    const migrated = readStore(path).map((profile) => validPassword(profile.password)
      ? profile
      : { ...profile, password: generateStrongPassword() })
    const knownUsage = readStore(usagePath)
    const knownProfileIds = new Set(knownUsage.filter(isUsage).map((entry) => entry.profileId))
    const seededUsage = [...knownUsage]
    for (const profile of migrated) {
      if (!knownProfileIds.has(profile.id) && Number.isFinite(Date.parse(profile.createdAt))) {
        seededUsage.push(usageFromProfile(profile))
      }
    }
    const retention = retain(migrated, now)
    const usage = retainUsage(seededUsage, now)
    writeStore(path, retention.kept)
    writeStore(usagePath, usage)
    return { ...retention, usage }
  }
  cleanup()
  const timer = setInterval(cleanup, 60 * 60 * 1000)
  timer.unref()

  return async function handleProfileStore(request, response) {
    if (request.headers['x-epg-client'] !== 'web') return json(response, 403, { error: 'Forbidden' })
    const currentVisitorId = visitorId(request)
    try {
      if (request.method === 'GET') {
        const retention = cleanup()
        return json(response, 200, {
          profiles: publicProfiles(retention.kept, currentVisitorId),
          retentionDays: SERVER_HISTORY_RETENTION_DAYS,
          uniqueness: uniquenessPayload(retention.usage),
          visibility: 'public-shared',
        }, currentVisitorId)
      }
      if (request.method === 'POST') {
        const body = await readBody(request)
        if (!Array.isArray(body.profiles) || body.profiles.length > 10) return json(response, 400, { error: 'Invalid profiles' }, currentVisitorId)
        const now = Date.now()
        const incoming = body.profiles.map((profile) => sanitizeProfile(profile, currentVisitorId, now))
        if (incoming.some((profile) => !profile)) return json(response, 400, { error: 'Invalid profile' }, currentVisitorId)
        const current = cleanup(now)
        const merged = new Map(current.kept.map((profile) => [profile.id, profile]))
        if (incoming.some((profile) => merged.has(profile.id) && merged.get(profile.id).ownerId !== currentVisitorId)) {
          return json(response, 409, { error: 'Profile already exists' }, currentVisitorId)
        }
        const nextUsage = [...current.usage]
        for (const profile of incoming) {
          const existing = merged.get(profile.id)
          const existingUsage = nextUsage.find((entry) => entry.profileId === profile.id)
          const idempotent = Boolean(existing && existingUsage && existing.ownerId === currentVisitorId && sameIdentity(profile, existingUsage))
          if (existing && !idempotent) {
            return json(response, 409, {
              error: '已保存资料的姓名、用户名、Bio 或头像不能被覆盖。',
              code: 'PROFILE_IDENTITY_CHANGED',
            }, currentVisitorId)
          }
          const conflicts = usageConflicts(profile, nextUsage, idempotent ? profile.id : null)
          if (conflicts.length) {
            return json(response, 409, {
              error: '姓名、头像或 Bio 在最近 30 天内已经使用，请重新生成。',
              code: 'UNIQUENESS_CONFLICT',
              conflicts,
              uniquenessDays: SERVER_UNIQUENESS_RETENTION_DAYS,
            }, currentVisitorId)
          }
          if (!idempotent) nextUsage.push(usageFromProfile(profile, now))
          merged.set(profile.id, profile)
        }
        const retention = retain([...merged.values()], now)
        const usage = retainUsage(nextUsage, now)
        writeStore(path, retention.kept)
        writeStore(usagePath, usage)
        return json(response, 200, {
          removedIds: retention.removedIds,
          retentionDays: SERVER_HISTORY_RETENTION_DAYS,
          uniquenessDays: SERVER_UNIQUENESS_RETENTION_DAYS,
          visibility: 'public-shared',
        }, currentVisitorId)
      }
      if (request.method === 'DELETE') {
        const body = await readBody(request)
        const stored = readStore(path)
        if (body.all === true) {
          const kept = stored.filter((profile) => profile.ownerId !== currentVisitorId)
          writeStore(path, kept)
          return json(response, 200, { deleted: stored.length - kept.length }, currentVisitorId)
        }
        if (!Array.isArray(body.ids) || body.ids.length > 500 || body.ids.some((id) => typeof id !== 'string' || !PROFILE_ID.test(id))) {
          return json(response, 400, { error: 'Invalid ids' }, currentVisitorId)
        }
        const ids = new Set(body.ids)
        const kept = stored.filter((profile) => profile.ownerId !== currentVisitorId || !ids.has(profile.id))
        writeStore(path, kept)
        return json(response, 200, { deleted: stored.length - kept.length }, currentVisitorId)
      }
      response.setHeader('Allow', 'GET, POST, DELETE')
      return json(response, 405, { error: 'Method Not Allowed' }, currentVisitorId)
    } catch (error) {
      return json(response, Number(error?.status) || 500, { error: Number(error?.status) ? error.message : 'Profile store failed' }, currentVisitorId)
    }
  }
}
