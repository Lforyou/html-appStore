import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { getLedgerRepository, type LedgerRepository } from '@/db/repository'
import { DEFAULT_SETTINGS } from '@/db/catalog'
import { clearUserData, ensureSeeded, restoreDemoData } from '@/db/seedStore'
import type { Account, BudgetPlan, Category, Kind, Settings, Transaction } from '@/types/domain'
import {
  addMonths,
  cnMonthDay,
  cnYearMonth,
  dayKeyOfDate,
  monthDayKeys,
  monthKeyOf,
  relativeDayLabel,
  type DayKey,
  type MonthKey,
} from '@/utils/date'
import {
  accountBalances,
  categoryBreakdown,
  expenseCents,
  groupByDay,
  incomeCents,
  ledgerAgeDays,
  monthlyBars,
  netWorth,
  streakDays,
  yearMonthKeys,
} from '@/domain/stats'
import { budgetBoard } from '@/domain/budget'

export type LoadPhase = 'idle' | 'loading' | 'ready' | 'error'

/** 记一笔/编辑的输入：金额为分（整数），由屏幕从数字键盘换算好再传入。 */
export interface EntryDraft {
  kind: Kind
  amountCents: number
  categoryId: string | null
  accountId: string
  targetAccountId?: string
  occurredAt: string
  merchant: string
  note: string
  tags?: string[]
}

export interface DaySummary {
  dayKey: DayKey
  label: string
  expenseCents: number
  incomeCents: number
  count: number
}

/** 明细页的一天：聚合值 + 当天流水（已按时间倒排）。 */
export interface DayGroup extends DaySummary {
  rows: Transaction[]
}

/**
 * 账本主存：IndexedDB 是唯一真相，屏幕只读这里的派生 getter。
 * 写路径 = 先落库再更新内存引用，派生 computed 随之重算，无需回读。
 */
