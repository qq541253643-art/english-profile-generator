import type { BasePerson, GenderFilter, RandomUserRecord } from '../types/profile'

const API_URL = 'https://randomuser.me/api/1.4/'
const INCLUDED_FIELDS = 'gender,name,dob,picture,nat'

export class ApiRequestError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export function isAgeInRange(age: number, minAge: number, maxAge: number): boolean {
  return Number.isInteger(age) && age >= minAge && age <= maxAge
}

export function parseRandomUser(record: RandomUserRecord): BasePerson | null {
  const gender = record.gender
  const firstName = record.name?.first
  const lastName = record.name?.last
  const age = record.dob?.age
  const avatarUrl = record.picture?.large
  if ((gender !== 'male' && gender !== 'female')
    || typeof firstName !== 'string' || !firstName.trim()
    || typeof lastName !== 'string' || !lastName.trim()
    || typeof age !== 'number' || !Number.isInteger(age)
    || typeof avatarUrl !== 'string' || !avatarUrl.startsWith('https://')) {
    return null
  }
  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    age,
    gender,
    avatarUrl,
    avatarSource: 'randomuser-placeholder',
    dataSource: 'api',
  }
}

interface FetchOptions {
  results: number
  gender: GenderFilter
  timeoutMs?: number
  signal?: AbortSignal
}

export async function fetchRandomUsers({ results, gender, timeoutMs = 12_000, signal }: FetchOptions): Promise<BasePerson[]> {
  const params = new URLSearchParams({
    nat: 'us',
    results: String(results),
    inc: INCLUDED_FIELDS,
  })
  if (gender !== 'random') params.set('gender', gender)
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(new DOMException('请求超时', 'TimeoutError')), timeoutMs)
  const abort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abort, { once: true })
  try {
    const response = await fetch(`${API_URL}?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new ApiRequestError(`API 返回 HTTP ${response.status}`)
    const payload = await response.json() as { results?: RandomUserRecord[]; error?: string }
    if (payload.error) throw new ApiRequestError(`API 报错：${payload.error}`)
    if (!Array.isArray(payload.results)) throw new ApiRequestError('API 返回缺少 results 数组')
    return payload.results.map(parseRandomUser).filter((item): item is BasePerson => item !== null)
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') throw new ApiRequestError('请求已取消或超时', error)
    throw new ApiRequestError('无法连接 Random User API', error)
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
