import type { Profile } from '../types/profile'
import { avatarFilename } from '../utils/avatar'

export type ExportRow = Record<string, string | number>

export function buildExportRows(profiles: Profile[], includePasswords: boolean): ExportRow[] {
  return profiles.map((profile, index) => {
    const row: ExportRow = {
      '序号': index + 1,
      '显示姓名': profile.displayName,
      '用户名': profile.username,
      '年龄': profile.age,
      '性别': profile.gender === 'male' ? '男' : '女',
      '英文 Bio': profile.bio,
      '中文翻译': profile.bioZh,
      '头像文件名': avatarFilename(index, profile.avatarUrl),
    }
    if (includePasswords) row['明文密码'] = profile.password
    return row
  })
}

export type ExcelCell = string | number | { value: string | number; fontWeight?: 'bold'; backgroundColor?: string }

export function buildExcelSheetData(profiles: Profile[], includePasswords: boolean): ExcelCell[][] {
  const rows = buildExportRows(profiles, includePasswords)
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  return [
    headers.map((value) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#E6EBE6' })),
    ...rows.map((row) => headers.map((header) => row[header])),
  ]
}

export async function createWorkbookBlob(profiles: Profile[], includePasswords: boolean): Promise<Blob> {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const widths = [8, 22, 26, 8, 8, 54, 54, 24, ...(includePasswords ? [28] : [])]
  return writeExcelFile(buildExcelSheetData(profiles, includePasswords), {
    columns: widths.map((width) => ({ width })),
  }).toBlob()
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function createCsv(profiles: Profile[], includePasswords: boolean): string {
  const rows = buildExportRows(profiles, includePasswords)
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return `\uFEFF${[headers.join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))].join('\r\n')}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export async function exportExcel(profiles: Profile[], includePasswords: boolean): Promise<void> {
  downloadBlob(await createWorkbookBlob(profiles, includePasswords), 'english-profiles.xlsx')
}

export function exportCsv(profiles: Profile[], includePasswords: boolean): void {
  downloadBlob(new Blob([createCsv(profiles, includePasswords)], { type: 'text/csv;charset=utf-8' }), 'english-profiles.csv')
}
