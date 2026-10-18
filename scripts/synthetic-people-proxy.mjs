import { transcodeAvifToJpeg } from './image-codecs.mjs'

const CATALOG_URL = 'https://ambravo.github.io/sigils-people/people/index.json'
// The browser's final avatar is 512 × 512, so fetching the native 512px source
// avoids downloading and decoding four times as many source pixels.
const AVATAR_ROOT = 'https://ambravo.github.io/sigils-people/portraits/m'
const VALID_ID = /^[a-z]{2}-\d{2}$/
const MAX_CATALOG_BYTES = 1024 * 1024
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const AVATAR_CACHE_LIMIT = 24
const AVATAR_FETCH_ATTEMPTS = 2
let catalogCache = null
const avatarCache = new Map()
const pendingAvatars = new Map()

function sendError(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  response.end(message)
}

async function fetchBytes(url, maxBytes, accept) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      redirect: 'error',
      headers: { Accept: accept, 'User-Agent': 'EnglishProfileGenerator-SyntheticPortraitProxy/1.0' },
    })
    if (!upstream.ok) throw new Error(`Upstream returned HTTP ${upstream.status}`)
    const declaredLength = Number(upstream.headers.get('content-length') || 0)
    if (declaredLength > maxBytes) throw new Error('Upstream response is too large')
    const body = Buffer.from(await upstream.arrayBuffer())
    if (body.length > maxBytes) throw new Error('Upstream response is too large')
    return { body, contentType: upstream.headers.get('content-type') || '' }
  } finally {
    clearTimeout(timeout)
  }
}

function rememberAvatar(id, body) {
  avatarCache.delete(id)
  avatarCache.set(id, body)
  while (avatarCache.size > AVATAR_CACHE_LIMIT) {
    avatarCache.delete(avatarCache.keys().next().value)
  }
}

async function loadCompatibleAvatar(id) {
  const cached = avatarCache.get(id)
  if (cached) {
    rememberAvatar(id, cached)
    return cached
  }
  if (!pendingAvatars.has(id)) {
    const task = (async () => {
      let lastError
      for (let attempt = 1; attempt <= AVATAR_FETCH_ATTEMPTS; attempt += 1) {
        try {
          const result = await fetchBytes(`${AVATAR_ROOT}/${id}.avif`, MAX_AVATAR_BYTES, 'image/avif')
          if (!result.contentType.includes('image/avif')) throw new Error('Portrait did not return AVIF')
          const jpeg = await transcodeAvifToJpeg(result.body)
          rememberAvatar(id, jpeg)
          return jpeg
        } catch (error) {
          lastError = error
          if (attempt < AVATAR_FETCH_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 200))
        }
      }
      throw lastError
    })()
    pendingAvatars.set(id, task)
    task.finally(() => pendingAvatars.delete(id)).catch(() => undefined)
  }
  return pendingAvatars.get(id)
}

export async function handleSyntheticCatalog(_requestUrl, response, method = 'GET') {
  try {
    if (!catalogCache || catalogCache.expiresAt < Date.now()) {
      const result = await fetchBytes(CATALOG_URL, MAX_CATALOG_BYTES, 'application/json')
      if (!result.contentType.includes('application/json')) throw new Error('Catalog did not return JSON')
      JSON.parse(result.body.toString('utf8'))
      catalogCache = { body: result.body, expiresAt: Date.now() + 60 * 60 * 1000 }
    }
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': catalogCache.body.length,
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(method === 'HEAD' ? undefined : catalogCache.body)
  } catch {
    sendError(response, 502, 'Synthetic portrait catalog is unavailable')
  }
}

export async function handleSyntheticAvatar(requestUrl, response, method = 'GET') {
  const id = requestUrl.searchParams.get('id') || ''
  if (!VALID_ID.test(id)) return sendError(response, 400, 'Invalid synthetic portrait id')
  try {
    const body = await loadCompatibleAvatar(id)
    response.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': body.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Avatar-Source-Format': 'avif',
      'X-Avatar-Compatible-Format': 'jpeg',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(method === 'HEAD' ? undefined : body)
  } catch (error) {
    console.error('Synthetic portrait conversion failed:', error instanceof Error ? error.message : 'Unknown error')
    sendError(response, 502, 'Synthetic portrait is unavailable')
  }
}
