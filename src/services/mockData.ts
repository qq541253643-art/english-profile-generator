import { firstNames, lastNames } from '../data/lexicon'
import type { BasePerson, GenderFilter } from '../types/profile'
import { makeInitialAvatar } from '../utils/avatar'
import { pick, randomInt } from '../utils/random'

export function createMockPerson(genderFilter: GenderFilter, minAge: number, maxAge: number): BasePerson {
  const gender = genderFilter === 'random' ? (randomInt(2) === 0 ? 'female' : 'male') : genderFilter
  const firstName = pick(firstNames[gender])
  const lastName = pick(lastNames)
  return {
    firstName,
    lastName,
    age: minAge + randomInt(maxAge - minAge + 1),
    gender,
    avatarUrl: makeInitialAvatar(firstName, lastName),
    avatarSource: 'local-placeholder',
    dataSource: 'mock',
  }
}
