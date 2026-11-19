import type { BudgetPlan, BudgetStatus, Category, Transaction } from '@/types/domain'
import { addMonths } from '@/utils/date'
import { dailyAllowanceCents, expenseCents } from './stats'

/**
 * 预算口径：
 * - targetId 为 'total' 表示月度总预算，否则是支出分类 id。
 * - 同一 target 按 effectiveFrom 版本化，判定某月用「该月及之前最后一次生效」的额度。
 * - 转账不计入预算；连续超支月数从今天所在月往前连续累计。
 */

export const TOTAL_BUDGET_TARGET = 'total'

/** 生效额度：effectiveFrom <= monthKey 中取最新版本；未设预算返回 null。 */
export function planFor(plans: BudgetPlan[], targetId: string, monthKey: string): BudgetPlan | null {
  let winner: BudgetPlan | null = null
  for (const p of plans) {
    if (p.targetId !== targetId || p.effectiveFrom > monthKey) continue
    if (winner === null || p.effectiveFrom > winner.effectiveFrom) winner = p
  }
  return winner
}

/** categoryId 为 null 表示整月支出合计（总预算口径）。 */
export function spentInMonth(rows: Transaction[], monthKey: string, categoryId: string | null): number {
  return expenseCents(rows.filter((t) => t.occurredAt.slice(0, 7) === monthKey && (categoryId === null || t.categoryId === categoryId)))
}

function statusOf(budgetCents: number, spentCents: number): BudgetStatus['state'] {
  if (spentCents > budgetCents) return 'over'
  if (budgetCents > 0 && spentCents >= budgetCents * 0.85) return 'near'
  return 'ok'
}

/** 连续超支月数：从 monthKey 往前逐月判定，遇到未达预算或该月无生效额度即停。 */
export function consecutiveOverMonths(
  plans: BudgetPlan[],
  rows: Transaction[],
  targetId: string,
  monthKey: string,
): number {
  const categoryId = targetId === TOTAL_BUDGET_TARGET ? null : targetId
  let count = 0
  let cursor = monthKey
  for (let guard = 0; guard < 120; guard++) {
    const plan = planFor(plans, targetId, cursor)
    if (plan === null || spentInMonth(rows, cursor, categoryId) <= plan.amountCents) break
    count += 1
    cursor = addMonths(cursor, -1)
  }
  return count
}

export function budgetStatus(
  targetId: string,
  name: string,
  icon: string,
  tileColor: string,
  plans: BudgetPlan[],
  rows: Transaction[],
  monthKey: string,
  todayDayKey: string,
): BudgetStatus | null {
  const plan = planFor(plans, targetId, monthKey)
  if (plan === null) return null
  const budgetCents = plan.amountCents
  const spentCents = spentInMonth(rows, monthKey, targetId === TOTAL_BUDGET_TARGET ? null : targetId)
  const remainingCents = budgetCents - spentCents
  return {
    targetId,
    name,
    icon,
    tileColor,
    budgetCents,
    spentCents,
    remainingCents,
    usedPercent: budgetCents <= 0 ? 0 : Math.round((spentCents / budgetCents) * 1000) / 10,
    overCents: remainingCents < 0 ? -remainingCents : 0,
    perDayRemainingCents: remainingCents <= 0 ? 0 : dailyAllowanceCents(remainingCents, monthKey, todayDayKey),
    consecutiveOverMonths: consecutiveOverMonths(plans, rows, targetId, monthKey),
    state: statusOf(budgetCents, spentCents),
  }
}

export interface BudgetBoard {
  total: BudgetStatus | null
  items: BudgetStatus[]
}

/** 预算页看板：总预算单独返回，分类按「已用比例」倒序，未设预算的分类不出现。 */
export function budgetBoard(
  plans: BudgetPlan[],
  categories: Category[],
  rows: Transaction[],
  monthKey: string,
  todayDayKey: string,
): BudgetBoard {
  const total = budgetStatus(TOTAL_BUDGET_TARGET, '本月总预算', 'doc', '#FFB703', plans, rows, monthKey, todayDayKey)
  const items = categories
    .filter((c) => c.kind === 'expense')
    .map((c) => budgetStatus(c.id, c.name, c.icon, c.tileColor, plans, rows, monthKey, todayDayKey))
    .filter((s): s is BudgetStatus => s !== null)
    .sort((a, b) => b.usedPercent - a.usedPercent)
  return { total, items }
}

/** 超支提醒页：本月已超预算的分类，按超出金额倒序。 */
export function overBudgetList(board: BudgetBoard): BudgetStatus[] {
  return board.items.filter((s) => s.state === 'over').sort((a, b) => b.overCents - a.overCents)
}
