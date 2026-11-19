/**
 * 种子数据集的自证层：从流水反推所有对外的口径数字，并检查是否命中原型锚点。
 * 生成器不满足锚点时返回 warning，由调用方决定是否提示，绝不静默交脏数据。
 */
import type { Transaction } from '@/types/domain'
import { ALL_CATEGORIES } from './catalog'
import { addDays } from '@/utils/date'
import { FIXED_ENTRIES, MONTHLY_EXPENSE_CENTS, SALARY_CENTS, SALARY_JANUARY_CENTS, STREAK_DAYS } from './seedAnchors'
import { currentMonthAmounts } from './seedBuckets'

export interface SeedInvariants {
  currentMonth: string
  currentMonthExpenseCents: number
  currentMonthIncomeCents: number
  currentMonthCategoryExpenseCents: Record<string, number>
  monthlyExpenseCents: Record<string, number>
  yearlyExpenseCents: number
  yearlyIncomeCents: number
  yearlyExpenseCount: number
  streakDays: number
  coveredDayCount: number
  accountBalancesCents: Record<string, number>
  /** 按时间推进过程中的最低余额，用于证明任何一天都不会透支。 */
  minAccountBalancesCents: Record<string, number>
}


export function computeInvariants(
  transactions: Transaction[],
  currentMonth: string,
  year: number,
  anchorDay: string,
  openings: Record<string, number>,
): SeedInvariants {
  const nameOf = new Map(ALL_CATEGORIES.map((c) => [c.id, c.name]))
  const monthly: Record<string, number> = {}
  const currentCategory: Record<string, number> = {}
  const running: Record<string, number> = { ...openings }
  const minRunning: Record<string, number> = { ...openings }
  const dayKeys = new Set<string>()
  let yearlyExpense = 0
  let yearlyIncome = 0
  let yearlyExpenseCount = 0

  for (const t of transactions) {
    const monthKey = t.occurredAt.slice(0, 7)
    const dayKey = t.occurredAt.slice(0, 10)
    dayKeys.add(dayKey)
    const delta: [string, number][] =
      t.kind === 'income'
        ? [[t.accountId, t.amountCents]]
        : t.kind === 'expense'
          ? [[t.accountId, -t.amountCents]]
          : [[t.accountId, -t.amountCents], [t.targetAccountId ?? t.accountId, t.amountCents]]
    for (const [accountId, change] of delta) {
      running[accountId] = (running[accountId] ?? 0) + change
      minRunning[accountId] = Math.min(minRunning[accountId] ?? 0, running[accountId] ?? 0)
    }
    if (t.kind === 'expense') {
      monthly[monthKey] = (monthly[monthKey] ?? 0) + t.amountCents
    }
    if (monthKey.slice(0, 4) !== String(year)) continue
    if (t.kind === 'expense') {
      yearlyExpense += t.amountCents
      yearlyExpenseCount += 1
      if (monthKey === currentMonth) {
        const name = nameOf.get(t.categoryId ?? '') ?? t.categoryId ?? '未知'
        currentCategory[name] = (currentCategory[name] ?? 0) + t.amountCents
      }
    } else if (t.kind === 'income') {
      yearlyIncome += t.amountCents
    }
  }

  let streak = 0
  for (let i = 0; i < 400; i++) {
    if (!dayKeys.has(addDays(anchorDay, -i))) break
    streak += 1
  }

  return {
    currentMonth,
    currentMonthExpenseCents: monthly[currentMonth] ?? 0,
    currentMonthIncomeCents: transactions
      .filter((t) => t.kind === 'income' && t.occurredAt.slice(0, 7) === currentMonth)
      .reduce((a, b) => a + b.amountCents, 0),
    currentMonthCategoryExpenseCents: currentCategory,
    monthlyExpenseCents: monthly,
    yearlyExpenseCents: yearlyExpense,
    yearlyIncomeCents: yearlyIncome,
    yearlyExpenseCount,
    streakDays: streak,
    coveredDayCount: dayKeys.size,
    accountBalancesCents: { ...running },
    minAccountBalancesCents: minRunning,
  }
}

