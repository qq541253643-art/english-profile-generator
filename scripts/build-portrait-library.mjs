#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { createPortraitPlan } from './portrait-plan.mjs'

const run = promisify(execFile)
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDirectory = resolve(process.argv[2] || join(projectRoot, 'artifacts', 'portrait-library-v1', 'source'))
const outputDirectory = resolve(process.argv[3] || join(projectRoot, 'public', 'portraits', 'v1'))
const plan = createPortraitPlan()

async function convert(item) {
  const source = join(sourceDirectory, `${item.id}.png`)
  const output = join(outputDirectory, `${item.id}.jpg`)
  const sourceInfo = await stat(source).catch(() => null)
  if (!sourceInfo?.isFile() || sourceInfo.size < 50_000) throw new Error(`原始头像缺失或异常：${item.id}`)
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', source,
    '-vf', 'scale=512:512:flags=lanczos', '-frames:v', '1', '-q:v', '2',
    '-map_metadata', '-1', '-metadata', 'comment=Fictional synthetic portrait. Not a real person.',
    '-y', output,
  ], { maxBuffer: 1024 * 1024 })
  const body = await readFile(output)
  if (body.length < 20_000 || body.length > 500_000) throw new Error(`发布头像体积异常：${item.id}`)
  return [item.id, '', '', '', item.gender, item.age, `${item.id}.jpg`, createHash('sha256').update(body).digest('hex'), body.length]
}

await mkdir(outputDirectory, { recursive: true })
const people = []
let cursor = 0
const worker = async () => {
  while (cursor < plan.length) {
    const index = cursor++
    people[index] = await convert(plan[index])
    if ((index + 1) % 25 === 0 || index + 1 === plan.length) process.stderr.write(`\r已处理 ${index + 1}/${plan.length}`)
  }
}
await Promise.all(Array.from({ length: 4 }, worker))
process.stderr.write('\n')

const hashes = new Set(people.map((item) => item[7]))
if (hashes.size !== people.length) throw new Error('发布头像存在完全重复内容')
const manifest = {
  version: 1,
  library: 'epg-photoreal-v1',
  count: people.length,
  width: 512,
  height: 512,
  format: 'jpeg',
  disclosure: 'Fictional synthetic portraits; no depicted person is real.',
  people,
}
await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest)}\n`, 'utf8')
console.log(JSON.stringify({ outputDirectory, count: people.length, bytes: people.reduce((sum, item) => sum + item[8], 0) }))
