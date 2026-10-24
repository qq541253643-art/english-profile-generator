import { readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transcodeAvifToJpeg } from './image-codecs.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const portraitDirectory = resolve(process.env.EPG_PORTRAIT_LIBRARY_DIR || join(scriptDirectory, '..', 'dist', 'portraits', 'v1'))
const manifestPath = join(portraitDirectory, 'manifest.json')
const LIBRARY_ID = /^[fm]-\d{3}$/
const LEGACY_ID = /^[a-z]{2}-\d{2}$/
const LEGACY_AVATAR_ROOT = 'https://ambravo.github.io/sigils-people/portraits/m'
const MAX_MANIFEST_BYTES = 1024 * 1024
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const LEGACY_CACHE_LIMIT = 24
const LEGACY_FETCH_ATTEMPTS = 2
let libraryPromise = null
const legacyCache = new Map()
const pendingLegacyAvatars = new Map()

function sendError(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  response.end(message)
}

function isLibraryPerson(value) {
  return Array.isArray(value) && LIBRARY_ID.test(value[0] || '')
    && (value[4] === 'female' || value[4] === 'male')
    && Number.isInteger(value[5]) && value[5] >= 18 && value[5] <= 45
    && value[6] === `${value[0]}.jpg`
}

async function loadLibrary() {
  if (!libraryPromise) {
    libraryPromise = (async () => {
      const info = await stat(manifestPath)
      if (!info.isFile() || info.size <= 0 || info.size > MAX_MANIFEST_BYTES) throw new Error('Portrait manifest size is invalid')
      const body = await readFile(manifestPath)
      const parsed = JSON.parse(body.toString('utf8'))
      if (!Array.isArray(parsed.people) || parsed.people.length !== 600 || !parsed.people.every(isLibraryPerson)) {
        throw new Error('Portrait manifest is incomplete')
      }
      const ids = new Set(parsed.people.map((person) => person[0]))
      if (ids.size !== parsed.people.length) throw new Error('Portrait manifest contains duplicate IDs')
      return { body, ids }
    })().catch((error) => {
      libraryPromise = null
      throw error
    })
  }
  return libraryPromise
}

async function fetchLegacyBytes(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      redirect: 'error',
      headers: { Accept: 'image/avif', 'User-Agent': 'EnglishProfileGenerator-LegacyPortraitProxy/1.0' },
    })
    if (!upstream.ok) throw new Error(`Upstream returned HTTP ${upstream.status}`)
    const declaredLength = Number(upstream.headers.get('content-length') || 0)
    if (declaredLength > MAX_AVATAR_BYTES) throw new Error('Upstream response is too large')
    const body = Buffer.from(await upstream.arrayBuffer())
    if (body.length > MAX_AVATAR_BYTES || !String(upstream.headers.get('content-type')).includes('image/avif')) {
      throw new Error('Legacy portrait response is invalid')
    }
    return body
  } finally {
    clearTimeout(timeout)
  }
}

function rememberLegacyAvatar(id, body) {
  legacyCache.delete(id)
  legacyCache.set(id, body)
  while (legacyCache.size > LEGACY_CACHE_LIMIT) legacyCache.delete(legacyCache.keys().next().value)
}

async function loadLegacyAvatar(id) {
  const cached = legacyCache.get(id)
  if (cached) {
    rememberLegacyAvatar(id, cached)
    return cached
  }
  if (!pendingLegacyAvatars.has(id)) {
    const task = (async () => {
      let lastError
      for (let attempt = 1; attempt <= LEGACY_FETCH_ATTEMPTS; attempt += 1) {
        try {
          const avif = await fetchLegacyBytes(`${LEGACY_AVATAR_ROOT}/${id}.avif`)
          const jpeg = await transcodeAvifToJpeg(avif)
          rememberLegacyAvatar(id, jpeg)
          return jpeg
        } catch (error) {
          lastError = error
          if (attempt < LEGACY_FETCH_ATTEMPTS) await new Promise((resolveDelay) => setTimeout(resolveDelay, 200))
        }
      }
      throw lastError
    })()
    pendingLegacyAvatars.set(id, task)
    task.finally(() => pendingLegacyAvatars.delete(id)).catch(() => undefined)
  }
  return pendingLegacyAvatars.get(id)
}

export async function handleSyntheticCatalog(_requestUrl, response, method = 'GET') {
  try {
    const library = await loadLibrary()
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': library.body.length,
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Portrait-Library': 'epg-v1-600',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(method === 'HEAD' ? undefined : library.body)
  } catch (error) {
    console.error('Portrait catalog failed:', error instanceof Error ? error.message : 'Unknown error')
    sendError(response, 503, 'Local portrait library is unavailable')
  }
}

export async function handleSyntheticAvatar(requestUrl, response, method = 'GET') {
  const id = requestUrl.searchParams.get('id') || ''
  if (!LIBRARY_ID.test(id) && !LEGACY_ID.test(id)) return sendError(response, 400, 'Invalid synthetic portrait id')
  try {
    let body
    let source
    if (LIBRARY_ID.test(id)) {
      const library = await loadLibrary()
      if (!library.ids.has(id)) return sendError(response, 404, 'Synthetic portrait was not found')
      body = await readFile(join(portraitDirectory, `${id}.jpg`))
      if (body.length <= 0 || body.length > MAX_AVATAR_BYTES) throw new Error('Portrait file size is invalid')
      source = 'epg-v1'
    } else {
      body = await loadLegacyAvatar(id)
      source = 'sigils-people-legacy'
    }
    response.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': body.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Avatar-Source': source,
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(method === 'HEAD' ? undefined : body)
  } catch (error) {
    console.error('Synthetic portrait failed:', error instanceof Error ? error.message : 'Unknown error')
    sendError(response, 503, 'Synthetic portrait is unavailable')
  }
}
