import { bioClosers, bioOpeners } from '../data/bios'
import { interests } from '../data/lexicon'
import { randomInt } from './random'

export interface GeneratedBio {
  bio: string
  bioZh: string
  interests: string[]
}

function candidates(): GeneratedBio[] {
  return bioOpeners.flatMap((opener) => interests.flatMap((interest) => bioClosers.map((closer) => ({
    bio: `${opener.en} Making time for ${interest.label}. ${closer.en}`,
    bioZh: `${opener.zh} 也会为${interest.zh}留出时间。${closer.zh}`,
    interests: [interest.key],
  }))))
}

const BIO_CANDIDATES = candidates()

function bioKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function generateUniqueBio(
  _firstName: string,
  existingBios = new Set<string>(),
  existingChineseBios = new Set<string>(),
): GeneratedBio {
  const start = randomInt(BIO_CANDIDATES.length)
  for (let offset = 0; offset < BIO_CANDIDATES.length; offset += 1) {
    const candidate = BIO_CANDIDATES[(start + offset) % BIO_CANDIDATES.length]
    const englishKey = bioKey(candidate.bio)
    const chineseKey = bioKey(candidate.bioZh)
    if (!existingBios.has(englishKey) && !existingChineseBios.has(chineseKey)) {
      existingBios.add(englishKey)
      existingChineseBios.add(chineseKey)
      return candidate
    }
  }
  throw new Error('30 天内可用的 Bio 组合已用完，请稍后再试。')
}

export function generateBio(firstName: string): GeneratedBio {
  return generateUniqueBio(firstName)
}
