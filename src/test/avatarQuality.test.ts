import { describe, expect, it } from 'vitest'
import { avatarExtension, makeHdAvatar } from '../utils/avatar'

describe('高清本地合成头像', () => {
  it('生成可缩放的 1024 方形 SVG，且不引用远程照片', () => {
    const avatar = makeHdAvatar('Avery', 'Miller', 'female', 'profile-1')
    const decoded = decodeURIComponent(avatar)
    expect(avatar).toMatch(/^data:image\/svg\+xml/)
    expect(decoded).toContain('width="1024" height="1024"')
    expect(decoded).toContain('no real person depicted')
    expect(decoded).not.toContain('http://randomuser.me')
    expect(decoded).not.toContain('https://randomuser.me')
    expect(avatarExtension(avatar)).toBe('png')
  })

  it('不同资料种子生成不同头像', () => {
    expect(makeHdAvatar('Avery', 'Miller', 'female', 'profile-1'))
      .not.toBe(makeHdAvatar('Avery', 'Miller', 'female', 'profile-2'))
  })
})
