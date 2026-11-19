import type { Category } from '@/types/domain'
import { ALL_CATEGORIES } from './catalog'
import {
  AVG_TICKET_CENTS,
  CURRENT_MONTH_COUNTS,
  CURRENT_MONTH_SPLIT_CENTS,
  HISTORY_SHARE_VECTOR,
  MILK_TEA_OVERRIDES_CENTS,
  MIN_TICKET_CENTS,
} from './seedAnchors'
import { splitByWeights } from './seedMath'

/**
 * 分类金额桶策略：把「一个月该花多少」拆成「每个分类各花多少、拆成几笔」。
 * 生成器和自证层共用同一份策略，避免两处口径各写一遍。
 */

export function expenseCategory(name: string): Category {
  const found = ALL_CATEGORIES.find((c) => c.name === name && c.kind === 'expense')
  if (!found) throw new Error(`分类目录缺少支出分类：${name}`)
  return found
}

/** 本月按分类拆分：11 月与原型逐分一致，其它月份按同一权重缩放到当月目标合计。 */
export function currentMonthAmounts(total: number): Record<string, number> {
  const names = Object.keys(CURRENT_MONTH_SPLIT_CENTS)
  const weights = names.map((n) => CURRENT_MONTH_SPLIT_CENTS[n] ?? 0)
  const values = splitByWeights(total, weights)
  const out: Record<string, number> = {}
  names.forEach((name, i) => {
    out[name] = values[i] ?? 0
  })
  return out
}

/** 历史月按占比分摊；医疗/学习/其他只出现在历史月，9/10 月奶茶按超支锚点覆盖。 */
export function historyCategoryAmounts(monthKey: string, total: number): Record<string, number> {
  const month = Number(monthKey.slice(5, 7))
  const shares: Record<string, number> = { ...HISTORY_SHARE_VECTOR }
  const override = MILK_TEA_OVERRIDES_CENTS[month]
  if (override !== undefined && override < total) {
    const others = Object.keys(shares).filter((k) => k !== '奶茶饮品')
    const othersSum = others.reduce((a, k) => a + (shares[k] ?? 0), 0)
    const scale = (total - override) / total / othersSum
    shares['奶茶饮品'] = override / total
    for (const key of others) shares[key] = (shares[key] ?? 0) * scale
  }
  const entries = Object.entries(shares)
  const amounts: Record<string, number> = {}
  let allocated = 0
  for (const [name, share] of entries.slice(0, -1)) {
    const value = Math.round(total * share)
    amounts[name] = value
    allocated += value
  }
  const lastName = entries[entries.length - 1]?.[0]
  if (!lastName) return amounts
  amounts[lastName] = total - allocated
  if ((amounts[lastName] ?? 0) < 0) amounts[lastName] = 0
  return amounts
}

/** 笔数：本月抄原型，历史月按同一笔均密度等比缩放，全年笔数才与原型的 1,286 笔同量级。 */
export function categoryCount(name: string, amountCents: number, isCurrentMonth: boolean): number {
  const maxCount = Math.max(1, Math.floor(amountCents / MIN_TICKET_CENTS))
  const base = CURRENT_MONTH_COUNTS[name]
  if (base !== undefined) {
    const anchorAmount = CURRENT_MONTH_SPLIT_CENTS[name] ?? amountCents
    const scaled = isCurrentMonth ? base : Math.round((base * amountCents) / anchorAmount)
    return Math.max(1, Math.min(scaled, maxCount))
  }
  const avg = AVG_TICKET_CENTS[name] ?? 5_000
  return Math.max(1, Math.min(Math.max(1, Math.round(amountCents / avg)), maxCount))
}
