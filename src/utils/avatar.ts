export function avatarExtension(url: string): 'jpg' | 'png' | 'webp' | 'svg' {
  if (url.startsWith('data:image/png')) return 'png'
  if (url.startsWith('data:image/webp')) return 'webp'
  if (url.startsWith('data:image/svg')) return 'png'
  const match = url.match(/\.(png|webp|svg)(?:\?|$)/i)
  const extension = match?.[1]?.toLowerCase()
  if (extension === 'svg') return 'png'
  return (extension as 'png' | 'webp' | undefined) ?? 'jpg'
}

export function avatarFilename(index: number, url: string): string {
  return `profile-${String(index + 1).padStart(3, '0')}.${avatarExtension(url)}`
}

export function makeInitialAvatar(firstName: string, lastName: string): string {
  const initials = `${firstName[0] ?? 'P'}${lastName[0] ?? 'G'}`.toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><metadata>${firstName} ${lastName}</metadata><rect width="512" height="512" rx="96" fill="#dceeea"/><circle cx="420" cy="88" r="80" fill="#f0ca6b"/><path d="M0 390C120 290 260 300 512 190V512H0Z" fill="#2d6d63"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="150" font-weight="700" fill="#143b36">${initials}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function hashAvatarSeed(value: string): number {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character] ?? character)
}

export function makeHdAvatar(firstName: string, lastName: string, gender: 'male' | 'female', seed: string): string {
  const hash = hashAvatarSeed(`${firstName}:${lastName}:${gender}:${seed}`)
  const pick = <T,>(values: T[], shift: number) => values[(hash >>> shift) % values.length]
  const skin = pick(['#f6d2b8', '#e7b98f', '#c98e68', '#9d6549', '#704533'], 0)
  const hair = pick(['#191816', '#3c281f', '#6d4632', '#a66b3f', '#d0a06a'], 3)
  const shirt = pick(['#1f6f78', '#315f8b', '#8c4e64', '#7b6338', '#4f6e56'], 6)
  const background = pick(['#dceeea', '#e8e1f3', '#f4dfbd', '#dce5f3', '#e7e8d8'], 9)
  const eye = pick(['#2f211c', '#3b3028', '#31404a', '#4b3827'], 12)
  const longHair = gender === 'female' ? (hash & 1) === 0 : (hash & 7) === 0
  const glasses = (hash & 16) !== 0
  const freckles = (hash & 32) !== 0
  const hairBack = longHair
    ? `<path d="M260 468c0-190 86-302 252-302s252 112 252 302v286H260Z" fill="${hair}"/>`
    : ''
  const hairFront = longHair
    ? `<path d="M302 410c8-160 92-238 210-238s202 78 210 238c-60-22-102-77-117-139-55 68-154 111-303 139Z" fill="${hair}"/>`
    : `<path d="M300 386c20-145 99-214 212-214 115 0 195 72 213 220-69-11-122-54-153-112-54 54-139 90-272 106Z" fill="${hair}"/>`
  const glassesSvg = glasses
    ? `<g fill="none" stroke="#263633" stroke-width="13"><rect x="342" y="424" width="128" height="84" rx="32"/><rect x="554" y="424" width="128" height="84" rx="32"/><path d="M470 456h84"/></g>`
    : ''
  const frecklesSvg = freckles
    ? '<g fill="#a96f56" opacity=".6"><circle cx="394" cy="524" r="7"/><circle cx="425" cy="535" r="6"/><circle cx="630" cy="524" r="7"/><circle cx="599" cy="535" r="6"/></g>'
    : ''
  const safeName = escapeXml(`${firstName} ${lastName}`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="${safeName} 的本地合成头像"><metadata>Synthetic vector avatar for ${safeName}; no real person depicted.</metadata><rect width="1024" height="1024" rx="160" fill="${background}"/><circle cx="820" cy="186" r="116" fill="#fff" opacity=".34"/>${hairBack}<path d="M150 1024c28-220 157-322 362-322s334 102 362 322Z" fill="${shirt}"/><path d="M423 653h178v152c-50 38-128 38-178 0Z" fill="${skin}"/><circle cx="314" cy="478" r="54" fill="${skin}"/><circle cx="710" cy="478" r="54" fill="${skin}"/><path d="M296 402c0-159 88-246 216-246s216 87 216 246v142c0 161-91 264-216 264S296 705 296 544Z" fill="${skin}"/>${hairFront}<g fill="none" stroke="#6e493d" stroke-width="13" stroke-linecap="round"><path d="M356 402q54-32 108 2"/><path d="M560 404q54-34 108-2"/></g><g fill="${eye}"><ellipse cx="413" cy="465" rx="15" ry="20"/><ellipse cx="611" cy="465" rx="15" ry="20"/></g><path d="M510 474c-8 54-17 90-4 104 13 10 31 8 45-1" fill="none" stroke="#b77e64" stroke-width="11" stroke-linecap="round"/>${frecklesSvg}<path d="M438 626q74 62 148 0" fill="none" stroke="#9b4d50" stroke-width="16" stroke-linecap="round"/>${glassesSvg}<path d="M371 804q141 98 282 0" fill="none" stroke="#fff" stroke-width="18" opacity=".75"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
