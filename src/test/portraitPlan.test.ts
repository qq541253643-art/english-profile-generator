/* @vitest-environment node */
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

interface PortraitPlanItem {
  id: string
  gender: 'female' | 'male'
  age: number
  prompt: string
  localPrompt: string
  localNegativePrompt: string
  seed: number
}

const projectRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

function loadPlan(planSalt = ''): PortraitPlanItem[] {
  const output = execFileSync(process.execPath, ['scripts/portrait-plan.mjs', '0', '600', planSalt], {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  return JSON.parse(output) as PortraitPlanItem[]
}

describe('600 张头像生成计划', () => {
  it('保证 ID、种子和提示词全部唯一', () => {
    const plan = loadPlan()
    expect(plan).toHaveLength(600)
    expect(new Set(plan.map((item) => item.id)).size).toBe(600)
    expect(new Set(plan.map((item) => item.seed)).size).toBe(600)
    expect(new Set(plan.map((item) => item.prompt)).size).toBe(600)
    expect(new Set(plan.map((item) => item.localPrompt)).size).toBe(600)
    expect(plan.every((item) => item.localNegativePrompt.length > 0)).toBe(true)
  })

  it('保证 420 女/180 男及已确认的女性年龄分布', () => {
    const plan = loadPlan()
    const women = plan.filter((item) => item.gender === 'female')
    const men = plan.filter((item) => item.gender === 'male')
    expect(women).toHaveLength(420)
    expect(men).toHaveLength(180)
    expect(women.filter((item) => item.age >= 20 && item.age <= 32)).toHaveLength(336)
    expect(women.filter((item) => item.age >= 33 && item.age <= 38)).toHaveLength(63)
    expect(women.filter((item) => item.age >= 39 && item.age <= 45)).toHaveLength(21)
    expect(plan.every((item) => item.age >= 18 && item.age <= 45)).toBe(true)
  })

  it('身份盐只替换生成特征，不改变编号、性别和年龄配额', () => {
    const original = loadPlan()
    const retry = loadPlan('retry-a')
    expect(retry.map(({ id, gender, age }) => ({ id, gender, age }))).toEqual(
      original.map(({ id, gender, age }) => ({ id, gender, age })),
    )
    expect(retry.every((item, index) => item.localPrompt !== original[index].localPrompt)).toBe(true)
    expect(new Set(retry.map((item) => item.localPrompt)).size).toBe(600)
    expect(new Set(retry.map((item) => item.seed)).size).toBe(600)
  })
})
