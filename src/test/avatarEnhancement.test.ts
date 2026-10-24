/* @vitest-environment node */
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

describe('真人照片 AI 增强', () => {
  it('公网版与 Windows 版都使用 ESRGAN x4，不依赖运行时付费 API', async () => {
    const [service, serverEnhancer, model, shard] = await Promise.all([
      readFile(resolve(projectRoot, 'src/services/avatarService.ts'), 'utf8'),
      readFile(resolve(projectRoot, 'scripts/avatar-enhancer.mjs'), 'utf8'),
      stat(resolve(projectRoot, 'public/models/esrgan-slim/x4/model.json')),
      stat(resolve(projectRoot, 'public/models/esrgan-slim/x4/group1-shard1of1.bin')),
    ])
    expect(service).toContain("import('@upscalerjs/esrgan-slim/4x')")
    expect(service).toContain("path: '/models/esrgan-slim/x4/model.json'")
    expect(service).toContain('canvas.width = 512')
    expect(serverEnhancer).toContain("require('@upscalerjs/esrgan-slim/4x')")
    expect(serverEnhancer).not.toContain("esrgan-slim/8x")
    expect(model.size).toBeGreaterThan(1_000)
    expect(shard.size).toBeGreaterThan(500_000)
  })

  it('合成人像直接使用与最终输出一致的 512px 源图并限制并发', async () => {
    const [service, syntheticProxy] = await Promise.all([
      readFile(resolve(projectRoot, 'src/services/avatarService.ts'), 'utf8'),
      readFile(resolve(projectRoot, 'scripts/synthetic-people-proxy.mjs'), 'utf8'),
    ])
    expect(syntheticProxy).toContain("'dist', 'portraits', 'v1'")
    expect(syntheticProxy).toContain('parsed.people.length !== 600')
    expect(syntheticProxy).toContain('LEGACY_FETCH_ATTEMPTS = 2')
    expect(service).toContain('Math.min(4, profiles.length)')
    expect(service).toContain("set('format', 'jpeg-v2')")
  })
})
