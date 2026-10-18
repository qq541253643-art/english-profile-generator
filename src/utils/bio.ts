import { bioTemplates } from '../data/bios'
import { interests } from '../data/lexicon'
import { pick } from './random'

export interface GeneratedBio {
  bio: string
  bioZh: string
  interests: string[]
}

export function generateBio(firstName: string): GeneratedBio {
  const interest = pick(interests)
  const template = pick(bioTemplates)
  return {
    bio: template.en(firstName, interest.label),
    bioZh: template.zh(firstName, interest.zh),
    interests: [interest.key],
  }
}
