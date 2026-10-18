import { pick, secureShuffle } from './random'

const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SPECIAL = '!@#$%^&*_-+=?'
const ALL = LOWER + UPPER + DIGITS + SPECIAL

export function generateStrongPassword(length = 20): string {
  if (length < 12) throw new Error('密码长度不得少于 12 位')
  const required = [pick([...LOWER]), pick([...UPPER]), pick([...DIGITS]), pick([...SPECIAL])]
  const remaining = Array.from({ length: length - required.length }, () => pick([...ALL]))
  return secureShuffle([...required, ...remaining]).join('')
}

export function hasStrongPasswordComplexity(password: string): boolean {
  return password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
}
