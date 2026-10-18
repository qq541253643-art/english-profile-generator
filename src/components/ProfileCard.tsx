import { useRef, useState } from 'react'
import { Check, Clipboard, Download, Eye, EyeOff, ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import type { Profile } from '../types/profile'

interface Props {
  profile: Profile
  index: number
  avatarDownloadsAllowed: boolean
  busy: boolean
  onCopy: (value: string, label: string) => void
  onDelete: (id: string) => void
  onRegenerate: (profile: Profile) => void
  onDownloadAvatar: (profile: Profile, index: number) => void
  onUploadAvatar: (profile: Profile, file: File) => void
}

function CopyButton({ value, label, onCopy }: { value: string; label: string; onCopy: Props['onCopy'] }) {
  const [copied, setCopied] = useState(false)
  return <button type="button" className="icon-button" aria-label={`复制${label}`} onClick={() => {
    onCopy(value, label); setCopied(true); window.setTimeout(() => setCopied(false), 1200)
  }}>{copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}</button>
}

export function ProfileCard(props: Props) {
  const { profile, index, busy, avatarDownloadsAllowed } = props
  const [showPassword, setShowPassword] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  return (
    <article className="profile-card">
      <div className="avatar-column">
        <div className="avatar-wrap">
          <img src={profile.avatarUrl} alt={`${profile.displayName} 的演示头像`} loading="lazy" />
          <span className={`source-dot ${profile.dataSource}`}>{profile.dataSource === 'api' ? 'API 占位' : '本地模拟'}</span>
        </div>
        <button type="button" className="text-button" onClick={() => fileInput.current?.click()}>
          <ImagePlus aria-hidden="true" />上传已授权头像
        </button>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden
          onChange={(event) => { const file = event.target.files?.[0]; if (file) props.onUploadAvatar(profile, file); event.target.value = '' }} />
      </div>

      <div className="profile-content">
        <div className="card-head">
          <div><span className="record-number">#{String(index + 1).padStart(3, '0')}</span><h3>{profile.displayName}</h3>
            <p>{profile.age} 岁 · {profile.gender === 'male' ? '男' : '女'} · 虚构资料</p></div>
          <div className="card-actions">
            <button type="button" className="icon-button" aria-label="重新生成这条资料" disabled={busy} onClick={() => props.onRegenerate(profile)}><RefreshCw aria-hidden="true" /></button>
            <button type="button" className="icon-button danger" aria-label="删除这条资料" onClick={() => props.onDelete(profile.id)}><Trash2 aria-hidden="true" /></button>
          </div>
        </div>

        <div className="data-grid">
          <div className="data-item"><span>用户名</span><div><code>@{profile.username}</code><CopyButton value={profile.username} label="用户名" onCopy={props.onCopy} /></div></div>
          <div className="data-item"><span>随机强密码</span><div><code>{showPassword ? profile.password : '•'.repeat(16)}</code>
            <button type="button" className="icon-button" aria-label={showPassword ? '隐藏密码' : '显示密码'} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
            <CopyButton value={profile.password} label="密码" onCopy={props.onCopy} /></div></div>
          <div className="data-item wide"><span>英文 Bio</span><div><p>{profile.bio}</p><CopyButton value={profile.bio} label="英文 Bio" onCopy={props.onCopy} /></div></div>
          <div className="data-item wide translation"><span>中文翻译</span><div><p>{profile.bioZh}</p><CopyButton value={profile.bioZh} label="中文翻译" onCopy={props.onCopy} /></div></div>
        </div>

        <button type="button" className="button secondary download-avatar" disabled={!avatarDownloadsAllowed}
          title={!avatarDownloadsAllowed ? '请先确认头像授权提示' : undefined}
          onClick={() => props.onDownloadAvatar(profile, index)}><Download aria-hidden="true" />下载头像</button>
      </div>
    </article>
  )
}
