const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_PATH = /^\/api\/portraits\/(?:men|women)\/\d+\.jpg$/

export function allowedAvatarUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.hostname === 'randomuser.me'
      && url.port === ''
      && url.username === ''
      && url.password === ''
      && ALLOWED_PATH.test(url.pathname)
      ? url
      : null
  } catch {
    return null
  }
}

function sendError(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(message),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(message)
}

export async function handleAvatarProxy(requestUrl, response) {
  const target = allowedAvatarUrl(requestUrl.searchParams.get('url') || '')
  if (!target) return sendError(response, 403, 'Avatar URL is not allowed')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const upstream = await fetch(target, {
      signal: controller.signal,
      redirect: 'error',
      headers: { 'User-Agent': 'EnglishProfileGenerator-AvatarProxy/1.0' },
    })
    if (!upstream.ok) return sendError(response, 502, `Avatar upstream returned HTTP ${upstream.status}`)
    const contentType = upstream.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) return sendError(response, 502, 'Avatar upstream did not return an image')
    const declaredLength = Number(upstream.headers.get('content-length') || 0)
    if (declaredLength > MAX_AVATAR_BYTES) return sendError(response, 413, 'Avatar is too large')

    const body = Buffer.from(await upstream.arrayBuffer())
    if (body.length > MAX_AVATAR_BYTES) return sendError(response, 413, 'Avatar is too large')
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': body.length,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(body)
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Avatar upstream timed out'
      : 'Avatar upstream request failed'
    sendError(response, 502, message)
  } finally {
    clearTimeout(timeout)
  }
}
