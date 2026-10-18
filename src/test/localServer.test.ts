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
    expect(health).toMatchObject({ app: 'english-profile-generator', lanUrls: expect.any(Array), avatarEnhancement: 'browser' })

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

    const unavailableEnhancement = await fetch(`${state.url}/__avatar-enhanced?url=${encodeURIComponent('https://randomuser.me/api/portraits/men/7.jpg')}`)
    expect(unavailableEnhancement.status).toBe(503)

    const invalidRandomUserRequest = await fetch(`${state.url}/__random-user?results=999&gender=random`)
    expect(invalidRandomUserRequest.status).toBe(400)

    const invalidSyntheticAvatar = await fetch(`${state.url}/__synthetic-avatar?id=../../private`)
    expect(invalidSyntheticAvatar.status).toBe(400)
  })

  it('服务器模式向所有访客共享同一列表和固定密码，并仅允许创建者删除', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'epg-shared-'))
    temporaryDirectories.push(temporaryDirectory)
    const webRoot = join(temporaryDirectory, 'dist')
    const storeRoot = join(temporaryDirectory, 'profile-store')
    const stateFile = join(temporaryDirectory, 'server-state.json')
    await mkdir(webRoot, { recursive: true })
    await mkdir(storeRoot, { recursive: true })
    await writeFile(join(webRoot, 'index.html'), '<!doctype html><title>公共列表</title>', 'utf8')
    await writeFile(join(storeRoot, 'shared-profiles.json'), JSON.stringify([{
      id: '22222222-2222-4222-8222-222222222222',
      firstName: 'Old', lastName: 'Profile', displayName: 'Old Profile', username: 'old.profile',
      age: 30, gender: 'male', bio: 'Expired profile.', bioZh: '已过期资料。', interests: [],
      avatarUrl: '/__synthetic-avatar?id=us-02', avatarSource: 'sigils-synthetic', dataSource: 'mock',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), ownerId: 'a'.repeat(64),
    }]), 'utf8')

    const server = spawn(process.execPath, [
      serverScript,
      '--root', webRoot,
      '--host', '127.0.0.1',
      '--port', '0',
      '--state-file', stateFile,
    ], { stdio: 'ignore', env: { ...process.env, EPG_PROFILE_STORE_DIR: storeRoot } })
    processes.push(server)
    const state = await waitForState(stateFile, server)
    const headers = { 'X-EPG-Client': 'web' }

    const ownerLoad = await fetch(`${state.url}/__profiles`, { headers })
    const ownerCookie = ownerLoad.headers.get('set-cookie')?.split(';')[0]
    expect(ownerCookie).toMatch(/^epg_visitor=[a-f0-9]{64}$/)
    expect(await ownerLoad.json()).toMatchObject({ profiles: [], retentionDays: 3, visibility: 'public-shared' })

    const savedProfile = {
      id: '11111111-1111-4111-8111-111111111111',
      firstName: 'Maya', lastName: 'Davis', displayName: 'Maya Davis', username: 'maya.davis',
      age: 28, gender: 'female', bio: 'Testing a shared profile.', bioZh: '测试公共资料。', interests: ['photo'],
      avatarUrl: '/__synthetic-avatar?id=us-01', avatarSource: 'sigils-synthetic', dataSource: 'api',
      createdAt: '2000-01-01T00:00:00.000Z', password: 'Aa2!abcdefghijklmnop',
    }
    const save = await fetch(`${state.url}/__profiles`, {
      method: 'POST',
      headers: { ...headers, Cookie: ownerCookie!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profiles: [savedProfile] }),
    })
    expect(save.status).toBe(200)

    const weakPassword = await fetch(`${state.url}/__profiles`, {
      method: 'POST',
      headers: { ...headers, Cookie: ownerCookie!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profiles: [{ ...savedProfile, id: '55555555-5555-4555-8555-555555555555', password: 'weak-password' }] }),
    })
    expect(weakPassword.status).toBe(400)

    const tooMany = await fetch(`${state.url}/__profiles`, {
      method: 'POST',
      headers: { ...headers, Cookie: ownerCookie!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profiles: Array.from({ length: 11 }, () => savedProfile) }),
    })
    expect(tooMany.status).toBe(400)

    const visitorLoad = await fetch(`${state.url}/__profiles`, { headers })
    const visitorCookie = visitorLoad.headers.get('set-cookie')?.split(';')[0]
    const visitorBody = await visitorLoad.json() as { profiles: Array<Record<string, unknown>> }
    expect(visitorBody.profiles).toHaveLength(1)
    expect(visitorBody.profiles[0]).toMatchObject({ id: savedProfile.id, password: savedProfile.password, canDelete: false })
    expect(Date.parse(String(visitorBody.profiles[0].createdAt))).toBeGreaterThan(Date.now() - 10_000)

    const ownershipTakeover = await fetch(`${state.url}/__profiles`, {
      method: 'POST',
      headers: { ...headers, Cookie: visitorCookie!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profiles: [{ ...savedProfile, displayName: 'Taken Over' }] }),
    })
    expect(ownershipTakeover.status).toBe(409)

    const externalAvatar = await fetch(`${state.url}/__profiles`, {
      method: 'POST',
      headers: { ...headers, Cookie: visitorCookie!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profiles: [{ ...savedProfile, id: '33333333-3333-4333-8333-333333333333', avatarUrl: 'https://tracker.example/avatar.png' }] }),
    })
    expect(externalAvatar.status).toBe(400)

    const visitorDelete = await fetch(`${state.url}/__profiles`, {
      method: 'DELETE',
      headers: { ...headers, Cookie: visitorCookie!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [savedProfile.id] }),
    })
    expect(await visitorDelete.json()).toMatchObject({ deleted: 0 })

    const ownerView = await fetch(`${state.url}/__profiles`, { headers: { ...headers, Cookie: ownerCookie! } })
    expect(await ownerView.json()).toMatchObject({ profiles: [{ id: savedProfile.id, password: savedProfile.password, canDelete: true }] })
    expect(await readFile(join(storeRoot, 'shared-profiles.json'), 'utf8')).toContain(savedProfile.password)

    const ownerDelete = await fetch(`${state.url}/__profiles`, {
      method: 'DELETE',
      headers: { ...headers, Cookie: ownerCookie!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [savedProfile.id] }),
    })
    expect(await ownerDelete.json()).toMatchObject({ deleted: 1 })
    expect((await fetch(`${state.url}/__profiles`, { headers })).status).toBe(200)

    const { password: _legacyPassword, ...legacyProfile } = {
      ...savedProfile,
      id: '44444444-4444-4444-8444-444444444444',
      createdAt: new Date().toISOString(),
      ownerId: 'b'.repeat(64),
    }
    await writeFile(join(storeRoot, 'shared-profiles.json'), JSON.stringify([legacyProfile]), 'utf8')
    const firstMigrationLoad = await fetch(`${state.url}/__profiles`, { headers }).then((response) => response.json()) as { profiles: Array<{ password: string }> }
    const secondMigrationLoad = await fetch(`${state.url}/__profiles`, { headers }).then((response) => response.json()) as { profiles: Array<{ password: string }> }
    const migratedPassword = firstMigrationLoad.profiles[0].password
    expect(migratedPassword).toHaveLength(20)
    expect(migratedPassword).toMatch(/[a-z]/)
    expect(migratedPassword).toMatch(/[A-Z]/)
    expect(migratedPassword).toMatch(/\d/)
    expect(migratedPassword).toMatch(/[^A-Za-z0-9]/)
    expect(secondMigrationLoad.profiles[0].password).toBe(migratedPassword)
    expect(JSON.parse(await readFile(join(storeRoot, 'shared-profiles.json'), 'utf8'))[0].password).toBe(migratedPassword)
  })
})
