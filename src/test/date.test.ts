import { describe, expect, it } from 'vitest'
import { formatCreatedAt } from '../utils/date'

describe('资料生成时间', () => {
  it('统一按北京时间显示到分钟', () => {
    expect(formatCreatedAt('2026-10-18T06:52:03.000Z')).toBe('2026年10月18日 14:52')
    expect(formatCreatedAt('2026-01-01T16:05:00.000Z')).toBe('2026年1月2日 00:05')
  })

  it('损坏的历史时间不会让资料卡崩溃', () => {
    expect(formatCreatedAt('invalid')).toBe('时间未知')
  })
})
