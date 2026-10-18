#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const distRoot = resolve('dist')
const indexHtml = await readFile(join(distRoot, 'index.html'), 'utf8')
if (!indexHtml.includes('width=device-width')) {
  throw new Error('生产页面缺少移动端 viewport 声明。')
}

const assetNames = await readdir(join(distRoot, 'assets'))
const cssNames = assetNames.filter((name) => name.endsWith('.css'))
if (!cssNames.length) throw new Error('生产构建未生成 CSS 文件。')

for (const name of cssNames) {
  const css = await readFile(join(distRoot, 'assets', name), 'utf8')
  if (/\(\s*(?:width|height)\s*(?:<=|>=|<|>)/.test(css)) {
    throw new Error(`${name} 含 Safari 15 不支持的媒体查询范围语法。`)
  }
}

console.log(`Safari 15 CSS compatibility verified (${cssNames.length} file${cssNames.length === 1 ? '' : 's'}).`)