export const useLedgerStore = defineStore('ledger', () => {
  const phase = ref<LoadPhase>('idle')
  const errorMessage = ref('')
  const seedWarnings = ref<string[]>([])
  const transactions = shallowRef<Transaction[]>([])
  const categories = shallowRef<Category[]>([])
  const accounts = shallowRef<Account[]>([])
  const budgetPlans = shallowRef<BudgetPlan[]>([])
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
  /** 启动即固定的「今天」：跨午夜不漂移，同一屏所有派生数字共用一个锚点。 */
  const clock = shallowRef(new Date())
  const today = ref<DayKey>(dayKeyOfDate(clock.value))
  /** 报表/预算页的查看月，默认与本月一致；切月只影响视图，不改数据。 */
  const viewMonth = ref<MonthKey>(monthKeyOf(today.value))

  let repo: LedgerRepository | null = null

  async function storage(): Promise<LedgerRepository> {
    if (repo === null) repo = await getLedgerRepository()
    return repo
  }

  function sorted(rows: Transaction[]): Transaction[] {
    return rows.sort((a, b) =>
      a.occurredAt === b.occurredAt ? a.id.localeCompare(b.id) : a.occurredAt.localeCompare(b.occurredAt),
    )
  }

  async function hydrate(from: LedgerRepository): Promise<void> {
    const [rows, cats, accs, plans, conf] = await Promise.all([
      from.listAllTransactions(),
      from.listCategories(),
      from.listAccounts(),
      from.listBudgetPlans(),
      from.getSettings(),
    ])
    transactions.value = sorted(rows)
    categories.value = cats
    accounts.value = accs
    budgetPlans.value = plans
    settings.value = conf
  }

  /** 冷启动：建库 → 必要时灌入示例数据 → 全量载入（1.2k 笔，实测 < 100ms）。 */
  async function load(overrides: { now?: Date; repo?: LedgerRepository } = {}): Promise<void> {
    if (overrides.now) {
      clock.value = overrides.now
      today.value = dayKeyOfDate(overrides.now)
      viewMonth.value = monthKeyOf(today.value)
    }
    phase.value = 'loading'
    errorMessage.value = ''
    try {
      const db = overrides.repo ?? (await storage())
      repo = db
      const seeded = await ensureSeeded(db, { today: clock.value })
      await hydrate(db)
      seedWarnings.value = seeded.warnings
      phase.value = 'ready'
    } catch (error) {
      phase.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : String(error)
    }
  }

  /* ------------------------------ 目录 ------------------------------ */

  const categoryById = computed(() => new Map(categories.value.map((c) => [c.id, c])))
  const accountById = computed(() => new Map(accounts.value.map((a) => [a.id, a])))
  const expenseCategories = computed(() => categories.value.filter((c) => c.kind === 'expense'))
  const incomeCategories = computed(() => categories.value.filter((c) => c.kind === 'income'))

  function categoryName(id: string | null): string {
    if (id === null) return '转账'
    return categoryById.value.get(id)?.name ?? '未分类'
  }

  function accountName(id?: string): string {
    if (!id) return ''
    return accountById.value.get(id)?.name ?? '已删除账户'
  }

  /* ---------------------------- 时间锚点 ---------------------------- */

  const currentMonth = computed(() => monthKeyOf(today.value))
  const year = computed(() => Number(currentMonth.value.slice(0, 4)))
  const monthLabel = computed(() => cnYearMonth(viewMonth.value))

  const daySummaries = computed<DaySummary[]>(() =>
    groupByDay(transactions.value).map((g) => ({
      dayKey: g.dayKey,
      label: relativeDayLabel(g.dayKey, today.value) ?? cnMonthDay(g.dayKey),
      expenseCents: g.expenseCents,
      incomeCents: g.incomeCents,
      count: g.rows.length,
    })),
  )

  /** 按任意区间取流水：[fromDay, toDay] 闭区间，日期串字典序即时间序。 */
  function rowsBetween(fromDay: DayKey, toDay: DayKey): Transaction[] {
    return transactions.value.filter((t) => {
      const day = t.occurredAt.slice(0, 10)
      return day >= fromDay && day <= toDay
    })
  }

  function rowsOfDay(day: DayKey): Transaction[] {
    return transactions.value.filter((t) => t.occurredAt.slice(0, 10) === day)
  }

  function rowsOfMonth(month: string): Transaction[] {
    return transactions.value.filter((t) => monthKeyOf(t.occurredAt) === month)
  }

  function rowsOfYear(targetYear: number): Transaction[] {
    return transactions.value.filter((t) => Number(t.occurredAt.slice(0, 4)) === targetYear)
  }

  function expenseOfYear(targetYear: number): number {
    return expenseCents(rowsOfYear(targetYear))
  }

  function incomeOfYear(targetYear: number): number {
    return incomeCents(rowsOfYear(targetYear))
  }

  /* --------------------------- 查看月派生 --------------------------- */

  const monthRows = computed(() => rowsOfMonth(viewMonth.value))
  const monthExpenseCents = computed(() => expenseCents(monthRows.value))
  const monthIncomeCents = computed(() => incomeCents(monthRows.value))
  const monthBalanceCents = computed(() => monthIncomeCents.value - monthExpenseCents.value)
  const monthCount = computed(() => monthRows.value.length)
  const monthBreakdown = computed(() => categoryBreakdown(monthRows.value, categories.value, 'expense'))
  const monthIncomeBreakdown = computed(() => categoryBreakdown(monthRows.value, categories.value, 'income'))
  const budgetBoardValue = computed(() =>
    budgetBoard(budgetPlans.value, categories.value, transactions.value, viewMonth.value, today.value),
  )

  /** 查看月的「按日分组」：一次遍历出全部天，避免视图按天反复过滤整本账。 */
  const dayGroupsOfMonth = computed<DayGroup[]>(() => {
    const groups: DayGroup[] = []
    for (const row of monthRows.value) {
      const dayKey = row.occurredAt.slice(0, 10)
      const last = groups[groups.length - 1]
      if (last && last.dayKey === dayKey) {
        last.rows.push(row)
        if (row.kind === 'expense') last.expenseCents += row.amountCents
        else if (row.kind === 'income') last.incomeCents += row.amountCents
        last.count += 1
        continue
      }
      groups.push({
        dayKey,
        label: relativeDayLabel(dayKey, today.value) ?? cnMonthDay(dayKey),
        expenseCents: row.kind === 'expense' ? row.amountCents : 0,
        incomeCents: row.kind === 'income' ? row.amountCents : 0,
        count: 1,
        rows: [row],
      })
    }
    // monthRows 是升序：天倒排展示，天内也倒排（最新一笔在最上）
    return groups.map((g) => ({ ...g, rows: [...g.rows].reverse() })).reverse()
  })

  const todayExpenseCents = computed(() => expenseCents(rowsOfDay(today.value)))
  const todayCount = computed(() => rowsOfDay(today.value).length)
  const streakDaysValue = computed(() => streakDays(transactions.value, today.value))
  const ledgerAge = computed(() => ledgerAgeDays(transactions.value, today.value))
  const netWorthValue = computed(() => netWorth(accounts.value, transactions.value))
  const balances = computed(() => accountBalances(accounts.value, transactions.value))

  /** 打卡日历：本月每天是否有账，连续天数另有 streakDays。 */
  const monthCalendar = computed(() => {
    const recorded = new Set(rowsOfMonth(viewMonth.value).map((t) => t.occurredAt.slice(0, 10)))
    return monthDayKeys(viewMonth.value).map((key) => ({
      dayKey: key,
      day: Number(key.slice(8, 10)),
      recorded: recorded.has(key),
      future: key > today.value,
    }))
  })

  /** 全年 12 根柱：缺月补 0，柱高按年内最大支出归一。 */
  const yearBars = computed(() => {
    const bars = monthlyBars(transactions.value, yearMonthKeys(year.value))
    const max = Math.max(...bars.map((b) => b.expenseCents), 1)
    return bars.map((b) => ({ ...b, ratio: b.expenseCents / max }))
  })
  const yearExpenseCents = computed(() => expenseOfYear(year.value))
  const yearIncomeCents = computed(() => incomeOfYear(year.value))

  function shiftViewMonth(delta: number): void {
    const next = addMonths(viewMonth.value, delta)
    if (next > currentMonth.value) return
    viewMonth.value = next
  }

  /* --------------------------- 本月固定口径 --------------------------- */
  /** 首页永远讲「本月」，不跟报表页的查看月串味。 */
  const currentMonthExpenseCents = computed(() => expenseCents(rowsOfMonth(currentMonth.value)))
  const currentMonthIncomeCents = computed(() => incomeCents(rowsOfMonth(currentMonth.value)))
  const currentMonthBalanceCents = computed(() => currentMonthIncomeCents.value - currentMonthExpenseCents.value)
  const currentMonthCount = computed(() => rowsOfMonth(currentMonth.value).length)
  const currentBudgetBoard = computed(() =>
    budgetBoard(budgetPlans.value, categories.value, transactions.value, currentMonth.value, today.value),
  )

  /* ------------------------------ 写入 ------------------------------ */

  function materialize(draft: EntryDraft, id: string): Transaction {
    const stamp = Date.now()
    const row: Transaction = {
      id,
      kind: draft.kind,
      amountCents: draft.amountCents,
      categoryId: draft.kind === 'transfer' ? null : draft.categoryId,
      accountId: draft.accountId,
      occurredAt: draft.occurredAt,
      merchant: draft.merchant.trim(),
      note: draft.note.trim(),
      tags: [...(draft.tags ?? [])],
      createdAt: stamp,
      updatedAt: stamp,
    }
    if (draft.kind === 'transfer' && draft.targetAccountId) row.targetAccountId = draft.targetAccountId
    return row
  }

  function validated(draft: EntryDraft): string | null {
    if (!Number.isInteger(draft.amountCents) || draft.amountCents <= 0) return '金额要大于 0'
    if (draft.kind !== 'transfer' && !draft.categoryId) return '选一个分类再记'
    if (!draft.accountId) return '选一个账户再记'
    if (draft.kind === 'transfer' && (!draft.targetAccountId || draft.targetAccountId === draft.accountId))
      return '转入账户要和转出账户不同'
    if (draft.occurredAt > `${today.value}T23:59:59`) return '不能记到未来'
    return null
  }

  /** 记一笔：成功返回 null，失败返回可直接展示的文案，绝不半途写库。 */
  async function addEntry(draft: EntryDraft): Promise<string | null> {
    const invalid = validated(draft)
    if (invalid) return invalid
    const db = await storage()
    const row = materialize(draft, `user:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`)
    await db.putTransaction(row)
    transactions.value = sorted([...transactions.value, row])
    return null
  }

  async function updateEntry(id: string, patch: Partial<EntryDraft>): Promise<string | null> {
    const current = transactions.value.find((t) => t.id === id)
    if (!current) return '这条记录已被删除'
    const merged: Transaction = { ...current, ...patch, occurredAt: patch.occurredAt ?? current.occurredAt, updatedAt: Date.now() }
    const invalid = validated(merged)
    if (invalid) return invalid
    const db = await storage()
    await db.putTransaction(merged)
    transactions.value = sorted([...transactions.value.filter((t) => t.id !== id), merged])
    return null
  }

  async function removeEntry(id: string): Promise<void> {
    const db = await storage()
    await db.deleteTransaction(id)
    transactions.value = transactions.value.filter((t) => t.id !== id)
  }

  /** 预算改动以「本月生效」新版本落库，历史月的连续超支判定不受影响。 */
  async function setBudget(targetId: string, amountCents: number): Promise<string | null> {
    if (!Number.isInteger(amountCents) || amountCents <= 0) return '预算要大于 0'
    const db = await storage()
    const plan: BudgetPlan = {
      id: `${targetId}#${currentMonth.value}`,
      targetId,
      amountCents,
      effectiveFrom: currentMonth.value,
      updatedAt: Date.now(),
    }
    await db.putBudgetPlan(plan)
    budgetPlans.value = await db.listBudgetPlans()
    return null
  }

  async function saveCategory(category: Category): Promise<void> {
    const db = await storage()
    await db.putCategory(category)
    categories.value = await db.listCategories()
  }

  /** 分类只在无流水引用时可删，避免历史账目变成「未分类」。 */
  async function removeCategory(id: string): Promise<string | null> {
    const used = transactions.value.filter((t) => t.categoryId === id).length
    if (used > 0) return `这个分类下还有 ${used} 笔记录，先改分类再删`
    const db = await storage()
    await db.deleteCategory(id)
    categories.value = await db.listCategories()
    return null
  }

  async function saveAccount(account: Account): Promise<void> {
    const db = await storage()
    await db.putAccount(account)
    accounts.value = await db.listAccounts()
  }

  async function saveSettings(next: Settings): Promise<void> {
    const db = await storage()
    await db.saveSettings(next)
    settings.value = next
  }

  /* --------------------------- 演示数据管理 --------------------------- */

  /** 恢复示例账本：覆盖式重建，用户已记的流水会一并清掉（设置页二次确认）。 */
  async function rebuildDemo(): Promise<void> {
    const db = await storage()
    const dataset = await restoreDemoData(db, { today: clock.value })
    await hydrate(db)
    seedWarnings.value = dataset.warnings
  }

  /** 清空账目：只删流水，分类/账户/预算模板保留。 */
  async function wipeLedger(): Promise<void> {
    const db = await storage()
    await clearUserData(db)
    transactions.value = []
  }

  return {
    phase,
    errorMessage,
    seedWarnings,
    today,
    currentMonth,
    viewMonth,
    year,
    monthLabel,
    transactions,
    categories,
    accounts,
    budgetPlans,
    settings,
    load,
    categoryById,
    accountById,
    expenseCategories,
    incomeCategories,
    categoryName,
    accountName,
    daySummaries,
    rowsBetween,
    rowsOfDay,
    rowsOfMonth,
    rowsOfYear,
    expenseOfYear,
    incomeOfYear,
    monthRows,
    monthExpenseCents,
    monthIncomeCents,
    monthBalanceCents,
    monthCount,
    monthBreakdown,
    monthIncomeBreakdown,
    dayGroupsOfMonth,
    budgetBoard: budgetBoardValue,
    currentMonthExpenseCents,
    currentMonthIncomeCents,
    currentMonthBalanceCents,
    currentMonthCount,
    currentBudgetBoard,
    monthCalendar,
    shiftViewMonth,
    todayExpenseCents,
    todayCount,
    streakDays: streakDaysValue,
    ledgerAge,
    netWorth: netWorthValue,
    balances,
    yearBars,
    yearExpenseCents,
    yearIncomeCents,
    addEntry,
    updateEntry,
    removeEntry,
    setBudget,
    saveCategory,
    removeCategory,
    saveAccount,
    saveSettings,
    rebuildDemo,
    wipeLedger,
  }
})

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useLedgerStore, import.meta.hot))
