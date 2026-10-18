export function avatarExtension(_url: string): 'png' {
  return 'png'
}

export function avatarFilename(index: number, url: string): string {
  return `profile-${String(index + 1).padStart(3, '0')}.${avatarExtension(url)}`
}

export function makeInitialAvatar(firstName: string, lastName: string): string {
  const initials = `${firstName[0] ?? 'P'}${lastName[0] ?? 'G'}`.toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><metadata>${firstName} ${lastName}</metadata><rect width="512" height="512" rx="96" fill="#dceeea"/><circle cx="420" cy="88" r="80" fill="#f0ca6b"/><path d="M0 390C120 290 260 300 512 190V512H0Z" fill="#2d6d63"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="150" font-weight="700" fill="#143b36">${initials}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
