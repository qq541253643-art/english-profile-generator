#!/usr/bin/env node
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, isAbsolute, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..')
const packageVersion = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')).version

function readArguments(values) {
  const options = {}
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]?.replace(/^--/, '')
    if (key) options[key] = values[index + 1]
  }
  return options
}

const options = readArguments(process.argv.slice(2))
const host = options.host || '127.0.0.1'
const requestedPort = Number.parseInt(options.port || '0', 10)
const root = resolve(options.root || join(projectRoot, 'dist'))
const stateFile = options['state-file']
  ? (isAbsolute(options['state-file']) ? options['state-file'] : resolve(options['state-file']))
  : null

if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
  throw new Error('端口参数无效。')
}
if (!existsSync(join(root, 'index.html'))) {
  throw new Error(`未找到构建产物：${join(root, 'index.html')}`)
}

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

function sendText(response, status, body, type = 'text/plain; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(body)
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD')
    return sendText(response, 405, 'Method Not Allowed')
  }

  const requestUrl = new URL(request.url || '/', `http://${host}`)
  if (requestUrl.pathname === '/__health') {
    return sendText(response, 200, JSON.stringify({ app: 'english-profile-generator', version: packageVersion }), 'application/json; charset=utf-8')
  }

  let decodedPath
  try {
    decodedPath = decodeURIComponent(requestUrl.pathname)
  } catch {
    return sendText(response, 400, 'Bad Request')
  }

  const requestedFile = decodedPath === '/' ? '/index.html' : decodedPath
  let filePath = resolve(root, `.${requestedFile}`)
  const insideRoot = filePath === root || filePath.startsWith(`${root}${sep}`)
  if (!insideRoot) return sendText(response, 403, 'Forbidden')

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    if (extname(requestedFile)) return sendText(response, 404, 'Not Found')
    filePath = join(root, 'index.html')
  }

  const stats = statSync(filePath)
  const headers = {
    'Content-Type': contentTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
    'Content-Length': stats.size,
    'Cache-Control': requestedFile.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  }
  response.writeHead(200, headers)
  if (request.method === 'HEAD') return response.end()
  createReadStream(filePath).pipe(response)
})

function removeOwnedStateFile() {
  if (!stateFile || !existsSync(stateFile)) return
  try {
    const state = JSON.parse(readFileSync(stateFile, 'utf8'))
    if (state.pid === process.pid) rmSync(stateFile, { force: true })
  } catch {
    // A malformed or replaced state file does not belong to this process.
  }
}

server.listen(requestedPort, host, () => {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('无法确定本地服务地址。')
  const url = `http://${host}:${address.port}`
  if (stateFile) {
    mkdirSync(dirname(stateFile), { recursive: true })
    writeFileSync(stateFile, JSON.stringify({ app: 'english-profile-generator', pid: process.pid, port: address.port, url }), 'utf8')
  }
  console.log(`English Profile Generator is ready at ${url}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => {
    removeOwnedStateFile()
    process.exit(0)
  }))
}
process.on('exit', removeOwnedStateFile)
