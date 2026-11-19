import { pad2 } from '@/utils/date'
import { MIN_TICKET_CENTS } from './seedAnchors'

/* ------------------------------------------------------------------ *
 * 确定性随机与整数守恒分摊：全部纯函数，可独立单测
 * ------------------------------------------------------------------ */

export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 把 total 精确拆成 parts 份整数，和恒等于 total，每份不低于下限。 */
export function splitInteger(total: number, parts: number, rand: () => number, minPart = MIN_TICKET_CENTS): number[] {
  if (parts <= 0) return []
  if (parts === 1) return [total]
  const floor = Math.max(1, Math.min(minPart, Math.floor(total / parts)))
  const weights: number[] = []
  for (let i = 0; i < parts; i++) weights.push(0.4 + rand())
  const sumW = weights.reduce((a, b) => a + b, 0)
  const values = weights.map((w) => Math.max(floor, Math.floor((w / sumW) * total)))
  let drift = total - values.reduce((a, b) => a + b, 0)
  // 余数按「最小差额优先」补齐/削减，避免单笔被抽干到下限以下
  for (let guard = 0; drift !== 0 && guard < parts * 64; guard++) {
    const idx = guard % parts
    if (drift > 0) {
      values[idx] = (values[idx] ?? 0) + 1
      drift -= 1
    } else if ((values[idx] ?? 0) > floor) {
      values[idx] = (values[idx] ?? 0) - 1
      drift += 1
    }
  }
  if (drift !== 0) {
    const biggest = values.indexOf(Math.max(...values))
    values[biggest] = (values[biggest] ?? 0) + drift
  }
  return values
}

/**
 * 按权重把 total 精确拆成等长数组（最大余额法），和恒等于 total。
 * 权重之和恰好等于 total 时原样返回，保证本月拆分与原型逐分一致。
 */
export function splitByWeights(total: number, weights: number[]): number[] {
  if (weights.length === 0) return []
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0) {
    const even = weights.map(() => Math.floor(total / weights.length))
    const first = 0
    even[first] = (even[first] ?? 0) + total - even.reduce((a, b) => a + b, 0)
    return even
  }
  if (sum === total) return [...weights]
  const exact = weights.map((w) => (total * w) / sum)
  const values = exact.map((v) => Math.floor(v))
  let drift = total - values.reduce((a, b) => a + b, 0)
  const order = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (let k = 0; drift > 0 && order.length > 0; k = (k + 1) % order.length) {
    const idx = (order[k] as { i: number }).i
    values[idx] = (values[idx] ?? 0) + 1
    drift -= 1
  }
  return values
}

/** 日期分配：必Cover 天各占一笔，其余随机落；只影响日期分布，不影响合计。 */
export function assignDays(count: number, eligibleDays: string[], mustCover: string[], rand: () => number): string[] {
  if (eligibleDays.length === 0) return []
  const days: string[] = []
  for (const day of mustCover) {
    if (days.length >= count) break
    if (eligibleDays.includes(day)) days.push(day)
  }
  while (days.length < count) {
    const idx = Math.floor(rand() * eligibleDays.length)
    days.push((eligibleDays[idx] ?? eligibleDays[0]) as string)
  }
  return days
}

/** 在月内挑一个既不是断打卡日、也不被固定条目占用的日期；挑不出则返回 null。 */
export function pickPlacementDay(preferred: number, lastDay: number, blockedDays: Set<string>, monthKey: string): number | null {
  for (let offset = 0; offset <= 7; offset++) {
    for (const direction of offset === 0 ? [0] : [1, -1]) {
      const day = preferred + direction * offset
      if (day < 1 || day > lastDay) continue
      if (!blockedDays.has(`${monthKey}-${pad2(day)}`)) return day
    }
  }
  return null
}
