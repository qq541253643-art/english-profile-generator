import type { BasePerson, Gender } from '../types/profile'

const INDEX_URL = '/__synthetic-people'
const INDEX_TIMEOUT_MS = 20_000

type RawPerson = [string, string, string, string, Gender, number, string]
type IndexResponse = { people?: unknown }

let catalogPromise: Promise<RawPerson[]> | null = null

function isRawPerson(value: unknown): value is RawPerson {
  return Array.isArray(value)
    && typeof value[0] === 'string'
    && (value[4] === 'female' || value[4] === 'male')
    && Number.isInteger(value[5])
}

async function loadCatalog(): Promise<RawPerson[]> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), INDEX_TIMEOUT_MS)
      try {
        const response = await fetch(INDEX_URL, { signal: controller.signal, cache: 'force-cache' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json() as IndexResponse
        if (!Array.isArray(payload.people)) throw new Error('合成人像目录格式错误')
        const people = payload.people.filter(isRawPerson)
        if (people.length < 300) throw new Error('合成人像目录数量不足')
        return people
      } finally {
        window.clearTimeout(timeout)
      }
    })().catch((error) => {
      catalogPromise = null
      throw error
    })
  }
  return catalogPromise
}

function randomIndex(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  const range = 0x1_0000_0000 - (0x1_0000_0000 % maxExclusive)
  const value = new Uint32Array(1)
  do crypto.getRandomValues(value); while (value[0] >= range)
  return value[0] % maxExclusive
}

function shuffle<T>(items: T[]): T[] {
  const output = [...items]
  for (let index = output.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1)
    ;[output[index], output[other]] = [output[other], output[index]]
  }
  return output
}

export async function assignSyntheticAvatars(people: BasePerson[]): Promise<number> {
  const catalog = await loadCatalog()
  const available = shuffle(catalog.filter((item) => item[5] >= 18 && item[5] <= 45))
  const used = new Set<string>()
  let assigned = 0

  for (const person of people) {
    let matchIndex = available.findIndex((item) => !used.has(item[0]) && item[4] === person.gender && item[5] === person.age)
    if (matchIndex < 0) matchIndex = available.findIndex((item) => !used.has(item[0]) && item[4] === person.gender)
    if (matchIndex < 0) continue
    const [id] = available[matchIndex]
    used.add(id)
    person.avatarUrl = `/__synthetic-avatar?id=${encodeURIComponent(id)}`
    person.avatarSource = 'sigils-synthetic'
    assigned += 1
  }
  return assigned
}

export const SYNTHETIC_AVATAR_CREDIT = 'Portraits by Ariel Bravo Ayala — sigils-people — CC BY 4.0'
export const SYNTHETIC_AVATAR_LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
