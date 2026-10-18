import { interests, lifestyleWords, nicknames } from '../data/lexicon'
import type { Gender, PlatformRules, UsernameStyle } from '../types/profile'
import { pick, randomInt } from './random'

export const DEFAULT_PLATFORM_RULES: PlatformRules = {
  minLength: 2,
  maxLength: 24,
  allowDot: true,
  allowUnderscore: true,
}

function normalizePart(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function validateUsername(username: string, rules: PlatformRules = DEFAULT_PLATFORM_RULES): string[] {
  const errors: string[] = []
  if (username.length < rules.minLength || username.length > rules.maxLength) {
    errors.push(`长度需为 ${rules.minLength}-${rules.maxLength} 个字符`)
  }
  const allowed = `a-zA-Z0-9${rules.allowUnderscore ? '_' : ''}${rules.allowDot ? '\\.' : ''}`
  if (!new RegExp(`^[${allowed}]+$`).test(username)) errors.push('包含平台规则不允许的字符')
  if (username.startsWith('.') || username.endsWith('.')) errors.push('不能以句点开头或结尾')
  if (/\.\./.test(username)) errors.push('不能包含连续句点')
  return errors
}

export interface UsernameInput {
  firstName: string
  lastName: string
  gender: Gender
  style: UsernameStyle
  allowNumbers: boolean
  rules: PlatformRules
}

function candidates(input: UsernameInput): string[] {
  const first = normalizePart(input.firstName)
  const last = normalizePart(input.lastName)
  const nickname = pick(nicknames[input.gender])
  const interest = pick(interests).username[randomInt(3)]
  const life = pick(lifestyleWords)
  const suffix = input.allowNumbers ? String(10 + randomInt(90)) : ''
  const byStyle: Record<UsernameStyle, string[]> = {
    real: [`${first}.${last}`, `${first}${last}`, `${first}_${last}`, `its${first}`, `hey${first}`],
    lifestyle: [`${nickname}${life}`, `${first}${life}`, `${life}.${first}`, `${nickname}_${life}`, `hey${nickname}`],
    interest: [`${first}${interest}`, `${nickname}.${interest}`, `${interest}with${first}`, `${first}_${interest}`, `its${first}${interest}`],
    mixed: [`${first}.${last}`, `${first}${interest}`, `its${first}`, `${nickname}${life}`, `${first}_${last}`],
  }
  const selected = byStyle[input.style]
  return [...selected, ...selected.map((value) => `${value}${suffix}`)]
}

function fitToRules(value: string, rules: PlatformRules): string {
  let result = value
  if (!rules.allowDot) result = result.replaceAll('.', '')
  if (!rules.allowUnderscore) result = result.replaceAll('_', '')
  result = result.replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '')
  return result.slice(0, rules.maxLength).replace(/\.$/, '')
}

export function generateUniqueUsername(input: UsernameInput, existing: Set<string>): string {
  const pool = candidates(input)
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const base = fitToRules(pool[attempt % pool.length], input.rules)
    const suffix = attempt < pool.length ? '' : String(2 + Math.floor(attempt / pool.length))
    const candidate = fitToRules(`${base}${suffix}`, input.rules)
    if (!existing.has(candidate) && validateUsername(candidate, input.rules).length === 0) {
      existing.add(candidate)
      return candidate
    }
  }
  throw new Error('无法在当前平台规则下生成唯一用户名')
}
