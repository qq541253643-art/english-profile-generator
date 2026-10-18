const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatCreatedAt(value: string): string {
  const instant = new Date(value)
  if (!Number.isFinite(instant.getTime())) return '时间未知'
  const beijing = new Date(instant.getTime() + BEIJING_OFFSET_MS)
  return `${beijing.getUTCFullYear()}年${beijing.getUTCMonth() + 1}月${beijing.getUTCDate()}日 ${twoDigits(beijing.getUTCHours())}:${twoDigits(beijing.getUTCMinutes())}`
}
