import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const SERVER_HISTORY_RETENTION_DAYS = 3
const RETENTION_MS = SERVER_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000
const COOKIE_NAME = 'epg_visitor'
const VISITOR_ID = /^[a-f0-9]{64}$/
const PROFILE_ID = /^[a-f0-9-]{20,64}$/i
const MAX_REQUEST_BYTES = 1024 * 1024
const MAX_SHARED_PROFILES = 5_000
const MAX_SHARED_BYTES = 50 * 1024 * 1024
const STORE_FILENAME = 'shared-profiles.json'
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
  const cleanup = () => {
    const migrated = readStore(path).map((profile) => validPassword(profile.password)
      ? profile
      : { ...profile, password: generateStrongPassword() })
    const retention = retain(migrated)
    writeStore(path, retention.kept)
    return retention
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
          visibility: 'public-shared',
        }, currentVisitorId)
      }
      if (request.method === 'POST') {
        const body = await readBody(request)
        if (!Array.isArray(body.profiles) || body.profiles.length > 10) return json(response, 400, { error: 'Invalid profiles' }, currentVisitorId)
        const now = Date.now()
        const incoming = body.profiles.map((profile) => sanitizeProfile(profile, currentVisitorId, now))
        if (incoming.some((profile) => !profile)) return json(response, 400, { error: 'Invalid profile' }, currentVisitorId)
        const merged = new Map(readStore(path).map((profile) => [profile.id, profile]))
        if (incoming.some((profile) => merged.has(profile.id) && merged.get(profile.id).ownerId !== currentVisitorId)) {
          return json(response, 409, { error: 'Profile already exists' }, currentVisitorId)
        }
        for (const profile of incoming) merged.set(profile.id, profile)
        const retention = retain([...merged.values()], now)
        writeStore(path, retention.kept)
        return json(response, 200, {
          removedIds: retention.removedIds,
          retentionDays: SERVER_HISTORY_RETENTION_DAYS,
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
