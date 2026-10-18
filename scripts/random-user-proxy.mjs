const MAX_RESPONSE_BYTES = 8 * 1024 * 1024

function sendError(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(message),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(message)
}

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'EnglishProfileGenerator-RandomUserProxy/1.0',
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function handleRandomUserProxy(requestUrl, response, method = 'GET') {
  const results = Number.parseInt(requestUrl.searchParams.get('results') || '', 10)
  const gender = requestUrl.searchParams.get('gender') || 'random'
  if (!Number.isInteger(results) || results < 1 || results > 500
    || !['random', 'male', 'female'].includes(gender)) {
    return sendError(response, 400, 'Invalid Random User request')
  }

  const upstreamUrl = new URL('https://randomuser.me/api/1.4/')
  upstreamUrl.searchParams.set('nat', 'us')
  upstreamUrl.searchParams.set('results', String(results))
  upstreamUrl.searchParams.set('inc', 'gender,name,dob,picture,nat')
  if (gender !== 'random') upstreamUrl.searchParams.set('gender', gender)

  try {
    let upstream
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        upstream = await fetchWithTimeout(upstreamUrl)
        if (upstream.ok) break
      } catch (error) {
        if (attempt === 1) throw error
      }
    }
    if (!upstream?.ok) return sendError(response, 502, `Random User returned HTTP ${upstream?.status || 502}`)
    const body = Buffer.from(await upstream.arrayBuffer())
    if (body.length > MAX_RESPONSE_BYTES) return sendError(response, 413, 'Random User response is too large')
    JSON.parse(body.toString('utf8'))
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(method === 'HEAD' ? undefined : body)
  } catch {
    sendError(response, 502, 'Random User request failed')
  }
}
