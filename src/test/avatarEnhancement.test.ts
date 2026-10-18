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
})
