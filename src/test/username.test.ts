import { describe, expect, it } from 'vitest'
import { DEFAULT_PLATFORM_RULES, generateUniqueUsername, validateUsername } from '../utils/username'

describe('用户名规则', () => {
  it('验证字符、长度和句点位置', () => {
    expect(validateUsername('avery.miller')).toEqual([])
    expect(validateUsername('.avery')).toContain('不能以句点开头或结尾')
    expect(validateUsername('avery..miller')).toContain('不能包含连续句点')
    expect(validateUsername('a'.repeat(25))).toContain('长度需为 2-24 个字符')
    expect(validateUsername('avery-miller')).toContain('包含平台规则不允许的字符')
  })

  it('批量生成时保证唯一且全部合法', () => {
    const existing = new Set<string>()
    for (let index = 0; index < 80; index += 1) {
      const username = generateUniqueUsername({ firstName: 'Avery', lastName: 'Miller', gender: 'female', style: 'mixed', allowNumbers: true, rules: DEFAULT_PLATFORM_RULES }, existing)
      expect(validateUsername(username)).toEqual([])
    }
    expect(existing.size).toBe(80)
  })

  it('遵循禁用句点和下划线的可配置规则', () => {
    const rules = { minLength: 2, maxLength: 20, allowDot: false, allowUnderscore: false }
    const username = generateUniqueUsername({ firstName: 'Mia', lastName: 'Clark', gender: 'female', style: 'real', allowNumbers: false, rules }, new Set())
    expect(username).not.toMatch(/[._]/)
    expect(validateUsername(username, rules)).toEqual([])
  })
})
