import { describe, expect, it } from 'vitest'
import { applyHistoryRetention, HISTORY_MAX_PROFILES } from '../services/historyDb'

function profile(id: string, createdAt: string, payload = '') {
  return { id, createdAt, payload }
}

describe('本地历史自动清理', () => {
  const now = Date.parse('2026-10-18T00:00:00.000Z')

  it('删除超过 90 天的记录并保留新记录', () => {
    const result = applyHistoryRetention([
      profile('recent', '2026-10-17T00:00:00.000Z'),
      profile('expired', '2026-07-01T00:00:00.000Z'),
    ], now)
    expect(result.kept.map((item) => item.id)).toEqual(['recent'])
    expect(result.removedIds).toEqual(['expired'])
  })

  it('只保留最新 500 条', () => {
    const profiles = Array.from({ length: HISTORY_MAX_PROFILES + 2 }, (_, index) => (
      profile(String(index), new Date(now - index * 1_000).toISOString())
    ))
    const result = applyHistoryRetention(profiles, now)
    expect(result.kept).toHaveLength(HISTORY_MAX_PROFILES)
    expect(result.removedIds).toEqual(['500', '501'])
  })

  it('达到空间预算后优先保留较新的记录', () => {
    const result = applyHistoryRetention([
      profile('new', '2026-10-18T00:00:00.000Z', 'x'.repeat(100)),
      profile('old', '2026-10-17T00:00:00.000Z', 'x'.repeat(100)),
    ], now, 500, 180)
    expect(result.kept.map((item) => item.id)).toEqual(['new'])
    expect(result.removedIds).toEqual(['old'])
  })
})
