import { Clipboard, RefreshCw, Trash2 } from 'lucide-react'
import type { Profile } from '../types/profile'
import { profileAvatarUrl } from '../services/avatarService'

interface Props {
  profiles: Profile[]
  selected: Set<string>
  busy: boolean
  onToggle: (id: string) => void
  onToggleAll: () => void
  onDelete: (id: string) => void
  onRegenerate: (profile: Profile) => void
  onCopy: (value: string, label: string) => void
}

export function ProfileTable({ profiles, selected, busy, ...props }: Props) {
  const allSelected = profiles.length > 0 && profiles.every((profile) => selected.has(profile.id))
  return (
    <div className="table-scroll">
      <table>
        <thead><tr>
          <th><input type="checkbox" aria-label="全选当前资料" checked={allSelected} onChange={props.onToggleAll} /></th>
          <th>头像 / 姓名</th><th>用户名</th><th>年龄</th><th>性别</th><th>Bio</th><th>来源</th><th>操作</th>
        </tr></thead>
        <tbody>{profiles.map((profile) => (
          <tr key={profile.id} className={selected.has(profile.id) ? 'selected' : ''}>
            <td><input type="checkbox" aria-label={`选择 ${profile.displayName}`} checked={selected.has(profile.id)} onChange={() => props.onToggle(profile.id)} /></td>
            <td><div className="table-person"><img src={profileAvatarUrl(profile)} alt="" loading="lazy" /><strong>{profile.displayName}</strong></div></td>
            <td><div className="inline-copy"><code>@{profile.username}</code><button type="button" className="icon-button" aria-label="复制用户名" onClick={() => props.onCopy(profile.username, '用户名')}><Clipboard aria-hidden="true" /></button></div></td>
            <td>{profile.age}</td><td>{profile.gender === 'male' ? '男' : '女'}</td><td className="bio-cell" title={profile.bio}>{profile.bio}</td>
            <td><span className={`source-dot ${profile.dataSource}`}>{profile.dataSource === 'api' ? 'API' : '本地模拟'}</span></td>
            <td><div className="row-actions">{profile.canDelete !== false && <button type="button" className="icon-button" aria-label="重新生成" disabled={busy} onClick={() => props.onRegenerate(profile)}><RefreshCw aria-hidden="true" /></button>}
              {profile.canDelete !== false && <button type="button" className="icon-button danger" aria-label="删除" onClick={() => props.onDelete(profile.id)}><Trash2 aria-hidden="true" /></button>}</div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}
