import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Archive, CheckCircle2, ChevronLeft, ChevronRight, Download, FileDown,
  Grid2X2, History, Info, LayoutList, LoaderCircle, LockKeyhole, Save, Search,
  ShieldCheck, Sparkles, Trash2, Users, WandSparkles, Wifi, X,
} from 'lucide-react'
import { ProfileCard } from './components/ProfileCard'
import { ProfileTable } from './components/ProfileTable'
import { SettingsPanel } from './components/SettingsPanel'
import { downloadAvatar, exportAvatarZip, readAuthorizedAvatar } from './services/avatarService'
import { exportCsv, exportExcel } from './services/exportService'
import { generateProfiles } from './services/generator'
import { clearProfiles, deleteProfiles, loadProfiles, saveProfiles } from './services/historyDb'
import type { GeneratorSettings, Profile } from './types/profile'
import { DEFAULT_PLATFORM_RULES } from './utils/username'
import packageInfo from '../package.json'

const defaultSettings: GeneratorSettings = {
  count: 10,
  gender: 'random',
  minAge: 18,
  maxAge: 45,
  style: 'mixed',
  allowNumbers: true,
  platformRules: DEFAULT_PLATFORM_RULES,
}

const preferredView = (count: number): 'cards' | 'table' => (
  count > 10 && !window.matchMedia('(max-width: 680px)').matches ? 'table' : 'cards'
)

type Toast = { id: number; tone: 'success' | 'error' | 'info'; message: string }

