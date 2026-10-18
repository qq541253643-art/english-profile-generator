import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateProfiles } from '../services/generator'
import * as randomUserApi from '../services/randomUserApi'
import type { GeneratorSettings } from '../types/profile'
import { DEFAULT_PLATFORM_RULES } from '../utils/username'

const settings: GeneratorSettings = {
  count: 300,
  gender: 'female',
  minAge: 18,
  maxAge: 45,
  style: 'mixed',
  allowNumbers: true,
  platformRules: DEFAULT_PLATFORM_RULES,
}

describe('300 条本地回退', () => {
  afterEach(() => vi.restoreAllMocks())

  it('API 断开时补齐、明确标注并保持用户名和头像 URL 唯一', async () => {
    vi.spyOn(randomUserApi, 'fetchRandomUsers').mockRejectedValue(new Error('模拟断网'))
    const result = await generateProfiles(settings)
    expect(result.profiles).toHaveLength(300)
    expect(result.mockCount).toBe(300)
    expect(result.apiCount).toBe(0)
    expect(result.profiles.every((profile) => profile.dataSource === 'mock' && profile.age >= 18 && profile.age <= 45)).toBe(true)
    expect(new Set(result.profiles.map((profile) => profile.username)).size).toBe(300)
    expect(new Set(result.profiles.map((profile) => profile.avatarUrl)).size).toBe(300)
  })
})
