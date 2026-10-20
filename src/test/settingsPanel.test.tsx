import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from '../components/SettingsPanel'
import type { GeneratorSettings } from '../types/profile'
import { DEFAULT_PLATFORM_RULES } from '../utils/username'

const settings: GeneratorSettings = {
  count: 10,
  gender: 'random',
  minAge: 18,
  maxAge: 45,
  style: 'mixed',
  bioStyle: 'news',
  allowNumbers: true,
  platformRules: DEFAULT_PLATFORM_RULES,
}

describe('生成设置', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('新闻解说为默认账号方向，并允许切换到生活分享', () => {
    const onChange = vi.fn()
    render(<SettingsPanel settings={settings} disabled={false} hasProfiles={false} onChange={onChange} />)

    const direction = screen.getByLabelText('账号方向')
    expect(direction).toHaveValue('news')
    fireEvent.change(direction, { target: { value: 'lifestyle' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ bioStyle: 'lifestyle' }))
  })
})