export default function App() {
  const [settings, setSettings] = useState(defaultSettings)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all')
  const [filterSource, setFilterSource] = useState<'all' | 'api' | 'mock'>('all')
  const [page, setPage] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0, message: '' })
  const [generationError, setGenerationError] = useState('')
  const [lastSummary, setLastSummary] = useState<{ apiCount: number; mockCount: number; warnings: string[] } | null>(null)
  const [includePasswords, setIncludePasswords] = useState(false)
  const [avatarRightsConfirmed, setAvatarRightsConfirmed] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [shareUrl, setShareUrl] = useState(() => (
    ['127.0.0.1', 'localhost'].includes(window.location.hostname) ? '' : window.location.origin
  ))
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const operationRef = useRef(0)

  const addToast = (message: string, tone: Toast['tone'] = 'success') => {
    const id = crypto.getRandomValues(new Uint32Array(1))[0]
    setToasts((current) => current.some((toast) => toast.message === message) ? current : [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3200)
  }

  useEffect(() => {
    loadProfiles().then((items) => {
      if (items.length) {
        setProfiles(items)
        setView(preferredView(items.length))
        addToast(`已恢复 ${items.length} 条历史；密码已为本会话重新生成。`, 'info')
      }
    }).catch(() => addToast('无法读取本地历史，可继续生成新资料。', 'error'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (shareUrl) return
    fetch('/__health')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((health: { app?: string; lanUrls?: string[] }) => {
        if (health.app === 'english-profile-generator' && health.lanUrls?.[0]) setShareUrl(health.lanUrls[0])
      })
      .catch(() => undefined)
  }, [shareUrl])

  useEffect(() => {
    if (!shareUrl) return
    let active = true
    import('qrcode').then(({ toDataURL }) => toDataURL(shareUrl, {
      width: 176,
      margin: 1,
      color: { dark: '#172421', light: '#fffefa' },
      errorCorrectionLevel: 'M',
    })).then((dataUrl) => { if (active) setQrCodeUrl(dataUrl) }).catch(() => undefined)
    return () => { active = false }
  }, [shareUrl])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return profiles.filter((profile) => {
      const matchesSearch = !keyword || [profile.displayName, profile.username, profile.bio, profile.bioZh]
        .some((value) => value.toLowerCase().includes(keyword))
      return matchesSearch
        && (filterGender === 'all' || profile.gender === filterGender)
        && (filterSource === 'all' || profile.dataSource === filterSource)
    })
  }, [profiles, search, filterGender, filterSource])

  const pageSize = view === 'table' ? 50 : 12
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleProfiles = filtered.slice((page - 1) * pageSize, page * pageSize)
  const exportProfiles = selected.size > 0 ? profiles.filter((profile) => selected.has(profile.id)) : filtered

  useEffect(() => setPage(1), [search, filterGender, filterSource, view])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const handleGenerate = async () => {
    if (isGenerating) return
    const operation = ++operationRef.current
    setIsGenerating(true)
    setGenerationError('')
    setLastSummary(null)
    setProgress({ completed: 0, total: settings.count, message: '正在准备请求…' })
    try {
      const result = await generateProfiles(settings, new Set(profiles.map((item) => item.username)),
        (completed, total, message) => operation === operationRef.current && setProgress({ completed, total, message }))
      if (operation !== operationRef.current) return
      setProfiles((current) => [...result.profiles, ...current])
      setLastSummary({ apiCount: result.apiCount, mockCount: result.mockCount, warnings: result.warnings })
      setView(preferredView(result.profiles.length))
      setPage(1)
      await saveProfiles(result.profiles)
      addToast(`已生成并保存 ${result.profiles.length} 条虚构资料。`)
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成失败'
      setGenerationError(message)
      addToast(message, 'error')
    } finally {
      if (operation === operationRef.current) {
        setIsGenerating(false)
        setProgress({ completed: 0, total: 0, message: '' })
      }
    }
  }

  const copy = async (value: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value)
          addToast(`${label}已复制。`)
          return
        } catch {
          // HTTP LAN origins may expose the API but reject writes; use the legacy selection fallback.
        }
      }
      const textArea = document.createElement('textarea')
      textArea.value = value
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.append(textArea)
      textArea.select()
      const copied = document.execCommand('copy')
      textArea.remove()
      if (!copied) throw new Error('copy failed')
      addToast(`${label}已复制。`)
    } catch { addToast(`${label}复制失败，请手动选择文本。`, 'error') }
  }

  const remove = async (ids: string[]) => {
    setProfiles((current) => current.filter((profile) => !ids.includes(profile.id)))
    setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))))
    await deleteProfiles(ids).catch(() => addToast('界面已删除，但本地历史同步失败。', 'error'))
    addToast(`已删除 ${ids.length} 条资料。`)
  }

  const regenerate = async (profile: Profile) => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const singleSettings = { ...settings, count: 1 as const, gender: profile.gender }
      const result = await generateProfiles(singleSettings, new Set(profiles.filter((item) => item.id !== profile.id).map((item) => item.username)))
      const replacement = result.profiles[0]
      setProfiles((current) => current.map((item) => item.id === profile.id ? replacement : item))
      await deleteProfiles([profile.id]); await saveProfiles([replacement])
      addToast('已重新生成该条资料。')
    } catch (error) { addToast(error instanceof Error ? error.message : '重新生成失败', 'error') }
    finally { setIsGenerating(false) }
  }

  const uploadAvatar = async (profile: Profile, file: File) => {
    try {
      const avatarUrl = await readAuthorizedAvatar(file)
      const updated = { ...profile, avatarUrl, avatarSource: 'authorized-upload' as const }
      setProfiles((current) => current.map((item) => item.id === profile.id ? updated : item))
      await saveProfiles([updated])
      addToast('已使用本地授权头像替换占位图。')
    } catch (error) { addToast(error instanceof Error ? error.message : '头像上传失败', 'error') }
  }

  const deduplicate = async () => {
    const seenUsers = new Set<string>(); const seenAvatars = new Set<string>(); const duplicateIds: string[] = []
    for (const profile of profiles) {
      if (seenUsers.has(profile.username) || seenAvatars.has(profile.avatarUrl)) duplicateIds.push(profile.id)
      else { seenUsers.add(profile.username); seenAvatars.add(profile.avatarUrl) }
    }
    if (!duplicateIds.length) return addToast('未发现重复用户名或头像 URL。', 'info')
    await remove(duplicateIds)
  }

  const saveHistory = async () => {
    try { await saveProfiles(profiles); addToast(`已保存 ${profiles.length} 条非敏感资料，密码未保存。`) }
    catch { addToast('保存历史失败。', 'error') }
  }

  const clearAll = async () => {
    if (!window.confirm('确定清空当前资料和本地历史吗？此操作无法撤销。')) return
    setProfiles([]); setSelected(new Set()); await clearProfiles(); addToast('已清空本地历史。')
  }

  const toggleAll = () => {
    const visibleIds = visibleProfiles.map((profile) => profile.id)
    const areAllSelected = visibleIds.every((id) => selected.has(id))
    setSelected((current) => {
      const next = new Set(current); visibleIds.forEach((id) => areAllSelected ? next.delete(id) : next.add(id)); return next
    })
  }

  const handleZip = async () => {
    if (!avatarRightsConfirmed) return addToast('请先确认头像授权限制。', 'error')
    try {
      setProgress({ completed: 0, total: exportProfiles.length, message: '正在打包头像…' })
      const result = await exportAvatarZip(exportProfiles, (completed, total) => setProgress({ completed, total, message: '正在打包头像…' }))
      addToast(`ZIP 已生成：${result.included} 张成功，${result.failed} 张失败。`, result.failed ? 'info' : 'success')
    } catch (error) { addToast(error instanceof Error ? error.message : '头像打包失败', 'error') }
    finally { setProgress({ completed: 0, total: 0, message: '' }) }
  }

  const handleExcel = async () => {
    try { await exportExcel(exportProfiles, includePasswords); addToast('Excel 文件已开始下载。') }
    catch (error) { addToast(error instanceof Error ? error.message : 'Excel 导出失败', 'error') }
  }

  const handleDownloadAvatar = async (profile: Profile, index: number) => {
    try { await downloadAvatar(profile, index); addToast('头像已开始下载。') }
    catch (error) { addToast(error instanceof Error ? error.message : '头像下载失败', 'error') }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-workspace">跳到主要内容</a>
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true"><span>EP</span></div>
        <div className="brand-copy">
          <div className="brand-title-row">
            <h1>英文账号资料生成器</h1>
            <span className="version-badge" aria-label={`当前版本 ${packageInfo.version}`}>v{packageInfo.version}</span>
          </div>
          <p>English Profile Generator · 本地草稿工具</p>
        </div>
        <div className="topbar-note"><ShieldCheck aria-hidden="true" /><span>仅用于草稿与界面测试</span></div>
        <button className="button primary generate-button" type="button" disabled={isGenerating} onClick={handleGenerate}>
          {isGenerating ? <LoaderCircle className="spin" aria-hidden="true" /> : <WandSparkles aria-hidden="true" />}
          {isGenerating ? '正在生成…' : `一键生成 ${settings.count} 条`}
        </button>
      </header>

      {(isGenerating || progress.total > 0) && <div className="progress-strip" role="status" aria-live="polite">
        <div className="progress-track"><span style={{ width: `${progress.total ? Math.max(4, progress.completed / progress.total * 100) : 4}%` }} /></div>
        <p>{progress.message}<strong>{progress.completed}/{progress.total}</strong></p>
      </div>}

      <div className="compliance-banner">
        <Info aria-hidden="true" /><p><strong>虚构资料，非真实身份。</strong> `nat=us` 不保证照片与美国国籍匹配；远程照片只作演示占位。本工具不提供批量注册、风控规避或冒名验证。</p>
      </div>

      {shareUrl && <div className="share-banner">
        {qrCodeUrl && <img src={qrCodeUrl} alt={`扫码打开 ${shareUrl}`} />}
        <Wifi aria-hidden="true" />
        <div>
          <strong>手机扫码打开</strong>
          <p>{window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
            ? '本地模式需手机与电脑处于同一局域网；公网服务器版可在任意网络访问。'
            : '使用手机相机或微信扫码，即可在当前网络打开同一版本。'}</p>
          <code>{shareUrl}</code>
        </div>
        <button type="button" className="text-button" onClick={() => copy(shareUrl, '访问地址')}>复制地址</button>
      </div>}

      <main className="workspace" id="main-workspace">
        <SettingsPanel settings={settings} disabled={isGenerating} hasProfiles={profiles.length > 0} onChange={setSettings} />

        <section className="results-panel" aria-label="生成结果">
          <div className="results-heading">
            <div><div className="heading-line"><h2>资料工作台</h2><span>{profiles.length} 条已保存</span></div><p>密码仅保留在当前会话，历史恢复时会重新生成。</p></div>
            <div className="view-toggle" aria-label="查看方式">
              <button type="button" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')} aria-pressed={view === 'cards'}><Grid2X2 aria-hidden="true" />卡片</button>
              <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} aria-pressed={view === 'table'}><LayoutList aria-hidden="true" />表格</button>
            </div>
          </div>

          {lastSummary && <div className={`source-summary ${lastSummary.mockCount ? 'warning' : 'success'}`}>
            {lastSummary.mockCount ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
            <div><strong>本次：远程 API {lastSummary.apiCount} 条 · 本地模拟 {lastSummary.mockCount} 条</strong>
              {lastSummary.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
          </div>}
          {generationError && <div className="source-summary error" role="alert"><AlertTriangle aria-hidden="true" /><div><strong>生成未完成</strong><p>{generationError}</p><button type="button" className="text-button" onClick={handleGenerate}>重试</button></div></div>}

          <div className="toolbar">
            <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">搜索资料</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索姓名、用户名或 Bio" /></label>
            <select aria-label="按性别筛选" value={filterGender} onChange={(event) => setFilterGender(event.target.value as typeof filterGender)}><option value="all">全部性别</option><option value="male">男</option><option value="female">女</option></select>
            <select aria-label="按数据来源筛选" value={filterSource} onChange={(event) => setFilterSource(event.target.value as typeof filterSource)}><option value="all">全部来源</option><option value="api">远程 API</option><option value="mock">本地模拟</option></select>
            <button type="button" className="button secondary compact" onClick={deduplicate}><Sparkles aria-hidden="true" />去重</button>
            <button type="button" className="button secondary compact" onClick={saveHistory} disabled={!profiles.length}><Save aria-hidden="true" />保存历史</button>
          </div>

          {selected.size > 0 && <div className="bulk-bar"><CheckCircle2 aria-hidden="true" /><strong>已选 {selected.size} 条</strong><button type="button" onClick={() => remove([...selected])}><Trash2 aria-hidden="true" />删除所选</button><button type="button" onClick={() => setSelected(new Set())}><X aria-hidden="true" />取消选择</button></div>}

          {profiles.length === 0 ? <div className="empty-state"><div className="empty-illustration" aria-hidden="true"><Users /><span /></div><h3>从一套可审阅的虚构资料开始</h3><p>设置数量和条件，然后点击右上角的一键生成。断网时会明确切换为本地模拟资料。</p><button type="button" className="button primary" onClick={handleGenerate}><WandSparkles aria-hidden="true" />生成 {settings.count} 条资料</button></div>
            : filtered.length === 0 ? <div className="empty-state compact-empty"><Search aria-hidden="true" /><h3>没有匹配的资料</h3><p>请调整关键词或筛选条件。</p></div>
            : view === 'cards' ? <div className="cards-list">{visibleProfiles.map((profile) => <ProfileCard key={profile.id} profile={profile} index={profiles.indexOf(profile)} busy={isGenerating}
              avatarDownloadsAllowed={avatarRightsConfirmed} onCopy={copy} onDelete={(id) => remove([id])} onRegenerate={regenerate}
              onDownloadAvatar={handleDownloadAvatar} onUploadAvatar={uploadAvatar} />)}</div>
              : <><p className="mobile-table-hint"><Info aria-hidden="true" />表格可左右滑动，或切换至卡片查看完整资料。</p><ProfileTable profiles={visibleProfiles} selected={selected} busy={isGenerating} onCopy={copy} onDelete={(id) => remove([id])} onRegenerate={regenerate}
                onToggle={(id) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })} onToggleAll={toggleAll} /></>}

          {filtered.length > pageSize && <nav className="pagination" aria-label="结果分页"><span>第 {page} / {totalPages} 页</span><div><button type="button" className="icon-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} aria-label="上一页"><ChevronLeft aria-hidden="true" /></button><button type="button" className="icon-button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} aria-label="下一页"><ChevronRight aria-hidden="true" /></button></div></nav>}

          {profiles.length > 0 && <section className="export-panel" aria-labelledby="export-heading">
            <div className="export-copy"><FileDown aria-hidden="true" /><div><h3 id="export-heading">导出与头像打包</h3><p>{selected.size ? `将导出所选 ${selected.size} 条` : `将导出当前筛选的 ${filtered.length} 条`}，表格与 ZIP 按同一序号对应。</p></div></div>
            <div className="rights-box"><label><input type="checkbox" checked={avatarRightsConfirmed} onChange={(event) => setAvatarRightsConfirmed(event.target.checked)} /><span><strong>我已了解头像许可限制</strong><small>Random User 照片只作演示占位；正式使用前请替换为你已获授权或具有可商用许可的素材。</small></span></label></div>
            <label className={`password-export ${includePasswords ? 'enabled' : ''}`}><input type="checkbox" checked={includePasswords} onChange={(event) => setIncludePasswords(event.target.checked)} /><span><strong>导出明文密码</strong><small>{includePasswords ? '警告：明文文件可能被他人读取，请安全保管并及时删除。' : '默认关闭，表格中不包含密码列。'}</small></span></label>
            <div className="export-actions"><button type="button" className="button secondary" onClick={() => exportCsv(exportProfiles, includePasswords)}><Download aria-hidden="true" />CSV</button><button type="button" className="button secondary" onClick={handleExcel}><Download aria-hidden="true" />Excel</button><button type="button" className="button primary" disabled={!avatarRightsConfirmed} onClick={handleZip}><Archive aria-hidden="true" />头像 ZIP</button></div>
          </section>}

          {profiles.length > 0 && <div className="history-footer"><span><History aria-hidden="true" />历史仅保存在本机浏览器 IndexedDB</span><button type="button" className="text-button danger-text" onClick={clearAll}><Trash2 aria-hidden="true" />清空全部</button></div>}
        </section>
      </main>

      <footer><LockKeyhole aria-hidden="true" /><span>密码由浏览器 Web Crypto 生成 · 不使用 API 密码 · 不检查平台占用</span><span>v{packageInfo.version}</span></footer>
      <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`toast ${toast.tone}`}>{toast.tone === 'error' ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}<span>{toast.message}</span></div>)}</div>
    </div>
  )
}
