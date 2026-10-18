const CATALOG_URL = 'https://ambravo.github.io/sigils-people/people/index.json'
const AVATAR_ROOT = 'https://ambravo.github.io/sigils-people/portraits/l'
const VALID_ID = /^[a-z]{2}-\d{2}$/
const MAX_CATALOG_BYTES = 1024 * 1024
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
let catalogCache = null

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
    const result = await fetchBytes(`${AVATAR_ROOT}/${id}.avif`, MAX_AVATAR_BYTES, 'image/avif')
    if (!result.contentType.includes('image/avif')) throw new Error('Portrait did not return AVIF')
    response.writeHead(200, {
      'Content-Type': 'image/avif',
      'Content-Length': result.body.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(method === 'HEAD' ? undefined : result.body)
  } catch {
    sendError(response, 502, 'Synthetic portrait is unavailable')
  }
}
