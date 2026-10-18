import { describe, expect, it } from 'vitest'
import { generateBio } from '../utils/bio'
import { generateStrongPassword, hasStrongPasswordComplexity } from '../utils/password'

describe('Bio 生成', () => {
  it('生成完整的中英文对照且具有句式多样性', () => {
    const bios = Array.from({ length: 40 }, () => generateBio('Mia'))
    expect(bios.every((item) => item.bio.length > 20 && item.bioZh.length > 10)).toBe(true)
    expect(new Set(bios.map((item) => item.bio)).size).toBeGreaterThan(3)
  })
})

describe('强密码', () => {
  it('默认 20 位并覆盖大写、小写、数字和特殊字符', () => {
    const passwords = Array.from({ length: 40 }, () => generateStrongPassword())
    expect(passwords.every((password) => password.length === 20 && hasStrongPasswordComplexity(password))).toBe(true)
    expect(new Set(passwords).size).toBe(40)
  })

  it('拒绝过短密码', () => {
    expect(() => generateStrongPassword(8)).toThrow('不得少于 12 位')
  })
})
