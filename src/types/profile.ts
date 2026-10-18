export type Gender = 'male' | 'female'
export type GenderFilter = 'random' | Gender
export type UsernameStyle = 'real' | 'lifestyle' | 'interest' | 'mixed'
export type DataSource = 'api' | 'mock'
export type AvatarSource = 'randomuser-placeholder' | 'authorized-upload' | 'local-placeholder'

export interface PlatformRules {
  minLength: number
  maxLength: number
  allowDot: boolean
  allowUnderscore: boolean
}

export interface GeneratorSettings {
  count: 1 | 10 | 100 | 300
  gender: GenderFilter
  minAge: number
  maxAge: number
  style: UsernameStyle
  allowNumbers: boolean
  platformRules: PlatformRules
}

export interface BasePerson {
  firstName: string
  lastName: string
  age: number
  gender: Gender
  avatarUrl: string
  avatarSource: AvatarSource
  dataSource: DataSource
}

export interface Profile extends BasePerson {
  id: string
  displayName: string
  username: string
  bio: string
  bioZh: string
  password: string
  interests: string[]
  createdAt: string
}

export interface RandomUserRecord {
  gender?: unknown
  name?: { first?: unknown; last?: unknown }
  dob?: { age?: unknown }
  picture?: { large?: unknown }
  nat?: unknown
}

export interface GenerationResult {
  profiles: Profile[]
  apiCount: number
  mockCount: number
  warnings: string[]
}

export type ProgressCallback = (completed: number, total: number, message: string) => void
