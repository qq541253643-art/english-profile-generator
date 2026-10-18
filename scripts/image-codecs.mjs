import { readFile } from 'node:fs/promises'
import decodeAvif, { init as initAvifDecoder } from '@jsquash/avif/decode.js'
import encodeJpeg, { init as initJpegEncoder } from '@jsquash/jpeg/encode.js'

const AVIF_DECODER_WASM = new URL('../node_modules/@jsquash/avif/codec/dec/avif_dec.wasm', import.meta.url)
const JPEG_ENCODER_WASM = new URL('../node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm', import.meta.url)
let codecsPromise

function exactArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

async function initializeCodecs() {
  const [avifWasm, jpegWasm] = await Promise.all([
    readFile(AVIF_DECODER_WASM),
    readFile(JPEG_ENCODER_WASM),
  ])
  const [avifModule, jpegModule] = await Promise.all([
    WebAssembly.compile(avifWasm),
    WebAssembly.compile(jpegWasm),
  ])
  await Promise.all([
    initAvifDecoder(avifModule),
    initJpegEncoder(jpegModule),
  ])
}

export async function transcodeAvifToJpeg(source, quality = 92) {
  if (!Buffer.isBuffer(source) || source.length === 0) throw new TypeError('AVIF source must be a non-empty Buffer')
  if (!codecsPromise) codecsPromise = initializeCodecs()
  await codecsPromise
  const image = await decodeAvif(exactArrayBuffer(source))
  const encoded = await encodeJpeg(image, { quality })
  return Buffer.from(encoded)
}
