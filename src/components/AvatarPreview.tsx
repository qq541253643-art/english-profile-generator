import { useEffect, useRef } from 'react'
import { Download, ShieldCheck, X } from 'lucide-react'
import { avatarFetchUrl } from '../services/avatarService'
import type { Profile } from '../types/profile'

interface Props {
  profile: Profile | null
  onClose: () => void
}

export function AvatarPreview({ profile, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (profile && !element.open) element.showModal()
    if (!profile && element.open) element.close()
  }, [profile])

  return (
    <dialog ref={dialog} className="avatar-preview" aria-labelledby="avatar-preview-title"
      onCancel={(event) => { event.preventDefault(); onClose() }} onClose={onClose}>
      {profile && <div className="avatar-preview-content">
        <div className="avatar-preview-head">
          <div><h2 id="avatar-preview-title">{profile.displayName} 的头像</h2><p>大图预览</p></div>
          <button type="button" className="icon-button" aria-label="关闭头像预览" onClick={onClose}><X aria-hidden="true" /></button>
        </div>
        <img src={avatarFetchUrl(profile.avatarUrl)} alt={`${profile.displayName} 的头像大图`} />
        <div className="avatar-save-guide"><Download aria-hidden="true" /><div><strong>手机长按图片保存</strong><p>长按上方大图，选择“存储图像”“保存到照片”或“下载图片”。</p></div></div>
        <p className="avatar-license-note"><ShieldCheck aria-hidden="true" />只保存你有权使用的头像；API 照片仍仅作演示占位。</p>
      </div>}
    </dialog>
  )
}
