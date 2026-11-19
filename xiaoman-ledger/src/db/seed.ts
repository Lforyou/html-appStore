/**
 * 确定性种子生成器：同一天重复调用产出完全相同的流水。
 * 分层：seedAnchors 数据表 → seedMath 纯算法 → seedBuckets 分类金额策略 → seedVerify 自证 → seedStore 落库。
 */
import type { Account, BudgetPlan, Category, Settings, Transaction } from '@/types/domain'
import { ALL_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_SETTINGS, categoryIdByName, defaultBudgetPlans } from './catalog'
import { addDays, daysInMonth, monthKeyFrom, pad2 } from '@/utils/date'
import {
  ACCOUNT_POOL,
  FIXED_ENTRIES,
  MERCHANT_POOL,
  MONTHLY_EXPENSE_CENTS,
  MONTHLY_TRANSFERS,
  SALARY_CENTS,
  SALARY_JANUARY_CENTS,
  SEED_VERSION,
  STREAK_DAYS,
  TIME_WINDOW,
  YEAR_END_BONUS_CENTS,
} from './seedAnchors'
import { assignDays, hashSeed, mulberry32, pickPlacementDay, splitInteger } from './seedMath'
import { categoryCount, currentMonthAmounts, expenseCategory, historyCategoryAmounts } from './seedBuckets'
import { computeInvariants, validateInvariants } from './seedVerify'
import type { SeedInvariants } from './seedVerify'

export interface SeedDataset {
  categories: Category[]
  accounts: Account[]
  budgetPlans: BudgetPlan[]
  transactions: Transaction[]
  settings: Settings
  invariants: SeedInvariants
  warnings: string[]
}

