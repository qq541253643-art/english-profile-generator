#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const libraryDirectory = resolve(process.argv[2] || join(projectRoot, 'public', 'portraits', 'v1'))
const manifest = JSON.parse(await readFile(join(libraryDirectory, 'manifest.json'), 'utf8'))

if (manifest.count !== 600 || !Array.isArray(manifest.people) || manifest.people.length !== 600) throw new Error('头像清单必须恰好包含 600 条')
const ids = new Set()
const hashes = new Set()
let female = 0
let male = 0
let totalBytes = 0

for (const item of manifest.people) {
  const [id, , , , gender, age, filename, expectedHash, expectedBytes] = item
  if (!/^[fm]-\d{3}$/.test(id) || filename !== `${id}.jpg` || ids.has(id)) throw new Error(`头像 ID 或文件名无效：${id}`)
  if (!['female', 'male'].includes(gender) || !Number.isInteger(age) || age < 18 || age > 45) throw new Error(`头像属性无效：${id}`)
  const path = join(libraryDirectory, filename)
  const info = await stat(path)
  const body = await readFile(path)
  const actualHash = createHash('sha256').update(body).digest('hex')
  if (!info.isFile() || info.size !== expectedBytes || actualHash !== expectedHash || hashes.has(actualHash)) throw new Error(`头像文件或哈希无效：${id}`)
  const probe = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', path])
  const stream = JSON.parse(probe.stdout).streams?.[0]
  if (stream?.codec_name !== 'mjpeg' || stream.width !== 512 || stream.height !== 512) throw new Error(`头像尺寸或格式无效：${id}`)
  ids.add(id)
  hashes.add(actualHash)
  totalBytes += info.size
  if (gender === 'female') female += 1
  else male += 1
}

if (female !== 420 || male !== 180) throw new Error(`性别分布无效：female=${female}, male=${male}`)
console.log(JSON.stringify({ count: ids.size, female, male, totalBytes }))
