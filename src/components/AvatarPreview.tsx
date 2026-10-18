import { useEffect, useRef, useState } from 'react'
import { Download, ShieldCheck, X } from 'lucide-react'
import { avatarFetchUrl, avatarToBlob } from '../services/avatarService'
import type { Profile } from '../types/profile'

interface Props {
  profile: Profile | null
  onClose: () => void
}

export function AvatarPreview({ profile, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (profile && !element.open) element.showModal()
    if (!profile && element.open) element.close()
  }, [profile])

  useEffect(() => {
    if (!profile) {
      setPreviewUrl('')
      return
    }
    setPreviewUrl(avatarFetchUrl(profile.avatarUrl))
    if (profile.avatarSource !== 'local-hd-avatar') return
    let active = true
    let objectUrl = ''
    avatarToBlob(profile.avatarUrl).then((blob) => {
      if (!active) return
      objectUrl = URL.createObjectURL(blob)
      setPreviewUrl(objectUrl)
    }).catch(() => undefined)
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [profile])

  return (
    <dialog ref={dialog} className="avatar-preview" aria-labelledby="avatar-preview-title"
      onCancel={(event) => { event.preventDefault(); onClose() }} onClose={onClose}>
      {profile && <div className="avatar-preview-content">
        <div className="avatar-preview-head">
          <div><h2 id="avatar-preview-title">{profile.displayName} 的头像</h2><p>{profile.avatarSource === 'local-hd-avatar' ? '1024 × 1024 高清矢量预览' : '大图预览'}</p></div>
          <button type="button" className="icon-button" aria-label="关闭头像预览" onClick={onClose}><X aria-hidden="true" /></button>
        </div>
        <img src={previewUrl || avatarFetchUrl(profile.avatarUrl)} alt={`${profile.displayName} 的头像大图`} />
        <div className="avatar-save-guide"><Download aria-hidden="true" /><div><strong>手机长按图片保存</strong><p>高清头像会转换为 1024 × 1024 PNG；长按上方大图，选择“存储图像”“保存到照片”或“下载图片”。</p></div></div>
        <p className="avatar-license-note"><ShieldCheck aria-hidden="true" />{profile.avatarSource === 'local-hd-avatar'
          ? '本地合成的虚构矢量头像，不对应或冒充任何真人。'
          : 'API 照片清晰度有限且仍仅作演示占位。'}</p>
      </div>}
    </dialog>
  )
}
