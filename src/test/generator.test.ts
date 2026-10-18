import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateProfiles } from '../services/generator'
import * as randomUserApi from '../services/randomUserApi'
import * as syntheticAvatarService from '../services/syntheticAvatarService'
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
  beforeEach(() => {
    vi.spyOn(syntheticAvatarService, 'assignSyntheticAvatars').mockImplementation(async (people) => {
      people.forEach((person, index) => {
        person.avatarUrl = `/__synthetic-avatar?id=test-${index}`
        person.avatarSource = 'sigils-synthetic'
      })
      return people.length
    })
  })
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
    expect(result.profiles.filter((profile) => profile.avatarSource === 'sigils-synthetic')).toHaveLength(300)
  })

  it('单条资料切换本地模拟时仍优先匹配真人风格照片', async () => {
    vi.spyOn(randomUserApi, 'fetchRandomUsers').mockRejectedValue(new Error('模拟断网'))
    const result = await generateProfiles({ ...settings, count: 1 })
    expect(result.profiles[0]).toMatchObject({ dataSource: 'mock', avatarSource: 'sigils-synthetic' })
    expect(result.profiles[0].avatarUrl).toBe('/__synthetic-avatar?id=test-0')
  })

  it('API 可用时也替换为高清合成人像，不使用低清 API 照片', async () => {
    vi.spyOn(randomUserApi, 'fetchRandomUsers').mockResolvedValue([{
      firstName: 'Avery', lastName: 'Miller', age: 28, gender: 'female',
      avatarUrl: 'https://randomuser.me/api/portraits/women/80.jpg',
      avatarSource: 'randomuser-placeholder', dataSource: 'api',
    }])
    const result = await generateProfiles({ ...settings, count: 1 })
    expect(result.profiles[0].avatarUrl).toBe('/__synthetic-avatar?id=test-0')
    expect(result.profiles[0].avatarSource).toBe('sigils-synthetic')
  })
})
