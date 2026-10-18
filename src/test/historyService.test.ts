import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('服务器历史同步', () => {
  it('把 30 天重复冲突转换为可自动换新的专用错误', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ profilePersistence: 'server' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: '姓名、头像或 Bio 在最近 30 天内已经使用，请重新生成。',
        code: 'UNIQUENESS_CONFLICT',
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)

    const history = await import('../services/historyService')
    await expect(history.saveProfiles([])).rejects.toBeInstanceOf(history.ProfileUniquenessConflictError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
