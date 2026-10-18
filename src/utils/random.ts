export function randomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('maxExclusive 必须是正整数')
  }
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive
  const buffer = new Uint32Array(1)
  do {
    crypto.getRandomValues(buffer)
  } while (buffer[0] >= limit)
  return buffer[0] % maxExclusive
}

export function pick<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error('不能从空数组中选取')
  return items[randomInt(items.length)]
}

export function secureShuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}
