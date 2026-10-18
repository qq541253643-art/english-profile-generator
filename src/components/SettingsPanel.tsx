import { useEffect, useState } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import type { GeneratorSettings, GenderFilter, UsernameStyle } from '../types/profile'

interface Props {
  settings: GeneratorSettings
  disabled: boolean
  hasProfiles: boolean
  onChange: (settings: GeneratorSettings) => void
}

const counts = [1, 10, 100, 300] as const

export function SettingsPanel({ settings, disabled, hasProfiles, onChange }: Props) {
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  const [mobileOpen, setMobileOpen] = useState(!hasProfiles)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const updateMedia = () => setIsNarrow(media.matches)
    media.addEventListener('change', updateMedia)
    return () => media.removeEventListener('change', updateMedia)
  }, [])

  useEffect(() => {
    if (isNarrow && hasProfiles) setMobileOpen(false)
  }, [hasProfiles, isNarrow])

  const update = <K extends keyof GeneratorSettings>(key: K, value: GeneratorSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <aside className="settings-panel" aria-label="生成设置">
      <details className="settings-disclosure" open={!isNarrow || mobileOpen}
        onToggle={(event) => { if (isNarrow) setMobileOpen(event.currentTarget.open) }}>
        <summary className="panel-title">
          <SlidersHorizontal aria-hidden="true" />
          <div><h2>生成设置</h2><p>{hasProfiles && isNarrow && !mobileOpen ? `${settings.count} 条 · ${settings.gender === 'random' ? '随机性别' : settings.gender === 'male' ? '男' : '女'} · ${settings.minAge}-${settings.maxAge} 岁` : '参数仅作用于本次草稿'}</p></div>
          <ChevronDown className="disclosure-chevron" aria-hidden="true" />
        </summary>
        <div className="settings-fields">

      <fieldset disabled={disabled}>
        <legend>生成数量</legend>
        <div className="segmented four">
          {counts.map((count) => (
            <button key={count} type="button" className={settings.count === count ? 'active' : ''}
              onClick={() => update('count', count)} aria-pressed={settings.count === count}>{count}</button>
          ))}
        </div>
      </fieldset>

      <label className="field-label" htmlFor="gender">性别</label>
      <div className="select-wrap">
        <select id="gender" value={settings.gender} disabled={disabled}
          onChange={(event) => update('gender', event.target.value as GenderFilter)}>
          <option value="random">随机</option><option value="male">男</option><option value="female">女</option>
        </select><ChevronDown aria-hidden="true" />
      </div>

      <fieldset disabled={disabled}>
        <legend>虚构年龄范围</legend>
        <div className="range-row">
          <label><span>最小</span><input type="number" min="18" max={settings.maxAge} value={settings.minAge}
            onChange={(event) => update('minAge', Math.min(Number(event.target.value), settings.maxAge))} /></label>
          <span aria-hidden="true">—</span>
          <label><span>最大</span><input type="number" min={settings.minAge} max="45" value={settings.maxAge}
            onChange={(event) => update('maxAge', Math.max(Number(event.target.value), settings.minAge))} /></label>
        </div>
        <p className="hint">18–45 岁；不符合时会有上限地重试</p>
      </fieldset>

      <label className="field-label" htmlFor="style">用户名风格</label>
      <div className="select-wrap">
        <select id="style" value={settings.style} disabled={disabled}
          onChange={(event) => update('style', event.target.value as UsernameStyle)}>
          <option value="real">真实姓名</option><option value="lifestyle">生活昵称</option>
          <option value="interest">兴趣主题</option><option value="mixed">混合</option>
        </select><ChevronDown aria-hidden="true" />
      </div>

      <label className="switch-row">
        <span><strong>允许少量数字</strong><small>仅在重名或部分模板中使用</small></span>
        <input type="checkbox" checked={settings.allowNumbers} disabled={disabled}
          onChange={(event) => update('allowNumbers', event.target.checked)} />
      </label>

      <details className="advanced">
        <summary>平台用户名规则 <ChevronDown aria-hidden="true" /></summary>
        <div className="advanced-body">
          <div className="range-row">
            <label><span>最短</span><input type="number" min="2" max={settings.platformRules.maxLength}
              value={settings.platformRules.minLength} disabled={disabled}
              onChange={(event) => update('platformRules', { ...settings.platformRules, minLength: Number(event.target.value) })} /></label>
            <label><span>最长</span><input type="number" min={settings.platformRules.minLength} max="30"
              value={settings.platformRules.maxLength} disabled={disabled}
              onChange={(event) => update('platformRules', { ...settings.platformRules, maxLength: Number(event.target.value) })} /></label>
          </div>
          <label className="check-row"><input type="checkbox" checked={settings.platformRules.allowDot} disabled={disabled}
            onChange={(event) => update('platformRules', { ...settings.platformRules, allowDot: event.target.checked })} />允许句点</label>
          <label className="check-row"><input type="checkbox" checked={settings.platformRules.allowUnderscore} disabled={disabled}
            onChange={(event) => update('platformRules', { ...settings.platformRules, allowUnderscore: event.target.checked })} />允许下划线</label>
          <p className="hint">仅验证字符与长度，不检查平台占用情况。</p>
        </div>
      </details>
        </div>
      </details>
    </aside>
  )
}
