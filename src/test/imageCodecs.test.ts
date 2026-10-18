/* @vitest-environment node */
import { describe, expect, it } from 'vitest'
import { transcodeAvifToJpeg } from '../../scripts/image-codecs.mjs'

const TINY_AVIF = 'AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAAD5bWV0YQAAAAAAAAAvaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAFBpY3R1cmVIYW5kbGVyAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAARAAAAQABAAAAAQAAASEAAAAYAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAAGppcHJwAAAAS2lwY28AAAAUaXNwZQAAAAAAAAACAAAAAgAAABBwaXhpAAAAAAMICAgAAAAMYXYxQ4EADAAAAAATY29scm5jbHgAAgACAAIAAAAAF2lwbWEAAAAAAAAAAQABBAECgwQAAAAgbWRhdAoFGAA2wCAyDxgAAABQAAAAALARdzg0gA=='

describe('旧版 Safari 头像格式兼容', () => {
  it('在服务端把 AVIF 转换为可由 iOS 15 解码的 JPEG', async () => {
    const jpeg = await transcodeAvifToJpeg(Buffer.from(TINY_AVIF, 'base64'))
    expect(jpeg.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]))
    expect(jpeg.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]))
  })

  it('拒绝空输入', async () => {
    await expect(transcodeAvifToJpeg(Buffer.alloc(0))).rejects.toThrow('non-empty Buffer')
  })
})