/** 生成器的自证：不满足锚点就报警，绝不静默交出脏数据。 */
export function validateInvariants(
  inv: SeedInvariants,
  transactions: Transaction[],
  currentMonth: string,
  anchorDay: string,
): string[] {
  const out: string[] = []
  const targetTotal = MONTHLY_EXPENSE_CENTS[Number(currentMonth.slice(5, 7))] ?? 400_000
  if (inv.currentMonthExpenseCents !== targetTotal) {
    out.push(`本月支出合计 ${inv.currentMonthExpenseCents}，期望 ${targetTotal}`)
  }
  for (const [name, expected] of Object.entries(currentMonthAmounts(targetTotal))) {
    const actual = inv.currentMonthCategoryExpenseCents[name] ?? 0
    if (actual !== expected) out.push(`本月「${name}」合计 ${actual}，期望 ${expected}`)
  }
  const categoryTotal = Object.values(inv.currentMonthCategoryExpenseCents).reduce((a, b) => a + b, 0)
  if (categoryTotal !== inv.currentMonthExpenseCents) {
    out.push(`本月分类合计 ${categoryTotal} ≠ 本月总支出 ${inv.currentMonthExpenseCents}`)
  }
  if (inv.streakDays !== STREAK_DAYS) out.push(`连续记账 ${inv.streakDays} 天，期望 ${STREAK_DAYS} 天`)
  if (inv.currentMonthIncomeCents !== SALARY_CENTS) {
    out.push(`本月收入 ${inv.currentMonthIncomeCents}，期望 ${SALARY_CENTS}`)
  }
  const monthIndex = Number(currentMonth.slice(5, 7))
  const expectedYearlyExpense = Object.entries(MONTHLY_EXPENSE_CENTS)
    .filter(([m]) => Number(m) <= monthIndex)
    .reduce((a, [, v]) => a + v, 0)
  if (inv.yearlyExpenseCents !== expectedYearlyExpense) {
    out.push(`本年度支出 ${inv.yearlyExpenseCents}，期望 ${expectedYearlyExpense}`)
  }
  let expectedYearlyIncome = 0
  for (let m = 1; m <= monthIndex; m++) expectedYearlyIncome += m === 1 ? SALARY_JANUARY_CENTS : SALARY_CENTS
  if (inv.yearlyIncomeCents !== expectedYearlyIncome) {
    out.push(`本年度收入 ${inv.yearlyIncomeCents}，期望 ${expectedYearlyIncome}`)
  }
  for (const [accountId, balance] of Object.entries(inv.minAccountBalancesCents)) {
    if ((balance ?? 0) < 0) out.push(`账户 ${accountId} 历史最低余额为负：${balance}`)
  }
  const expectedToday = FIXED_ENTRIES.filter((f) => f.dayOffsetFromToday === 0).reduce((a, b) => a + b.cents, 0)
  const todayRows = transactions.filter((t) => t.kind === 'expense' && t.occurredAt.slice(0, 10) === anchorDay)
  const todaySum = todayRows.reduce((a, b) => a + b.amountCents, 0)
  if (todaySum !== expectedToday) out.push(`今天支出合计 ${todaySum}，期望 ${expectedToday}`)
  if (todayRows.length !== FIXED_ENTRIES.filter((f) => f.dayOffsetFromToday === 0).length) {
    out.push(`今天笔数 ${todayRows.length}，期望 ${FIXED_ENTRIES.filter((f) => f.dayOffsetFromToday === 0).length}`)
  }
  const previousDay = addDays(anchorDay, -1)
  if (previousDay.startsWith(currentMonth)) {
    const expectedYesterday = FIXED_ENTRIES.filter((f) => f.dayOffsetFromToday === 1).reduce((a, b) => a + b.cents, 0)
    const yesterdaySum = transactions
      .filter((t) => t.kind === 'expense' && t.occurredAt.slice(0, 10) === previousDay)
      .reduce((a, b) => a + b.amountCents, 0)
    if (yesterdaySum !== expectedYesterday) out.push(`昨天支出合计 ${yesterdaySum}，期望 ${expectedYesterday}`)
  }
  return out
}
