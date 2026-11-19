import type { Account, Category, Transaction } from '@/types/domain'
import { addDays, diffDays, monthKeyFrom, remainingDaysInMonth, weekRange } from '@/utils/date'
import { percentOf } from '@/utils/money'

/**
 * 领域计算层：全部纯函数，输入「流水 + 目录」，输出屏幕要的数字。
 * 约定：转账（kind === 'transfer'）不计入收入/支出/预算，只参与余额推演。
 */

export interface DayGroup {
  dayKey: string
  expenseCents: number
  incomeCents: number
  rows: Transaction[]
}

const EXPENSE = 'expense'
const INCOME = 'income'

export function isExpense(t: Transaction): boolean {
  return t.kind === EXPENSE
}

export function isIncome(t: Transaction): boolean {
  return t.kind === INCOME
}

export function sumCents(rows: Transaction[], kind?: Transaction['kind']): number {
  return rows.reduce((acc, t) => (kind && t.kind !== kind ? acc : acc + t.amountCents), 0)
}

export function expenseCents(rows: Transaction[]): number {
  return sumCents(rows, EXPENSE)
}

export function incomeCents(rows: Transaction[]): number {
  return sumCents(rows, INCOME)
}

/** 按日分组并按日期倒序，日内部按时间倒序（记账 App 的最新一笔永远在最上）。 */
export function groupByDay(rows: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>()
  for (const t of rows) {
    const key = t.occurredAt.slice(0, 10)
    const list = map.get(key)
    if (list) list.push(t)
    else map.set(key, [t])
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dayKey, list]) => ({
      dayKey,
      rows: [...list].sort((x, y) => y.occurredAt.localeCompare(x.occurredAt)),
      expenseCents: expenseCents(list),
      incomeCents: incomeCents(list),
    }))
}

/** 分类环形图 / 图例：按金额倒序，占比一位小数，合计为 0 时全部 0%。 */
export function categoryBreakdown(
  rows: Transaction[],
  categories: Category[],
  kind: 'expense' | 'income',
): { totalCents: number; slices: { category: Category | undefined; amountCents: number; count: number; sharePercent: number }[] } {
  const target = kind === 'expense' ? expenseCents(rows) : incomeCents(rows)
  const byId = new Map(categories.map((c) => [c.id, c]))
  const acc = new Map<string, { amountCents: number; count: number }>()
  for (const t of rows) {
    if (t.kind !== kind || t.categoryId === null) continue
    const entry = acc.get(t.categoryId)
    if (entry) {
      entry.amountCents += t.amountCents
      entry.count += 1
    } else acc.set(t.categoryId, { amountCents: t.amountCents, count: 1 })
  }
  const slices = [...acc.entries()]
    .map(([id, v]) => ({
      category: byId.get(id),
      amountCents: v.amountCents,
      count: v.count,
      sharePercent: percentOf(v.amountCents, target, 1),
    }))
    .sort((a, b) => b.amountCents - a.amountCents)
  return { totalCents: target, slices }
}

/** 商家/备注排行：分类详情页「钱都花在哪几个店」。 */
export function merchantRank(rows: Transaction[], limit = 5): { name: string; amountCents: number; count: number }[] {
  const acc = new Map<string, { amountCents: number; count: number }>()
  for (const t of rows) {
    if (!isExpense(t)) continue
    const name = t.merchant.trim() || '未命名'
    const entry = acc.get(name)
    if (entry) {
      entry.amountCents += t.amountCents
      entry.count += 1
    } else acc.set(name, { amountCents: t.amountCents, count: 1 })
  }
  return [...acc.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, limit)
}

export interface BarPoint {
  key: string
  label: string
  expenseCents: number
  incomeCents: number
}

/** 月度柱状：给定月份序列，逐月汇总（缺月补 0，保证 12 根柱不塌陷）。 */
export function monthlyBars(
  rows: Transaction[],
  monthKeys: string[],
  labelOf: (monthKey: string) => string = (m) => m.slice(5, 7),
): BarPoint[] {
  const expense: Record<string, number> = {}
  const income: Record<string, number> = {}
  for (const t of rows) {
    const key = t.occurredAt.slice(0, 7)
    if (t.kind === EXPENSE) expense[key] = (expense[key] ?? 0) + t.amountCents
    else if (t.kind === INCOME) income[key] = (income[key] ?? 0) + t.amountCents
  }
  return monthKeys.map((key) => ({
    key,
    label: labelOf(key),
    expenseCents: expense[key] ?? 0,
    incomeCents: income[key] ?? 0,
  }))
}

/** 最近 n 个自然月（含当月），旧的在前。 */
export function recentMonthKeys(today: Date, n: number): string[] {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const shifted = new Date(today.getFullYear(), today.getMonth() - i, 1)
    keys.push(monthKeyFrom(shifted.getFullYear(), shifted.getMonth() + 1))
  }
  return keys
}

/** 本年度 1–12 月，1 月在最前。 */
export function yearMonthKeys(year: number): string[] {
  const keys: string[] = []
  for (let m = 1; m <= 12; m++) keys.push(monthKeyFrom(year, m))
  return keys
}

