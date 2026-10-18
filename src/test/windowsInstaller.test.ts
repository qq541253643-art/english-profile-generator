/* @vitest-environment node */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

describe('Windows 一键安装与自动更新契约', () => {
  it('安装器版本与应用版本一致，并校验 Release 包', async () => {
    const [packageText, installer] = await Promise.all([
      readFile(resolve(projectRoot, 'package.json'), 'utf8'),
      readFile(resolve(projectRoot, 'install.ps1'), 'utf8'),
    ])
    const packageVersion = (JSON.parse(packageText) as { version: string }).version
    expect(installer).toContain(`$appVersion = '${packageVersion}'`)
    expect(installer).toContain('Get-FileHash -Algorithm SHA256')
    expect(installer).toContain('-EncodedCommand $encodedCommand')
  })

  it('快捷方式启动器先检查最新正式 Release，失败时保留本地版本', async () => {
    const launcher = await readFile(resolve(projectRoot, 'windows', 'launcher.ps1'), 'utf8')
    expect(launcher).toContain('/releases/latest')
    expect(launcher).toContain('Update-AppIfNeeded')
    expect(launcher).toContain('return $false')
    expect(launcher).toContain('update-status.txt')
    expect(launcher).toContain('New-Object Text.UTF8Encoding($true)')
  })
})
