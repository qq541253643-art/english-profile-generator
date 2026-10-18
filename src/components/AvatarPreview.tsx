import { useEffect, useRef, useState } from 'react'
import { Download, ShieldCheck, X } from 'lucide-react'
import { avatarFetchUrl, avatarToBlob, profileAvatarUrl } from '../services/avatarService'
import type { Profile } from '../types/profile'

interface Props {
  profile: Profile | null
  onClose: () => void
}

export function AvatarPreview({ profile, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)

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
    if (profile.avatarPreviewUrl) {
      setPreviewUrl(profile.avatarPreviewUrl)
      setIsEnhancing(false)
      return
    }
    setPreviewUrl(avatarFetchUrl(profile.avatarUrl))
    setIsEnhancing(profile.avatarSource === 'randomuser-placeholder')
    let active = true
    let objectUrl = ''
    avatarToBlob(profile.avatarUrl).then((blob) => {
      if (!active) return
      objectUrl = URL.createObjectURL(blob)
      setPreviewUrl(objectUrl)
    }).catch(() => undefined).finally(() => { if (active) setIsEnhancing(false) })
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
          <div><h2 id="avatar-preview-title">{profile.displayName} 的头像</h2><p>{isEnhancing ? '正在生成 AI 超分辨率头像…' : profile.avatarSource === 'sigils-synthetic' ? '原生 512px 合成人像 · 512 × 512 PNG' : profile.avatarSource === 'randomuser-placeholder' ? '512 × 512 AI 增强预览' : '512 × 512 大图预览'}</p></div>
          <button type="button" className="icon-button" aria-label="关闭头像预览" onClick={onClose}><X aria-hidden="true" /></button>
        </div>
        <img src={previewUrl || profileAvatarUrl(profile)} alt={`${profile.displayName} 的头像大图`} />
        <div className="avatar-save-guide"><Download aria-hidden="true" /><div><strong>手机长按图片保存</strong><p>高清头像会转换为 512 × 512 PNG；长按上方大图，选择“存储图像”“保存到照片”或“下载图片”。</p></div></div>
        <p className="avatar-license-note"><ShieldCheck aria-hidden="true" />{profile.avatarSource === 'sigils-synthetic'
          ? '非真人 AI 合成人像，画面无水印。来源：sigils-people，CC BY 4.0；不可用于冒充真人或规避平台规则。'
          : profile.avatarSource === 'randomuser-placeholder'
          ? '照片来自 Random User，原图清晰度有限；增强不会新增真实细节，仍仅作演示占位。'
          : profile.avatarSource === 'local-hd-avatar' ? '这是旧版生成的本地合成头像。' : '断网时使用本地占位头像。'}</p>
      </div>}
    </dialog>
  )
}
