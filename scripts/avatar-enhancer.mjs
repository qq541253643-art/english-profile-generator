import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { allowedAvatarUrl, fetchAvatar } from './avatar-proxy.mjs'

const cacheDirectory = process.env.EPG_AVATAR_CACHE_DIR || ''
const pending = new Map()
let enhancementQueue = Promise.resolve()
let enhancerPromise
const require = createRequire(import.meta.url)

function sendError(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(message),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(message)
}

async function getEnhancer() {
  if (!enhancerPromise) {
    enhancerPromise = Promise.resolve().then(() => {
      const tf = require('@tensorflow/tfjs-node')
      const Upscaler = require('upscaler/node')
      const model = require('@upscalerjs/esrgan-slim/4x')
      const upscaler = new Upscaler({ model })
      return { tf, upscaler }
    })
  }
  return enhancerPromise
}

function cacheName(target) {
  const match = target.pathname.match(/^\/api\/portraits\/(men|women)\/(\d+)\.jpg$/)
  if (!match) throw new Error('Invalid avatar path')
  return `${match[1]}-${match[2].padStart(2, '0')}.png`
}

async function generateEnhancedAvatar(target, outputPath) {
  const source = await fetchAvatar(target)
  const { tf, upscaler } = await getEnhancer()
  const tensor = await upscaler.upscale(source.body, {
    patchSize: 64,
    padding: 2,
    output: 'tensor',
  })
  try {
    const png = Buffer.from(await tf.node.encodePng(tensor))
    const temporaryPath = `${outputPath}.${process.pid}.tmp`
    await writeFile(temporaryPath, png)
    await rename(temporaryPath, outputPath)
    return png
  } finally {
    tensor.dispose()
  }
}

async function loadOrGenerate(target) {
  await mkdir(cacheDirectory, { recursive: true })
  const outputPath = join(cacheDirectory, cacheName(target))
  try {
    return await readFile(outputPath)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  const key = target.href
  if (!pending.has(key)) {
    if (pending.size >= 8) {
      const error = new Error('Enhancement queue is full')
      error.code = 'QUEUE_FULL'
      throw error
    }
    const task = enhancementQueue.then(() => generateEnhancedAvatar(target, outputPath))
    enhancementQueue = task.catch(() => undefined)
    pending.set(key, task.finally(() => pending.delete(key)))
  }
  return pending.get(key)
}

export function serverAvatarEnhancementAvailable() {
  return Boolean(cacheDirectory)
}

export async function handleEnhancedAvatar(requestUrl, response, method = 'GET') {
  const target = allowedAvatarUrl(requestUrl.searchParams.get('url') || '')
  if (!target) return sendError(response, 403, 'Avatar URL is not allowed')
  if (!cacheDirectory) return sendError(response, 503, 'Server avatar enhancement is unavailable')

  try {
    const png = await loadOrGenerate(target)
    response.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': png.length,
      'Cache-Control': 'public, max-age=2592000, immutable',
      'X-Avatar-Enhancement': 'esrgan-slim-4x-server',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(method === 'HEAD' ? undefined : png)
  } catch (error) {
    console.error('Avatar enhancement failed:', error instanceof Error ? error.message : 'Unknown error')
    sendError(response, error?.code === 'QUEUE_FULL' ? 429 : 502,
      error?.code === 'QUEUE_FULL' ? 'Server avatar enhancement queue is full' : 'Server avatar enhancement failed')
  }
}
