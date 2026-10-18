/* @vitest-environment node */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

describe('服务器空间清理契约', () => {
  it('更新器加锁、自更新，并只保留当前版和一个回退版', async () => {
    const updater = await readFile(resolve(projectRoot, 'deploy/server/update.sh'), 'utf8')
    expect(updater).toContain('flock -n 9')
    expect(updater).toContain('previous_kept=0')
    expect(updater).toContain('cleanup_storage')
    expect(updater).toContain('/usr/local/sbin/english-profile-generator-update')
    expect(updater).toContain('rm -rf "$APP_ROOT/cache/npm"')
    const currentVersionCheck = updater.indexOf('if [[ "$current_tag"')
    expect(currentVersionCheck).toBeGreaterThan(-1)
    expect(updater.indexOf('disable_legacy_avatar_enhancement')).toBeLessThan(currentVersionCheck)
    expect(updater.indexOf('configure_profile_store')).toBeLessThan(currentVersionCheck)
    expect(updater).toContain('EPG_PROFILE_STORE_DIR')
  })
})
