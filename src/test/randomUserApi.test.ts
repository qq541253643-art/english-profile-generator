import { describe, expect, it } from 'vitest'
import { isAgeInRange, parseRandomUser } from '../services/randomUserApi'

describe('Random User API 解析', () => {
  it('解析需要的字段并忽略其他身份字段', () => {
    const parsed = parseRandomUser({
      gender: 'female',
      name: { first: 'Avery', last: 'Miller' },
      dob: { age: 28 },
      picture: { large: 'https://randomuser.me/api/portraits/women/1.jpg' },
      nat: 'US',
    })
    expect(parsed).toMatchObject({ firstName: 'Avery', lastName: 'Miller', age: 28, gender: 'female', dataSource: 'api' })
  })

  it('对字段缺失、非 HTTPS 头像或非法性别容错', () => {
    expect(parseRandomUser({ name: { first: 'A', last: 'B' } })).toBeNull()
    expect(parseRandomUser({ gender: 'unknown', name: { first: 'A', last: 'B' }, dob: { age: 20 }, picture: { large: 'https://example.com/a.jpg' } })).toBeNull()
    expect(parseRandomUser({ gender: 'male', name: { first: 'A', last: 'B' }, dob: { age: 20 }, picture: { large: 'http://example.com/a.jpg' } })).toBeNull()
  })
})

describe('年龄范围', () => {
  it('包含边界并排除越界和小数', () => {
    expect(isAgeInRange(18, 18, 45)).toBe(true)
    expect(isAgeInRange(45, 18, 45)).toBe(true)
    expect(isAgeInRange(17, 18, 45)).toBe(false)
    expect(isAgeInRange(46, 18, 45)).toBe(false)
    expect(isAgeInRange(20.5, 18, 45)).toBe(false)
  })
})
