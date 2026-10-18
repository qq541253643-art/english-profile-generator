/* @vitest-environment node */
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const serverScript = resolve(fileURLToPath(new URL('../../scripts/local-server.mjs', import.meta.url)))
const processes: ChildProcess[] = []
const temporaryDirectories: string[] = []

async function waitForState(stateFile: string, process: ChildProcess) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (process.exitCode !== null) throw new Error(`本地服务提前退出：${process.exitCode}`)
    try {
      return JSON.parse(await readFile(stateFile, 'utf8')) as { app: string; pid: number; url: string; lanUrls: string[] }
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 50))
    }
  }
  throw new Error('等待本地服务状态文件超时')
}

afterEach(async () => {
  for (const process of processes.splice(0)) {
    if (process.exitCode === null) process.kill('SIGTERM')
  }
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 60))
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('Windows 快捷方式使用的本地静态服务', () => {
  it('在随机本机端口提供健康检查、静态资源和单页回退', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'epg-server-'))
    temporaryDirectories.push(temporaryDirectory)
    const webRoot = join(temporaryDirectory, 'dist')
    const stateFile = join(temporaryDirectory, 'server-state.json')
    await mkdir(join(webRoot, 'assets'), { recursive: true })
    await writeFile(join(webRoot, 'index.html'), '<!doctype html><title>测试面板</title>', 'utf8')
    await writeFile(join(webRoot, 'assets', 'app.js'), 'window.ready = true', 'utf8')

    const server = spawn(process.execPath, [
      serverScript,
      '--root', webRoot,
      '--host', '127.0.0.1',
      '--port', '0',
      '--state-file', stateFile,
    ], { stdio: 'ignore' })
    processes.push(server)

    const state = await waitForState(stateFile, server)
    expect(state.app).toBe('english-profile-generator')
    expect(state.pid).toBe(server.pid)
    expect(state.url).toMatch(/^http:\/\/127\.0\.0\.1:/)
    expect(Array.isArray(state.lanUrls)).toBe(true)

    const health = await fetch(`${state.url}/__health`).then((response) => response.json())
    expect(health).toMatchObject({ app: 'english-profile-generator', lanUrls: expect.any(Array) })

    const home = await fetch(state.url)
    expect(home.status).toBe(200)
    expect(await home.text()).toContain('测试面板')

    const asset = await fetch(`${state.url}/assets/app.js`)
    expect(asset.status).toBe(200)
    expect(asset.headers.get('cache-control')).toContain('immutable')

    const route = await fetch(`${state.url}/profiles/42`)
    expect(route.status).toBe(200)
    expect(await route.text()).toContain('测试面板')

    const missingAsset = await fetch(`${state.url}/assets/missing.js`)
    expect(missingAsset.status).toBe(404)

    const blockedProxy = await fetch(`${state.url}/__avatar?url=${encodeURIComponent('http://127.0.0.1/private.png')}`)
    expect(blockedProxy.status).toBe(403)
  })
})
