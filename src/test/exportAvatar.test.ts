import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { buildExcelSheetData, buildExportRows, createCsv } from '../services/exportService'
import type { Profile } from '../types/profile'
import { avatarFilename } from '../utils/avatar'
import { avatarFetchUrl } from '../services/avatarService'

const profiles: Profile[] = [
  {
    id: '1', firstName: 'Avery', lastName: 'Miller', displayName: 'Avery Miller', username: 'avery.miller', age: 28,
    gender: 'female', bio: 'Books, coffee, and slow weekends.', bioZh: '喜欢阅读、咖啡和悠闲的周末。', password: 'Aa2!abcdefghijklmno',
    interests: ['books'], avatarUrl: 'https://example.com/avatar.jpg', avatarSource: 'randomuser-placeholder', dataSource: 'api', createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '2', firstName: 'Noah', lastName: 'Clark', displayName: 'Noah Clark', username: 'noahclark', age: 31,
    gender: 'male', bio: 'Documenting everyday life.', bioZh: '记录日常生活。', password: 'Bb3@abcdefghijklmno',
    interests: ['photo'], avatarUrl: 'data:image/png;base64,AAAA', avatarSource: 'local-hd-avatar', dataSource: 'mock', createdAt: '2026-01-02T00:00:00.000Z',
  },
]

describe('头像文件名映射', () => {
  it('按表格序号生成稳定的增强 PNG 文件名', () => {
    expect(avatarFilename(0, profiles[0].avatarUrl)).toBe('profile-001.png')
    expect(avatarFilename(1, profiles[1].avatarUrl)).toBe('profile-002.png')
  })

  it('远程 Random User 头像通过同源白名单代理下载', () => {
    const url = 'https://randomuser.me/api/portraits/women/80.jpg'
    expect(avatarFetchUrl(url)).toBe(`/__avatar?url=${encodeURIComponent(url)}`)
    expect(avatarFetchUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA')
    expect(avatarFetchUrl('https://example.com/avatar.jpg')).toBe('https://example.com/avatar.jpg')
  })

  it('合成人像使用带版本的兼容地址，绕过旧 Safari 已缓存的 AVIF', () => {
    expect(avatarFetchUrl('/__synthetic-avatar?id=us-01')).toBe('/__synthetic-avatar?id=us-01&format=jpeg-v1')
    expect(avatarFetchUrl('/__synthetic-avatar?id=us-01&format=jpeg-v1')).toBe('/__synthetic-avatar?id=us-01&format=jpeg-v1')
  })
})

describe('Excel / CSV 导出', () => {
  it('默认不导出密码，且头像文件名与序号一致', () => {
    const rows = buildExportRows(profiles, false)
    expect(rows[0]['明文密码']).toBeUndefined()
    expect(rows.map((row) => row['头像文件名'])).toEqual(['profile-001.png', 'profile-002.png'])
    expect(createCsv(profiles, false)).not.toContain('明文密码')
  })

  it('用户明确启用时 Excel 包含明文密码列', async () => {
    const { default: writeExcelFile } = await import('write-excel-file/node')
    const data = buildExcelSheetData(profiles, true)
    const buffer = await writeExcelFile(data).toBuffer()
    const zip = await JSZip.loadAsync(buffer)
    const worksheetXml = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    expect(data).toHaveLength(3)
    expect(data[0]).toHaveLength(9)
    expect(data[1][8]).toBe(profiles[0].password)
    expect(data[2][7]).toBe('profile-002.png')
    expect(worksheetXml).toContain('<worksheet')
  })
})
