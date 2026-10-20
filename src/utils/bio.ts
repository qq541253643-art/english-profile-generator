import { lifestyleBioClosers, lifestyleBioOpeners, newsBioAngles, newsBioLeads, newsBioTopics } from '../data/bios'
import { interests } from '../data/lexicon'
import type { BioStyle } from '../types/profile'
import { randomInt } from './random'

export interface GeneratedBio {
  bio: string
  bioZh: string
  interests: string[]
}

function lifestyleCandidates(): GeneratedBio[] {
  return lifestyleBioOpeners.flatMap((opener) => interests.flatMap((interest) => lifestyleBioClosers.map((closer) => ({
    bio: `${opener.en} Making time for ${interest.label}. ${closer.en}`,
    bioZh: `${opener.zh} 也会为${interest.zh}留出时间。${closer.zh}`,
    interests: [interest.key],
  }))))
}

function newsCandidates(): GeneratedBio[] {
  return newsBioLeads.flatMap((lead) => newsBioTopics.flatMap((topic) => newsBioAngles.map((angle) => ({
    bio: `${lead.en} ${topic.en} ${angle.en}`,
    bioZh: `${lead.zh}${topic.zh}${angle.zh}`,
    interests: [topic.key],
  }))))
}

const NEWS_BIO_CANDIDATES = newsCandidates()
const LIFESTYLE_BIO_CANDIDATES = lifestyleCandidates()

function candidates(style: BioStyle): GeneratedBio[] {
  if (style === 'news') return NEWS_BIO_CANDIDATES
  if (style === 'lifestyle') return LIFESTYLE_BIO_CANDIDATES
  return [...NEWS_BIO_CANDIDATES, ...LIFESTYLE_BIO_CANDIDATES]
}

function bioKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function generateUniqueBio(
  _firstName: string,
  existingBios = new Set<string>(),
  existingChineseBios = new Set<string>(),
  style: BioStyle = 'news',
): GeneratedBio {
  const available = candidates(style)
  const start = randomInt(available.length)
  for (let offset = 0; offset < available.length; offset += 1) {
    const candidate = available[(start + offset) % available.length]
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

export function generateBio(firstName: string, style: BioStyle = 'news'): GeneratedBio {
  return generateUniqueBio(firstName, new Set<string>(), new Set<string>(), style)
}
