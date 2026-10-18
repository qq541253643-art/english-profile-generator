#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..')

function getArgument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

async function addDirectory(zip, sourceDirectory, archiveDirectory) {
  for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = join(sourceDirectory, entry.name)
    const archivePath = `${archiveDirectory}/${entry.name}`
    if (entry.isDirectory()) await addDirectory(zip, sourcePath, archivePath)
    else if (entry.isFile()) zip.file(archivePath, await readFile(sourcePath))
  }
}

const outputDirectory = resolve(getArgument('output', join(projectRoot, 'release-assets')))
const packageData = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'))
const version = packageData.version
const requiredFiles = [
  join(projectRoot, 'dist', 'index.html'),
  join(projectRoot, 'scripts', 'avatar-proxy.mjs'),
  join(projectRoot, 'scripts', 'avatar-enhancer.mjs'),
  join(projectRoot, 'scripts', 'random-user-proxy.mjs'),
  join(projectRoot, 'scripts', 'synthetic-people-proxy.mjs'),
  join(projectRoot, 'scripts', 'local-server.mjs'),
  join(projectRoot, 'scripts', 'profile-store.mjs'),
  join(projectRoot, 'windows', 'launcher.ps1'),
  join(projectRoot, 'windows', 'launcher.vbs'),
]

for (const path of requiredFiles) {
  if (!(await stat(path).catch(() => null))) throw new Error(`发布文件缺失：${relative(projectRoot, path)}`)
}

const zip = new JSZip()
await addDirectory(zip, join(projectRoot, 'dist'), 'app/dist')
zip.file('app/package.json', await readFile(join(projectRoot, 'package.json')))
zip.file('app/scripts/avatar-proxy.mjs', await readFile(join(projectRoot, 'scripts', 'avatar-proxy.mjs')))
zip.file('app/scripts/avatar-enhancer.mjs', await readFile(join(projectRoot, 'scripts', 'avatar-enhancer.mjs')))
zip.file('app/scripts/random-user-proxy.mjs', await readFile(join(projectRoot, 'scripts', 'random-user-proxy.mjs')))
zip.file('app/scripts/synthetic-people-proxy.mjs', await readFile(join(projectRoot, 'scripts', 'synthetic-people-proxy.mjs')))
zip.file('app/scripts/local-server.mjs', await readFile(join(projectRoot, 'scripts', 'local-server.mjs')))
zip.file('app/scripts/profile-store.mjs', await readFile(join(projectRoot, 'scripts', 'profile-store.mjs')))
const launcherText = (await readFile(join(projectRoot, 'windows', 'launcher.ps1'), 'utf8')).replace(/^\uFEFF/, '')
const launcherWithBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(launcherText, 'utf8')])
zip.file('app/windows/launcher.ps1', launcherWithBom)
zip.file('app/windows/launcher.vbs', await readFile(join(projectRoot, 'windows', 'launcher.vbs')))

const archive = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
  platform: 'DOS',
})
const assetName = `english-profile-generator-windows-v${version}.zip`
const assetPath = join(outputDirectory, assetName)
const checksum = createHash('sha256').update(archive).digest('hex')

await mkdir(outputDirectory, { recursive: true })
await writeFile(assetPath, archive)
await writeFile(`${assetPath}.sha256`, `${checksum}  ${basename(assetPath)}\n`, 'utf8')
console.log(JSON.stringify({ assetPath, bytes: archive.length, checksum }))
