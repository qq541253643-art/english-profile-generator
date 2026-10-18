import { describe, expect, it, vi } from 'vitest'
import { generateBio, generateUniqueBio } from '../utils/bio'
import { generateStrongPassword, hasStrongPasswordComplexity } from '../utils/password'
import { generateUuid } from '../utils/uuid'

describe('Bio 生成', () => {
  it('生成完整的中英文对照且具有句式多样性', () => {
    const bios = Array.from({ length: 40 }, () => generateBio('Mia'))
    expect(bios.every((item) => item.bio.length > 20 && item.bioZh.length > 10)).toBe(true)
    expect(new Set(bios.map((item) => item.bio)).size).toBeGreaterThan(3)
  })

  it('至少可生成 500 组互不重复的中英文 Bio', () => {
    const english = new Set<string>()
    const chinese = new Set<string>()
    const bios = Array.from({ length: 500 }, () => generateUniqueBio('Mia', english, chinese))
    expect(new Set(bios.map((item) => item.bio)).size).toBe(500)
    expect(new Set(bios.map((item) => item.bioZh)).size).toBe(500)
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

describe('UUID', () => {
  it('使用 Web Crypto 生成合法 UUID', () => {
    expect(generateUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('在非 HTTPS 浏览器没有 randomUUID 时仍使用安全随机数生成', () => {
    const browserCrypto = globalThis.crypto
    vi.stubGlobal('crypto', {
      getRandomValues: browserCrypto.getRandomValues.bind(browserCrypto),
    })
    try {
      expect(generateUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
