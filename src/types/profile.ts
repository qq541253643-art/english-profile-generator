export type Gender = 'male' | 'female'
export type GenderFilter = 'random' | Gender
export type UsernameStyle = 'real' | 'lifestyle' | 'interest' | 'mixed'
export type BioStyle = 'news' | 'lifestyle' | 'mixed'
export type DataSource = 'api' | 'mock'
export type AvatarSource = 'project-synthetic' | 'sigils-synthetic' | 'randomuser-placeholder' | 'local-hd-avatar' | 'local-placeholder'

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
  bioStyle: BioStyle
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
  /** 服务器公开共享列表中，当前浏览器是否有权删除该条。 */
  canDelete?: boolean
  /** 仅当前页面会话使用的已增强图片 URL，不写入历史记录。 */
  avatarPreviewUrl?: string
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

export interface GenerationUniqueness {
  windowDays: number
  displayNameKeys: string[]
  usernameKeys: string[]
  bioKeys: string[]
  bioZhKeys: string[]
  avatarIds: string[]
}

export type ProgressCallback = (completed: number, total: number, message: string) => void