export function buildSeedDataset(options: { today?: Date } = {}): SeedDataset {
  const today = options.today ?? new Date()
  const todayKeyStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  const currentMonth = todayKeyStr.slice(0, 7)
  const currentMonthIndex = Number(currentMonth.slice(5, 7))
  const year = today.getFullYear()
  const stamp = Date.now()

  const mustCoverDays: string[] = []
  for (let i = 0; i < STREAK_DAYS; i++) mustCoverDays.push(addDays(todayKeyStr, -i))
  const forbiddenDay = addDays(todayKeyStr, -STREAK_DAYS)

  const transactions: Transaction[] = []
  const warnings: string[] = []
  let seq = 0

  // 只铺本年度：年度 12 根柱、累计支出、记账天数三处口径才能同时自洽。
  // 1 月额外补满上一自然年，否则月初的 21 天连续打卡会算不满。
  const months: string[] = []
  if (currentMonthIndex === 1) {
    for (let m = 1; m <= 12; m++) months.push(monthKeyFrom(year - 1, m))
  }
  for (let m = 1; m <= currentMonthIndex; m++) months.push(monthKeyFrom(year, m))

  for (const monthKey of months) {
    const monthNumber = Number(monthKey.slice(5, 7))
    const monthYear = Number(monthKey.slice(0, 4))
    const isCurrent = monthKey === currentMonth
    const totalDays = daysInMonth(monthYear, monthNumber)
    const lastDay = isCurrent ? today.getDate() : totalDays
    // 今天/昨天由固定条目独占，生成流水不再落这两天，Hero 的 ¥73.40 / ¥373.00 才守得住
    const reservedDays = new Set<string>()
    if (isCurrent) {
      for (const fx of FIXED_ENTRIES) {
        const dayKey = addDays(todayKeyStr, -fx.dayOffsetFromToday)
        if (dayKey.startsWith(monthKey)) reservedDays.add(dayKey)
      }
    }
    const blockedDays = new Set<string>(reservedDays)
    blockedDays.add(forbiddenDay)
    const eligibleDays: string[] = []
    for (let d = 1; d <= lastDay; d++) {
      const key = `${monthKey}-${pad2(d)}`
      if (!blockedDays.has(key)) eligibleDays.push(key)
    }
    // 可记日为空（月初 1–2 号）时按真实空账本呈现，不硬凑整月合计
    const fillMonth = eligibleDays.length > 0
    const rand = mulberry32(hashSeed(`xiaoman:${monthKey}`))
    const mustCoverHere = mustCoverDays.filter((d) => eligibleDays.includes(d))

    if (fillMonth) {
      // 收入：发薪日 10 号，月初不足 10 号则就近前移到本月可记日
      const salaryDay = pickPlacementDay(Math.min(10, lastDay), lastDay, blockedDays, monthKey)
      const salaryCents = monthNumber === 1 ? SALARY_JANUARY_CENTS : SALARY_CENTS
      if (salaryDay !== null) {
        transactions.push({
          id: `seed:${monthKey}:salary`,
          kind: 'income',
          amountCents: salaryCents,
          categoryId: categoryIdByName('工资薪金'),
          accountId: 'cmb',
          occurredAt: `${monthKey}-${pad2(salaryDay)}T10:05:00`,
          merchant: '薪资代发',
          note: `${monthNumber}月工资`,
          tags: ['发薪日'],
          createdAt: stamp,
          updatedAt: stamp,
        })
      }

      if (monthNumber === 12 && !isCurrent) {
        const bonusDay = pickPlacementDay(25, lastDay, blockedDays, monthKey)
        if (bonusDay !== null) {
          transactions.push({
            id: `seed:${monthKey}:bonus`,
            kind: 'income',
            amountCents: YEAR_END_BONUS_CENTS,
            categoryId: categoryIdByName('奖金绩效'),
            accountId: 'cmb',
            occurredAt: `${monthKey}-${pad2(bonusDay)}T15:30:00`,
            merchant: '公司年终',
            note: '年终绩效',
            tags: ['年终奖'],
            createdAt: stamp,
            updatedAt: stamp,
          })
        }
      }

      // 转账：不参与收支与预算，只推演账户余额，避免微信/支付宝余额记成负数
      for (const plan of MONTHLY_TRANSFERS) {
        const day = pickPlacementDay(Math.min(plan.day, lastDay), lastDay, blockedDays, monthKey)
        if (day === null) continue
        transactions.push({
          id: `seed:${monthKey}:transfer:${plan.to}`,
          kind: 'transfer',
          amountCents: plan.cents,
          categoryId: null,
          accountId: plan.from,
          targetAccountId: plan.to,
          occurredAt: `${monthKey}-${pad2(day)}T11:00:00`,
          merchant: plan.merchant,
          note: plan.note,
          tags: [],
          createdAt: stamp,
          updatedAt: stamp,
        })
      }
    }

    const monthTarget = MONTHLY_EXPENSE_CENTS[monthNumber] ?? 400_000
    const amounts = fillMonth
      ? isCurrent
        ? currentMonthAmounts(monthTarget)
        : historyCategoryAmounts(monthKey, monthTarget)
      : {}

    // 固定条目先占位，并从对应桶里扣掉，保证合计不重复
    const reservedAmount: Record<string, number> = {}
    const reservedCount: Record<string, number> = {}
    if (isCurrent) {
      for (const fx of FIXED_ENTRIES) {
        const dayKey = addDays(todayKeyStr, -fx.dayOffsetFromToday)
        if (!dayKey.startsWith(monthKey)) continue
        reservedAmount[fx.category] = (reservedAmount[fx.category] ?? 0) + fx.cents
        reservedCount[fx.category] = (reservedCount[fx.category] ?? 0) + 1
        transactions.push({
          id: `seed:${dayKey}:fixed:${(seq += 1)}`,
          kind: 'expense',
          amountCents: fx.cents,
          categoryId: expenseCategory(fx.category).id,
          accountId: fx.account,
          occurredAt: `${dayKey}T${fx.time}`,
          merchant: fx.merchant,
          note: fx.note,
          tags: [...fx.tags],
          createdAt: stamp,
          updatedAt: stamp,
        })
      }
    }

    for (const [name, bucket] of Object.entries(amounts)) {
      const remaining = bucket - (reservedAmount[name] ?? 0)
      if (remaining <= 0) continue
      const totalCount = categoryCount(name, bucket, isCurrent)
      const restCount = Math.max(1, totalCount - (reservedCount[name] ?? 0))
      const values = splitInteger(remaining, restCount, rand)
      const days = assignDays(values.length, eligibleDays, name === '餐饮' ? mustCoverHere : [], rand)
      const pool = MERCHANT_POOL[name] ?? [['日常支出', '']]
      const accounts = ACCOUNT_POOL[name] ?? ['wechat']
      const window = TIME_WINDOW[name] ?? [9, 20]
      const categoryId = expenseCategory(name).id
      values.forEach((cents, i) => {
        const dayKey = days[i] ?? (eligibleDays[0] as string)
        const pick = pool[Math.floor(rand() * pool.length) % pool.length] as [string, string]
        const hour = window[0] + Math.floor(rand() * Math.max(1, window[1] - window[0]))
        const minute = Math.floor(rand() * 60)
        transactions.push({
          id: `seed:${monthKey}:${(seq += 1)}`,
          kind: 'expense',
          amountCents: cents,
          categoryId,
          accountId: accounts[Math.floor(rand() * accounts.length) % accounts.length] as string,
          occurredAt: `${dayKey}T${pad2(hour)}:${pad2(minute)}:00`,
          merchant: pick[0],
          note: pick[1],
          tags: [],
          createdAt: stamp,
          updatedAt: stamp,
        })
      })
    }
  }

  transactions.sort((a, b) => (a.occurredAt === b.occurredAt ? a.id.localeCompare(b.id) : a.occurredAt.localeCompare(b.occurredAt)))

  const openings: Record<string, number> = {}
  for (const account of DEFAULT_ACCOUNTS) openings[account.id] = account.openingBalanceCents

  const invariants = computeInvariants(transactions, currentMonth, year, todayKeyStr, openings)
  if (today.getDate() >= 3) warnings.push(...validateInvariants(invariants, transactions, currentMonth, todayKeyStr))

  return {
    categories: ALL_CATEGORIES.map((c) => ({ ...c })),
    accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a })),
    budgetPlans: defaultBudgetPlans(today),
    transactions,
    settings: { ...DEFAULT_SETTINGS, seedVersion: SEED_VERSION, onboardedAt: `${currentMonth}-01T09:00:00` },
    invariants,
    warnings,
  }
}
