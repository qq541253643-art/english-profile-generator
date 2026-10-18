import type { BasePerson, GenerationResult, GeneratorSettings, Profile, ProgressCallback } from '../types/profile'
import { generateBio } from '../utils/bio'
import { generateStrongPassword } from '../utils/password'
import { generateUniqueUsername } from '../utils/username'
import { createMockPerson } from './mockData'
import { fetchRandomUsers, isAgeInRange } from './randomUserApi'

const MAX_API_ROUNDS = 7

function enrichPerson(person: BasePerson, settings: GeneratorSettings, usernames: Set<string>): Profile {
  const generatedBio = generateBio(person.firstName)
  const username = generateUniqueUsername({
    firstName: person.firstName,
    lastName: person.lastName,
    gender: person.gender,
    style: settings.style,
    allowNumbers: settings.allowNumbers,
    rules: settings.platformRules,
  }, usernames)
  return {
    ...person,
    id: crypto.randomUUID(),
    displayName: `${person.firstName} ${person.lastName}`,
    username,
    ...generatedBio,
    password: generateStrongPassword(),
    createdAt: new Date().toISOString(),
  }
}

export async function generateProfiles(
  settings: GeneratorSettings,
  existingUsernames = new Set<string>(),
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
): Promise<GenerationResult> {
  const accepted: BasePerson[] = []
  const seenAvatars = new Set<string>()
  const warnings: string[] = []
  let apiUnavailable = false

  for (let round = 0; round < MAX_API_ROUNDS && accepted.length < settings.count; round += 1) {
    const remaining = settings.count - accepted.length
    onProgress?.(accepted.length, settings.count, round === 0 ? '正在请求远程资料…' : `筛选年龄区间（第 ${round + 1} 轮）…`)
    try {
      const batch = await fetchRandomUsers({ results: remaining, gender: settings.gender, signal })
      for (const person of batch) {
        if (accepted.length >= settings.count) break
        if (!isAgeInRange(person.age, settings.minAge, settings.maxAge)) continue
        if (seenAvatars.has(person.avatarUrl)) continue
        seenAvatars.add(person.avatarUrl)
        accepted.push(person)
      }
    } catch (error) {
      if (signal?.aborted) throw error
      apiUnavailable = true
      warnings.push(error instanceof Error ? error.message : '远程 API 请求失败')
      break
    }
  }

  const apiCount = accepted.length
  if (accepted.length < settings.count) {
    const missing = settings.count - accepted.length
    warnings.push(apiUnavailable
      ? `远程 API 不可用，已用 ${missing} 条本地模拟资料补齐。`
      : `达到年龄筛选或重复头像重试上限，已用 ${missing} 条本地模拟资料补齐。`)
    let mockAttempts = 0
    while (accepted.length < settings.count) {
      const mockPerson = createMockPerson(settings.gender, settings.minAge, settings.maxAge)
      mockAttempts += 1
      if (seenAvatars.has(mockPerson.avatarUrl)) {
        if (mockAttempts > 5_000) throw new Error('本地模拟头像去重超过安全上限，请缩小批量后重试。')
        continue
      }
      seenAvatars.add(mockPerson.avatarUrl)
      accepted.push(mockPerson)
    }
  }

  const usernames = new Set(existingUsernames)
  const profiles = accepted.map((person, index) => {
    const profile = enrichPerson(person, settings, usernames)
    onProgress?.(index + 1, settings.count, '正在增强头像并生成用户名、Bio 与密码…')
    return profile
  })
  return { profiles, apiCount, mockCount: settings.count - apiCount, warnings }
}
