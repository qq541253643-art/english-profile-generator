import type { BasePerson, GenerationResult, GeneratorSettings, GenerationUniqueness, Profile, ProgressCallback } from '../types/profile'
import { generateUniqueBio } from '../utils/bio'
import { makeInitialAvatar } from '../utils/avatar'
import { generateStrongPassword } from '../utils/password'
import { generateUniqueUsername } from '../utils/username'
import { generateUuid } from '../utils/uuid'
import { createMockPerson } from './mockData'
import { fetchRandomUsers, isAgeInRange } from './randomUserApi'
import { assignSyntheticAvatars } from './syntheticAvatarService'

const MAX_API_ROUNDS = 4

function uniquenessKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function enrichPerson(
  person: BasePerson,
  settings: GeneratorSettings,
  usernames: Set<string>,
  bios: Set<string>,
  chineseBios: Set<string>,
): Profile {
  const generatedBio = generateUniqueBio(person.firstName, bios, chineseBios)
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
    id: generateUuid(),
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
  uniqueness?: GenerationUniqueness,
): Promise<GenerationResult> {
  const accepted: BasePerson[] = []
  const seenAvatars = new Set<string>()
  const seenNames = new Set(uniqueness?.displayNameKeys || [])
  const warnings: string[] = []
  let apiUnavailable = false

  for (let round = 0; round < MAX_API_ROUNDS && accepted.length < settings.count; round += 1) {
    const remaining = settings.count - accepted.length
    onProgress?.(accepted.length, settings.count, round === 0 ? '正在请求远程资料…' : `筛选年龄区间（第 ${round + 1} 轮）…`)
    try {
      const requestCount = Math.min(500, Math.max(remaining, remaining * 3))
      const batch = await fetchRandomUsers({ results: requestCount, gender: settings.gender, signal })
      for (const person of batch) {
        if (accepted.length >= settings.count) break
        if (!isAgeInRange(person.age, settings.minAge, settings.maxAge)) continue
        if (seenAvatars.has(person.avatarUrl)) continue
        const nameKey = uniquenessKey(`${person.firstName} ${person.lastName}`)
        if (seenNames.has(nameKey)) continue
        seenAvatars.add(person.avatarUrl)
        seenNames.add(nameKey)
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
      const nameKey = uniquenessKey(`${mockPerson.firstName} ${mockPerson.lastName}`)
      if (seenAvatars.has(mockPerson.avatarUrl) || seenNames.has(nameKey)) {
        if (mockAttempts > 5_000) throw new Error('当前条件下可用的未重复姓名不足，请稍后重试。')
        continue
      }
      seenAvatars.add(mockPerson.avatarUrl)
      seenNames.add(nameKey)
      accepted.push(mockPerson)
    }
  }

  onProgress?.(0, settings.count, '正在匹配高清 512px 合成人像…')
  try {
    const assigned = await assignSyntheticAvatars(accepted, new Set(uniqueness?.avatarIds || []))
    if (assigned < accepted.length) warnings.push(`${accepted.length - assigned} 条资料未匹配到合适的合成人像，已使用本地占位图。`)
  } catch {
    for (const person of accepted) {
      person.avatarUrl = makeInitialAvatar(person.firstName, person.lastName)
      person.avatarSource = 'local-placeholder'
    }
    warnings.push('高清合成人像服务暂时不可用，已明确切换为本地占位图。')
  }

  const usernames = new Set([...existingUsernames, ...(uniqueness?.usernameKeys || [])])
  const bios = new Set(uniqueness?.bioKeys || [])
  const chineseBios = new Set(uniqueness?.bioZhKeys || [])
  const profiles = accepted.map((person, index) => {
    const profile = enrichPerson(person, settings, usernames, bios, chineseBios)
    onProgress?.(index + 1, settings.count, '正在生成用户名、Bio 与密码…')
    return profile
  })
  return { profiles, apiCount, mockCount: settings.count - apiCount, warnings }
}