/** 周视图：按周一为一周起点，聚合本周 7 天。 */
export function weekdayBars(rows: Transaction[], anchorDay: string): BarPoint[] {
  const week = weekRange(anchorDay)
  const expense: Record<string, number> = {}
  const income: Record<string, number> = {}
  for (const t of rows) {
    const day = t.occurredAt.slice(0, 10)
    if (day < week.start || day > week.end) continue
    if (t.kind === EXPENSE) expense[day] = (expense[day] ?? 0) + t.amountCents
    else if (t.kind === INCOME) income[day] = (income[day] ?? 0) + t.amountCents
  }
  return week.days.map((day, i) => ({
    key: day,
    label: '一二三四五六日'[i] ?? '',
    expenseCents: expense[day] ?? 0,
    incomeCents: income[day] ?? 0,
  }))
}

/** 每个星期几的均值：分类详情页「周三最爱喝奶茶」这类结论的来源。 */
export function weekdayAverages(rows: Transaction[]): { weekday: number; avgCents: number; totalCents: number; count: number }[] {
  const totals: number[] = Array.from({ length: 7 }, () => 0)
  const occurrences: number[] = Array.from({ length: 7 }, () => 0)
  const daily: Record<string, number> = {}
  for (const t of rows) {
    if (!isExpense(t)) continue
    const day = t.occurredAt.slice(0, 10)
    daily[day] = (daily[day] ?? 0) + t.amountCents
  }
  for (const [day, amount] of Object.entries(daily)) {
    const weekday = new Date(`${day}T00:00:00`).getDay()
    totals[weekday] = (totals[weekday] ?? 0) + amount
    occurrences[weekday] = (occurrences[weekday] ?? 0) + 1
  }
  return totals.map((totalCents, weekday) => {
    const count = occurrences[weekday] ?? 0
    return { weekday, totalCents, count, avgCents: count === 0 ? 0 : Math.round(totalCents / count) }
  })
}

/** 连续记账天数：从今天往回逐日回溯，今天没记则从昨天起算。 */
export function streakDays(rows: Transaction[], todayDayKey: string): number {
  const days = new Set(rows.map((t) => t.occurredAt.slice(0, 10)))
  // 今天还没记不算断：从昨天起算，昨天也没有才算 0
  let cursor = days.has(todayDayKey) ? 0 : 1
  let streak = 0
  while (streak < 3650 && days.has(addDays(todayDayKey, -cursor))) {
    streak += 1
    cursor += 1
  }
  return streak
}

/** 记账第几天：从第一笔流水到今天的天数，无流水返回 0。 */
export function ledgerAgeDays(rows: Transaction[], todayDayKey: string): number {
  if (rows.length === 0) return 0
  const first = rows.reduce((min, t) => (t.occurredAt.slice(0, 10) < min ? t.occurredAt.slice(0, 10) : min), '9999-12-31')
  return diffDays(first, todayDayKey) + 1
}

/** 账户余额一律由「期初 + 流水」推演，不落库，避免和流水对不上。 */
export function accountBalanceCents(account: Account, rows: Transaction[]): number {
  return rows.reduce((balance, t) => {
    if (t.kind === EXPENSE) return t.accountId === account.id ? balance - t.amountCents : balance
    if (t.kind === INCOME) return t.accountId === account.id ? balance + t.amountCents : balance
    let next = balance
    if (t.accountId === account.id) next -= t.amountCents
    if (t.targetAccountId === account.id) next += t.amountCents
    return next
  }, account.openingBalanceCents)
}

export function accountBalances(accounts: Account[], rows: Transaction[]): { account: Account; balanceCents: number }[] {
  return accounts.map((account) => ({ account, balanceCents: accountBalanceCents(account, rows) }))
}

export interface NetWorth {
  assetsCents: number
  liabilitiesCents: number
  netCents: number
}

/** 净资产 = 非信用卡账户余额之和；信用卡余额按负债计。 */
export function netWorth(accounts: Account[], rows: Transaction[]): NetWorth {
  let assets = 0
  let liabilities = 0
  for (const { account, balanceCents } of accountBalances(accounts, rows)) {
    if (account.kind === 'credit') liabilities += -balanceCents
    else assets += balanceCents
  }
  return { assetsCents: assets, liabilitiesCents: liabilities, netCents: assets - liabilities }
}

/** 周期对比：本周期 vs 上一周期，上一周期为 0 时不给百分比（避免除零假增长）。 */
export function periodComparison(
  current: { expenseCents: number; incomeCents: number; count: number },
  previous: { expenseCents: number; incomeCents: number; count: number },
): { expenseChangePercent: number | null; incomeChangePercent: number | null } {
  return {
    expenseChangePercent:
      previous.expenseCents === 0 ? null : percentOf(current.expenseCents - previous.expenseCents, previous.expenseCents, 1),
    incomeChangePercent:
      previous.incomeCents === 0 ? null : percentOf(current.incomeCents - previous.incomeCents, previous.incomeCents, 1),
  }
}

/** 本月剩余可花（S1 Hero 与 S5 预算页共用同一口径）。 */
export function dailyAllowanceCents(remainingCents: number, monthKey: string, todayDayKey: string): number {
  const days = remainingDaysInMonth(monthKey, todayDayKey)
  return days <= 0 ? 0 : Math.floor(remainingCents / days)
}

export function maxExpense(rows: Transaction[]): Transaction | undefined {
  return rows.filter(isExpense).sort((a, b) => b.amountCents - a.amountCents)[0]
}
